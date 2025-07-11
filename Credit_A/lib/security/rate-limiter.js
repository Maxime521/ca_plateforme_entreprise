// lib/security/rate-limiter.js - Advanced rate limiting
const rateLimit = require('express-rate-limit');
const logger = require('../logger.js');
const { RateLimitError } = require('./error-handler.js');

// Rate limiting configurations
const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    skipSuccessfulRequests: true
  },

  // Moderate rate limiting for API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many API requests. Please try again in 15 minutes.'
  },

  // Relaxed rate limiting for document previews
  preview: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many preview requests. Please wait a moment.'
  },

  // Strict rate limiting for file uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Upload limit exceeded. Please try again in an hour.'
  },

  // Very strict rate limiting for admin endpoints
  admin: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many admin requests. Please try again in 5 minutes.'
  }
};

// Create rate limiter with custom configuration
function createRateLimiter(configName = 'api', customConfig = {}) {
  const config = {
    ...rateLimitConfigs[configName],
    ...customConfig
  };

  return rateLimit({
    ...config,
    keyGenerator: (req) => {
      // Use IP address and user ID (if available) for more accurate limiting
      const ip = getClientIP(req);
      const userId = req.user?.uid || 'anonymous';
      return `${ip}:${userId}`;
    },
    handler: (req, res) => {
      // Log rate limit violations
      logger.warn('Rate limit exceeded', {
        ip: getClientIP(req),
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.uid,
        timestamp: new Date().toISOString()
      });

      // Return standardized error response
      const error = new RateLimitError(config.message);
      res.status(error.statusCode).json({
        error: true,
        message: error.message,
        code: error.code,
        retryAfter: Math.ceil(config.windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      if (req.path === '/api/health') return true;
      
      // Skip for whitelisted IPs in development
      if (process.env.NODE_ENV === 'development') {
        const ip = getClientIP(req);
        const whitelistedIPs = ['127.0.0.1', '::1', 'localhost'];
        return whitelistedIPs.includes(ip);
      }
      
      return false;
    }
  });
}

// Specific rate limiters for different endpoints
const authRateLimiter = createRateLimiter('auth');
const apiRateLimiter = createRateLimiter('api');
const previewRateLimiter = createRateLimiter('preview');
const uploadRateLimiter = createRateLimiter('upload');
const adminRateLimiter = createRateLimiter('admin');

// Dynamic rate limiter based on user role
function createDynamicRateLimiter(req, res, next) {
  const userRole = req.user?.role || 'anonymous';
  
  let limiter;
  
  switch (userRole) {
    case 'admin':
      limiter = createRateLimiter('api', { max: 500 }); // Higher limits for admins
      break;
    case 'user':
      limiter = createRateLimiter('api', { max: 200 }); // Medium limits for users
      break;
    case 'viewer':
      limiter = createRateLimiter('api', { max: 50 }); // Lower limits for viewers
      break;
    default:
      limiter = createRateLimiter('api', { max: 20 }); // Lowest limits for anonymous
  }
  
  return limiter(req, res, next);
}

// Sliding window rate limiter for advanced use cases
class SlidingWindowRateLimiter {
  constructor(windowSizeMs = 60000, maxRequests = 100) {
    this.windowSizeMs = windowSizeMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const userRequests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);
    
    // Check if limit is exceeded
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    return true;
  }

  cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowSizeMs * 2; // Keep some buffer
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > cutoff);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// BODACC-specific rate limiter
const bodaccRateLimiter = createRateLimiter('preview', {
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 BODACC requests per minute
  message: 'Too many BODACC requests. Please wait before requesting another report.'
});

// Helper function to get client IP
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : req.connection.remoteAddress || req.socket.remoteAddress;
  
  return ip && ip.match(/^[\d.:]+$/) ? ip : 'unknown';
}

// Middleware to apply rate limiting based on endpoint
function applyRateLimiting(req, res, next) {
  const path = req.path.toLowerCase();
  
  // Choose appropriate rate limiter based on endpoint
  if (path.includes('/auth/')) {
    return authRateLimiter(req, res, next);
  } else if (path.includes('/admin/')) {
    return adminRateLimiter(req, res, next);
  } else if (path.includes('/upload')) {
    return uploadRateLimiter(req, res, next);
  } else if (path.includes('/preview') || path.includes('/bodacc')) {
    return previewRateLimiter(req, res, next);
  } else {
    return apiRateLimiter(req, res, next);
  }
}

// Rate limit status middleware
function rateLimitStatus(req, res, next) {
  // Add rate limit info to response headers
  res.set('X-RateLimit-Limit', req.rateLimit?.limit || 'unknown');
  res.set('X-RateLimit-Remaining', req.rateLimit?.remaining || 'unknown');
  res.set('X-RateLimit-Reset', req.rateLimit?.reset || 'unknown');
  
  next();
}

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  previewRateLimiter,
  uploadRateLimiter,
  adminRateLimiter,
  createDynamicRateLimiter,
  SlidingWindowRateLimiter,
  bodaccRateLimiter,
  applyRateLimiting,
  rateLimitStatus
};