// lib/middleware/request-optimization.js - Advanced Request Optimization
//==============================================================================

import { cacheService } from '../cache/redis-client'
import logger from '../logger'

/**
 * Advanced request optimization middleware with:
 * - Request deduplication
 * - Batch processing
 * - Cache warming
 * - Adaptive caching
 */

// In-memory request deduplication store
const pendingRequests = new Map()
const requestPatterns = new Map()

/**
 * Request deduplication middleware
 * Prevents duplicate requests from hitting the same endpoint simultaneously
 */
export function withRequestDeduplication(handler, options = {}) {
  const { 
    keyGenerator = (req) => `${req.method}:${req.url}`,
    timeout = 10000 // 10 seconds
  } = options

  return async (req, res) => {
    const requestKey = keyGenerator(req)
    
    // Check if similar request is already pending
    if (pendingRequests.has(requestKey)) {
      logger.info('Request deduplication - waiting for pending request', { requestKey })
      
      try {
        // Wait for the pending request to complete
        const result = await pendingRequests.get(requestKey)
        
        // Return the cached result
        if (result.success) {
          res.setHeader('X-Request-Dedupe', 'HIT')
          return res.status(200).json(result.data)
        } else {
          return res.status(result.status || 500).json(result.error)
        }
      } catch (error) {
        logger.error('Request deduplication error', { error: error.message, requestKey })
        // Fall through to execute original handler
      }
    }

    // Create a promise for this request
    const requestPromise = new Promise(async (resolve, reject) => {
      try {
        // Intercept the response to capture result
        const originalJson = res.json
        const originalStatus = res.status
        let responseData = null
        let statusCode = 200
        
        res.status = function(code) {
          statusCode = code
          return originalStatus.call(this, code)
        }
        
        res.json = function(data) {
          responseData = data
          resolve({ success: statusCode === 200, data, status: statusCode })
          return originalJson.call(this, data)
        }

        // Execute the original handler
        await handler(req, res)
        
        // Timeout fallback
        setTimeout(() => {
          if (!responseData) {
            reject(new Error('Request timeout'))
          }
        }, timeout)
        
      } catch (error) {
        resolve({ success: false, error: { message: error.message }, status: 500 })
      }
    })

    // Store the pending request
    pendingRequests.set(requestKey, requestPromise)
    
    // Clean up after completion
    requestPromise.finally(() => {
      pendingRequests.delete(requestKey)
    })

    return requestPromise
  }
}

/**
 * Batch request processing for multiple similar requests
 */
export function withBatchProcessing(handler, options = {}) {
  const {
    batchSize = 5,
    batchTimeout = 100, // 100ms
    keyExtractor = (req) => req.query.q || req.body?.query
  } = options

  const batchQueues = new Map()
  
  return async (req, res) => {
    const batchKey = keyExtractor(req)
    
    if (!batchKey) {
      // No batch key, execute immediately
      return handler(req, res)
    }

    // Get or create batch queue
    let batch = batchQueues.get(batchKey)
    if (!batch) {
      batch = {
        requests: [],
        timeout: null,
        processing: false
      }
      batchQueues.set(batchKey, batch)
    }

    // Add request to batch
    return new Promise((resolve, reject) => {
      batch.requests.push({ req, res, resolve, reject })
      
      // Process batch if it's full
      if (batch.requests.length >= batchSize) {
        processBatch(batchKey, batch, handler)
      } else if (!batch.timeout) {
        // Set timeout to process batch
        batch.timeout = setTimeout(() => {
          processBatch(batchKey, batch, handler)
        }, batchTimeout)
      }
    })
  }
}

/**
 * Process a batch of requests
 * @private
 */
