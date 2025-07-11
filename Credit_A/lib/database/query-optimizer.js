// lib/database/query-optimizer.js - Advanced Database Query Optimization
//==============================================================================

import { PrismaClient } from '@prisma/client'
import logger from '../logger'

/**
 * Advanced database query optimization with:
 * - Query performance monitoring
 * - Intelligent caching
 * - Connection pooling
 * - Query analysis
 * - Automatic optimization suggestions
 */

class QueryOptimizer {
  constructor() {
    this.queryCache = new Map()
    this.queryMetrics = new Map()
    this.slowQueries = new Map()
    this.optimizationSuggestions = new Map()
    
    // Performance thresholds
    this.slowQueryThreshold = 1000 // 1 second
    this.cacheTTL = 5 * 60 * 1000 // 5 minutes
    
    // Start monitoring
    this.startMonitoring()
  }

  /**
   * Execute query with performance monitoring and caching
   */
  async executeQuery(queryId, queryFn, options = {}) {
    const {
      cacheKey = null,
      cacheTTL = this.cacheTTL,
      logSlow = true,
      skipCache = false
    } = options

    const startTime = Date.now()
    
    // Check cache first
    if (cacheKey && !skipCache) {
      const cached = this.queryCache.get(cacheKey)
      if (cached && Date.now() < cached.expires) {
        this.recordQueryMetrics(queryId, Date.now() - startTime, true)
        return cached.data
      }
    }

    try {
      // Execute query
      const result = await queryFn()
      const duration = Date.now() - startTime
      
      // Cache result if specified
      if (cacheKey && result) {
        this.queryCache.set(cacheKey, {
          data: result,
          expires: Date.now() + cacheTTL,
          created: Date.now()
        })
      }
      
      // Record metrics
      this.recordQueryMetrics(queryId, duration, false)
      
      // Log slow queries
      if (logSlow && duration > this.slowQueryThreshold) {
        this.recordSlowQuery(queryId, duration, cacheKey)
      }
      
      return result
      
    } catch (error) {
      const duration = Date.now() - startTime
      this.recordQueryError(queryId, duration, error)
      throw error
    }
  }

  /**
   * Record query performance metrics
   */
  recordQueryMetrics(queryId, duration, cached) {
    const metrics = this.queryMetrics.get(queryId) || {
      totalExecutions: 0,
      totalDuration: 0,
      cachedHits: 0,
      errors: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      lastExecution: null
    }

    metrics.totalExecutions++
    metrics.totalDuration += duration
    metrics.avgDuration = metrics.totalDuration / metrics.totalExecutions
    metrics.minDuration = Math.min(metrics.minDuration, duration)
    metrics.maxDuration = Math.max(metrics.maxDuration, duration)
    metrics.lastExecution = Date.now()
    
    if (cached) {
      metrics.cachedHits++
    }
    
    this.queryMetrics.set(queryId, metrics)
  }

  /**
   * Record slow query for analysis
   */
  recordSlowQuery(queryId, duration, cacheKey) {
    const slowQuery = {
      queryId,
      duration,
      cacheKey,
      timestamp: Date.now(),
      suggestions: this.generateOptimizationSuggestions(queryId, duration)
    }
    
    this.slowQueries.set(`${queryId}-${Date.now()}`, slowQuery)
    
    logger.warn('Slow query detected', {
      queryId,
      duration: `${duration}ms`,
      cacheKey,
      suggestions: slowQuery.suggestions
    })
  }

