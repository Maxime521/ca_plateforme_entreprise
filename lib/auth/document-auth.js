// lib/auth/document-auth.js - Enhanced Document Access Authorization
//==============================================================================

import { createAdminClient } from '../supabase';
import logger from '../logger';

/**
 * Enhanced document authorization middleware with comprehensive security
 * Implements role-based access control, rate limiting, and audit logging
 */
export class DocumentAuthService {
  constructor() {
    this.supabase = createAdminClient();
    this.rateLimits = new Map(); // IP-based rate limiting
    this.auditLog = [];
  }

  /**
   * Verify user authorization for document access
   * @param {Object} req - HTTP request object
   * @param {string} operation - Operation type (preview, download, batch)
   * @param {Object} documentInfo - Document information
   * @returns {Promise<Object>} Authorization result
   */
  async authorizeDocumentAccess(req, operation, documentInfo) {
    const startTime = Date.now();
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    try {
      // 1. Extract authentication token
      const authResult = await this.extractAndValidateAuth(req);
      if (!authResult.success) {
        await this.logSecurityEvent('AUTH_FAILED', {
          operation,
          documentInfo,
          clientIP,
          userAgent,
          reason: authResult.reason
        });
        return authResult;
      }

      const { user, session } = authResult.data;

      // 2. Check rate limiting
      const rateLimitResult = this.checkRateLimit(clientIP, user.id, operation);
      if (!rateLimitResult.allowed) {
        await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          operation,
          documentInfo,
          clientIP,
          userAgent,
          userId: user.id,
          rateLimitInfo: rateLimitResult
        });
        return {
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for document operations',
          retryAfter: rateLimitResult.retryAfter
        };
      }

      // 3. Verify user permissions
      const permissionResult = await this.checkUserPermissions(user, operation, documentInfo);
      if (!permissionResult.allowed) {
        await this.logSecurityEvent('PERMISSION_DENIED', {
          operation,
          documentInfo,
          clientIP,
          userAgent,
          userId: user.id,
          reason: permissionResult.reason
        });
        return {
          success: false,
          code: 'PERMISSION_DENIED',
          message: permissionResult.reason
        };
      }

      // 4. Validate document access rules
      const accessResult = await this.validateDocumentAccess(user, documentInfo, operation);
      if (!accessResult.allowed) {
        await this.logSecurityEvent('ACCESS_DENIED', {
          operation,
          documentInfo,
          clientIP,
          userAgent,
          userId: user.id,
          reason: accessResult.reason
        });
        return {
          success: false,
          code: 'ACCESS_DENIED',
          message: accessResult.reason
        };
      }

      // 5. Update rate limit counters
      this.updateRateLimit(clientIP, user.id, operation);

