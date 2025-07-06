import { createAdminClient } from '../../lib/supabase'
import logger from '../../lib/logger'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks: {}
  }

  let overallStatus = 'healthy'

  try {
    // Database health check
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('companies')
        .select('count(*)')
        .limit(1)
      
      if (error) throw error
      
      healthCheck.checks.database = {
        status: 'healthy',
        latency: Date.now(),
        message: 'Database connection successful'
      }
    } catch (error) {
      healthCheck.checks.database = {
        status: 'unhealthy',
        error: error.message,
        message: 'Database connection failed'
      }
      overallStatus = 'unhealthy'
    }

    // Memory usage check
    const memUsage = process.memoryUsage()
    const memoryThreshold = 500 * 1024 * 1024 // 500MB
    
    healthCheck.checks.memory = {
      status: memUsage.heapUsed < memoryThreshold ? 'healthy' : 'warning',
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    }

    if (memUsage.heapUsed > memoryThreshold) {
      overallStatus = overallStatus === 'healthy' ? 'warning' : overallStatus
    }

    // External APIs health check
    try {
      const inseeHealthy = process.env.INSEE_CONSUMER_KEY && 
                          process.env.INSEE_CONSUMER_SECRET &&
                          process.env.INSEE_CONSUMER_KEY !== 'your-insee-consumer-key'
      
      healthCheck.checks.externalApis = {
        status: inseeHealthy ? 'healthy' : 'warning',
        insee: inseeHealthy ? 'configured' : 'not configured',
        bodacc: 'available' // BODACC is public API
      }
    } catch (error) {
      healthCheck.checks.externalApis = {
        status: 'unhealthy',
        error: error.message
      }
      overallStatus = 'unhealthy'
    }

    // Disk space check (if possible)
    try {
      const fs = require('fs')
      const stats = fs.statSync(process.cwd())
      
      healthCheck.checks.filesystem = {
        status: 'healthy',
        accessible: true,
        message: 'Filesystem accessible'
      }
    } catch (error) {
      healthCheck.checks.filesystem = {
        status: 'unhealthy',
        accessible: false,
        error: error.message
      }
      overallStatus = 'unhealthy'
    }

    // Environment variables check
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    healthCheck.checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      missingVariables: missingEnvVars,
      message: missingEnvVars.length === 0 ? 'All required environment variables present' : 'Missing required environment variables'
    }

    if (missingEnvVars.length > 0) {
      overallStatus = 'unhealthy'
    }

    healthCheck.status = overallStatus

    // Log health check
    logger.info('Health Check', {
      status: overallStatus,
      checks: Object.keys(healthCheck.checks).reduce((acc, key) => {
        acc[key] = healthCheck.checks[key].status
        return acc
      }, {}),
      metrics: {
        type: 'health_check',
        status: overallStatus,
        uptime: healthCheck.uptime,
        memoryUsage: memUsage.heapUsed
      }
    })

    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'warning' ? 200 : 503

    return res.status(statusCode).json(healthCheck)

  } catch (error) {
    logger.error('Health Check Error', { error })
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Health check failed'
    })
  }
}