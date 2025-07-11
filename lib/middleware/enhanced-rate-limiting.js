// lib/middleware/enhanced-rate-limiting.js - Advanced Rate Limiting System
//==============================================================================

import { cacheService } from '../cache/redis-client'
import logger from '../logger'

/**
 * Enhanced rate limiting with:
 * - Burst handling
 * - Adaptive limits
 * - User-based limits
 * - Circuit breaker pattern
 * - Real-time analytics
 */

class EnhancedRateLimiter {
  constructor(options = {}) {
    this.options = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      burstMax: 150, // Allow bursts up to 150 requests
      burstWindowMs: 60 * 1000, // 1 minute burst window
      adaptiveScaling: true,
      circuitBreakerThreshold: 10, // failures before circuit opens
      circuitBreakerTimeout: 30 * 1000, // 30 seconds
      ...options
    }
    
    // In-memory stores (use Redis in production)
    this.store = new Map()
    this.burstStore = new Map()
    this.failureStore = new Map()
    this.circuitBreakers = new Map()
    this.analytics = new Map()
    
    // Start cleanup interval
    this.startCleanup()
  }

  /**
   * Main rate limiting method
   */
  async checkLimit(key, userLevel = 'default') {
    const now = Date.now()
    
    // Check circuit breaker
    if (this.isCircuitOpen(key)) {
      return {
        allowed: false,
        reason: 'circuit_breaker',
        retryAfter: this.getCircuitRetryAfter(key)
      }
    }

    // Get adaptive limits for user level
    const limits = this.getAdaptiveLimits(key, userLevel)
    
    // Check burst limits first
    const burstCheck = await this.checkBurstLimit(key, limits, now)
    if (!burstCheck.allowed) {
      this.recordFailure(key)
      return burstCheck
    }

    // Check main window limits
    const mainCheck = await this.checkMainLimit(key, limits, now)
    if (!mainCheck.allowed) {
      this.recordFailure(key)
      return mainCheck
    }

    // Record successful request
    this.recordSuccess(key)
    this.updateAnalytics(key, userLevel)
    
    return {
      allowed: true,
      remaining: mainCheck.remaining,
      resetTime: mainCheck.resetTime,
      burstRemaining: burstCheck.remaining
    }
  }

  /**
   * Check burst limits (short-term high volume)
   */
  async checkBurstLimit(key, limits, now) {
    const burstKey = `burst:${key}`
    const record = this.burstStore.get(burstKey) || {
      count: 0,
      resetTime: now + limits.burstWindowMs
    }

    // Reset if window expired
    if (now > record.resetTime) {
      record.count = 0
      record.resetTime = now + limits.burstWindowMs
    }

    // Check if burst limit exceeded
    if (record.count >= limits.burstMax) {
      return {
        allowed: false,
        reason: 'burst_limit',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
        remaining: 0
      }
    }

    // Update burst counter
    record.count++
    this.burstStore.set(burstKey, record)

    return {
      allowed: true,
      remaining: limits.burstMax - record.count,
      resetTime: record.resetTime
    }
  }

  /**
   * Check main window limits
   */
  async checkMainLimit(key, limits, now) {
    const record = this.store.get(key) || {
      count: 0,
      resetTime: now + limits.windowMs
    }

    // Reset if window expired
    if (now > record.resetTime) {
      record.count = 0
      record.resetTime = now + limits.windowMs
    }

    // Check if main limit exceeded
    if (record.count >= limits.max) {
      return {
        allowed: false,
        reason: 'rate_limit',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
        remaining: 0
      }
    }

    // Update main counter
    record.count++
    this.store.set(key, record)

    return {
      allowed: true,
      remaining: limits.max - record.count,
      resetTime: record.resetTime
    }
  }

  /**
   * Get adaptive limits based on user level and historical data
   */
  getAdaptiveLimits(key, userLevel) {
    const baseLimits = {
      default: { max: 100, burstMax: 150, windowMs: 15 * 60 * 1000, burstWindowMs: 60 * 1000 },
      premium: { max: 500, burstMax: 750, windowMs: 15 * 60 * 1000, burstWindowMs: 60 * 1000 },
      enterprise: { max: 2000, burstMax: 3000, windowMs: 15 * 60 * 1000, burstWindowMs: 60 * 1000 }
    }

    let limits = baseLimits[userLevel] || baseLimits.default

    // Apply adaptive scaling if enabled
    if (this.options.adaptiveScaling) {
      const analytics = this.analytics.get(key)
      if (analytics) {
        const avgLoad = analytics.totalRequests / analytics.timeWindows
        const errorRate = analytics.errors / analytics.totalRequests

        // Scale up for consistent low-error usage
        if (errorRate < 0.01 && avgLoad > limits.max * 0.8) {
          limits.max = Math.min(limits.max * 1.5, limits.max * 3)
          limits.burstMax = Math.min(limits.burstMax * 1.5, limits.burstMax * 3)
        }
        
        // Scale down for high error rates
        if (errorRate > 0.1) {
          limits.max = Math.max(limits.max * 0.7, 10)
          limits.burstMax = Math.max(limits.burstMax * 0.7, 15)
        }
      }
    }

    return limits
  }

  /**
   * Circuit breaker implementation
   */
  isCircuitOpen(key) {
    const circuit = this.circuitBreakers.get(key)
    if (!circuit) return false

    const now = Date.now()
    
    // Check if circuit should be closed (timeout expired)
    if (circuit.state === 'open' && now > circuit.resetTime) {
      circuit.state = 'half-open'
      circuit.failures = 0
      this.circuitBreakers.set(key, circuit)
      return false
    }

    return circuit.state === 'open'
  }

  /**
   * Record failure for circuit breaker
   */
  recordFailure(key) {
    const circuit = this.circuitBreakers.get(key) || {
      failures: 0,
      state: 'closed',
      resetTime: 0
    }

    circuit.failures++
    
    // Open circuit if failure threshold reached
    if (circuit.failures >= this.options.circuitBreakerThreshold) {
      circuit.state = 'open'
      circuit.resetTime = Date.now() + this.options.circuitBreakerTimeout
      
      logger.warn('Circuit breaker opened', { key, failures: circuit.failures })
    }

    this.circuitBreakers.set(key, circuit)
  }

  /**
   * Record success for circuit breaker
   */
  recordSuccess(key) {
    const circuit = this.circuitBreakers.get(key)
    if (circuit) {
      if (circuit.state === 'half-open') {
        circuit.state = 'closed'
        circuit.failures = 0
        logger.info('Circuit breaker closed', { key })
      } else {
        circuit.failures = Math.max(0, circuit.failures - 1)
      }
      
      this.circuitBreakers.set(key, circuit)
    }
  }

  /**
   * Get circuit breaker retry after time
   */
  getCircuitRetryAfter(key) {
    const circuit = this.circuitBreakers.get(key)
    if (!circuit) return 0
    
    return Math.ceil((circuit.resetTime - Date.now()) / 1000)
  }

  /**
   * Update analytics for adaptive scaling
   */
  updateAnalytics(key, userLevel) {
    const analytics = this.analytics.get(key) || {
      totalRequests: 0,
      errors: 0,
      timeWindows: 1,
      userLevel,
      lastReset: Date.now()
    }

    analytics.totalRequests++
    
    // Reset analytics every hour
    const hoursSinceReset = (Date.now() - analytics.lastReset) / (60 * 60 * 1000)
    if (hoursSinceReset >= 1) {
      analytics.timeWindows++
      analytics.lastReset = Date.now()
    }

    this.analytics.set(key, analytics)
  }

  /**
   * Get current rate limit status
   */
  getStatus(key) {
    const now = Date.now()
    const record = this.store.get(key)
    const burstRecord = this.burstStore.get(`burst:${key}`)
    const circuit = this.circuitBreakers.get(key)
    const analytics = this.analytics.get(key)

    return {
      main: record ? {
        count: record.count,
        resetTime: record.resetTime,
        remaining: Math.max(0, this.options.max - record.count)
      } : null,
      burst: burstRecord ? {
        count: burstRecord.count,
        resetTime: burstRecord.resetTime,
        remaining: Math.max(0, this.options.burstMax - burstRecord.count)
      } : null,
      circuit: circuit ? {
        state: circuit.state,
        failures: circuit.failures,
        resetTime: circuit.resetTime
      } : null,
      analytics: analytics || null
    }
  }

  /**
   * Get overall system analytics
   */
  getSystemAnalytics() {
    const stats = {
      totalKeys: this.store.size,
      activeCircuits: Array.from(this.circuitBreakers.values()).filter(c => c.state !== 'closed').length,
      topUsers: Array.from(this.analytics.entries())
        .sort(([,a], [,b]) => b.totalRequests - a.totalRequests)
        .slice(0, 10)
        .map(([key, data]) => ({ key, ...data }))
    }

    return stats
  }

  /**
   * Start cleanup process for expired entries
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now()
      
      // Clean up main store
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetTime) {
          this.store.delete(key)
        }
      }

      // Clean up burst store
      for (const [key, record] of this.burstStore.entries()) {
        if (now > record.resetTime) {
          this.burstStore.delete(key)
        }
      }

      // Clean up circuit breakers
      for (const [key, circuit] of this.circuitBreakers.entries()) {
        if (circuit.state === 'closed' && circuit.failures === 0) {
          this.circuitBreakers.delete(key)
        }
      }

    }, 60 * 1000) // Every minute
  }

  /**
   * Reset limits for a specific key (admin function)
   */
  resetLimits(key) {
    this.store.delete(key)
    this.burstStore.delete(`burst:${key}`)
    this.circuitBreakers.delete(key)
    
    logger.info('Rate limits reset', { key })
  }

  /**
   * Whitelist a key (bypass rate limiting)
   */
  whitelist(key, duration = 60 * 60 * 1000) {
    const expiry = Date.now() + duration
    this.store.set(`whitelist:${key}`, { expiry })
    
    logger.info('Key whitelisted', { key, duration })
  }

  /**
   * Check if key is whitelisted
   */
  isWhitelisted(key) {
    const whitelist = this.store.get(`whitelist:${key}`)
    if (!whitelist) return false
    
    if (Date.now() > whitelist.expiry) {
      this.store.delete(`whitelist:${key}`)
      return false
    }
    
    return true
  }
}

