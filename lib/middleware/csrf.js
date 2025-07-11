// lib/middleware/csrf.js - CSRF Protection Middleware
import crypto from 'crypto';

// In-memory CSRF token store (use Redis in production)
const tokenStore = new Map();

// CSRF token configuration
const CSRF_CONFIG = {
  tokenLength: 32,
  tokenLifetime: 3600000, // 1 hour in milliseconds
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  }
};

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCSRFToken() {
  return crypto.randomBytes(CSRF_CONFIG.tokenLength).toString('hex');
}

/**
 * Clean expired tokens from store
 */
function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expires < now) {
      tokenStore.delete(token);
    }
  }
}

/**
 * Store CSRF token with expiration
 */
function storeToken(token, sessionId) {
  const expires = Date.now() + CSRF_CONFIG.tokenLifetime;
  tokenStore.set(token, {
    sessionId,
    expires,
    created: Date.now()
  });
  
  // Clean expired tokens periodically
  if (Math.random() < 0.1) { // 10% chance
    cleanExpiredTokens();
  }
}

/**
 * Validate CSRF token
 */
function validateToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }
  
  const tokenData = tokenStore.get(token);
  if (!tokenData) {
    return false;
  }
  
  // Check expiration
  if (tokenData.expires < Date.now()) {
    tokenStore.delete(token);
    return false;
  }
  
  // Check session match
  if (tokenData.sessionId !== sessionId) {
    return false;
  }
  
  return true;
}

/**
 * Generate session ID from request
 */
function getSessionId(req) {
  // Use IP + User-Agent as session identifier
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.ip;
  const userAgent = req.headers['user-agent'] || '';
  
  return crypto
    .createHash('sha256')
    .update(ip + userAgent)
    .digest('hex');
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(options = {}) {
  const config = { ...CSRF_CONFIG, ...options };
  
  return function csrfMiddleware(handler) {
    return async function(req, res) {
      const sessionId = getSessionId(req);
      
      // Generate token for GET requests
      if (req.method === 'GET') {
        const token = generateCSRFToken();
        storeToken(token, sessionId);
        
        // Set token in cookie
        res.setHeader('Set-Cookie', [
          `${config.cookieName}=${token}; HttpOnly; ${config.cookieOptions.secure ? 'Secure; ' : ''}SameSite=Strict; Max-Age=${config.cookieOptions.maxAge}; Path=/`
        ]);
        
        // Also send in response for AJAX usage
        res.setHeader('X-CSRF-Token', token);
        
        return handler(req, res);
      }
      
      // Validate token for state-changing requests
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const tokenFromHeader = req.headers[config.headerName];
        const tokenFromCookie = req.cookies?.[config.cookieName];
        
        // Check both header and cookie (double submit pattern)
        const token = tokenFromHeader || tokenFromCookie;
        
        if (!validateToken(token, sessionId)) {
          console.warn(`CSRF validation failed for ${req.method} ${req.url}`);
          return res.status(403).json({
            success: false,
            error: 'CSRF token validation failed',
            code: 'CSRF_ERROR'
          });
        }
        
        // Token is valid, continue
        return handler(req, res);
      }
      
      // Allow other methods (HEAD, OPTIONS)
      return handler(req, res);
    };
  };
}

/**
 * Manual CSRF token generation for forms
 */
export function generateCSRFTokenForForm(req) {
  const sessionId = getSessionId(req);
  const token = generateCSRFToken();
  storeToken(token, sessionId);
  return token;
}

/**
 * CSRF status endpoint
 */
export function createCSRFStatusHandler() {
  return function(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const sessionId = getSessionId(req);
    const token = generateCSRFToken();
    storeToken(token, sessionId);
    
    res.status(200).json({
      success: true,
      token: token,
      expires: Date.now() + CSRF_CONFIG.tokenLifetime
    });
  };
}

/**
 * Express-style middleware (for compatibility)
 */
export function expressCSRFProtection(req, res, next) {
  const sessionId = getSessionId(req);
  
  if (req.method === 'GET') {
    const token = generateCSRFToken();
    storeToken(token, sessionId);
    res.setHeader('X-CSRF-Token', token);
    return next();
  }
  
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    
    if (!validateToken(token, sessionId)) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token validation failed'
      });
    }
  }
  
  next();
}

export default {
  csrfProtection,
  generateCSRFTokenForForm,
  createCSRFStatusHandler,
  expressCSRFProtection
};