async function processBatch(batchKey, batch, handler) {
  if (batch.processing) return
  
  batch.processing = true
  
  if (batch.timeout) {
    clearTimeout(batch.timeout)
    batch.timeout = null
  }

  const requests = batch.requests.slice()
  batch.requests = []
  
  logger.info('Processing batch', { batchKey, requestCount: requests.length })
  
  // Process all requests in the batch
  const results = await Promise.allSettled(
    requests.map(async ({ req, res, resolve, reject }) => {
      try {
        const result = await handler(req, res)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })
  )

  // Clean up batch if empty
  if (batch.requests.length === 0) {
    batchQueues.delete(batchKey)
  } else {
    batch.processing = false
  }
}

/**
 * Cache warming middleware
 * Proactively warms cache for common requests
 */
export function withCacheWarming(handler, options = {}) {
  const {
    warmingPatterns = [],
    warmingInterval = 5 * 60 * 1000, // 5 minutes
    enabled = process.env.NODE_ENV === 'production'
  } = options

  // Start cache warming if enabled
  if (enabled && warmingPatterns.length > 0) {
    startCacheWarming(warmingPatterns, warmingInterval)
  }

  return async (req, res) => {
    // Track request patterns for adaptive warming
    trackRequestPattern(req)
    
    return handler(req, res)
  }
}

/**
 * Start cache warming process
 * @private
 */
function startCacheWarming(patterns, interval) {
  const warmCache = async () => {
    for (const pattern of patterns) {
      try {
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}${pattern}`, {
          method: 'GET',
          headers: { 'User-Agent': 'cache-warmer' }
        })
        
        if (response.ok) {
          logger.info('Cache warmed successfully', { pattern })
        } else {
          logger.warn('Cache warming failed', { pattern, status: response.status })
        }
      } catch (error) {
        logger.error('Cache warming error', { pattern, error: error.message })
      }
    }
  }

  // Initial warming
  warmCache()
  
  // Set up periodic warming
  setInterval(warmCache, interval)
}

/**
 * Track request patterns for adaptive caching
 * @private
 */
function trackRequestPattern(req) {
  const pattern = `${req.method}:${req.url.split('?')[0]}`
  const now = Date.now()
  const hour = Math.floor(now / (60 * 60 * 1000))
  
  const key = `${pattern}:${hour}`
  const current = requestPatterns.get(key) || { count: 0, lastSeen: now }
  
  requestPatterns.set(key, {
    count: current.count + 1,
    lastSeen: now
  })
  
  // Clean up old patterns (older than 24 hours)
  const cutoff = hour - 24
  for (const [patternKey] of requestPatterns.entries()) {
    const patternHour = parseInt(patternKey.split(':').pop())
    if (patternHour < cutoff) {
      requestPatterns.delete(patternKey)
    }
  }
}

/**
 * Adaptive caching middleware
 * Adjusts cache TTL based on request patterns
 */
export function withAdaptiveCaching(handler, options = {}) {
  const {
    baseTTL = 300, // 5 minutes
    minTTL = 60,   // 1 minute
    maxTTL = 3600  // 1 hour
  } = options

  return async (req, res) => {
    const pattern = `${req.method}:${req.url.split('?')[0]}`
    
    // Calculate adaptive TTL based on request frequency
    const ttl = calculateAdaptiveTTL(pattern, baseTTL, minTTL, maxTTL)
    
    // Add TTL to request for caching middleware
    req.adaptiveTTL = ttl
    
    return handler(req, res)
  }
}

/**
 * Calculate adaptive TTL based on request patterns
 * @private
 */
function calculateAdaptiveTTL(pattern, baseTTL, minTTL, maxTTL) {
  const now = Date.now()
  const hour = Math.floor(now / (60 * 60 * 1000))
  
  // Check request frequency in the last few hours
  let totalRequests = 0
  for (let i = 0; i < 6; i++) { // Look back 6 hours
    const key = `${pattern}:${hour - i}`
    const data = requestPatterns.get(key)
    if (data) {
      totalRequests += data.count
    }
  }
  
  // Adjust TTL based on request frequency
  if (totalRequests > 100) {
    // High frequency - longer cache
    return Math.min(maxTTL, baseTTL * 2)
  } else if (totalRequests > 10) {
    // Medium frequency - normal cache
    return baseTTL
  } else {
    // Low frequency - shorter cache
    return Math.max(minTTL, baseTTL / 2)
  }
}

/**
 * Request analytics and optimization insights
 */
export function getOptimizationInsights() {
  const insights = {
    pendingRequests: pendingRequests.size,
    requestPatterns: Array.from(requestPatterns.entries())
      .map(([key, data]) => ({ pattern: key, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20), // Top 20 patterns
    recommendations: []
  }

  // Generate recommendations
  const highFrequencyPatterns = insights.requestPatterns.filter(p => p.count > 50)
  if (highFrequencyPatterns.length > 0) {
    insights.recommendations.push({
      type: 'caching',
      message: `${highFrequencyPatterns.length} high-frequency endpoints could benefit from longer cache TTL`,
      patterns: highFrequencyPatterns.map(p => p.pattern)
    })
  }

  if (insights.pendingRequests > 10) {
    insights.recommendations.push({
      type: 'performance',
      message: 'High number of pending requests detected - consider scaling or optimization',
      count: insights.pendingRequests
    })
  }

  return insights
}

/**
 * Request prefetching middleware
 * Prefetches related data based on request patterns
 */
export function withRequestPrefetching(handler, options = {}) {
  const {
    prefetchRules = [],
    enabled = process.env.NODE_ENV === 'production'
  } = options

  return async (req, res) => {
    const result = await handler(req, res)
    
    // Trigger prefetching after successful response
    if (enabled && res.statusCode === 200) {
      triggerPrefetch(req, prefetchRules)
    }
    
    return result
  }
}

/**
 * Trigger prefetching based on rules
 * @private
 */
function triggerPrefetch(req, rules) {
  for (const rule of rules) {
    if (rule.condition(req)) {
      // Async prefetch - don't block the response
      setImmediate(async () => {
        try {
          const prefetchUrl = rule.generateUrl(req)
          logger.info('Prefetching data', { url: prefetchUrl })
          
          await fetch(`http://localhost:${process.env.PORT || 3000}${prefetchUrl}`, {
            method: 'GET',
            headers: { 'User-Agent': 'prefetcher' }
          })
        } catch (error) {
          logger.error('Prefetch error', { error: error.message })
        }
      })
    }
  }
}

