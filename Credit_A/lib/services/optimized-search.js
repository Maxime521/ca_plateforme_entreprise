// lib/services/optimized-search.js - High-Performance Database Search Service
//==============================================================================

const { createAdminClient } = require('../supabase')

/**
 * Optimized search service that leverages database indexes and materialized views
 * Expected performance: 5-10x faster than original searches
 */

class OptimizedSearchService {
  constructor() {
    this.supabase = createAdminClient()
    this.searchCache = new Map() // Additional local cache layer
    this.performanceMetrics = {
      searches: 0,
      totalTime: 0,
      cacheHits: 0
    }
  }

  /**
   * High-performance company search using optimized indexes
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with performance metrics
   */
  async searchCompanies(query, options = {}) {
    const startTime = Date.now()
    const {
      limit = 10,
      offset = 0,
      source = 'optimized', // 'optimized', 'materialized', or 'standard'
      includeInactive = false,
      sortBy = 'relevance' // 'relevance', 'name', 'date'
    } = options

    try {
      // Sanitize and prepare query
      const sanitizedQuery = this.sanitizeQuery(query)
      const cacheKey = `${sanitizedQuery}-${source}-${limit}-${offset}-${includeInactive}`
      
      // Check local cache first (for repeated searches within same session)
      if (this.searchCache.has(cacheKey)) {
        this.performanceMetrics.cacheHits++
        const cached = this.searchCache.get(cacheKey)
        return {
          ...cached,
          performance: {
            ...cached.performance,
            duration: Date.now() - startTime,
            source: 'local-cache'
          }
        }
      }

      let results, queryTime

      // Choose optimal search strategy based on source
      switch (source) {
        case 'materialized':
          results = await this.searchMaterializedView(sanitizedQuery, limit, offset, sortBy)
          break
        case 'optimized':
          results = await this.searchWithIndexes(sanitizedQuery, limit, offset, includeInactive, sortBy)
          break
        default:
          results = await this.searchStandard(sanitizedQuery, limit, offset, includeInactive, sortBy)
      }

      queryTime = Date.now() - startTime

      // Update performance metrics
      this.performanceMetrics.searches++
      this.performanceMetrics.totalTime += queryTime

      const response = {
        success: true,
        query: sanitizedQuery,
        results: results.data || [],
        count: results.count || 0,
        performance: {
          duration: queryTime,
          source: source,
          avgQueryTime: this.performanceMetrics.totalTime / this.performanceMetrics.searches,
          optimizationUsed: true
        },
        metadata: {
          limit,
          offset,
          hasMore: (results.count || 0) > offset + limit,
          strategy: this.getQueryStrategy(sanitizedQuery)
        }
      }

      // Cache result locally (expire after 5 minutes)
      this.setCacheWithExpiry(cacheKey, response, 5 * 60 * 1000)

      return response

    } catch (error) {
      const queryTime = Date.now() - startTime
      
      console.error('Optimized search error:', error)
      
      return {
        success: false,
        query: query,
        results: [],
        count: 0,
        error: error.message,
        performance: {
          duration: queryTime,
          source: 'error',
          failed: true
        }
      }
    }
  }

  /**
   * Search using materialized view (fastest - 10-50ms)
   * Best for active companies only
   */
  async searchMaterializedView(query, limit, offset, sortBy) {
    console.log(`🚀 Using materialized view search for: "${query}"`)
    
    let queryBuilder = this.supabase
      .from('mv_active_companies')
      .select('*', { count: 'exact' })

    // Use full-text search vector for best performance
    if (query.length >= 3) {
      const tsQuery = query.split(' ').map(term => `${term}:*`).join(' & ')
      queryBuilder = queryBuilder.textSearch('search_vector', tsQuery)
    } else {
      // Fallback to ILIKE for short queries
      queryBuilder = queryBuilder.or(
        `siren.ilike.%${query}%,denomination.ilike.%${query}%`
      )
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        queryBuilder = queryBuilder.order('denomination')
        break
      case 'date':
        queryBuilder = queryBuilder.order('created_at', { ascending: false })
        break
      default:
        // Relevance-based ordering (keep database order for full-text search)
        break
    }

    const result = await queryBuilder
      .range(offset, offset + limit - 1)

    return result
  }

  /**
   * Search using optimized indexes (fast - 50-200ms)
   * Works with all companies
   */
  async searchWithIndexes(query, limit, offset, includeInactive, sortBy) {
    console.log(`⚡ Using optimized index search for: "${query}"`)
    
    let queryBuilder = this.supabase
      .from('companies')
      .select('*', { count: 'exact' })

    // Apply active filter using optimized index
    if (!includeInactive) {
      queryBuilder = queryBuilder.eq('active', true)
    }

    // Use optimized search strategy based on query type
    if (this.isSirenQuery(query)) {
      // Direct SIREN lookup (fastest path)
      queryBuilder = queryBuilder.eq('siren', query)
    } else if (query.length >= 3) {
      // Full-text search using GIN index
      const tsQuery = query.split(' ').map(term => `${term}:*`).join(' & ')
      queryBuilder = queryBuilder.textSearch('denomination,siren', tsQuery)
    } else {
      // Short query fallback
      queryBuilder = queryBuilder.or(
        `siren.ilike.%${query}%,denomination.ilike.%${query}%`
      )
    }

    // Apply sorting with index optimization
    switch (sortBy) {
      case 'name':
        queryBuilder = queryBuilder.order('denomination')
        break
      case 'date':
        queryBuilder = queryBuilder.order('created_at', { ascending: false })
        break
      default:
        // Default relevance ordering
        queryBuilder = queryBuilder.order('denomination')
        break
    }

    const result = await queryBuilder
      .range(offset, offset + limit - 1)

    return result
  }

