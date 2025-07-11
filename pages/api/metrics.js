// pages/api/metrics.js - Application metrics endpoint
import { createAdminClient } from '../../lib/supabase'
import logger from '../../lib/logger'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Simple authentication check (you might want to implement proper auth)
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${process.env.METRICS_API_KEY}`) {
    logger.security('Unauthorized Metrics Access', {
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    })
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const supabase = createAdminClient()
    const metrics = {
      timestamp: new Date().toISOString(),
      application: {
        name: 'enterprise-data-platform',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
      },
      database: {},
      api: {},
      errors: []
    }

    // Database metrics
    try {
      // Companies count
      const { data: companiesCount, error: companiesError } = await supabase
        .from('companies')
        .select('count(*)', { count: 'exact' })
      
      if (companiesError) throw companiesError

      // Documents count  
      const { data: documentsCount, error: documentsError } = await supabase
        .from('documents')
        .select('count(*)', { count: 'exact' })
      
      if (documentsError) throw documentsError

      // Users count
      const { data: usersCount, error: usersError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact' })
      
      if (usersError) throw usersError

      // Recent activity (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: recentDocuments, error: recentDocsError } = await supabase
        .from('documents')
        .select('count(*)', { count: 'exact' })
        .gte('created_at', yesterday)
      
      const { data: recentUsers, error: recentUsersError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact' })
        .gte('last_login_at', yesterday)

      metrics.database = {
        connected: true,
        companies: companiesCount?.[0]?.count || 0,
        documents: documentsCount?.[0]?.count || 0,
        users: usersCount?.[0]?.count || 0,
        activity_24h: {
          new_documents: recentDocuments?.[0]?.count || 0,
          active_users: recentUsers?.[0]?.count || 0,
        }
      }
    } catch (error) {
      metrics.database = {
        connected: false,
        error: error.message
      }
      metrics.errors.push({
        component: 'database',
        error: error.message
      })
    }

    // Read log files for API metrics (if available)
    try {
      const fs = require('fs')
      const path = require('path')
      const logDir = path.join(process.cwd(), 'logs')
      
      if (fs.existsSync(logDir)) {
        const allLogFile = path.join(logDir, 'all.log')
        const errorLogFile = path.join(logDir, 'error.log')
        
        let totalRequests = 0
        let errorRequests = 0
        
        // Count requests from today's logs
        if (fs.existsSync(allLogFile)) {
          const logContent = fs.readFileSync(allLogFile, 'utf8')
          const today = new Date().toISOString().split('T')[0]
          const todayLogs = logContent.split('\n').filter(line => 
            line.includes(today) && line.includes('API Request')
          )
          totalRequests = todayLogs.length
        }
        
        // Count errors from today's logs
        if (fs.existsSync(errorLogFile)) {
          const errorContent = fs.readFileSync(errorLogFile, 'utf8')
          const today = new Date().toISOString().split('T')[0]
          const todayErrors = errorContent.split('\n').filter(line => 
            line.includes(today)
          )
          errorRequests = todayErrors.length
        }
        
        metrics.api = {
          requests_today: totalRequests,
          errors_today: errorRequests,
          error_rate: totalRequests > 0 ? (errorRequests / totalRequests * 100).toFixed(2) + '%' : '0%'
        }
      } else {
        metrics.api = {
          requests_today: 'N/A',
          errors_today: 'N/A',
          error_rate: 'N/A',
          note: 'Log files not available'
        }
      }
    } catch (error) {
      metrics.api = {
        error: error.message
      }
      metrics.errors.push({
        component: 'api_metrics',
        error: error.message
      })
    }

    // Performance metrics
    metrics.performance = {
      memory_usage_mb: Math.round(metrics.system.memory.heapUsed / 1024 / 1024),
      memory_usage_percent: Math.round(
        (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100
      ),
      uptime_hours: Math.round(metrics.application.uptime / 3600),
    }

    // Log metrics collection
    logger.info('Metrics Collected', {
      metricsRequested: true,
      databaseConnected: metrics.database.connected,
      metrics: {
        type: 'metrics_collection',
        companies: metrics.database.companies,
        documents: metrics.database.documents,
        users: metrics.database.users,
        memory_mb: metrics.performance.memory_usage_mb,
        uptime_hours: metrics.performance.uptime_hours,
      }
    })

    return res.status(200).json(metrics)

  } catch (error) {
    logger.error('Metrics Collection Error', { error })
    
    return res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}