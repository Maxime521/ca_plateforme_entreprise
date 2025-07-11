// pages/api/companies/search-enhanced.js - Database-Optimized Search API
//==============================================================================

import { optimizedPrisma } from '../../../lib/database/query-optimizer'
import { dbAnalytics } from '../../../lib/database/analytics-service'
import { withEnhancedRateLimit } from '../../../lib/middleware/enhanced-rate-limiting'
import { withCaching } from '../../../lib/middleware/caching'
import { 
  withRequestDeduplication, 
  withAdaptiveCaching 
} from '../../../lib/middleware/request-optimization'
import { validateSearchQuery, sanitizeQuery, securityHeaders } from '../../../lib/middleware/validation'
import { withLogging, measurePerformance } from '../../../lib/middleware/logging'
import { serverAnalytics } from '../../../lib/analytics'
import logger from '../../../lib/logger'
import APIService from '../../../lib/api-services'
import INSEEAPIService from '../../../lib/insee-api'

/**
 * Enhanced search API with database optimization
 * Features:
 * - Optimized database queries with intelligent caching
 * - Performance monitoring and analytics
 * - Enhanced rate limiting
 * - Request deduplication
 * - Adaptive caching based on usage patterns
 * - Comprehensive error handling and logging
 */

// Enhanced rate limiting configuration
const rateLimitOptions = {
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || req.ip
    const userAgent = req.headers['user-agent'] || 'unknown'
    return `search:${ip}:${userAgent.slice(0, 30)}`
  },
  userLevelDetector: (req) => {
    const authHeader = req.headers.authorization
    if (authHeader?.includes('premium')) return 'premium'
    if (authHeader?.includes('enterprise')) return 'enterprise'
    return 'default'
  }
}

// Caching configuration
const cacheOptions = {
  keyGenerator: (req) => {
    const { q, source = 'all', activeOnly = 'true' } = req.query
    return `search:enhanced:${q}:${source}:${activeOnly}`
  },
  ttl: req => req.adaptiveTTL || 300, // Use adaptive TTL
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_CACHE === 'true',
  namespace: 'search-enhanced',
  shouldCache: (req, res, data) => {
    return data && data.success && data.results && data.results.length > 0
  },
  compress: true
}

// Request deduplication options
const deduplicationOptions = {
  keyGenerator: (req) => {
    const { q, source = 'all' } = req.query
    return `search:enhanced:${q}:${source}`
  },
  timeout: 10000
}

// Adaptive caching options
const adaptiveCachingOptions = {
  baseTTL: 300,
  minTTL: 60,
  maxTTL: 1800
}

/**
 * Main search handler with database optimization
 */
