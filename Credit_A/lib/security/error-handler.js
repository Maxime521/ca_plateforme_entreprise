// lib/security/error-handler.js - Secure error handling
const logger = require('../logger.js');

class SecurityError extends Error {
  constructor(message, statusCode = 500, code = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends SecurityError {
  constructor(errors) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends SecurityError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
  }
}

class RateLimitError extends SecurityError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Secure error handler middleware
function secureErrorHandler(error, req, res, next) {
  // Log error securely (no sensitive data)
  const logData = {
    error: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: getClientIP(req)
  };

  // Log different levels based on severity
  if (error.statusCode >= 500) {
    logger.error('Server error', logData);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error', logData);
  } else {
    logger.info('Request error', logData);
  }

  // Return sanitized error response
  const response = createErrorResponse(error, req);
  res.status(error.statusCode || 500).json(response);
}

// Create sanitized error response
function createErrorResponse(error, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // Base error response
  const response = {
    error: true,
    message: error.message,
    timestamp: new Date().toISOString(),
    requestId: req.id || generateRequestId()
  };

  // Add error code if available
  if (error.code) {
    response.code = error.code;
  }

  // Add validation errors if present
  if (error.errors && Array.isArray(error.errors)) {
    response.errors = error.errors;
  }

  // In development, include more details
  if (isDevelopment) {
    response.stack = error.stack;
    response.details = {
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers)
    };
  }

  // In production, sanitize sensitive information
  if (isProduction) {
    response.message = sanitizeErrorMessage(error.message);
  }

  return response;
}

// Sanitize error messages in production
function sanitizeErrorMessage(message) {
  const sensitivePatterns = [
    /password/gi,
    /token/gi,
    /secret/gi,
    /key/gi,
    /api[_-]?key/gi,
    /auth/gi,
    /credential/gi,
    /\b\d{9}\b/g, // SIREN numbers
    /\b\d{14}\b/g, // SIRET numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email addresses
  ];

  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

// Sanitize headers for logging
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-csrf-token'
  ];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Get client IP address securely
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : req.connection.remoteAddress;
  
  // Sanitize IP address
  return ip && ip.match(/^[\d.:]+$/) ? ip : 'unknown';
}

// Generate unique request ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// BODACC API specific error handler
function handleBODACCError(error, siren) {
  const sanitizedSiren = siren ? siren.substring(0, 3) + '****' : '[REDACTED]';
  
  // Log error without sensitive data
  logger.error('BODACC API Error', {
    siren: sanitizedSiren,
    status: error.response?.status,
    code: error.code,
    timestamp: new Date().toISOString()
  });

  // Return appropriate user-facing error
  if (error.response) {
    const status = error.response.status;
    
    switch (status) {
      case 400:
        return new ValidationError([{
          field: 'siren',
          message: 'Invalid SIREN format provided'
        }]);
      case 404:
        return new SecurityError('No BODACC records found for this company', 404, 'NOT_FOUND');
      case 429:
        return new RateLimitError('BODACC API rate limit exceeded. Please try again later.');
      case 500:
      case 502:
      case 503:
        return new SecurityError('BODACC service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
      default:
        return new SecurityError('External service error', 502, 'EXTERNAL_SERVICE_ERROR');
    }
  } else if (error.code) {
    switch (error.code) {
      case 'ENOTFOUND':
        return new SecurityError('Unable to connect to BODACC service', 503, 'CONNECTION_ERROR');
      case 'ECONNREFUSED':
        return new SecurityError('Connection refused by BODACC service', 503, 'CONNECTION_ERROR');
      case 'ECONNABORTED':
      case 'ETIMEDOUT':
        return new SecurityError('BODACC service timeout', 504, 'TIMEOUT_ERROR');
      default:
        return new SecurityError('Network error occurred', 503, 'NETWORK_ERROR');
    }
  }

  return new SecurityError('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

// Express error handler wrapper
function wrapAsyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation error handler
function handleValidationError(validationResult) {
  if (!validationResult.isValid) {
    throw new ValidationError(validationResult.errors);
  }
  return validationResult.data;
}

module.exports = {
  SecurityError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  secureErrorHandler,
  createErrorResponse,
  sanitizeErrorMessage,
  sanitizeHeaders,
  getClientIP,
  generateRequestId,
  handleBODACCError,
  wrapAsyncHandler,
  handleValidationError
};