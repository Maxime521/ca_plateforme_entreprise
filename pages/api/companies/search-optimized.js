// pages/api/companies/search-optimized.js - Performance Optimized Search API
//==============================================================================

import { createAdminClient } from '../../../lib/supabase'
import axios from 'axios'
import { validateSearchQuery, sanitizeQuery, securityHeaders } from '../../../lib/middleware/validation'
import { withLogging, measurePerformance } from '../../../lib/middleware/logging'
import { serverAnalytics } from '../../../lib/analytics'
import logger from '../../../lib/logger'
import { withCaching } from '../../../lib/middleware/caching'
import { withEnhancedRateLimit } from '../../../lib/middleware/enhanced-rate-limiting'
import { 
  withRequestDeduplication, 
  withBatchProcessing, 
  withCacheWarming, 
  withAdaptiveCaching 
} from '../../../lib/middleware/request-optimization'
import { pooledCacheService } from '../../../lib/cache/redis-pool'

/**
 * Next-generation search API with advanced performance optimizations:
 * - Enhanced rate limiting with burst handling
 * - Request deduplication
 * - Batch processing
 * - Adaptive caching
 * - Connection pooling
 * - Circuit breaker pattern
 * - Performance monitoring
 */

// Enhanced cache configuration
const cacheOptions = {
  keyGenerator: (req) => {
    const { q, source = 'all' } = req.query
    return `search:optimized:${q}:${source}`
  },
  ttl: req => req.adaptiveTTL || 300, // Use adaptive TTL
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_CACHE === 'true',
  namespace: 'search-optimized',
  shouldCache: (req, res, data) => {
    return data && data.success && data.results && data.results.length > 0
  },
  compress: true,
  varyHeaders: ['user-agent', 'accept-language']
}

// Enhanced rate limiting configuration
const rateLimitOptions = {
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || req.ip
    const userAgent = req.headers['user-agent'] || 'unknown'
    return `${ip}:${userAgent.slice(0, 50)}`
  },
  userLevelDetector: (req) => {
    // Detect user level from headers or authentication
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.includes('premium')) return 'premium'
    if (authHeader && authHeader.includes('enterprise')) return 'enterprise'
    return 'default'
  }
}

// Request deduplication options
const deduplicationOptions = {
  keyGenerator: (req) => {
    const { q, source = 'all' } = req.query
    return `search:${q}:${source}`
  },
  timeout: 15000 // 15 seconds
}

// Batch processing options
const batchOptions = {
  batchSize: 3,
  batchTimeout: 50, // 50ms
  keyExtractor: (req) => {
    const query = req.query.q || ''
    // Group similar queries for batch processing
    return query.length > 0 ? query.slice(0, 3) : null
  }
}

// Cache warming patterns
const warmingPatterns = [
  '/api/companies/search-optimized?q=paris',
  '/api/companies/search-optimized?q=france',
  '/api/companies/search-optimized?q=sarl',
  '/api/companies/search-optimized?q=sas'
]

// Adaptive caching options
const adaptiveCachingOptions = {
  baseTTL: 300,
  minTTL: 60,
  maxTTL: 3600
}

// Middleware chain
const withOptimizations = (handler) => {
  return withCaching(
    withEnhancedRateLimit(rateLimitOptions)(
      withRequestDeduplication(
        withBatchProcessing(
          withCacheWarming(
            withAdaptiveCaching(
              handler,
              adaptiveCachingOptions
            ),
            { warmingPatterns, enabled: process.env.NODE_ENV === 'production' }
          ),
          batchOptions
        ),
        deduplicationOptions
      )
    ),
    cacheOptions
  )
}

// Apply security headers
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

/**
 * Main search handler with performance optimizations
 */
