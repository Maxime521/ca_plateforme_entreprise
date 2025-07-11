// lib/middleware/logging.js - API logging middleware
import logger from '../logger'

// Generate unique request ID
function generateRequestId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// API logging middleware
export const withLogging = (handler) => {
  return async (req, res) => {
    const startTime = Date.now()
    const requestId = generateRequestId()
    
    // Add request ID to request object
    req.requestId = requestId
    
    // Log incoming request
    logger.info('Incoming Request', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      timestamp: new Date().toISOString(),
    })

    // Capture original res.json and res.status methods
    const originalJson = res.json
    const originalStatus = res.status
    const originalEnd = res.end

    let responseBody = null
    let statusCode = 200

    // Override res.json to capture response data
    res.json = function(data) {
      responseBody = data
      return originalJson.call(this, data)
    }

    // Override res.status to capture status code
    res.status = function(code) {
      statusCode = code
      return originalStatus.call(this, code)
    }

    // Override res.end to log when response is sent
    res.end = function(chunk, encoding) {
      const endTime = Date.now()
      const duration = endTime - startTime

      // Log response
      logger.apiRequest(req, { statusCode }, duration)

      // Log slow requests
      if (duration > 1000) {
        logger.warn('Slow Request', {
          requestId,
          method: req.method,
          url: req.url,
          duration: `${duration}ms`,
          status: statusCode,
        })
      }

      // Log errors
      if (statusCode >= 400) {
        const logLevel = statusCode >= 500 ? 'error' : 'warn'
        logger[logLevel]('Request Error', {
          requestId,
          method: req.method,
          url: req.url,
          status: statusCode,
          duration: `${duration}ms`,
          response: responseBody,
        })
      }

      return originalEnd.call(this, chunk, encoding)
    }

    try {
      // Execute the handler
      const result = await handler(req, res)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log unhandled errors
      logger.error('Unhandled API Error', {
        requestId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      })

      // Send error response if not already sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          requestId,
          ...(process.env.NODE_ENV === 'development' && { error: error.message })
        })
      }
    }
  }
}

// Rate limiting logging
export const logRateLimit = (req, res, next) => {
  const originalSend = res.send

  res.send = function(data) {
    if (res.statusCode === 429) {
      logger.warn('Rate Limit Exceeded', {
        requestId: req.requestId,
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
      })
    }
    return originalSend.call(this, data)
  }

  next()
}

// Security logging
export const logSecurityEvents = {
  invalidAuth: (req, reason) => {
    logger.security('Invalid Authentication', {
      requestId: req.requestId,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      method: req.method,
      url: req.url,
      reason,
      userAgent: req.headers['user-agent'],
    })
  },

  suspiciousActivity: (req, activity) => {
    logger.security('Suspicious Activity', {
      requestId: req.requestId,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      method: req.method,
      url: req.url,
      activity,
      userAgent: req.headers['user-agent'],
    })
  },

  sqlInjectionAttempt: (req, query) => {
    logger.security('SQL Injection Attempt', {
      requestId: req.requestId,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      method: req.method,
      url: req.url,
      suspiciousQuery: query,
      userAgent: req.headers['user-agent'],
    })
  }
}

// Database logging helper
export const withDatabaseLogging = (operation, table) => {
  return async (queryFn) => {
    const startTime = Date.now()
    
    try {
      const result = await queryFn()
      const duration = Date.now() - startTime
      
      logger.dbOperation(operation, table, duration)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.dbOperation(operation, table, duration, error)
      throw error
    }
  }
}

// Performance monitoring helper
export const measurePerformance = (metricName, tags = {}) => {
  const startTime = Date.now()
  
  return {
    end: () => {
      const duration = Date.now() - startTime
      logger.performance(metricName, duration, tags)
      return duration
    }
  }
}

export default {
  withLogging,
  logRateLimit,
  logSecurityEvents,
  withDatabaseLogging,
  measurePerformance,
}