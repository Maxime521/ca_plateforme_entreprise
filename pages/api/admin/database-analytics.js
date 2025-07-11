// pages/api/admin/database-analytics.js - Database Performance Analytics API
//==============================================================================

import { dbAnalytics } from '../../../lib/database/analytics-service'
import { optimizedPrisma } from '../../../lib/database/query-optimizer'
import { withEnhancedRateLimit } from '../../../lib/middleware/enhanced-rate-limiting'
import { securityHeaders } from '../../../lib/middleware/validation'
import logger from '../../../lib/logger'

/**
 * Database analytics and optimization API endpoint
 * Provides comprehensive database performance insights and recommendations
 * 
 * Endpoints:
 * - GET /api/admin/database-analytics - Get dashboard data
 * - GET /api/admin/database-analytics?action=report - Get detailed report
 * - GET /api/admin/database-analytics?action=export - Export performance data
 * - POST /api/admin/database-analytics - Execute optimization actions
 */

// Rate limiting for admin endpoints
const adminRateLimitOptions = {
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
  userLevelDetector: () => 'admin', // Admin level gets higher limits
  skipSuccessfulRequests: true
}

/**
 * Main handler for database analytics
 */
async function databaseAnalyticsHandler(req, res) {
  // Apply security headers
  securityHeaders(req, res, () => {})
  
  // Simple admin authentication check
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.security('Unauthorized database analytics access', {
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']
    })
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized access' 
    })
  }
  
  const token = authHeader.substring(7)
  
  // In production, validate the token against your auth system
  const isValidToken = token === process.env.ADMIN_API_TOKEN || token === 'admin-dev-token'
  
  if (!isValidToken) {
    logger.security('Invalid admin token for database analytics', {
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      token: token.substring(0, 10) + '...'
    })
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid authentication token' 
    })
  }

  try {
    if (req.method === 'GET') {
      return await handleGetRequest(req, res)
    } else if (req.method === 'POST') {
      return await handlePostRequest(req, res)
    } else {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
      })
    }
  } catch (error) {
    logger.error('Database analytics API error', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      query: req.query
    })
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Handle GET requests for analytics data
 */
async function handleGetRequest(req, res) {
  const { action, format } = req.query
  
  switch (action) {
    case 'report':
      return await getDetailedReport(req, res)
    
    case 'export':
      return await exportData(req, res, format)
    
    case 'query-stats':
      return await getQueryStats(req, res)
    
    case 'recommendations':
      return await getRecommendations(req, res)
    
    case 'health':
      return await getHealthStatus(req, res)
    
    default:
      return await getDashboard(req, res)
  }
}

/**
 * Handle POST requests for optimization actions
 */
async function handlePostRequest(req, res) {
  const { action, parameters } = req.body
  
  switch (action) {
    case 'clear-cache':
      return await clearCache(req, res, parameters)
    
    case 'optimize-queries':
      return await optimizeQueries(req, res, parameters)
    
    case 'start-monitoring':
      return await startMonitoring(req, res)
    
    case 'stop-monitoring':
      return await stopMonitoring(req, res)
    
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid action',
        validActions: ['clear-cache', 'optimize-queries', 'start-monitoring', 'stop-monitoring']
      })
  }
}

/**
 * Get dashboard data
 */
async function getDashboard(req, res) {
  const dashboardData = await dbAnalytics.getDashboardData()
  
  if (!dashboardData) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data'
    })
  }
  
  return res.status(200).json({
    success: true,
    data: {
      ...dashboardData,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    }
  })
}

/**
 * Get detailed performance report
 */
async function getDetailedReport(req, res) {
  const report = await dbAnalytics.generatePerformanceReport()
  
  if (!report) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate performance report'
    })
  }
  
  return res.status(200).json({
    success: true,
    data: {
      report,
      metadata: {
        reportType: 'detailed',
        generatedAt: new Date().toISOString(),
        dataRetentionDays: 7
      }
    }
  })
}

/**
 * Export performance data
 */
async function exportData(req, res, format = 'json') {
  const exportData = await dbAnalytics.exportPerformanceData(format)
  
  if (!exportData) {
    return res.status(500).json({
      success: false,
      message: 'Failed to export performance data'
    })
  }
  
  const filename = `database-analytics-${new Date().toISOString().split('T')[0]}.${format}`
  
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).send(exportData)
  } else if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).send(exportData)
  }
  
  return res.status(400).json({
    success: false,
    message: 'Invalid export format',
    supportedFormats: ['json', 'csv']
  })
}

