// lib/utils/errorHandler.js - Centralized error handling utilities
import { toast } from 'react-hot-toast';

// API Error types
export const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  SERVER: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Centralized error classification
export const classifyError = (error) => {
  // Network errors
  if (!error.response && error.request) {
    return {
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.HIGH,
      userMessage: 'Problème de connexion réseau. Vérifiez votre connexion.',
      technicalMessage: error.message
    };
  }

  // HTTP response errors
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.message;

    switch (status) {
      case 400:
        return {
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.LOW,
          userMessage: message || 'Données invalides. Vérifiez votre saisie.',
          technicalMessage: error.response.data?.errors || message
        };

      case 401:
        return {
          type: ERROR_TYPES.AUTH,
          severity: ERROR_SEVERITY.MEDIUM,
          userMessage: 'Session expirée. Veuillez vous reconnecter.',
          technicalMessage: message
        };

      case 403:
        return {
          type: ERROR_TYPES.AUTH,
          severity: ERROR_SEVERITY.MEDIUM,
          userMessage: 'Accès non autorisé.',
          technicalMessage: message
        };

      case 404:
        return {
          type: ERROR_TYPES.NOT_FOUND,
          severity: ERROR_SEVERITY.LOW,
          userMessage: 'Ressource non trouvée.',
          technicalMessage: message
        };

      case 429:
        return {
          type: ERROR_TYPES.RATE_LIMIT,
          severity: ERROR_SEVERITY.MEDIUM,
          userMessage: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
          technicalMessage: message
        };

      case 408:
        return {
          type: ERROR_TYPES.TIMEOUT,
          severity: ERROR_SEVERITY.MEDIUM,
          userMessage: 'Délai d\'attente dépassé. Veuillez réessayer.',
          technicalMessage: message
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: ERROR_TYPES.SERVER,
          severity: ERROR_SEVERITY.HIGH,
          userMessage: 'Erreur serveur temporaire. Veuillez réessayer dans quelques minutes.',
          technicalMessage: message
        };

      default:
        return {
          type: ERROR_TYPES.SERVER,
          severity: ERROR_SEVERITY.MEDIUM,
          userMessage: message || 'Une erreur inattendue s\'est produite.',
          technicalMessage: message
        };
    }
  }

  // Generic JavaScript errors
  return {
    type: ERROR_TYPES.SERVER,
    severity: ERROR_SEVERITY.MEDIUM,
    userMessage: 'Une erreur inattendue s\'est produite.',
    technicalMessage: error.message || 'Unknown error'
  };
};

// Centralized error handler
export const handleError = (error, context = '', options = {}) => {
  const {
    showToast = true,
    logToConsole = true,
    logToService = process.env.NODE_ENV === 'production'
  } = options;

  const errorInfo = classifyError(error);
  
  // Log to console in development
  if (logToConsole && process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error in ${context}`);
    console.error('Type:', errorInfo.type);
    console.error('Severity:', errorInfo.severity);
    console.error('User Message:', errorInfo.userMessage);
    console.error('Technical:', errorInfo.technicalMessage);
    console.error('Original Error:', error);
    console.groupEnd();
  }

  // Log to external service in production
  if (logToService) {
    // Example: Send to Sentry, LogRocket, etc.
    console.error('Production error logged:', {
      context,
      type: errorInfo.type,
      severity: errorInfo.severity,
      message: errorInfo.technicalMessage,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    });
  }

  // Show user-friendly toast notification
  if (showToast && typeof window !== 'undefined') {
    const toastOptions = {
      duration: errorInfo.severity === ERROR_SEVERITY.LOW ? 3000 : 5000,
      style: {
        background: errorInfo.severity === ERROR_SEVERITY.CRITICAL ? '#dc2626' : '#f59e0b',
        color: 'white'
      }
    };

    toast.error(errorInfo.userMessage, toastOptions);
  }

  return errorInfo;
};

// Specialized error handlers for different contexts
export const handleAPIError = (error, apiName = 'API') => {
  return handleError(error, `${apiName} Request`, {
    showToast: true,
    logToConsole: true
  });
};

export const handleAuthError = (error) => {
  const errorInfo = handleError(error, 'Authentication', {
    showToast: true,
    logToConsole: true
  });

  // Additional auth-specific handling
  if (errorInfo.type === ERROR_TYPES.AUTH) {
    // Could trigger logout or redirect
    // Example: store.dispatch(logout());
  }

  return errorInfo;
};

export const handleSearchError = (error, query = '') => {
  return handleError(error, `Search: "${query}"`, {
    showToast: true,
    logToConsole: true
  });
};

// Error boundary error handler
export const handleComponentError = (error, componentName, errorInfo) => {
  const context = `Component: ${componentName}`;
  
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Component Error: ${componentName}`);
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo?.componentStack);
    console.groupEnd();
  }

  return handleError(error, context, {
    showToast: false, // Error boundaries handle their own UI
    logToConsole: true,
    logToService: true
  });
};

// Utility to create error objects
export const createError = (type, message, statusCode = 500) => {
  const error = new Error(message);
  error.type = type;
  error.statusCode = statusCode;
  return error;
};

// Retry utility with exponential backoff
export const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Error reporting utility
export const reportError = (error, context = '', metadata = {}) => {
  const errorReport = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    metadata: {
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userId: metadata.userId || 'anonymous',
      sessionId: metadata.sessionId,
      ...metadata
    }
  };

  // In production, send to error reporting service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external service
    console.error('Error Report:', errorReport);
  }

  return errorReport;
};