// lib/cache/redis-pool.js - Redis Connection Pool for High Performance
//==============================================================================

import logger from '../logger'

/**
 * Redis connection pool for high-performance caching
 * Provides connection pooling, health monitoring, and automatic failover
 */

class RedisConnectionPool {
  constructor(options = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '10'),
      minConnections: parseInt(process.env.REDIS_MIN_CONNECTIONS || '2'),
      acquireTimeout: parseInt(process.env.REDIS_ACQUIRE_TIMEOUT || '10000'),
      idleTimeout: parseInt(process.env.REDIS_IDLE_TIMEOUT || '30000'),
      healthCheckInterval: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL || '5000'),
      retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000'),
      ...options
    }

    this.pool = []
    this.activeConnections = new Set()
    this.availableConnections = new Set()
    this.waitingQueue = []
    this.healthStatus = new Map()
    this.isInitialized = false
    this.isShuttingDown = false
    
    // Performance metrics
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      acquiredConnections: 0,
      releasedConnections: 0,
      failedConnections: 0,
      timeouts: 0,
      avgResponseTime: 0,
      lastHealthCheck: null
    }

    this.initializePool()
  }

  /**
   * Initialize the connection pool
   */
  async initializePool() {
    try {
      logger.info('Initializing Redis connection pool', {
        host: this.config.host,
        port: this.config.port,
        maxConnections: this.config.maxConnections,
        minConnections: this.config.minConnections
      })

      // Create minimum number of connections
      for (let i = 0; i < this.config.minConnections; i++) {
        await this.createConnection()
      }

      // Start health check interval
      this.startHealthChecks()
      
      this.isInitialized = true
      logger.info('Redis connection pool initialized successfully')
      
    } catch (error) {
      logger.error('Failed to initialize Redis connection pool', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Create a new Redis connection
   */
  async createConnection() {
    try {
      const Redis = require('ioredis')
      
      const connection = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        family: 4
      })

      // Set up connection event handlers
      connection.on('connect', () => {
        logger.debug('Redis connection established', { id: connection.id })
      })

      connection.on('error', (error) => {
        logger.error('Redis connection error', { 
          id: connection.id, 
          error: error.message 
        })
        this.handleConnectionError(connection, error)
      })

      connection.on('close', () => {
        logger.debug('Redis connection closed', { id: connection.id })
        this.removeConnection(connection)
      })

      // Test connection
      await connection.ping()
      
      // Add to pool
      connection.id = `redis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      connection.createdAt = Date.now()
      connection.lastUsed = Date.now()
      connection.inUse = false
      
      this.pool.push(connection)
      this.availableConnections.add(connection)
      this.healthStatus.set(connection.id, { healthy: true, lastCheck: Date.now() })
      
      this.metrics.totalConnections++
      
      logger.debug('Redis connection created', { 
        id: connection.id,
        totalConnections: this.pool.length,
        available: this.availableConnections.size
      })
      
      return connection
      
    } catch (error) {
      this.metrics.failedConnections++
      logger.error('Failed to create Redis connection', { error: error.message })
      throw error
    }
  }

  /**
   * Acquire a connection from the pool
   */
  async acquireConnection(timeout = this.config.acquireTimeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      // Check if we have available connections
      if (this.availableConnections.size > 0) {
        const connection = this.getAvailableConnection()
        if (connection) {
          resolve(connection)
          return
        }
      }

      // If we can create more connections, do so
      if (this.pool.length < this.config.maxConnections) {
        this.createConnection()
          .then(connection => {
            const acquired = this.getAvailableConnection()
            resolve(acquired || connection)
          })
          .catch(reject)
        return
      }

      // Add to waiting queue
      const timeoutId = setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve)
        if (index !== -1) {
          this.waitingQueue.splice(index, 1)
        }
        this.metrics.timeouts++
        reject(new Error('Connection acquisition timeout'))
      }, timeout)

      this.waitingQueue.push({
        resolve,
        reject,
        timeoutId,
        startTime
      })
    })
  }

  /**
   * Get an available connection from the pool
   */
  getAvailableConnection() {
    for (const connection of this.availableConnections) {
      if (!connection.inUse && this.isConnectionHealthy(connection)) {
        connection.inUse = true
        connection.lastUsed = Date.now()
        
        this.availableConnections.delete(connection)
        this.activeConnections.add(connection)
        this.metrics.acquiredConnections++
        this.metrics.activeConnections = this.activeConnections.size
        
        return connection
      }
    }
    return null
  }

  /**
   * Release a connection back to the pool
   */
  async releaseConnection(connection) {
    if (!connection || !connection.id) {
      return
    }

    try {
      connection.inUse = false
      connection.lastUsed = Date.now()
      
      this.activeConnections.delete(connection)
      this.availableConnections.add(connection)
      this.metrics.releasedConnections++
      this.metrics.activeConnections = this.activeConnections.size
      
      // Process waiting queue
      if (this.waitingQueue.length > 0) {
        const waiting = this.waitingQueue.shift()
        clearTimeout(waiting.timeoutId)
        
        const availableConnection = this.getAvailableConnection()
        if (availableConnection) {
          waiting.resolve(availableConnection)
        } else {
          waiting.reject(new Error('No connection available'))
        }
      }
      
    } catch (error) {
      logger.error('Error releasing connection', { 
        connectionId: connection.id, 
        error: error.message 
      })
    }
  }

  /**
   * Execute a command using a pooled connection
   */
  async execute(command, ...args) {
    const startTime = Date.now()
    let connection = null
    
    try {
      connection = await this.acquireConnection()
      
      const result = await connection[command](...args)
      
      // Update metrics
      const duration = Date.now() - startTime
      this.updateResponseTimeMetrics(duration)
      
      return result
      
    } catch (error) {
      logger.error('Redis command execution error', {
        command,
        args: args.length > 0 ? args[0] : undefined,
        error: error.message
      })
      throw error
    } finally {
      if (connection) {
        await this.releaseConnection(connection)
      }
    }
  }

  /**
   * Execute a pipeline of commands
   */
  async pipeline(commands) {
    const startTime = Date.now()
    let connection = null
    
    try {
      connection = await this.acquireConnection()
      
      const pipeline = connection.pipeline()
      commands.forEach(([command, ...args]) => {
        pipeline[command](...args)
      })
      
      const results = await pipeline.exec()
      
      // Update metrics
      const duration = Date.now() - startTime
      this.updateResponseTimeMetrics(duration)
      
      return results
      
    } catch (error) {
      logger.error('Redis pipeline execution error', {
        commandCount: commands.length,
        error: error.message
      })
      throw error
    } finally {
      if (connection) {
        await this.releaseConnection(connection)
      }
    }
  }

  /**
   * Check if a connection is healthy
   */
  isConnectionHealthy(connection) {
    const status = this.healthStatus.get(connection.id)
    if (!status) return false
    
    const maxAge = 60 * 60 * 1000 // 1 hour
    const isOld = Date.now() - connection.createdAt > maxAge
    
    return status.healthy && !isOld
  }

  /**
   * Start health check interval
   */
  startHealthChecks() {
    setInterval(async () => {
      await this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }

  /**
   * Perform health check on all connections
   */
  async performHealthCheck() {
    const now = Date.now()
    const healthyConnections = []
    const unhealthyConnections = []
    
    for (const connection of this.pool) {
      try {
        if (!connection.inUse) {
          await connection.ping()
          this.healthStatus.set(connection.id, { healthy: true, lastCheck: now })
          healthyConnections.push(connection)
        }
      } catch (error) {
        logger.warn('Connection health check failed', {
          connectionId: connection.id,
          error: error.message
        })
        this.healthStatus.set(connection.id, { healthy: false, lastCheck: now })
        unhealthyConnections.push(connection)
      }
    }
    
    // Remove unhealthy connections
    for (const connection of unhealthyConnections) {
      this.removeConnection(connection)
    }
    
    // Ensure minimum connections
    while (this.pool.length < this.config.minConnections) {
      try {
        await this.createConnection()
      } catch (error) {
        logger.error('Failed to create connection during health check', {
          error: error.message
        })
        break
      }
    }
    
    this.metrics.lastHealthCheck = now
    
    logger.debug('Health check completed', {
      healthy: healthyConnections.length,
      unhealthy: unhealthyConnections.length,
      total: this.pool.length
    })
  }

  /**
   * Handle connection error
   */
  handleConnectionError(connection, error) {
    logger.error('Redis connection error', {
      connectionId: connection.id,
      error: error.message
    })
    
    this.healthStatus.set(connection.id, { healthy: false, lastCheck: Date.now() })
    
    // Remove from active connections if needed
    this.activeConnections.delete(connection)
    this.availableConnections.delete(connection)
  }

  /**
   * Remove a connection from the pool
   */
  removeConnection(connection) {
    const index = this.pool.findIndex(c => c.id === connection.id)
    if (index !== -1) {
      this.pool.splice(index, 1)
      this.activeConnections.delete(connection)
      this.availableConnections.delete(connection)
      this.healthStatus.delete(connection.id)
      
      try {
        connection.disconnect()
      } catch (error) {
        logger.error('Error disconnecting connection', {
          connectionId: connection.id,
          error: error.message
        })
      }
    }
  }

  /**
   * Update response time metrics
   */
  updateResponseTimeMetrics(duration) {
    const currentAvg = this.metrics.avgResponseTime
    const count = this.metrics.acquiredConnections
    
    this.metrics.avgResponseTime = (currentAvg * (count - 1) + duration) / count
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      pool: {
        total: this.pool.length,
        active: this.activeConnections.size,
        available: this.availableConnections.size,
        waiting: this.waitingQueue.length,
        healthy: Array.from(this.healthStatus.values()).filter(s => s.healthy).length
      },
      metrics: {
        ...this.metrics,
        activeConnections: this.activeConnections.size
      },
      config: {
        maxConnections: this.config.maxConnections,
        minConnections: this.config.minConnections,
        acquireTimeout: this.config.acquireTimeout,
        idleTimeout: this.config.idleTimeout
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down Redis connection pool')
    
    this.isShuttingDown = true
    
    // Clear waiting queue
    this.waitingQueue.forEach(item => {
      clearTimeout(item.timeoutId)
      item.reject(new Error('Connection pool is shutting down'))
    })
    this.waitingQueue = []
    
    // Close all connections
    const closePromises = this.pool.map(async (connection) => {
      try {
        await connection.quit()
      } catch (error) {
        logger.error('Error closing connection during shutdown', {
          connectionId: connection.id,
          error: error.message
        })
      }
    })
    
    await Promise.all(closePromises)
    
    this.pool = []
    this.activeConnections.clear()
    this.availableConnections.clear()
    this.healthStatus.clear()
    
    logger.info('Redis connection pool shutdown completed')
  }
}

// Create singleton instance
const redisPool = new RedisConnectionPool()

// Enhanced cache service using connection pool
class PooledCacheService {
  constructor() {
    this.fallbackCache = new Map()
  }

  async get(key) {
    try {
      const cached = await redisPool.execute('get', key)
      if (cached) {
        const parsed = JSON.parse(cached)
        
        // Check if cached item has expired
        if (parsed.expires && Date.now() > parsed.expires) {
          await this.delete(key)
          return null
        }
        
        return parsed.data
      }
      
      return null
    } catch (error) {
      logger.error('Pooled cache get error', { key, error: error.message })
      
      // Fallback to in-memory cache
      const cached = this.fallbackCache.get(key)
      if (cached && Date.now() < cached.expires) {
        return cached.data
      }
      
      return null
    }
  }

  async set(key, value, ttl = 300) {
    try {
      const expires = Date.now() + (ttl * 1000)
      const cacheData = {
        data: value,
        expires,
        created: Date.now()
      }

      await redisPool.execute('setex', key, ttl, JSON.stringify(cacheData))
      
    } catch (error) {
      logger.error('Pooled cache set error', { key, error: error.message })
      
      // Fallback to in-memory cache
      this.fallbackCache.set(key, {
        data: value,
        expires: Date.now() + (ttl * 1000)
      })
    }
  }

  async delete(key) {
    try {
      await redisPool.execute('del', key)
    } catch (error) {
      logger.error('Pooled cache delete error', { key, error: error.message })
      this.fallbackCache.delete(key)
    }
  }

  async mget(keys) {
    try {
      const values = await redisPool.execute('mget', ...keys)
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
    } catch (error) {
      logger.error('Pooled cache mget error', { keys, error: error.message })
      return {}
    }
  }

  async getStats() {
    const poolStats = redisPool.getStats()
    
    return {
      type: 'pooled-redis',
      connected: poolStats.pool.total > 0,
      pool: poolStats.pool,
      metrics: poolStats.metrics,
      fallbackSize: this.fallbackCache.size
    }
  }

  generateKey(namespace, key) {
    const sanitized = key.replace(/[^a-zA-Z0-9:_-]/g, '_')
    return `edp:${namespace}:${sanitized}`
  }
}

// Create singleton instance
const pooledCacheService = new PooledCacheService()

export { redisPool, pooledCacheService }
export default pooledCacheService