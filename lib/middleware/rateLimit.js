import rateLimit from 'express-rate-limit';

// In-memory store for rate limiting (use Redis in production)
const store = new Map();

// Custom store implementation for Next.js
class NextJSStore {
  constructor() {
    this.hits = new Map();
  }

  incr(key, cb) {
    const now = Date.now();
    const record = this.hits.get(key) || { count: 0, resetTime: now + 15 * 60 * 1000 };
    
    // Reset if window has expired
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + 15 * 60 * 1000;
    }
    
    record.count++;
    this.hits.set(key, record);
    
    cb(null, record.count, record.resetTime);
  }

  decrement(key) {
    const record = this.hits.get(key);
    if (record && record.count > 0) {
      record.count--;
      this.hits.set(key, record);
    }
  }

  resetKey(key) {
    this.hits.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.hits.entries()) {
      if (now > record.resetTime) {
        this.hits.delete(key);
      }
    }
  }
}

const store_instance = new NextJSStore();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  store_instance.cleanup();
}, 5 * 60 * 1000);

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  store: store_instance,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use forwarded IP if behind proxy, otherwise use connection remote address
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress ||
           req.ip;
  }
});

// Strict rate limiter for search endpoints
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 search requests per windowMs
  store: store_instance,
  message: {
    success: false,
    error: 'Search rate limit exceeded',
    message: 'Too many search requests. Please wait before searching again.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress ||
               req.ip;
    return `search:${ip}`;
  }
});

// Authentication rate limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  store: store_instance,
  message: {
    success: false,
    error: 'Authentication rate limit exceeded',
    message: 'Too many authentication attempts. Please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress ||
               req.ip;
    return `auth:${ip}`;
  }
});

// Rate limiter middleware wrapper for Next.js API routes
export const withRateLimit = (limiter) => {
  return (handler) => {
    return async (req, res) => {
      return new Promise((resolve, reject) => {
        limiter(req, res, (result) => {
          if (result instanceof Error) {
            reject(result);
          } else {
            handler(req, res).then(resolve).catch(reject);
          }
        });
      });
    };
  };
};

// Helper to check if request is rate limited
export const isRateLimited = (req, limiter) => {
  return new Promise((resolve) => {
    const originalSend = req.res.send;
    let isLimited = false;
    
    req.res.send = function(data) {
      if (typeof data === 'object' && data.error && data.error.includes('rate limit')) {
        isLimited = true;
      }
      return originalSend.call(this, data);
    };
    
    limiter(req, req.res, () => {
      req.res.send = originalSend;
      resolve(isLimited);
    });
  });
};

// Get rate limit status for an IP
export const getRateLimitStatus = (ip, windowMs = 15 * 60 * 1000) => {
  const record = store_instance.hits.get(ip);
  if (!record) {
    return {
      count: 0,
      remaining: 100,
      resetTime: Date.now() + windowMs,
      limited: false
    };
  }
  
  const now = Date.now();
  const isExpired = now > record.resetTime;
  
  if (isExpired) {
    return {
      count: 0,
      remaining: 100,
      resetTime: now + windowMs,
      limited: false
    };
  }
  
  return {
    count: record.count,
    remaining: Math.max(0, 100 - record.count),
    resetTime: record.resetTime,
    limited: record.count >= 100
  };
};