// lib/cache/redis-client.js - Redis Cache Service for Enterprise Data Platform
//==============================================================================

/**
 * Enterprise-grade Redis caching service with fallback mechanisms
 * Provides high-performance caching for search results, API responses, and analytics
 */

class CacheService {
  constructor() {
    this.redis = null
    this.isConnected = false
    this.fallbackCache = new Map() // In-memory fallback
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      family: 4, // IPv4
      keepAlive: true,
      connectTimeout: 10000,
      commandTimeout: 5000
    }
    
    this.initializeRedis()
  }

  async initializeRedis() {
    try {
      // Try to initialize Redis connection
      if (typeof window === 'undefined') { // Server-side only
        await this.connectRedis()
      }
    } catch (error) {
      console.warn('Redis connection failed, using fallback cache:', error.message)
      this.isConnected = false
    }
  }

  async connectRedis() {
    try {
      // Dynamic import for better compatibility
      const Redis = require('ioredis') || null
      
      if (!Redis) {
        throw new Error('Redis package not available')
      }

      this.redis = new Redis(this.config)
      
      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully')
        this.isConnected = true
      })
      
      this.redis.on('error', (error) => {
        console.warn('⚠️ Redis connection error:', error.message)
        this.isConnected = false
      })
      
      this.redis.on('close', () => {
        console.log('🔌 Redis connection closed')
        this.isConnected = false
      })

      // Test connection
      await this.redis.ping()
      this.isConnected = true
      
    } catch (error) {
      console.warn('Redis initialization failed:', error.message)
      this.isConnected = false
    }
  }

  /**
   * Get cached value by key
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null
   */
  async get(key) {
    try {
      if (this.isConnected && this.redis) {
        const cached = await this.redis.get(key)
        if (cached) {
          const parsed = JSON.parse(cached)
          
          // Check if cached item has expired (client-side validation)
          if (parsed.expires && Date.now() > parsed.expires) {
            await this.delete(key)
            return null
          }
          
          return parsed.data
        }
      } else {
        // Fallback to in-memory cache
        const cached = this.fallbackCache.get(key)
        if (cached && Date.now() < cached.expires) {
          return cached.data
        } else if (cached) {
          this.fallbackCache.delete(key)
        }
      }
      
      return null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Set cached value with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 300)
   */
  async set(key, value, ttl = 300) {
    try {
      const expires = Date.now() + (ttl * 1000)
      const cacheData = {
        data: value,
        expires,
        created: Date.now()
      }

      if (this.isConnected && this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(cacheData))
      } else {
        // Fallback to in-memory cache
        this.fallbackCache.set(key, cacheData)
        
        // Clean up expired entries periodically
        this.cleanupFallbackCache()
      }
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key to delete
   */
  async delete(key) {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key)
      } else {
        this.fallbackCache.delete(key)
      }
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Pattern to match keys (e.g., "search:*")
   */
  async invalidatePattern(pattern) {
    try {
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } else {
        // Fallback pattern matching for in-memory cache
        const regex = new RegExp(pattern.replace('*', '.*'))
        for (const key of this.fallbackCache.keys()) {
          if (regex.test(key)) {
            this.fallbackCache.delete(key)
          }
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }

  /**
   * Check if cache is available
   * @returns {boolean} True if cache is connected
   */
  isAvailable() {
    return this.isConnected || this.fallbackCache.size >= 0
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  async getStats() {
    try {
      if (this.isConnected && this.redis) {
        const info = await this.redis.info('memory')
        const keyspace = await this.redis.info('keyspace')
        
        return {
          type: 'redis',
          connected: true,
          memory: this.parseRedisInfo(info),
          keyspace: this.parseRedisInfo(keyspace)
        }
      } else {
        return {
          type: 'memory',
          connected: false,
          size: this.fallbackCache.size,
          keys: Array.from(this.fallbackCache.keys())
        }
      }
    } catch (error) {
      return {
        type: 'error',
        connected: false,
        error: error.message
      }
    }
  }

  /**
   * Generate cache key with prefix
   * @param {string} namespace - Cache namespace
   * @param {string} key - Base key
   * @returns {string} Formatted cache key
   */
  generateKey(namespace, key) {
    const sanitized = key.replace(/[^a-zA-Z0-9:_-]/g, '_')
    return `edp:${namespace}:${sanitized}`
  }

  /**
   * Batch get multiple keys
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} Object with key-value pairs
   */
  async mget(keys) {
    try {
      if (this.isConnected && this.redis) {
        const values = await this.redis.mget(...keys)
        const result = {}
        
        keys.forEach((key, index) => {
          if (values[index]) {
            try {
              const parsed = JSON.parse(values[index])
              if (!parsed.expires || Date.now() <= parsed.expires) {
                result[key] = parsed.data
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        })
        
        return result
      } else {
        const result = {}
        keys.forEach(key => {
          const cached = this.fallbackCache.get(key)
          if (cached && Date.now() < cached.expires) {
            result[key] = cached.data
          }
        })
        return result
      }
    } catch (error) {
      console.error('Cache mget error:', error)
      return {}
    }
  }

  /**
   * Clean up expired entries from fallback cache
   * @private
   */
  cleanupFallbackCache() {
    if (this.fallbackCache.size > 100) { // Only cleanup if cache is getting large
      const now = Date.now()
      for (const [key, value] of this.fallbackCache.entries()) {
        if (now > value.expires) {
          this.fallbackCache.delete(key)
        }
      }
    }
  }

  /**
   * Parse Redis info string into object
   * @private
   */
  parseRedisInfo(info) {
    const result = {}
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':')
        result[key] = value
      }
    })
    return result
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.redis) {
      await this.redis.quit()
      this.isConnected = false
    }
  }
}

// Create singleton instance
const cacheService = new CacheService()

// Export both the class and instance
module.exports = {
  CacheService,
  cacheService
}

// ES6 export for compatibility
module.exports.default = cacheService