async function searchHandler(req, res) {
  const perf = measurePerformance('enhanced_search_db_request')
  
  if (req.method !== 'GET') {
    logger.warn('Invalid method on enhanced search endpoint', {
      method: req.method,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    })
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    })
  }

  const { q, source = 'all', activeOnly = 'true', limit = 20, offset = 0 } = req.query
  const sanitizedQuery = sanitizeQuery(q)
  
  // Input validation
  if (!sanitizedQuery || sanitizedQuery.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Query must be at least 2 characters long',
      error: 'INVALID_QUERY'
    })
  }

  logger.info('Enhanced search request initiated', {
    query: q,
    sanitizedQuery,
    source,
    activeOnly,
    limit: parseInt(limit),
    offset: parseInt(offset),
    ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    cacheEnabled: cacheOptions.enabled
  })

  try {
    const results = {
      local: [],
      external: [],
      errors: []
    }

    console.log(`🚀 Enhanced DB Search for: "${sanitizedQuery}"`)

    // Execute optimized local database search
    if (source === 'all' || source === 'local') {
      try {
        const localResults = await searchLocalDatabaseOptimized(
          sanitizedQuery, 
          {
            limit: parseInt(limit),
            offset: parseInt(offset),
            activeOnly: activeOnly === 'true'
          }
        )
        
        results.local = localResults.companies || []
        console.log(`📊 Found ${results.local.length} local results (${localResults.total} total)`)
        
        // Add pagination info
        results.pagination = {
          total: localResults.total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: localResults.hasMore
        }
      } catch (error) {
        console.error('Local database search error:', error)
        results.errors.push({
          source: 'local',
          message: 'Erreur base de données locale',
          type: 'DATABASE_ERROR'
        })
      }
    }

    // Execute external API search if needed
    if ((source === 'all' || source === 'external') && results.local.length < 5) {
      try {
        const externalResults = await searchExternalAPIsOptimized(sanitizedQuery, source)
        results.external = externalResults
        console.log(`🌐 Found ${results.external.length} external results`)
      } catch (error) {
        console.error('External API search error:', error)
        results.errors.push({
          source: 'external',
          message: 'Erreur APIs externes',
          type: 'API_ERROR'
        })
      }
    }

    // Merge results with intelligent deduplication
    const mergedResults = mergeResultsOptimized(results)
    const duration = perf.end()
    
    // Advanced analytics
    const analytics = {
      query: sanitizedQuery,
      resultsCount: mergedResults.length,
      localCount: results.local.length,
      externalCount: results.external.length,
      errorsCount: results.errors.length,
      duration: `${duration}ms`,
      cached: req.headers['x-cache'] === 'HIT',
      deduplicated: req.headers['x-request-dedupe'] === 'HIT',
      performance: {
        dbOptimized: true,
        avgResponseTime: duration,
        cacheHitRate: req.headers['x-cache'] === 'HIT' ? 100 : 0
      }
    }

    logger.info('Enhanced search completed successfully', analytics)
    
    // Server analytics
    serverAnalytics.search(sanitizedQuery, mergedResults.length, null, analytics)
    
    // Database analytics
    dbAnalytics.recordQueryMetrics('enhanced-search', duration, req.headers['x-cache'] === 'HIT')

    console.log(`✅ Enhanced search completed: ${mergedResults.length} results in ${duration}ms`)

    return res.status(200).json({
      success: true,
      query: sanitizedQuery,
      originalQuery: q,
      results: mergedResults,
      pagination: results.pagination,
      sources: {
        local: results.local.length,
        external: results.external.length
      },
      errors: results.errors,
      timestamp: new Date().toISOString(),
      performance: {
        duration: `${duration}ms`,
        cached: req.headers['x-cache'] === 'HIT',
        deduplicated: req.headers['x-request-dedupe'] === 'HIT',
        dbOptimized: true,
        queryOptimizations: [
          'indexed_search',
          'query_caching',
          'result_pagination',
          'intelligent_deduplication'
        ]
      },
      optimization: {
        databaseOptimized: true,
        cacheEnabled: cacheOptions.enabled,
        rateLimitingEnabled: true,
        deduplicationEnabled: true,
        adaptiveCachingEnabled: true,
        performanceMonitoring: true
      }
    })

  } catch (error) {
    const duration = perf.end()
    
    logger.error('Enhanced search operation failed', {
      query: sanitizedQuery,
      source,
      duration: `${duration}ms`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    })

    // Server analytics
    serverAnalytics.error('enhanced_search_db_error', error.message, null, {
      query: sanitizedQuery,
      source,
      duration
    })

    // Database analytics
    dbAnalytics.recordQueryError('enhanced-search', duration, error)

    return res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la recherche optimisée',
      type: 'SEARCH_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Optimized local database search using enhanced Prisma client
 */
async function searchLocalDatabaseOptimized(query, options = {}) {
  const {
    limit = 20,
    offset = 0,
    activeOnly = true
  } = options

  console.log(`🔍 Optimized DB search: "${query}" (active: ${activeOnly}, limit: ${limit}, offset: ${offset})`)

  // Use the optimized Prisma client with intelligent caching
  const results = await optimizedPrisma.searchCompanies(query, {
    limit,
    offset,
    activeOnly
  })

  return results
}

/**
 * Optimized external API search
 */
async function searchExternalAPIsOptimized(query, source) {
  const externalResults = []
  
  try {
    // Search INSEE API
    if (source === 'all' || source === 'insee') {
      try {
        const inseeResults = await INSEEAPIService.searchCompanies(query)
        if (inseeResults.results) {
          externalResults.push(...inseeResults.results.map(company => ({
            ...company,
            source: 'insee'
          })))
        }
      } catch (error) {
        console.error('INSEE API search failed:', error)
      }
    }

    // Search BODACC API
    if (source === 'all' || source === 'bodacc') {
      try {
        const bodaccResults = await APIService.searchBODACC(query)
        if (bodaccResults.results) {
          externalResults.push(...bodaccResults.results.map(company => ({
            ...company,
            source: 'bodacc'
          })))
        }
      } catch (error) {
        console.error('BODACC API search failed:', error)
      }
    }

  } catch (error) {
    console.error('External API search error:', error)
  }

  return externalResults
}

/**
 * Merge results with intelligent deduplication and ranking
 */
function mergeResultsOptimized(results) {
  const seen = new Set()
  const merged = []
  const scoreMap = new Map()

  // Score and add local results first (highest priority)
  results.local.forEach(company => {
    if (company.siren) {
      const score = calculateRelevanceScore(company, 'local')
      seen.add(company.siren)
      scoreMap.set(company.siren, score)
      merged.push({
        ...company,
        source: 'local',
        relevanceScore: score,
        optimized: true
      })
    }
  })

  // Add external results with scoring
  results.external.forEach(company => {
    let siren = company.siren
    if (!siren && company.siret) {
      siren = company.siret.substring(0, 9)
    }
    
    if (siren) {
      const score = calculateRelevanceScore(company, company.source || 'external')
      
      if (!seen.has(siren) || score > (scoreMap.get(siren) || 0)) {
        if (seen.has(siren)) {
          // Replace with higher scored result
          const index = merged.findIndex(r => r.siren === siren)
          if (index !== -1) {
            merged.splice(index, 1)
          }
        }
        
        seen.add(siren)
        scoreMap.set(siren, score)
        merged.push({
          ...company,
          siren: siren,
          relevanceScore: score,
          optimized: true
        })
      }
    }
  })

  // Sort by relevance score and return
  return merged
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, 20)
}