      // 6. Log successful authorization
      await this.logAuditEvent('DOCUMENT_ACCESS_AUTHORIZED', {
        operation,
        documentInfo,
        clientIP,
        userAgent,
        userId: user.id,
        sessionId: session.id,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        user,
        session,
        permissions: permissionResult.permissions,
        accessLevel: accessResult.accessLevel
      };

    } catch (error) {
      logger.error('Document authorization error', {
        error,
        operation,
        documentInfo,
        clientIP,
        userAgent,
        duration: Date.now() - startTime
      });

      await this.logSecurityEvent('AUTHORIZATION_ERROR', {
        operation,
        documentInfo,
        clientIP,
        userAgent,
        error: error.message
      });

      return {
        success: false,
        code: 'AUTHORIZATION_ERROR',
        message: 'Authorization service temporarily unavailable'
      };
    }
  }

  /**
   * Extract and validate authentication from request
   * @param {Object} req - HTTP request object
   * @returns {Promise<Object>} Authentication result
   */
  async extractAndValidateAuth(req) {
    try {
      // Extract token from Authorization header or cookie
      let token = null;
      
      if (req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      } else if (req.cookies?.access_token) {
        token = req.cookies.access_token;
      }

      if (!token) {
        return {
          success: false,
          code: 'NO_TOKEN',
          reason: 'No authentication token provided'
        };
      }

      // Validate token with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        return {
          success: false,
          code: 'INVALID_TOKEN',
          reason: 'Invalid or expired authentication token'
        };
      }

      // Get session information
      const { data: session } = await this.supabase.auth.getSession();

      return {
        success: true,
        data: { user, session }
      };

    } catch (error) {
      return {
        success: false,
        code: 'AUTH_ERROR',
        reason: 'Authentication service error'
      };
    }
  }

  /**
   * Check rate limiting for user and IP
   * @param {string} clientIP - Client IP address
   * @param {string} userId - User ID
   * @param {string} operation - Operation type
   * @returns {Object} Rate limit result
   */
  checkRateLimit(clientIP, userId, operation) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    
    // Different limits for different operations
    const limits = {
      preview: { perMinute: 30, perHour: 500 },
      download: { perMinute: 10, perHour: 100 },
      batch: { perMinute: 2, perHour: 20 }
    };

    const limit = limits[operation] || limits.download;
    const key = `${clientIP}_${userId}_${operation}`;
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, {
        minute: { count: 0, resetTime: now + windowMs },
        hour: { count: 0, resetTime: now + (60 * windowMs) }
      });
    }

    const userLimit = this.rateLimits.get(key);
    
    // Reset counters if window expired
    if (now > userLimit.minute.resetTime) {
      userLimit.minute = { count: 0, resetTime: now + windowMs };
    }
    if (now > userLimit.hour.resetTime) {
      userLimit.hour = { count: 0, resetTime: now + (60 * windowMs) };
    }

    // Check limits
    if (userLimit.minute.count >= limit.perMinute) {
      return {
        allowed: false,
        retryAfter: Math.ceil((userLimit.minute.resetTime - now) / 1000)
      };
    }
    
    if (userLimit.hour.count >= limit.perHour) {
      return {
        allowed: false,
        retryAfter: Math.ceil((userLimit.hour.resetTime - now) / 1000)
      };
    }

    return { allowed: true };
  }

  /**
   * Update rate limit counters
   * @param {string} clientIP - Client IP address
   * @param {string} userId - User ID
   * @param {string} operation - Operation type
   */
  updateRateLimit(clientIP, userId, operation) {
    const key = `${clientIP}_${userId}_${operation}`;
    const userLimit = this.rateLimits.get(key);
    
    if (userLimit) {
      userLimit.minute.count++;
      userLimit.hour.count++;
    }
  }

  /**
   * Check user permissions for operation
   * @param {Object} user - User object
   * @param {string} operation - Operation type
   * @param {Object} documentInfo - Document information
   * @returns {Promise<Object>} Permission result
   */
  async checkUserPermissions(user, operation, documentInfo) {
    try {
      // Get user role from database
      const { data: userProfile, error } = await this.supabase
        .from('users')
        .select('role, permissions, subscription_tier')
        .eq('id', user.id)
        .single();

      if (error || !userProfile) {
        return {
          allowed: false,
          reason: 'User profile not found'
        };
      }

      const { role, permissions, subscription_tier } = userProfile;

      // Admin users have full access
      if (role === 'admin') {
        return {
          allowed: true,
          permissions: ['all'],
          accessLevel: 'full'
        };
      }

      // Check subscription tier limits
      const tierLimits = {
        free: { dailyDownloads: 10, simultaneousDownloads: 2 },
        pro: { dailyDownloads: 100, simultaneousDownloads: 5 },
        enterprise: { dailyDownloads: 1000, simultaneousDownloads: 10 }
      };

      const userTier = tierLimits[subscription_tier] || tierLimits.free;
      
      // Check daily download limit for download operations
      if (operation === 'download' || operation === 'batch') {
        const dailyUsage = await this.getDailyDownloadUsage(user.id);
        if (dailyUsage >= userTier.dailyDownloads) {
          return {
            allowed: false,
            reason: 'Daily download limit exceeded'
          };
        }
      }

      return {
        allowed: true,
        permissions: permissions || ['basic'],
        accessLevel: subscription_tier,
        limits: userTier
      };

    } catch (error) {
      logger.error('Permission check error', { error, userId: user.id, operation });
      return {
        allowed: false,
        reason: 'Permission check failed'
      };
    }
  }

  /**
   * Validate document access rules
   * @param {Object} user - User object
   * @param {Object} documentInfo - Document information
   * @param {string} operation - Operation type
   * @returns {Promise<Object>} Access validation result
   */
  async validateDocumentAccess(user, documentInfo, operation) {
    try {
      // Check if document exists and user has access
      if (documentInfo.companyId) {
        const { data: companyAccess, error } = await this.supabase
          .from('company_access')
          .select('access_level')
          .eq('company_id', documentInfo.companyId)
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        // If no explicit access record, check if company is public
        if (!companyAccess) {
          const { data: company, error: companyError } = await this.supabase
            .from('companies')
            .select('is_public')
            .eq('id', documentInfo.companyId)
            .single();

          if (companyError || !company?.is_public) {
            return {
              allowed: false,
              reason: 'Access denied to private company data'
            };
          }
        }
      }

      // Check document-specific restrictions
      if (documentInfo.restrictions) {
        const restrictions = JSON.parse(documentInfo.restrictions);
        
        if (restrictions.requiresApproval && !restrictions.approvedUsers?.includes(user.id)) {
          return {
            allowed: false,
            reason: 'Document requires approval for access'
          };
        }

        if (restrictions.ipWhitelist && !this.isIPWhitelisted(req.ip, restrictions.ipWhitelist)) {
          return {
            allowed: false,
            reason: 'IP address not authorized for this document'
          };
        }
      }

      return {
        allowed: true,
        accessLevel: 'standard'
      };

    } catch (error) {
      logger.error('Document access validation error', { error, userId: user.id, documentInfo });
      return {
        allowed: false,
        reason: 'Access validation failed'
      };
    }
  }

  /**
   * Get daily download usage for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Daily download count
   */
  async getDailyDownloadUsage(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'DOCUMENT_DOWNLOADED')
        .gte('created_at', today.toISOString())
        .lt('created_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      return data?.length || 0;

    } catch (error) {
      logger.error('Daily usage check error', { error, userId });
      return 0;
    }
  }

  /**
   * Log security event
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   */
  async logSecurityEvent(eventType, eventData) {
    try {
      await this.supabase
        .from('security_events')
        .insert({
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString(),
          severity: this.getEventSeverity(eventType)
        });

      logger.security(eventType, eventData);

    } catch (error) {
      logger.error('Security event logging failed', { error, eventType, eventData });
    }
  }

  /**
   * Log audit event
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   */
  async logAuditEvent(eventType, eventData) {
    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          event_type: eventType,
          event_data: eventData,
          user_id: eventData.userId,
          created_at: new Date().toISOString()
        });

      logger.info(eventType, eventData);

    } catch (error) {
      logger.error('Audit event logging failed', { error, eventType, eventData });
    }
  }

  /**
   * Get event severity level
   * @param {string} eventType - Event type
   * @returns {string} Severity level
   */
  getEventSeverity(eventType) {
    const severityMap = {
      'AUTH_FAILED': 'medium',
      'RATE_LIMIT_EXCEEDED': 'medium',
      'PERMISSION_DENIED': 'high',
      'ACCESS_DENIED': 'high',
      'AUTHORIZATION_ERROR': 'critical'
    };

    return severityMap[eventType] || 'low';
  }

  /**
   * Check if IP is whitelisted
   * @param {string} ip - IP address
   * @param {string[]} whitelist - Whitelisted IPs
   * @returns {boolean} True if whitelisted
   */
  isIPWhitelisted(ip, whitelist) {
    return whitelist.includes(ip) || whitelist.includes('*');
  }

  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimits() {
    const now = Date.now();
    for (const [key, limit] of this.rateLimits.entries()) {
      if (now > limit.hour.resetTime) {
        this.rateLimits.delete(key);
      }
    }
  }
}

// Create singleton instance
const documentAuth = new DocumentAuthService();

// Cleanup rate limits every 5 minutes
setInterval(() => {
  documentAuth.cleanupRateLimits();
}, 5 * 60 * 1000);

export default documentAuth;