  /**
   * Record query error
   */
  recordQueryError(queryId, duration, error) {
    const metrics = this.queryMetrics.get(queryId) || {
      totalExecutions: 0,
      totalDuration: 0,
      cachedHits: 0,
      errors: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      lastExecution: null
    }

    metrics.errors++
    this.queryMetrics.set(queryId, metrics)
    
    logger.error('Query execution error', {
      queryId,
      duration: `${duration}ms`,
      error: error.message
    })
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(queryId, duration) {
    const suggestions = []
    
    // Duration-based suggestions
    if (duration > 5000) {
      suggestions.push({
        type: 'critical',
        message: 'Query is extremely slow (>5s)',
        actions: [
          'Add database indexes',
          'Optimize query structure',
          'Consider pagination',
          'Review data model'
        ]
      })
    } else if (duration > 2000) {
      suggestions.push({
        type: 'warning',
        message: 'Query is slow (>2s)',
        actions: [
          'Add caching',
          'Optimize WHERE clauses',
          'Consider database indexes'
        ]
      })
    } else if (duration > 1000) {
      suggestions.push({
        type: 'info',
        message: 'Query could be optimized',
        actions: [
          'Add query caching',
          'Review query structure'
        ]
      })
    }
    
    // Query pattern suggestions
    if (queryId.includes('search')) {
      suggestions.push({
        type: 'optimization',
        message: 'Search queries benefit from full-text indexes',
        actions: [
          'Add full-text search indexes',
          'Consider search-specific database',
          'Implement search result caching'
        ]
      })
    }
    
    return suggestions
  }

  /**
   * Get query performance statistics
   */
  getQueryStats() {
    const stats = {
      totalQueries: this.queryMetrics.size,
      totalExecutions: 0,
      totalDuration: 0,
      avgDuration: 0,
      slowQueries: this.slowQueries.size,
      cacheHitRate: 0,
      topSlowQueries: [],
      topFrequentQueries: [],
      recentErrors: []
    }

    // Calculate totals
    let totalCachedHits = 0
    const queryList = []
    
    for (const [queryId, metrics] of this.queryMetrics.entries()) {
      stats.totalExecutions += metrics.totalExecutions
      stats.totalDuration += metrics.totalDuration
      totalCachedHits += metrics.cachedHits
      
      queryList.push({
        queryId,
        ...metrics,
        cacheHitRate: metrics.cachedHits / metrics.totalExecutions
      })
    }
    
    // Calculate averages
    stats.avgDuration = stats.totalDuration / stats.totalExecutions
    stats.cacheHitRate = totalCachedHits / stats.totalExecutions
    
    // Get top slow queries
    stats.topSlowQueries = queryList
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10)
    
    // Get top frequent queries
    stats.topFrequentQueries = queryList
      .sort((a, b) => b.totalExecutions - a.totalExecutions)
      .slice(0, 10)
    
    return stats
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = []
    const stats = this.getQueryStats()
    
    // Cache hit rate recommendations
    if (stats.cacheHitRate < 0.3) {
      recommendations.push({
        type: 'caching',
        priority: 'high',
        message: 'Low cache hit rate detected',
        description: `Current cache hit rate: ${Math.round(stats.cacheHitRate * 100)}%`,
        actions: [
          'Increase cache TTL for stable data',
          'Add caching to frequently accessed queries',
          'Review cache invalidation strategy'
        ]
      })
    }
    
    // Slow query recommendations
    if (stats.avgDuration > 500) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'High average query duration',
        description: `Average query time: ${Math.round(stats.avgDuration)}ms`,
        actions: [
          'Add database indexes',
          'Optimize slow queries',
          'Consider query result caching'
        ]
      })
    }
    
    // Frequent query recommendations
    stats.topFrequentQueries.forEach(query => {
      if (query.totalExecutions > 100 && query.cacheHitRate < 0.5) {
        recommendations.push({
          type: 'caching',
          priority: 'medium',
          message: `High-frequency query with low cache hit rate: ${query.queryId}`,
          description: `Executed ${query.totalExecutions} times, cache hit rate: ${Math.round(query.cacheHitRate * 100)}%`,
          actions: [
            'Add caching for this query',
            'Increase cache TTL',
            'Pre-warm cache for common queries'
          ]
        })
      }
    })
    
    return recommendations
  }

  /**
   * Clear query cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern)
      for (const [key] of this.queryCache.entries()) {
        if (regex.test(key)) {
          this.queryCache.delete(key)
        }
      }
    } else {
      this.queryCache.clear()
    }
    
    logger.info('Query cache cleared', { pattern })
  }

  /**
   * Start monitoring and cleanup
   */
  startMonitoring() {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.queryCache.entries()) {
        if (now > entry.expires) {
          this.queryCache.delete(key)
        }
      }
    }, 5 * 60 * 1000)
    
    // Clean up old slow queries every hour
    setInterval(() => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      for (const [key, slowQuery] of this.slowQueries.entries()) {
        if (slowQuery.timestamp < oneHourAgo) {
          this.slowQueries.delete(key)
        }
      }
    }, 60 * 60 * 1000)
  }
}