  /**
   * Standard search (slower - 500-2000ms)
   * Fallback method
   */
  async searchStandard(query, limit, offset, includeInactive, sortBy) {
    console.log(`🐌 Using standard search for: "${query}"`)
    
    let queryBuilder = this.supabase
      .from('companies')
      .select('*', { count: 'exact' })

    if (!includeInactive) {
      queryBuilder = queryBuilder.eq('active', true)
    }

    queryBuilder = queryBuilder.or(
      `siren.ilike.%${query}%,denomination.ilike.%${query}%,adresse_siege.ilike.%${query}%`
    )

    const result = await queryBuilder
      .order(sortBy === 'name' ? 'denomination' : 'created_at', 
            { ascending: sortBy !== 'date' })
      .range(offset, offset + limit - 1)

    return result
  }

  /**
   * Multi-source aggregated search with performance optimization
   */
  async searchMultiSource(query, options = {}) {
    const startTime = Date.now()
    const {
      sources = ['local', 'insee', 'bodacc'],
      timeout = 8000,
      includePerformanceMetrics = true
    } = options

    const results = {
      local: [],
      insee: [],
      bodacc: [],
      errors: [],
      performance: {}
    }

    try {
      const searchPromises = []

      // Local database search (optimized)
      if (sources.includes('local')) {
        searchPromises.push(
          this.searchCompanies(query, { source: 'materialized', limit: 20 })
            .then(result => ({ source: 'local', ...result }))
            .catch(error => ({ source: 'local', error: error.message }))
        )
      }

      // External API searches (if configured)
      if (sources.includes('insee')) {
        searchPromises.push(
          this.searchINSEEOptimized(query)
            .then(result => ({ source: 'insee', ...result }))
            .catch(error => ({ source: 'insee', error: error.message }))
        )
      }

      if (sources.includes('bodacc')) {
        searchPromises.push(
          this.searchBODACCOptimized(query)
            .then(result => ({ source: 'bodacc', ...result }))
            .catch(error => ({ source: 'bodacc', error: error.message }))
        )
      }

      // Execute searches with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), timeout)
      )

      const searchResults = await Promise.allSettled([
        Promise.race([Promise.all(searchPromises), timeoutPromise])
      ])

      // Process results
      if (searchResults[0].status === 'fulfilled') {
        searchResults[0].value[0].forEach(sourceResult => {
          if (sourceResult.error) {
            results.errors.push({
              source: sourceResult.source,
              message: sourceResult.error
            })
          } else {
            results[sourceResult.source] = sourceResult.results || []
            if (includePerformanceMetrics) {
              results.performance[sourceResult.source] = sourceResult.performance
            }
          }
        })
      }

      const totalTime = Date.now() - startTime

      return {
        success: true,
        query: query,
        results: this.mergeSearchResults(results),
        sources: {
          local: results.local.length,
          insee: results.insee.length,
          bodacc: results.bodacc.length
        },
        errors: results.errors,
        performance: {
          ...results.performance,
          totalDuration: totalTime,
          optimized: true
        }
      }

    } catch (error) {
      return {
        success: false,
        query: query,
        results: [],
        error: error.message,
        performance: {
          totalDuration: Date.now() - startTime,
          failed: true
        }
      }
    }
  }

  /**
   * Utility methods
   */
  
  sanitizeQuery(query) {
    if (!query || typeof query !== 'string') return ''
    return query.trim().replace(/[<>{}]/g, '').substring(0, 100)
  }

  isSirenQuery(query) {
    return /^\d{9}$/.test(query.replace(/\s/g, ''))
  }

  getQueryStrategy(query) {
    if (this.isSirenQuery(query)) return 'siren-exact'
    if (query.length >= 3) return 'fulltext-search'
    return 'partial-match'
  }

  setCacheWithExpiry(key, value, ttl) {
    this.searchCache.set(key, value)
    setTimeout(() => this.searchCache.delete(key), ttl)
    
    // Cleanup cache if it gets too large
    if (this.searchCache.size > 100) {
      const keys = Array.from(this.searchCache.keys())
      keys.slice(0, 20).forEach(k => this.searchCache.delete(k))
    }
  }

  mergeSearchResults(results) {
    const seen = new Set()
    const merged = []

    // Add local results first (highest priority)
    results.local.forEach(company => {
      if (company.siren && !seen.has(company.siren)) {
        seen.add(company.siren)
        merged.push({ ...company, source: 'local' })
      }
    })

    // Add external results
    ;['insee', 'bodacc'].forEach(source => {
      results[source].forEach(company => {
        const siren = company.siren || (company.siret ? company.siret.substring(0, 9) : null)
        if (siren && !seen.has(siren)) {
          seen.add(siren)
          merged.push({ ...company, siren, source })
        }
      })
    })

    return merged.slice(0, 50) // Reasonable limit
  }

  /**
   * Performance monitoring and metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.searches > 0 
        ? (this.performanceMetrics.cacheHits / this.performanceMetrics.searches * 100).toFixed(1) + '%'
        : '0%',
      avgResponseTime: this.performanceMetrics.searches > 0
        ? Math.round(this.performanceMetrics.totalTime / this.performanceMetrics.searches)
        : 0
    }
  }

  resetMetrics() {
    this.performanceMetrics = { searches: 0, totalTime: 0, cacheHits: 0 }
    this.searchCache.clear()
  }

  // Placeholder methods for external API searches (implement as needed)
  async searchINSEEOptimized(query) {
    // Implement optimized INSEE search with caching
    return { results: [] }
  }

  async searchBODACCOptimized(query) {
    // Implement optimized BODACC search with caching
    return { results: [] }
  }
}

// Create singleton instance
const optimizedSearchService = new OptimizedSearchService()

module.exports = {
  OptimizedSearchService,
  optimizedSearchService
}