// Create global instance
const enhancedLimiter = new EnhancedRateLimiter()

/**
 * Enhanced rate limiting middleware for Next.js
 */
export function withEnhancedRateLimit(options = {}) {
  const {
    keyGenerator = (req) => req.headers['x-forwarded-for'] || req.ip,
    userLevelDetector = () => 'default',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options

  return (handler) => {
    return async (req, res) => {
      const key = keyGenerator(req)
      const userLevel = userLevelDetector(req)
      
      // Check if whitelisted
      if (enhancedLimiter.isWhitelisted(key)) {
        return handler(req, res)
      }

      try {
        const result = await enhancedLimiter.checkLimit(key, userLevel)
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', result.remaining + (result.remaining > 0 ? 1 : 0))
        res.setHeader('X-RateLimit-Remaining', result.remaining || 0)
        res.setHeader('X-RateLimit-Reset', result.resetTime || Date.now())
        
        if (result.burstRemaining !== undefined) {
          res.setHeader('X-RateLimit-Burst-Remaining', result.burstRemaining)
        }
        
        if (!result.allowed) {
          logger.warn('Rate limit exceeded', { 
            key, 
            userLevel, 
            reason: result.reason,
            retryAfter: result.retryAfter 
          })
          
          res.setHeader('Retry-After', result.retryAfter)
          
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: getErrorMessage(result.reason),
            retryAfter: result.retryAfter
          })
        }

        // Execute handler
        const startTime = Date.now()
        const response = await handler(req, res)
        const duration = Date.now() - startTime
        
        // Update analytics based on response
        if (res.statusCode >= 400 && !skipFailedRequests) {
          enhancedLimiter.recordFailure(key)
        } else if (res.statusCode < 400 && !skipSuccessfulRequests) {
          enhancedLimiter.recordSuccess(key)
        }
        
        return response
        
      } catch (error) {
        logger.error('Enhanced rate limiter error', { 
          key, 
          userLevel, 
          error: error.message 
        })
        
        // Fall back to allowing request on error
        return handler(req, res)
      }
    }
  }
}

/**
 * Get error message based on reason
 */
function getErrorMessage(reason) {
  switch (reason) {
    case 'burst_limit':
      return 'Too many requests in short time period. Please slow down.'
    case 'rate_limit':
      return 'Rate limit exceeded. Please try again later.'
    case 'circuit_breaker':
      return 'Service temporarily unavailable. Please try again later.'
    default:
      return 'Request limit exceeded.'
  }
}

/**
 * Admin endpoint to get rate limiting statistics
 */
export async function getRateLimitStats() {
  return {
    system: enhancedLimiter.getSystemAnalytics(),
    timestamp: new Date().toISOString()
  }
}

/**
 * Admin endpoint to reset rate limits for a key
 */
export async function resetRateLimit(key) {
  enhancedLimiter.resetLimits(key)
  return { success: true, message: `Rate limits reset for ${key}` }
}

/**
 * Admin endpoint to whitelist a key
 */
export async function whitelistKey(key, duration) {
  enhancedLimiter.whitelist(key, duration)
  return { success: true, message: `Key ${key} whitelisted` }
}

// Export the limiter instance for direct use
export { enhancedLimiter }