// Create singleton instance
const queryOptimizer = new QueryOptimizer()

/**
 * Enhanced Prisma client with query optimization
 */
class OptimizedPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' }
      ]
    })
    
    // Set up query logging
    this.$on('query', (e) => {
      if (e.duration > 1000) {
        logger.warn('Slow database query', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`
        })
      }
    })
  }

  /**
   * Execute optimized company search
   */
  async searchCompanies(query, options = {}) {
    const {
      limit = 10,
      offset = 0,
      activeOnly = true,
      includeInactive = false
    } = options

    const cacheKey = `search:companies:${query}:${limit}:${offset}:${activeOnly}`
    
    return queryOptimizer.executeQuery(
      'search-companies',
      async () => {
        const whereClause = {
          AND: [
            {
              OR: [
                { siren: { contains: query } },
                { denomination: { contains: query } }
              ]
            },
            activeOnly ? { active: true } : {}
          ]
        }

        const [companies, total] = await Promise.all([
          this.company.findMany({
            where: whereClause,
            take: limit,
            skip: offset,
            orderBy: [
              { updatedAt: 'desc' },
              { denomination: 'asc' }
            ],
            include: {
              documents: {
                take: 3,
                orderBy: { datePublication: 'desc' }
              },
              _count: {
                select: { documents: true }
              }
            }
          }),
          this.company.count({ where: whereClause })
        ])

        return {
          companies,
          total,
          hasMore: offset + limit < total
        }
      },
      {
        cacheKey,
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      }
    )
  }

  /**
   * Execute optimized company details fetch
   */
  async getCompanyDetails(siren) {
    const cacheKey = `company:details:${siren}`
    
    return queryOptimizer.executeQuery(
      'get-company-details',
      async () => {
        const company = await this.company.findUnique({
          where: { siren },
          include: {
            documents: {
              orderBy: { datePublication: 'desc' },
              take: 20
            },
            financialRatios: {
              orderBy: { year: 'desc' },
              take: 10
            }
          }
        })

        if (!company) {
          throw new Error('Company not found')
        }

        return company
      },
      {
        cacheKey,
        cacheTTL: 10 * 60 * 1000 // 10 minutes
      }
    )
  }

  /**
   * Execute batch company upsert with optimization
   */
  async batchUpsertCompanies(companies) {
    return queryOptimizer.executeQuery(
      'batch-upsert-companies',
      async () => {
        const results = await Promise.all(
          companies.map(company => 
            this.company.upsert({
              where: { siren: company.siren },
              update: {
                denomination: company.denomination,
                dateCreation: company.dateCreation,
                dateImmatriculation: company.dateImmatriculation,
                active: company.active,
                adresseSiege: company.adresseSiege,
                natureEntreprise: company.natureEntreprise,
                formeJuridique: company.formeJuridique,
                codeAPE: company.codeAPE,
                libelleAPE: company.libelleAPE,
                capitalSocial: company.capitalSocial,
                updatedAt: new Date()
              },
              create: {
                siren: company.siren,
                denomination: company.denomination,
                dateCreation: company.dateCreation,
                dateImmatriculation: company.dateImmatriculation,
                active: company.active ?? true,
                adresseSiege: company.adresseSiege,
                natureEntreprise: company.natureEntreprise,
                formeJuridique: company.formeJuridique,
                codeAPE: company.codeAPE,
                libelleAPE: company.libelleAPE,
                capitalSocial: company.capitalSocial
              }
            })
          )
        )

        // Clear related cache entries
        queryOptimizer.clearCache('search:companies:')
        
        return results
      },
      {
        skipCache: true // Don't cache mutations
      }
    )
  }

  /**
   * Get query optimization statistics
   */
  getQueryStats() {
    return queryOptimizer.getQueryStats()
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    return queryOptimizer.getOptimizationRecommendations()
  }

  /**
   * Clear query cache
   */
  clearQueryCache(pattern) {
    return queryOptimizer.clearCache(pattern)
  }
}

// Export singleton instance
const optimizedPrisma = new OptimizedPrismaClient()

export { optimizedPrisma, queryOptimizer }
export default optimizedPrisma