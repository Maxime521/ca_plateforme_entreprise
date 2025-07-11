// utils/logger.js - Structured logging

class Logger {
  constructor(context = 'APP') {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...meta
    };

    if (this.isDevelopment) {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      // In production, send to logging service (e.g., DataDog, CloudWatch)
      console.log(JSON.stringify(logEntry));
    }
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  debug(message, meta = {}) {
    if (this.isDevelopment) {
      this.log('DEBUG', message, meta);
    }
  }

  // API-specific logging
  apiRequest(method, url, duration, status, meta = {}) {
    this.info('API Request', {
      method,
      url,
      duration,
      status,
      type: 'api_request',
      ...meta
    });
  }

  apiError(method, url, error, meta = {}) {
    this.error('API Error', {
      method,
      url,
      error: error.message,
      stack: error.stack,
      type: 'api_error',
      ...meta
    });
  }

  // Performance logging
  performance(operation, duration, meta = {}) {
    this.info('Performance', {
      operation,
      duration,
      type: 'performance',
      ...meta
    });
  }
}

// Performance monitoring wrapper
class PerformanceMonitor {
  static async measure(name, fn, logger) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      logger.performance(name, duration, { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.performance(name, duration, { success: false, error: error.message });
      throw error;
    }
  }
}

// API Route monitoring middleware
export function withMonitoring(handler, context = 'API') {
  return async (req, res) => {
    const logger = new Logger(context);
    const start = Date.now();
    const method = req.method;
    const url = req.url;

    try {
      logger.info('Request started', {
        method,
        url,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });

      const result = await handler(req, res);
      const duration = Date.now() - start;
      
      logger.apiRequest(method, url, duration, res.statusCode);
      return result;

    } catch (error) {
      const duration = Date.now() - start;
      logger.apiError(method, url, error, {
        duration,
        statusCode: res.statusCode
      });
      throw error;
    }
  };
}

// Rate limiting and caching
class APIRateLimiter {
  constructor() {
    this.requests = new Map();
    this.windowMs = 60 * 1000; // 1 minute
    this.maxRequests = 100;
  }

  isRateLimited(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return true;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return false;
  }
}

// Cache implementation
class SimpleCache {
  constructor(ttlMs = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Health check system
class HealthChecker {
  constructor() {
    this.checks = new Map();
  }

  addCheck(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  async runHealthCheck() {
    const results = {};
    const startTime = Date.now();

    for (const [name, checkFn] of this.checks) {
      try {
        const checkStart = Date.now();
        const result = await Promise.race([
          checkFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        results[name] = {
          status: 'healthy',
          duration: Date.now() - checkStart,
          details: result
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          duration: Date.now() - checkStart,
          error: error.message
        };
      }
    }

    const overallStatus = Object.values(results).every(r => r.status === 'healthy') 
      ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      checks: results
    };
  }
}

// Enhanced API wrapper with monitoring
class MonitoredAPIService {
  constructor(name, baseConfig = {}) {
    this.name = name;
    this.logger = new Logger(`API_${name.toUpperCase()}`);
    this.cache = new SimpleCache();
    this.rateLimiter = new APIRateLimiter();
    this.config = baseConfig;
  }

  async request(url, options = {}) {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit', { url, cacheKey });
      return cached;
    }

    // Check rate limiting
    if (this.rateLimiter.isRateLimited(this.name)) {
      throw new Error(`Rate limit exceeded for ${this.name}`);
    }

    return PerformanceMonitor.measure(
      `${this.name}_request`,
      async () => {
        const response = await fetch(url, {
          ...this.config,
          ...options,
          headers: {
            'User-Agent': 'DataCorp-Platform/1.0',
            ...this.config.headers,
            ...options.headers
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Cache successful responses
        this.cache.set(cacheKey, data);
        
        return data;
      },
      this.logger
    );
  }
}

// Export instances
export const logger = new Logger();
export const performanceMonitor = PerformanceMonitor;
export const healthChecker = new HealthChecker();
export const apiCache = new SimpleCache();

// Add default health checks
healthChecker.addCheck('database', async () => {
  // Check database connection
  const { prisma } = require('../lib/prisma');
  await prisma.$queryRaw`SELECT 1`;
  return { connection: 'ok' };
});

healthChecker.addCheck('insee_api', async () => {
  // Check INSEE API availability
  const response = await fetch('https://api.insee.fr/entreprises/sirene/V3.11/informations');
  return { status: response.status };
});

healthChecker.addCheck('bodacc_api', async () => {
  // Check BODACC API availability
  const response = await fetch('https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records?limit=1');
  return { status: response.status };
});
