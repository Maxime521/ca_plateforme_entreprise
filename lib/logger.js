// lib/logger.js - Comprehensive logging utility
const fs = require('fs')
const path = require('path')

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
}

// Current log level based on environment
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG')

class Logger {
  constructor() {
    this.logLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.INFO
    this.ensureLogDirectory()
  }

  ensureLogDirectory() {
    const logDir = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
      // Add request context if available
      ...(meta.req && {
        request: {
          method: meta.req.method,
          url: meta.req.url,
          ip: meta.req.headers['x-forwarded-for'] || meta.req.connection?.remoteAddress,
          userAgent: meta.req.headers['user-agent'],
        }
      }),
      // Add error details if present
      ...(meta.error && {
        error: {
          name: meta.error.name,
          message: meta.error.message,
          stack: meta.error.stack,
        }
      }),
    }

    return JSON.stringify(logEntry)
  }

  writeToFile(level, formattedMessage) {
    if (process.env.NODE_ENV === 'production') {
      const logFile = path.join(process.cwd(), 'logs', `${level.toLowerCase()}.log`)
      const allLogFile = path.join(process.cwd(), 'logs', 'all.log')
      
      // Write to level-specific log
      fs.appendFileSync(logFile, formattedMessage + '\n')
      // Write to combined log
      fs.appendFileSync(allLogFile, formattedMessage + '\n')
    }
  }

  log(level, message, meta = {}) {
    const levelValue = LOG_LEVELS[level]
    if (levelValue <= this.logLevel) {
      const formattedMessage = this.formatMessage(level, message, meta)
      
      // Console output with colors
      this.writeToConsole(level, message, meta)
      
      // File output (production only)
      this.writeToFile(level, formattedMessage)
      
      // Send to external services if configured
      this.sendToExternalServices(level, formattedMessage, meta)
    }
  }

  writeToConsole(level, message, meta) {
    const timestamp = new Date().toISOString()
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m', // White
    }
    const reset = '\x1b[0m'
    
    const prefix = `${colors[level]}[${timestamp}] ${level}${reset}`
    
    if (meta.error) {
      console.error(`${prefix}: ${message}`, meta.error)
    } else if (Object.keys(meta).length > 0) {
      console.log(`${prefix}: ${message}`, meta)
    } else {
      console.log(`${prefix}: ${message}`)
    }
  }

  sendToExternalServices(level, formattedMessage, meta) {
    // Send critical errors to external monitoring
    if (level === 'ERROR' && process.env.WEBHOOK_URL) {
      this.sendToWebhook(formattedMessage, meta)
    }
    
    // Send metrics to analytics
    if (meta.metrics && process.env.ANALYTICS_ENDPOINT) {
      this.sendMetrics(meta.metrics)
    }
  }

  async sendToWebhook(message, meta) {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch(process.env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Error in ${process.env.APP_NAME || 'Enterprise Data Platform'}`,
            attachments: [{
              color: 'danger',
              fields: [{
                title: 'Error Details',
                value: message,
                short: false
              }]
            }]
          })
        })
      }
    } catch (error) {
      console.error('Failed to send webhook:', error)
    }
  }

  async sendMetrics(metrics) {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch(process.env.ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics,
            timestamp: new Date().toISOString(),
            app: process.env.APP_NAME || 'enterprise-data-platform'
          })
        })
      }
    } catch (error) {
      console.error('Failed to send metrics:', error)
    }
  }

  // Convenience methods
  error(message, meta = {}) {
    this.log('ERROR', message, meta)
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta)
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta)
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta)
  }

  // API request logging
  apiRequest(req, res, duration) {
    this.info('API Request', {
      req,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      metrics: {
        type: 'api_request',
        method: req.method,
        endpoint: req.url,
        status: res.statusCode,
        duration,
      }
    })
  }

  // User activity logging
  userActivity(userId, action, details = {}) {
    this.info('User Activity', {
      userId,
      action,
      details,
      metrics: {
        type: 'user_activity',
        userId,
        action,
      }
    })
  }

  // Database operation logging
  dbOperation(operation, table, duration, error = null) {
    if (error) {
      this.error('Database Error', {
        operation,
        table,
        duration: `${duration}ms`,
        error,
        metrics: {
          type: 'db_error',
          operation,
          table,
          duration,
        }
      })
    } else {
      this.debug('Database Operation', {
        operation,
        table,
        duration: `${duration}ms`,
        metrics: {
          type: 'db_operation',
          operation,
          table,
          duration,
        }
      })
    }
  }

  // Performance monitoring
  performance(metric, value, tags = {}) {
    this.info('Performance Metric', {
      metric,
      value,
      tags,
      metrics: {
        type: 'performance',
        metric,
        value,
        tags,
      }
    })
  }

  // Security events
  security(event, details = {}) {
    this.warn('Security Event', {
      event,
      details,
      metrics: {
        type: 'security',
        event,
      }
    })
  }
}

// Create singleton instance
const logger = new Logger()

module.exports = logger