// lib/database/analytics-service.js - Database Performance Analytics Service
//==============================================================================

import { optimizedPrisma } from './query-optimizer'
import logger from '../logger'

/**
 * Database analytics service for monitoring and optimizing database performance
 * Provides real-time insights, performance tracking, and optimization recommendations
 */

class DatabaseAnalyticsService {
  constructor() {
    this.performanceMetrics = new Map()
    this.queryPatterns = new Map()
    this.indexUsage = new Map()
    this.slowQueryThreshold = 1000 // 1 second
    this.isMonitoring = false
    
    // Performance baselines
    this.baselines = {
      searchQuery: 500,      // 500ms
      companyDetail: 300,    // 300ms
      documentLookup: 200,   // 200ms
      batchOperation: 2000   // 2 seconds
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    
    // Monitor query performance every 5 minutes
    setInterval(() => {
      this.collectPerformanceMetrics()
    }, 5 * 60 * 1000)
    
    // Generate reports every hour
    setInterval(() => {
      this.generatePerformanceReport()
    }, 60 * 60 * 1000)
    
    // Cleanup old metrics every 24 hours
    setInterval(() => {
      this.cleanupOldMetrics()
    }, 24 * 60 * 60 * 1000)
    
    logger.info('Database analytics monitoring started')
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false
    logger.info('Database analytics monitoring stopped')
  }

  /**
   * Collect performance metrics from database
   */
  async collectPerformanceMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        tables: await this.getTableStatistics(),
        indexes: await this.getIndexUsage(),
        queries: await this.getQueryPerformance(),
        connections: await this.getConnectionStats(),
        storage: await this.getStorageStats()
      }
      
      this.performanceMetrics.set(metrics.timestamp, metrics)
      
      // Alert on performance degradation
      this.checkPerformanceAlerts(metrics)
      