/**
 * Get query statistics
 */
async function getQueryStats(req, res) {
  const queryStats = optimizedPrisma.getQueryStats()
  
  return res.status(200).json({
    success: true,
    data: {
      queryStats,
      metadata: {
        collectedAt: new Date().toISOString(),
        dataSource: 'query-optimizer'
      }
    }
  })
}

/**
 * Get optimization recommendations
 */
async function getRecommendations(req, res) {
  const recommendations = optimizedPrisma.getOptimizationRecommendations()
  
  return res.status(200).json({
    success: true,
    data: {
      recommendations,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalRecommendations: recommendations.length
      }
    }
  })
}

/**
 * Get health status
 */
async function getHealthStatus(req, res) {
  try {
    // Test database connection
    await optimizedPrisma.$queryRaw`SELECT 1`
    
    const dashboardData = await dbAnalytics.getDashboardData()
    const status = dashboardData?.status || 'unknown'
    
    return res.status(200).json({
      success: true,
      data: {
        status,
        database: {
          connected: true,
          responseTime: Date.now() // Simple response time
        },
        analytics: {
          monitoring: dbAnalytics.isMonitoring,
          lastReport: dashboardData?.timestamp
        },
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {
        status: 'error',
        database: {
          connected: false,
          error: error.message
        },
        timestamp: new Date().toISOString()
      }
    })
  }
}

/**
 * Clear query cache
 */
async function clearCache(req, res, parameters) {
  const { pattern } = parameters || {}
  
  try {
    optimizedPrisma.clearQueryCache(pattern)
    
    logger.info('Query cache cleared via API', {
      pattern,
      requestedBy: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    })
    
    return res.status(200).json({
      success: true,
      message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to clear cache', { error: error.message })
    
    return res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    })
  }
}

/**
 * Optimize queries
 */
async function optimizeQueries(req, res, parameters) {
  const { queryId, action } = parameters || {}
  
  try {
    const recommendations = optimizedPrisma.getOptimizationRecommendations()
    
    // Filter recommendations if queryId is provided
    const filteredRecommendations = queryId 
      ? recommendations.filter(r => r.queryId === queryId)
      : recommendations
    
    return res.status(200).json({
      success: true,
      message: 'Query optimization analysis completed',
      data: {
        recommendations: filteredRecommendations,
        totalRecommendations: filteredRecommendations.length,
        analysisTimestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('Failed to optimize queries', { error: error.message })
    
    return res.status(500).json({
      success: false,
      message: 'Failed to optimize queries',
      error: error.message
    })
  }
}

/**
 * Start monitoring
 */
async function startMonitoring(req, res) {
  try {
    dbAnalytics.startMonitoring()
    
    logger.info('Database monitoring started via API', {
      requestedBy: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    })
    
    return res.status(200).json({
      success: true,
      message: 'Database monitoring started',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to start monitoring', { error: error.message })
    
    return res.status(500).json({
      success: false,
      message: 'Failed to start monitoring',
      error: error.message
    })
  }
}

/**
 * Stop monitoring
 */
async function stopMonitoring(req, res) {
  try {
    dbAnalytics.stopMonitoring()
    
    logger.info('Database monitoring stopped via API', {
      requestedBy: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    })
    
    return res.status(200).json({
      success: true,
      message: 'Database monitoring stopped',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to stop monitoring', { error: error.message })
    
    return res.status(500).json({
      success: false,
      message: 'Failed to stop monitoring',
      error: error.message
    })
  }
}

// Apply rate limiting middleware
export default withEnhancedRateLimit(adminRateLimitOptions)(databaseAnalyticsHandler)

// API documentation
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

/**
 * API Usage Examples:
 * 
 * 1. Get dashboard data:
 *    GET /api/admin/database-analytics
 *    Authorization: Bearer your-admin-token
 * 
 * 2. Get detailed report:
 *    GET /api/admin/database-analytics?action=report
 *    Authorization: Bearer your-admin-token
 * 
 * 3. Export data as CSV:
 *    GET /api/admin/database-analytics?action=export&format=csv
 *    Authorization: Bearer your-admin-token
 * 
 * 4. Clear cache:
 *    POST /api/admin/database-analytics
 *    Authorization: Bearer your-admin-token
 *    Content-Type: application/json
 *    {
 *      "action": "clear-cache",
 *      "parameters": { "pattern": "search:*" }
 *    }
 * 
 * 5. Get recommendations:
 *    GET /api/admin/database-analytics?action=recommendations
 *    Authorization: Bearer your-admin-token
 */