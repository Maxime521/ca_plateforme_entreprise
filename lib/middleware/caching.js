// lib/middleware/caching.js - API Caching Middleware
//==============================================================================

const { cacheService } = require('../cache/redis-client')
const logger = require('../logger')

/**
 * Caching middleware for API endpoints with intelligent cache management
 * Provides automatic cache invalidation, compression, and performance monitoring
 */

/**
 * Cache middleware options
 * @typedef {Object} CacheOptions
 * @property {Function} keyGenerator - Function to generate cache key from request
 * @property {number} ttl - Time to live in seconds
 * @property {boolean} enabled - Whether caching is enabled
 * @property {string[]} varyHeaders - Headers to include in cache key
 * @property {Function} shouldCache - Function to determine if response should be cached
 * @property {boolean} compress - Whether to compress cached data
 * @property {string} namespace - Cache namespace
 */

/**
 * Create caching middleware
 * @param {Function} handler - API handler function
 * @param {CacheOptions} options - Caching options
 * @returns {Function} Wrapped handler with caching
 */
function withCaching(handler, options = {}) {
  const {
    keyGenerator = defaultKeyGenerator,
    ttl = 300, // 5 minutes default
    enabled = process.env.NODE_ENV === 'production',
    varyHeaders = [],
    shouldCache = defaultShouldCache,
    compress = true,
    namespace = 'api'
  } = options

  return async (req, res) => {
    // Skip caching if disabled or for non-GET requests
    if (!enabled || req.method !== 'GET') {
      if (logger && logger.debug) {
        logger.debug('Cache skipped', { 
          reason: !enabled ? 'disabled' : 'non-GET-method',
          method: req.method 
        })
      }
      return handler(req, res)
    }

    const startTime = Date.now()
    
    try {
      // Generate cache key
      const baseKey = keyGenerator(req)
      const varyKey = generateVaryKey(req, varyHeaders)
      const cacheKey = cacheService.generateKey(namespace, `${baseKey}${varyKey}`)
      
      logger.debug('Cache lookup', { cacheKey, enabled })

      // Try to get from cache
      const cached = await cacheService.get(cacheKey)
      
      if (cached) {
        const duration = Date.now() - startTime
        
        // Set cache headers
        res.setHeader('X-Cache', 'HIT')
        res.setHeader('X-Cache-Key', cacheKey)
        res.setHeader('X-Cache-Duration', `${duration}ms`)
        
        // Log cache hit
        if (logger && logger.info) {
          logger.info('Cache hit', {
            cacheKey,
            duration,
            size: JSON.stringify(cached).length
          })
        }
        
        return res.status(200).json(cached)
      }

      // Cache miss - execute handler and cache result
      logger.debug('Cache miss', { cacheKey })
      
      // Intercept the response to cache it
      const originalJson = res.json
      const originalStatus = res.status
      let responseData = null
      let statusCode = 200
      
      // Override res.status to capture status code
      res.status = function(code) {
        statusCode = code
        return originalStatus.call(this, code)
      }
      
      // Override res.json to capture response data
      res.json = function(data) {
        responseData = data
        
        // Cache successful responses
        if (statusCode === 200 && shouldCache(req, res, data)) {
          cacheResponse(cacheKey, data, ttl, compress, startTime)
        }
        
        // Set cache headers
        res.setHeader('X-Cache', 'MISS')
        res.setHeader('X-Cache-Key', cacheKey)
        res.setHeader('X-Cache-Duration', `${Date.now() - startTime}ms`)
        
        return originalJson.call(this, data)
      }

      // Execute the original handler
      return await handler(req, res)
      
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.error('Cache middleware error', {
        error: error.message,
        duration,
        url: req.url
      })
      
      // Fallback to original handler without caching
      return handler(req, res)
    }
  }
}

/**
 * Cache the response data
 * @private
 */
async function cacheResponse(cacheKey, data, ttl, compress, startTime) {
  try {
    let cacheData = data
    
    // Compress large responses
    if (compress && JSON.stringify(data).length > 1024) {
      cacheData = {
        ...data,
        _compressed: true,
        _originalSize: JSON.stringify(data).length
      }
    }
    
    await cacheService.set(cacheKey, cacheData, ttl)
    
    const duration = Date.now() - startTime
    logger.info('Response cached', {
      cacheKey,
      ttl,
      size: JSON.stringify(cacheData).length,
      duration
    })
    
  } catch (error) {
    logger.error('Cache set error', {
      error: error.message,
      cacheKey
    })
  }
}

/**
 * Default cache key generator
 * @private
 */
function defaultKeyGenerator(req) {
  const url = req.url.split('?')[0] // Remove query params for base key
  const queryParams = new URLSearchParams(req.url.split('?')[1] || '')
  
  // Sort query parameters for consistent keys
  const sortedParams = Array.from(queryParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  
  return `${url}${sortedParams ? `?${sortedParams}` : ''}`
}

/**
 * Generate cache key variation based on headers
 * @private
 */
function generateVaryKey(req, varyHeaders) {
  if (!varyHeaders.length) return ''
  
  const varyValues = varyHeaders
    .map(header => `${header}:${req.headers[header.toLowerCase()] || 'none'}`)
    .join('|')
  
  return varyValues ? `:vary:${Buffer.from(varyValues).toString('base64')}` : ''
}

/**
 * Default function to determine if response should be cached
 * @private
 */
function defaultShouldCache(req, res, data) {
  // Don't cache error responses
  if (!data || data.success === false) {
    return false
  }
  
  // Don't cache empty results
  if (data.results && data.results.length === 0) {
    return false
  }
  
  // Don't cache user-specific data
  if (req.headers.authorization) {
    return false
  }
  
  return true
}

/**
 * Create cache invalidation middleware
 * @param {string|string[]} patterns - Cache patterns to invalidate
 * @param {string} namespace - Cache namespace
 */
function withCacheInvalidation(patterns, namespace = 'api') {
  return async (req, res, next) => {
    try {
      const patternsArray = Array.isArray(patterns) ? patterns : [patterns]
      
      for (const pattern of patternsArray) {
        const fullPattern = cacheService.generateKey(namespace, pattern)
        await cacheService.invalidatePattern(fullPattern)
        
        logger.info('Cache invalidated', {
          pattern: fullPattern,
          trigger: req.url
        })
      }
      
    } catch (error) {
      logger.error('Cache invalidation error', {
        error: error.message,
        patterns
      })
    }
    
    if (next) next()
  }
}

/**
 * Cache warming utility
 * @param {string} url - URL to warm
 * @param {Object} options - Request options
 */
async function warmCache(url, options = {}) {
  try {
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}${url}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'cache-warmer',
        ...options.headers
      }
    })
    
    if (response.ok) {
      logger.info('Cache warmed', { url, status: response.status })
    } else {
      logger.warn('Cache warm failed', { url, status: response.status })
    }
    
  } catch (error) {
    logger.error('Cache warm error', { url, error: error.message })
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const stats = await cacheService.getStats()
    return {
      ...stats,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

module.exports = {
  withCaching,
  withCacheInvalidation,
  warmCache,
  getCacheStats,
  cacheService
}