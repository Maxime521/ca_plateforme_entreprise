/**
 * Base application error class
 * All custom errors should extend this class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', retryable = false, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();
    this.meta = meta;
    
    // Capture stack trace, excluding constructor call
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
      ...this.meta
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    // Override in subclasses for user-specific messages
    return this.message;
  }

  /**
   * Check if error should be logged
   */
  shouldLog() {
    return this.statusCode >= 500;
  }
}

/**
 * Validation error for input validation failures
 */
class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 400, 'VALIDATION_ERROR', false, { field, value });
    this.field = field;
    this.value = value;
  }

  getUserMessage() {
    return this.field 
      ? `Erreur de validation pour le champ "${this.field}": ${this.message}`
      : `Erreur de validation: ${this.message}`;
  }
}

/**
 * Authentication error
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTH_REQUIRED') {
    super(message, 401, code, false);
  }

  getUserMessage() {
    return 'Authentification requise. Veuillez vous connecter.';
  }
}

/**
 * Authorization error
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied', requiredRole = null, action = null) {
    super(message, 403, 'ACCESS_DENIED', false, { requiredRole, action });
    this.requiredRole = requiredRole;
    this.action = action;
  }

  getUserMessage() {
    return 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
  }
}

/**
 * API service error for external service failures
 */
class APIServiceError extends AppError {
  constructor(service, message, originalError = null, retryable = true, statusCode = 503) {
    const fullMessage = `${service}: ${message}`;
    super(fullMessage, statusCode, `${service.toUpperCase()}_ERROR`, retryable, {
      service,
      originalError: originalError?.message,
      originalStack: originalError?.stack
    });
    this.service = service;
    this.originalError = originalError;
  }

  getUserMessage() {
    const serviceNames = {
      'INSEE': 'INSEE SIRENE',
      'BODACC': 'BODACC',
      'INPI': 'INPI',
      'RNE': 'RNE'
    };
    
    const friendlyName = serviceNames[this.service.toUpperCase()] || this.service;
    
    if (this.retryable) {
      return `Le service ${friendlyName} est temporairement indisponible. Veuillez réessayer dans quelques instants.`;
    }
    
    return `Erreur du service ${friendlyName}. Veuillez contacter le support si le problème persiste.`;
  }
}

/**
 * Rate limiting error
 */
class RateLimitError extends AppError {
  constructor(service, retryAfter = 60, limit = null) {
    const message = `Rate limit exceeded for ${service}${limit ? `. Limit: ${limit} requests` : ''}`;
    super(message, 429, 'RATE_LIMIT_ERROR', true, { service, retryAfter, limit });
    this.service = service;
    this.retryAfter = retryAfter;
    this.limit = limit;
  }

  getUserMessage() {
    return `Limite de requêtes atteinte. Veuillez réessayer dans ${this.retryAfter} secondes.`;
  }
}

/**
 * Resource not found error
 */
class NotFoundError extends AppError {
  constructor(resource, identifier = null) {
    const message = `${resource} not found${identifier ? `: ${identifier}` : ''}`;
    super(message, 404, 'NOT_FOUND_ERROR', false, { resource, identifier });
    this.resource = resource;
    this.identifier = identifier;
  }

  getUserMessage() {
    const resourceNames = {
      'Company': 'Entreprise',
      'Document': 'Document',
      'User': 'Utilisateur',
      'BODACC announcements': 'Annonces BODACC',
      'INSEE data': 'Données INSEE'
    };
    
    const friendlyResource = resourceNames[this.resource] || this.resource;
    return `${friendlyResource} non trouvé${this.identifier ? ` (${this.identifier})` : ''}.`;
  }
}

/**
 * Conflict error for resource conflicts
 */
class ConflictError extends AppError {
  constructor(message, resource = null, conflictField = null) {
    super(message, 409, 'CONFLICT_ERROR', false, { resource, conflictField });
    this.resource = resource;
    this.conflictField = conflictField;
  }

  getUserMessage() {
    return `Conflit détecté: ${this.message}`;
  }
}

/**
 * Database error
 */
class DatabaseError extends AppError {
  constructor(message, operation = null, table = null, originalError = null) {
    super(message, 500, 'DATABASE_ERROR', false, { operation, table });
    this.operation = operation;
    this.table = table;
    this.originalError = originalError;
  }

  getUserMessage() {
    return 'Erreur de base de données. Veuillez réessayer ou contacter le support.';
  }

  shouldLog() {
    return true; // Always log database errors
  }
}

/**
 * File operation error
 */
class FileError extends AppError {
  constructor(message, operation = null, filepath = null, originalError = null) {
    super(message, 500, 'FILE_ERROR', false, { operation, filepath });
    this.operation = operation;
    this.filepath = filepath;
    this.originalError = originalError;
  }

  getUserMessage() {
    switch (this.operation) {
      case 'upload':
        return 'Erreur lors du téléchargement du fichier.';
      case 'download':
        return 'Erreur lors du téléchargement du fichier.';
      case 'delete':
        return 'Erreur lors de la suppression du fichier.';
      default:
        return 'Erreur de fichier.';
    }
  }
}

/**
 * Business logic error
 */