async function searchHandler(req, res) {
  const perf = measurePerformance('optimized_search_request')
  
  if (req.method !== 'GET') {
    logger.warn('Invalid method on optimized search endpoint', {
      method: req.method,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    })
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    })
  }

  const { q, source = 'all' } = req.query
  const sanitizedQuery = sanitizeQuery(q)
  
  logger.info('Optimized search request initiated', {
    query: q,
    sanitizedQuery,
    source,
    ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    cacheEnabled: cacheOptions.enabled,
    rateLimitHeaders: {
      remaining: res.getHeader('X-RateLimit-Remaining'),
      reset: res.getHeader('X-RateLimit-Reset')
    }
  })

  try {
    const results = {
      local: [],
      insee: [],
      bodacc: [],
      errors: []
    }

    console.log(`🚀 Optimized Search for: "${sanitizedQuery}" (sanitized from: "${q}")`)

    // Parallel execution with connection pooling
    const searchPromises = []

    // 1. Local database search
    if (source === 'all' || source === 'local') {
      searchPromises.push(
        searchLocalDatabase(sanitizedQuery).then(data => {
          results.local = data
          console.log(`📂 Found ${data.length} local results`)
        }).catch(error => {
          console.error('Local database error:', error)
          results.errors.push({ 
            source: 'local', 
            message: 'Erreur base de données locale',
            type: 'DATABASE_ERROR' 
          })
        })
      )
    }

    // 2. INSEE API search with pooled caching
    if (source === 'all' || source === 'insee') {
      searchPromises.push(
        searchINSEEOptimized(sanitizedQuery).then(data => {
          results.insee = data
          console.log(`🏛️ Found ${data.length} INSEE results`)
        }).catch(error => {
          console.error('INSEE API error:', error)
          results.errors.push({ 
            source: 'insee', 
            message: 'API INSEE non disponible',
            type: 'API_ERROR' 
          })
        })
      )
    }

    // 3. BODACC API search with pooled caching
    if (source === 'all' || source === 'bodacc') {
      searchPromises.push(
        searchBODACCOptimized(sanitizedQuery).then(data => {
          results.bodacc = data
          console.log(`📰 Found ${data.length} BODACC results`)
        }).catch(error => {
          console.error('BODACC API error:', error)
          results.errors.push({ 
            source: 'bodacc', 
            message: 'Erreur API BODACC',
            type: 'API_ERROR' 
          })
        })
      )
    }

    // Wait for all searches to complete
    await Promise.all(searchPromises)

    // Merge results with intelligent deduplication
    const mergedResults = mergeSearchResultsOptimized(results)
    const duration = perf.end()
    
    // Advanced analytics
    const analytics = {
      query: sanitizedQuery,
      resultsCount: mergedResults.length,
      sources: {
        local: results.local.length,
        insee: results.insee.length,
        bodacc: results.bodacc.length
      },
      errorsCount: results.errors.length,
      duration: `${duration}ms`,
      cached: req.headers['x-cache'] === 'HIT',
      deduplicated: req.headers['x-request-dedupe'] === 'HIT',
      rateLimited: false,
      performance: {
        cacheHitRate: req.headers['x-cache'] === 'HIT' ? 100 : 0,
        avgResponseTime: duration,
        optimizationScore: calculateOptimizationScore(duration, results.errors.length, mergedResults.length)
      }
    }

    logger.info('Optimized search completed successfully', analytics)

    // Enhanced server analytics
    serverAnalytics.search(sanitizedQuery, mergedResults.length, null, analytics)

    console.log(`✅ Total optimized results: ${mergedResults.length}`)

    return res.status(200).json({
      success: true,
      query: sanitizedQuery,
      originalQuery: q,
      results: mergedResults,
      sources: {
        local: results.local.length,
        insee: results.insee.length,
        bodacc: results.bodacc.length
      },
      errors: results.errors,
      timestamp: new Date().toISOString(),
      performance: {
        duration: `${duration}ms`,
        cached: req.headers['x-cache'] === 'HIT',
        deduplicated: req.headers['x-request-dedupe'] === 'HIT',
        optimizationScore: analytics.performance.optimizationScore
      },
      optimization: {
        cacheEnabled: cacheOptions.enabled,
        rateLimitingEnabled: true,
        deduplicationEnabled: true,
        batchProcessingEnabled: true,
        adaptiveCachingEnabled: true,
        connectionPoolingEnabled: true
      }
    })

  } catch (error) {
    const duration = perf.end()
    
    logger.error('Optimized search operation failed', {
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

    serverAnalytics.error('optimized_search_error', error.message, null, {
      query: sanitizedQuery,
      source,
      duration
    })

    return res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la recherche optimisée',
      type: 'SEARCH_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Optimized local database search
 */
async function searchLocalDatabase(query) {
  const supabase = createAdminClient()
  
  const { data: localResults, error } = await supabase
    .from('companies')
    .select('*')
    .or(`siren.ilike.%${query}%,denomination.ilike.%${query}%`)
    .limit(10)
  
  if (error) throw error
  
  return localResults || []
}

/**
 * Optimized INSEE search with pooled caching
 */
async function searchINSEEOptimized(query) {
  const cacheKey = pooledCacheService.generateKey('insee', `search:${query}`)
  
  // Try cache first
  const cached = await pooledCacheService.get(cacheKey)
  if (cached) {
    return cached
  }
  
  try {
    const { default: INSEEAPIService } = await import('../../../lib/insee-api')
    const results = await INSEEAPIService.searchCompanies(query)
    const data = results.results || []
    
    // Cache for 10 minutes
    await pooledCacheService.set(cacheKey, data, 600)
    
    return data
  } catch (error) {
    console.error('INSEE API call failed:', error)
    return []
  }
}

/**
 * Optimized BODACC search with pooled caching
 */
async function searchBODACCOptimized(query) {
  const cacheKey = pooledCacheService.generateKey('bodacc', `search:${query}`)
  
  // Try cache first
  const cached = await pooledCacheService.get(cacheKey)
  if (cached) {
    return cached
  }
  
  try {
    const encodedQuery = encodeURIComponent(query.replace(/[%_]/g, '\\\\$&'))
    
    const bodaccResponse = await axios.get('https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records', {
      params: {
        where: `commercant like "%${encodedQuery}%"`,
        limit: 20,
        order_by: 'dateparution desc',
        timezone: 'Europe/Paris'
      },
      timeout: 8000,
      headers: {
        'User-Agent': 'DataCorp-Platform/1.0 (Optimized)',
        'Accept': 'application/json'
      }
    })

    const bodaccResults = formatBODACCAnnouncements(bodaccResponse.data)
    const data = bodaccResults.results || []
    
    // Cache for 15 minutes
    await pooledCacheService.set(cacheKey, data, 900)
    
    return data
    
  } catch (error) {
    console.error('BODACC API call failed:', error)
    return []
  }
}

/**
 * Optimized result merging with intelligent deduplication
 */
function mergeSearchResultsOptimized(results) {
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
        id: company.id,
        active: company.active ?? true,
        relevanceScore: score,
        dateCreation: company.dateCreation?.toISOString ? company.dateCreation.toISOString() : company.dateCreation
      })
    }
  })

  // Add INSEE results with scoring
  results.insee.forEach(company => {
    let siren = company.siren
    if (!siren && company.siret) {
      siren = company.siret.substring(0, 9)
    }
    
    if (siren) {
      const score = calculateRelevanceScore(company, 'insee')
      
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
          source: 'insee',
          id: `insee-${siren}`,
          relevanceScore: score,
          adresseSiege: company.adresse || company.adresseSiege,
          formeJuridique: company.formeJuridique || company.categorieJuridique
        })
      }
    }
  })

  // Add BODACC results with scoring
  results.bodacc.forEach(announcement => {
    if (announcement.siren) {
      const score = calculateRelevanceScore(announcement, 'bodacc')
      
      if (!seen.has(announcement.siren) || score > (scoreMap.get(announcement.siren) || 0)) {
        if (seen.has(announcement.siren)) {
          // Replace with higher scored result
          const index = merged.findIndex(r => r.siren === announcement.siren)
          if (index !== -1) {
            merged.splice(index, 1)
          }
        }
        
        seen.add(announcement.siren)
        scoreMap.set(announcement.siren, score)
        merged.push({
          siren: announcement.siren,
          denomination: announcement.denomination,
          formeJuridique: announcement.formeJuridique,
          adresseSiege: announcement.adresse,
          active: true,
          source: 'bodacc',
          id: `bodacc-${announcement.siren}`,
          relevanceScore: score,
          lastAnnouncement: {
            type: announcement.typeAnnonce,
            date: announcement.dateParution,
            tribunal: announcement.tribunal
          }
        })
      }
    }
  })

  // Sort by relevance score and return top 20
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
  }
  
  // Add points for completeness
  if (item.denomination) score += 20
  if (item.siren) score += 20
  if (item.adresseSiege || item.adresse) score += 10
  if (item.formeJuridique) score += 10
  
  // Add points for recent activity
  if (item.active !== false) score += 10
  if (item.lastAnnouncement) score += 5
  
  return score
}