/**
 * Calculate relevance score for intelligent result ranking
 */
function calculateRelevanceScore(item, source) {
  let score = 0
  
  // Base score by source priority
  switch (source) {
    case 'local': score += 100; break
    case 'insee': score += 80; break
    case 'bodacc': score += 60; break
    default: score += 40; break
  }
  
  // Add points for data completeness
  if (item.denomination) score += 20
  if (item.siren) score += 20
  if (item.adresseSiege || item.adresse) score += 10
  if (item.formeJuridique) score += 10
  if (item.codeAPE) score += 10
  
  // Add points for recent activity
  if (item.active !== false) score += 15
  if (item.updatedAt) {
    const daysSinceUpdate = (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate < 30) score += 10
    else if (daysSinceUpdate < 90) score += 5
  }
  
  return score
}

/**
 * Security and validation middleware
 */
const withSecurity = (handler) => {
  return async (req, res) => {
    securityHeaders(req, res, () => {})
    
    return new Promise((resolve, reject) => {
      validateSearchQuery(req, res, () => {
        handler(req, res).then(resolve).catch(reject)
      })
    })
  }
}

// Apply middleware chain
const withOptimizations = (handler) => {
  return withCaching(
    withEnhancedRateLimit(rateLimitOptions)(
      withRequestDeduplication(
        withAdaptiveCaching(
          handler,
          adaptiveCachingOptions
        ),
        deduplicationOptions
      )
    ),
    cacheOptions
  )
}

// Export the enhanced handler with all middleware
export default withOptimizations(withSecurity(searchHandler))

/**
 * API Usage Examples:
 * 
 * 1. Basic search:
 *    GET /api/companies/search-enhanced?q=société
 * 
 * 2. Paginated search:
 *    GET /api/companies/search-enhanced?q=société&limit=10&offset=20
 * 
 * 3. Active companies only:
 *    GET /api/companies/search-enhanced?q=société&activeOnly=true
 * 
 * 4. Local database only:
 *    GET /api/companies/search-enhanced?q=société&source=local
 * 
 * 5. External APIs only:
 *    GET /api/companies/search-enhanced?q=société&source=external
 */