class BusinessLogicError extends AppError {
  constructor(message, rule = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', false, { rule });
    this.rule = rule;
  }

  getUserMessage() {
    return `Erreur métier: ${this.message}`;
  }
}

/**
 * Timeout error
 */
class TimeoutError extends AppError {
  constructor(operation, timeout, service = null) {
    const message = `Operation "${operation}" timed out after ${timeout}ms${service ? ` for service ${service}` : ''}`;
    super(message, 408, 'TIMEOUT_ERROR', true, { operation, timeout, service });
    this.operation = operation;
    this.timeout = timeout;
    this.service = service;
  }

  getUserMessage() {
    return 'L\'opération a pris trop de temps. Veuillez réessayer.';
  }
}

/**
 * Error factory for creating appropriate error types
 */
class ErrorFactory {
  /**
   * Create error from HTTP response
   */
  static fromHTTPResponse(response, service = 'Unknown') {
    const { status, statusText, data } = response;
    
    switch (status) {
      case 400:
        return new ValidationError(data?.message || statusText);
      case 401:
        return new AuthenticationError(data?.message || statusText);
      case 403:
        return new AuthorizationError(data?.message || statusText);
      case 404:
        return new NotFoundError(service, data?.identifier);
      case 409:
        return new ConflictError(data?.message || statusText);
      case 429:
        return new RateLimitError(service, data?.retryAfter);
      case 500:
      case 502:
      case 503:
      case 504:
        return new APIServiceError(service, data?.message || statusText, null, true, status);
      default:
        return new APIServiceError(service, `HTTP ${status}: ${statusText}`, null, status >= 500, status);
    }
  }

  /**
   * Create error from database operation
   */
  static fromDatabaseError(error, operation = null, table = null) {
    // Handle Prisma-specific errors
    if (error.code) {
      switch (error.code) {
        case 'P2002':
          return new ConflictError('Unique constraint violation', table, error.meta?.target);
        case 'P2025':
          return new NotFoundError(table || 'Record');
        case 'P2003':
          return new ConflictError('Foreign key constraint violation', table);
        default:
          return new DatabaseError(error.message, operation, table, error);
      }
    }

    return new DatabaseError(error.message, operation, table, error);
  }

  /**
   * Create error from validation failure
   */
  static fromValidation(errors) {
    if (Array.isArray(errors) && errors.length > 0) {
      const firstError = errors[0];
      return new ValidationError(firstError.message, firstError.path, firstError.value);
    }
    
    if (typeof errors === 'object' && errors.message) {
      return new ValidationError(errors.message, errors.field, errors.value);
    }
    
    return new ValidationError('Validation failed');
  }
}

/**
 * Error handler middleware for Next.js API routes
 */
class ErrorHandler {
  /**
   * Handle error in API route
   */
  static handle(error, req, res) {
    // Convert unknown errors to AppError
    const appError = error instanceof AppError 
      ? error 
      : new AppError(error.message || 'Internal server error', 500, 'INTERNAL_ERROR');

    // Log error if needed
    if (appError.shouldLog()) {
      console.error('API Error:', {
        error: appError.toJSON(),
        url: req.url,
        method: req.method,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
    }

    // Send appropriate response
    res.status(appError.statusCode).json({
      success: false,
      error: {
        message: appError.getUserMessage(),
        code: appError.code,
        ...(process.env.NODE_ENV === 'development' && {
          details: appError.message,
          stack: appError.stack
        })
      },
      timestamp: appError.timestamp,
      ...(appError.retryable && { retryable: true })
    });
  }

  /**
   * Async error wrapper for API routes
   */
  static wrap(handler) {
    return async (req, res) => {
      try {
        await handler(req, res);
      } catch (error) {
        ErrorHandler.handle(error, req, res);
      }
    };
  }
}

/**
 * Client-side error utilities
 */
class ClientErrorUtils {
  /**
   * Check if error is retryable
   */
  static isRetryable(error) {
    return error?.retryable === true || 
           error?.code === 'NETWORK_ERROR' ||
           error?.code === 'TIMEOUT_ERROR' ||
           (error?.statusCode >= 500 && error?.statusCode < 600);
  }

  /**
   * Get retry delay with exponential backoff
   */
  static getRetryDelay(attempt, baseDelay = 1000, maxDelay = 30000) {
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Format error for user display
   */
  static formatForUser(error) {
    if (error?.getUserMessage && typeof error.getUserMessage === 'function') {
      return error.getUserMessage();
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return 'Une erreur inattendue s\'est produite.';
  }
}

// Export all error classes and utilities
module.exports = {
  // Base error class
  AppError,
  
  // Specific error types
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  APIServiceError,
  RateLimitError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  FileError,
  BusinessLogicError,
  TimeoutError,
  
  // Utilities
  ErrorFactory,
  ErrorHandler,
  ClientErrorUtils
};

// ES module exports for frontend
if (typeof window !== 'undefined') {
  window.ErrorClasses = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    APIServiceError,
    RateLimitError,
    NotFoundError,
    ConflictError,
    DatabaseError,
    FileError,
    BusinessLogicError,
    TimeoutError,
    ErrorFactory,
    ClientErrorUtils
  };
}
