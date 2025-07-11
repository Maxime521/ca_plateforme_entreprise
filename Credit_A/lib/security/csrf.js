// lib/security/csrf.js - CSRF protection implementation
import crypto from 'crypto';
import { logger } from '../logger.js';
import { SecurityError } from './error-handler.js';

// CSRF token configuration
const CSRF_CONFIG = {
  tokenLength: 32,
  tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
  secretKey: process.env.CSRF_SECRET || 'fallback-secret-key-change-in-production',
  cookieName: '_csrf_token',
  headerName: 'x-csrf-token'
};

// In-memory token store (use Redis in production)
const tokenStore = new Map();

// Generate CSRF token
export function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(CSRF_CONFIG.tokenLength).toString('hex');
  const timestamp = Date.now();
  
  // Store token with expiry
  tokenStore.set(token, {
    sessionId,
    timestamp,
    used: false
  });
  
  // Clean up expired tokens
  cleanupExpiredTokens();
  
  return token;
}

// Validate CSRF token
export function validateCSRFToken(token, sessionId) {
  if (!token || !sessionId) {
    logger.warn('CSRF validation failed: missing token or session ID');
    return false;
  }
  
  const tokenData = tokenStore.get(token);
  
  if (!tokenData) {
    logger.warn('CSRF validation failed: token not found', { token: token.substring(0, 8) + '...' });
    return false;
  }
  
  // Check if token is expired
  if (Date.now() - tokenData.timestamp > CSRF_CONFIG.tokenExpiry) {
    logger.warn('CSRF validation failed: token expired', { token: token.substring(0, 8) + '...' });
    tokenStore.delete(token);
    return false;
  }
  
  // Check if token belongs to the session
  if (tokenData.sessionId !== sessionId) {
    logger.warn('CSRF validation failed: session mismatch', { 
      token: token.substring(0, 8) + '...',
      sessionId: sessionId.substring(0, 8) + '...'
    });
    return false;
  }
  
  // Check if token was already used (prevent replay attacks)
  if (tokenData.used) {
    logger.warn('CSRF validation failed: token already used', { token: token.substring(0, 8) + '...' });
    return false;
  }
  
  // Mark token as used
  tokenData.used = true;
  
  return true;
}

// Clean up expired tokens
function cleanupExpiredTokens() {
  const now = Date.now();
  const expiredTokens = [];
  
  for (const [token, data] of tokenStore.entries()) {
    if (now - data.timestamp > CSRF_CONFIG.tokenExpiry) {
      expiredTokens.push(token);
    }
  }
  
  expiredTokens.forEach(token => tokenStore.delete(token));
  
  if (expiredTokens.length > 0) {
    logger.debug('Cleaned up expired CSRF tokens', { count: expiredTokens.length });
  }
}

// CSRF middleware for API routes
export function csrfProtection(req, res, next) {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for API endpoints that use other authentication
  if (req.path.includes('/api/auth/') || req.path.includes('/api/webhook/')) {
    return next();
  }
  
  const sessionId = req.sessionID || req.headers['x-session-id'];
  const token = req.headers[CSRF_CONFIG.headerName] || req.body._csrf || req.query._csrf;
  
  if (!validateCSRFToken(token, sessionId)) {
    logger.warn('CSRF protection triggered', {
      method: req.method,
      path: req.path,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      sessionId: sessionId?.substring(0, 8) + '...'
    });
    
    const error = new SecurityError('Invalid CSRF token', 403, 'CSRF_ERROR');
    return res.status(error.statusCode).json({
      error: true,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

// Generate CSRF token for client
export function generateCSRFTokenForClient(req, res) {
  const sessionId = req.sessionID || req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(400).json({
      error: true,
      message: 'Session ID required',
      code: 'NO_SESSION'
    });
  }
  
  const token = generateCSRFToken(sessionId);
  
  // Set token in cookie (httpOnly for security)
  res.cookie(CSRF_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_CONFIG.tokenExpiry
  });
  
  // Also return token in response for client-side use
  res.json({
    token,
    expiresAt: Date.now() + CSRF_CONFIG.tokenExpiry
  });
}

// Double-submit cookie CSRF protection
export function doubleSubmitCookieCSRF(req, res, next) {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const cookieToken = req.cookies[CSRF_CONFIG.cookieName];
  const headerToken = req.headers[CSRF_CONFIG.headerName];
  
  if (!cookieToken || !headerToken) {
    logger.warn('Double-submit CSRF failed: missing tokens', {
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      path: req.path
    });
    
    return res.status(403).json({
      error: true,
      message: 'CSRF token required',
      code: 'CSRF_TOKEN_REQUIRED'
    });
  }
  
  if (cookieToken !== headerToken) {
    logger.warn('Double-submit CSRF failed: token mismatch', {
      cookieToken: cookieToken.substring(0, 8) + '...',
      headerToken: headerToken.substring(0, 8) + '...',
      path: req.path
    });
    
    return res.status(403).json({
      error: true,
      message: 'CSRF token mismatch',
      code: 'CSRF_TOKEN_MISMATCH'
    });
  }
  
  next();
}

// Signed token CSRF protection (more secure)
export function signedTokenCSRF(req, res, next) {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const token = req.headers[CSRF_CONFIG.headerName] || req.body._csrf;
  
  if (!token) {
    return res.status(403).json({
      error: true,
      message: 'CSRF token required',
      code: 'CSRF_TOKEN_REQUIRED'
    });
  }
  
  try {
    const [tokenValue, signature] = token.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_CONFIG.secretKey)
      .update(tokenValue)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }
    
    // Decode token data
    const tokenData = JSON.parse(Buffer.from(tokenValue, 'base64').toString());
    
    // Check expiry
    if (Date.now() > tokenData.expires) {
      throw new Error('Token expired');
    }
    
    // Check session
    const sessionId = req.sessionID || req.headers['x-session-id'];
    if (tokenData.sessionId !== sessionId) {
      throw new Error('Session mismatch');
    }
    
    next();
    
  } catch (error) {
    logger.warn('Signed CSRF token validation failed', {
      error: error.message,
      path: req.path,
      ip: getClientIP(req)
    });
    
    return res.status(403).json({
      error: true,
      message: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }
}

// Generate signed CSRF token
export function generateSignedCSRFToken(sessionId) {
  const tokenData = {
    sessionId,
    timestamp: Date.now(),
    expires: Date.now() + CSRF_CONFIG.tokenExpiry,
    nonce: crypto.randomBytes(16).toString('hex')
  };
  
  const tokenValue = Buffer.from(JSON.stringify(tokenData)).toString('base64');
  const signature = crypto
    .createHmac('sha256', CSRF_CONFIG.secretKey)
    .update(tokenValue)
    .digest('hex');
  
  return `${tokenValue}.${signature}`;
}

// Helper function to get client IP
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : req.connection.remoteAddress || req.socket.remoteAddress;
  
  return ip && ip.match(/^[\d.:]+$/) ? ip : 'unknown';
}

// Middleware to add CSRF token to all responses
export function injectCSRFToken(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Add CSRF token to response if session exists
    const sessionId = req.sessionID || req.headers['x-session-id'];
    if (sessionId && typeof data === 'object' && data !== null) {
      data._csrf = generateCSRFToken(sessionId);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

// CSRF protection status endpoint
export function csrfStatus(req, res) {
  const sessionId = req.sessionID || req.headers['x-session-id'];
  
  res.json({
    csrfProtected: true,
    sessionId: sessionId ? sessionId.substring(0, 8) + '...' : null,
    tokenExpiry: CSRF_CONFIG.tokenExpiry,
    activeTokens: tokenStore.size
  });
}