/**
 * Calculate optimization score for performance tracking
 */
function calculateOptimizationScore(duration, errorCount, resultCount) {
  let score = 100
  
  // Penalize for slow response times
  if (duration > 2000) score -= 30
  else if (duration > 1000) score -= 15
  else if (duration > 500) score -= 5
  
  // Penalize for errors
  score -= errorCount * 10
  
  // Reward for good result count
  if (resultCount > 10) score += 10
  else if (resultCount > 5) score += 5
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Format BODACC announcements (reused from original)
 */
function formatBODACCAnnouncements(data) {
  if (!data || !data.records) {
    return { results: [], total: 0 }
  }

  const results = []

  for (let i = 0; i < data.records.length; i++) {
    try {
      const record = data.records[i]
      const fields = record.record?.fields || record.fields || {}
      
      const siren = extractSIREN(fields.registre)
      
      if (siren) {
        const result = {
          id: fields.id || `bodacc-${siren}-${Date.now()}-${i}`,
          siren: siren,
          registre: fields.registre,
          denomination: fields.commercant || fields.denomination || 'Entreprise inconnue',
          formeJuridique: null,
          adresse: formatBodaccAddress(fields),
          dateParution: fields.dateparution,
          typeAnnonce: fields.familleavis_lib || fields.familleavis || 'Annonce',
          numeroAnnonce: fields.numeroannonce,
          tribunal: fields.tribunal,
          ville: fields.ville,
          codePostal: fields.cp,
          departement: fields.departement_nom_officiel,
          region: fields.region_nom_officiel,
          details: fields.publicationavis
        }
        
        results.push(result)
      }
      
    } catch (recordError) {
      console.error(`Error processing BODACC record ${i}:`, recordError.message)
      continue
    }
  }
  
  return {
    results: results,
    total: data.total_count || results.length
  }
}

/**
 * Extract SIREN from registry string
 */
function extractSIREN(registre) {
  if (!registre) return ''
  
  const registreStr = String(registre)
  
  if (registreStr.includes(',')) {
    const parts = registreStr.split(',')
    if (parts.length > 1) {
      const siren = parts[1].trim()
      if (siren.length === 9 && /^\\d{9}$/.test(siren)) {
        return siren
      }
    }
  }
  
  const match = registreStr.match(/(\\d{9})/)
  if (match) {
    return match[1]
  }
  
  return ''
}

/**
 * Format BODACC address
 */
function formatBodaccAddress(fields) {
  try {
    const parts = [
      fields.ville,
      fields.cp,
      fields.departement_nom_officiel
    ].filter(Boolean).filter(part => String(part).trim() !== '')

    return parts.length > 0 ? parts.join(', ') : 'Adresse non disponible'
  } catch (error) {
    return 'Adresse non disponible'
  }
}

// Export the optimized handler with all middleware
export default withOptimizations(withSecurity(searchHandler))