      return metrics
    } catch (error) {
      logger.error('Failed to collect performance metrics', {
        error: error.message
      })
      return null
    }
  }

  /**
   * Get table statistics
   */
  async getTableStatistics() {
    try {
      const [
        companyCount,
        documentCount,
        financialRatioCount,
        userCount,
        activeCompanies,
        recentDocuments
      ] = await Promise.all([
        optimizedPrisma.company.count(),
        optimizedPrisma.document.count(),
        optimizedPrisma.financialRatio.count(),
        optimizedPrisma.user.count(),
        optimizedPrisma.company.count({ where: { active: true } }),
        optimizedPrisma.document.count({
          where: {
            datePublication: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        })
      ])

      return {
        company: {
          total: companyCount,
          active: activeCompanies,
          inactive: companyCount - activeCompanies
        },
        document: {
          total: documentCount,
          recent: recentDocuments
        },
        financialRatio: {
          total: financialRatioCount
        },
        user: {
          total: userCount
        }
      }
    } catch (error) {
      logger.error('Failed to get table statistics', { error: error.message })
      return {}
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsage() {
    try {
      // This would need to be implemented based on specific database
      // For SQLite, we can use PRAGMA index_info and PRAGMA index_list
      // For PostgreSQL, we can use pg_stat_user_indexes
      
      const indexStats = {
        totalIndexes: 0,
        usedIndexes: 0,
        unusedIndexes: 0,
        topIndexes: [],
        recommendations: []
      }
      
      // Simulate index usage data
      const mockIndexes = [
        { name: 'idx_company_siren', usage: 95, efficiency: 98 },
        { name: 'idx_company_denomination_search', usage: 87, efficiency: 89 },
        { name: 'idx_document_company_date_type', usage: 76, efficiency: 92 },
        { name: 'idx_company_code_ape_active', usage: 45, efficiency: 78 },
        { name: 'idx_financial_ratio_company_year_desc', usage: 23, efficiency: 85 }
      ]
      
      indexStats.totalIndexes = mockIndexes.length
      indexStats.usedIndexes = mockIndexes.filter(i => i.usage > 10).length
      indexStats.unusedIndexes = mockIndexes.filter(i => i.usage <= 10).length
      indexStats.topIndexes = mockIndexes.sort((a, b) => b.usage - a.usage).slice(0, 5)
      
      // Generate recommendations
      mockIndexes.forEach(index => {
        if (index.usage < 10) {
          indexStats.recommendations.push({
            type: 'unused_index',
            index: index.name,
            message: `Index ${index.name} is rarely used and could be dropped`
          })
        } else if (index.efficiency < 70) {
          indexStats.recommendations.push({
            type: 'inefficient_index',
            index: index.name,
            message: `Index ${index.name} has low efficiency and should be reviewed`
          })
        }
      })
      
      return indexStats
    } catch (error) {
      logger.error('Failed to get index usage', { error: error.message })
      return {}
    }
  }

  /**
   * Get query performance metrics
   */
  async getQueryPerformance() {
    try {
      const queryStats = optimizedPrisma.getQueryStats()
      
      // Add baseline comparisons
      const performance = {
        ...queryStats,
        baselineComparisons: this.compareWithBaselines(queryStats),
        trends: this.calculatePerformanceTrends(),
        alerts: this.generatePerformanceAlerts(queryStats)
      }
      
      return performance
    } catch (error) {
      logger.error('Failed to get query performance', { error: error.message })
      return {}
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats() {
    return {
      activeConnections: 1, // Single connection for SQLite
      maxConnections: 1,
      connectionUtilization: 100,
      avgConnectionTime: 0
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      // This would need to be implemented based on database type
      return {
        totalSize: 0,
        indexSize: 0,
        dataSize: 0,
        growthRate: 0
      }
    } catch (error) {
      logger.error('Failed to get storage stats', { error: error.message })
      return {}
    }
  }

  /**
   * Compare performance with baselines
   */
  compareWithBaselines(queryStats) {
    const comparisons = {}
    
    if (queryStats.topSlowQueries) {
      queryStats.topSlowQueries.forEach(query => {
        const baseline = this.baselines[query.queryId] || 1000
        const deviation = ((query.avgDuration - baseline) / baseline) * 100
        
        comparisons[query.queryId] = {
          current: query.avgDuration,
          baseline: baseline,
          deviation: deviation,
          status: deviation > 50 ? 'critical' : deviation > 20 ? 'warning' : 'good'
        }
      })
    }
    
    return comparisons
  }

  /**
   * Calculate performance trends
   */
  calculatePerformanceTrends() {
    const trends = {}
    const recentMetrics = Array.from(this.performanceMetrics.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10) // Last 10 data points
    
    if (recentMetrics.length >= 2) {
      const latest = recentMetrics[0]
      const previous = recentMetrics[1]
      
      // Calculate trends for various metrics
      if (latest.queries && previous.queries) {
        trends.avgDuration = this.calculateTrend(
          latest.queries.avgDuration,
          previous.queries.avgDuration
        )
        
        trends.cacheHitRate = this.calculateTrend(
          latest.queries.cacheHitRate,
          previous.queries.cacheHitRate
        )
        
        trends.slowQueries = this.calculateTrend(
          latest.queries.slowQueries,
          previous.queries.slowQueries
        )
      }
    }
    
    return trends
  }

  /**
   * Calculate trend for a metric
   */
  calculateTrend(current, previous) {
    if (previous === 0) return 0
    
    const change = ((current - previous) / previous) * 100
    return {
      current,
      previous,
      change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    }
  }

  /**
   * Generate performance alerts
   */
  generatePerformanceAlerts(queryStats) {
    const alerts = []
    
    // Check for slow queries
    if (queryStats.avgDuration > this.slowQueryThreshold) {
      alerts.push({
        type: 'slow_queries',
        severity: 'warning',
        message: `Average query duration is ${queryStats.avgDuration}ms (threshold: ${this.slowQueryThreshold}ms)`,
        recommendations: [
          'Add database indexes',
          'Optimize slow queries',
          'Consider caching frequently accessed data'
        ]
      })
    }
    
    // Check cache hit rate
    if (queryStats.cacheHitRate < 0.5) {
      alerts.push({
        type: 'low_cache_hit_rate',
        severity: 'info',
        message: `Cache hit rate is ${Math.round(queryStats.cacheHitRate * 100)}%`,
        recommendations: [
          'Increase cache TTL for stable data',
          'Add caching to more queries',
          'Review cache invalidation strategy'
        ]
      })
    }
    
    // Check for high error rate
    const totalQueries = queryStats.totalExecutions || 1
    const errorRate = (queryStats.recentErrors?.length || 0) / totalQueries
    
    if (errorRate > 0.05) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Query error rate is ${Math.round(errorRate * 100)}%`,
        recommendations: [
          'Investigate query errors',
          'Add error handling',
          'Review database schema'
        ]
      })
    }
    
    return alerts
  }

  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts(metrics) {
    const alerts = []
    
    // Check for performance degradation
    if (metrics.queries?.avgDuration > this.slowQueryThreshold * 2) {
      alerts.push({
        type: 'performance_degradation',
        severity: 'critical',
        message: `Severe performance degradation detected: ${metrics.queries.avgDuration}ms average`,
        timestamp: Date.now()
      })
    }
    
    // Check for storage issues
    if (metrics.storage?.growthRate > 100) {
      alerts.push({
        type: 'storage_growth',
        severity: 'warning',
        message: `High storage growth rate: ${metrics.storage.growthRate}% increase`,
        timestamp: Date.now()
      })
    }
    
    // Log alerts
    alerts.forEach(alert => {
      logger.warn('Database performance alert', alert)
    })
    
    return alerts
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport() {
    try {
      const metrics = await this.collectPerformanceMetrics()
      if (!metrics) return null
      
      const report = {
        timestamp: Date.now(),
        summary: {
          status: this.getOverallStatus(metrics),
          totalQueries: metrics.queries?.totalExecutions || 0,
          avgDuration: metrics.queries?.avgDuration || 0,
          cacheHitRate: metrics.queries?.cacheHitRate || 0,
          slowQueries: metrics.queries?.slowQueries || 0
        },
        tables: metrics.tables,
        indexes: metrics.indexes,
        queries: metrics.queries,
        alerts: metrics.queries?.alerts || [],
        recommendations: this.generateRecommendations(metrics),
        trends: metrics.queries?.trends || {}
      }
      
      // Log report summary
      logger.info('Database performance report generated', {
        status: report.summary.status,
        totalQueries: report.summary.totalQueries,
        avgDuration: report.summary.avgDuration,
        alertCount: report.alerts.length
      })
      
      return report
    } catch (error) {
      logger.error('Failed to generate performance report', {
        error: error.message
      })
      return null
    }
  }

  /**
   * Get overall system status
   */
  getOverallStatus(metrics) {
    const alerts = metrics.queries?.alerts || []
    const criticalAlerts = alerts.filter(a => a.severity === 'critical')
    const warningAlerts = alerts.filter(a => a.severity === 'warning')
    
    if (criticalAlerts.length > 0) return 'critical'
    if (warningAlerts.length > 0) return 'warning'
    if (metrics.queries?.avgDuration > this.slowQueryThreshold) return 'degraded'
    return 'healthy'
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = []
    
    // Query optimization recommendations
    if (metrics.queries) {
      recommendations.push(...optimizedPrisma.getOptimizationRecommendations())
    }
    
    // Index recommendations
    if (metrics.indexes?.recommendations) {
      recommendations.push(...metrics.indexes.recommendations)
    }
    
    // Storage recommendations
    if (metrics.storage?.growthRate > 50) {
      recommendations.push({
        type: 'storage',
        priority: 'medium',
        message: 'High storage growth detected',
        actions: [
          'Implement data archiving',
          'Review data retention policies',
          'Consider data compression'
        ]
      })
    }
    
    return recommendations
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days
    
    for (const [timestamp] of this.performanceMetrics.entries()) {
      if (timestamp < cutoff) {
        this.performanceMetrics.delete(timestamp)
      }
    }
    
    logger.info('Old performance metrics cleaned up')
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData() {
    try {
      const [
        currentMetrics,
        queryStats,
        recommendations
      ] = await Promise.all([
        this.collectPerformanceMetrics(),
        optimizedPrisma.getQueryStats(),
        optimizedPrisma.getOptimizationRecommendations()
      ])
      
      return {
        timestamp: Date.now(),
        status: this.getOverallStatus(currentMetrics),
        metrics: {
          queries: queryStats,
          tables: currentMetrics?.tables || {},
          indexes: currentMetrics?.indexes || {},
          performance: currentMetrics?.queries || {}
        },
        recommendations: recommendations.slice(0, 10), // Top 10 recommendations
        alerts: currentMetrics?.queries?.alerts || []
      }
    } catch (error) {
      logger.error('Failed to get dashboard data', { error: error.message })
      return null
    }
  }

  /**
   * Export performance data
   */
  async exportPerformanceData(format = 'json') {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        metrics: Array.from(this.performanceMetrics.values()),
        queryStats: optimizedPrisma.getQueryStats(),
        recommendations: optimizedPrisma.getOptimizationRecommendations()
      }
      
      if (format === 'json') {
        return JSON.stringify(data, null, 2)
      } else if (format === 'csv') {
        return this.convertToCSV(data)
      }
      
      return data
    } catch (error) {
      logger.error('Failed to export performance data', { error: error.message })
      return null
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simple CSV conversion for metrics
    const csv = ['timestamp,avgDuration,cacheHitRate,slowQueries,totalExecutions']
    
    data.metrics.forEach(metric => {
      if (metric.queries) {
        csv.push([
          metric.timestamp,
          metric.queries.avgDuration || 0,
          metric.queries.cacheHitRate || 0,
          metric.queries.slowQueries || 0,
          metric.queries.totalExecutions || 0
        ].join(','))
      }
    })
    
    return csv.join('\n')
  }
}

// Create singleton instance
const dbAnalytics = new DatabaseAnalyticsService()

export { dbAnalytics }
export default dbAnalytics