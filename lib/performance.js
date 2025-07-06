// In-memory cache with TTL
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, value, ttlMs = 300000) { // 5 minutes default
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
    
    // Clean up expired entries
    setTimeout(() => {
      if (this.ttl.get(key) <= Date.now()) {
        this.cache.delete(key);
        this.ttl.delete(key);
      }
    }, ttlMs);
  }

  get(key) {
    if (this.ttl.get(key) <= Date.now()) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  has(key) {
    return this.cache.has(key) && this.ttl.get(key) > Date.now();
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache keys
export const CACHE_KEYS = {
  COMPANY_SEARCH: 'company_search',
  COMPANY_DETAILS: 'company_details',
  COMPANY_DOCUMENTS: 'company_documents',
  API_EXTERNAL: 'api_external'
};

// Cached company search
export async function getCachedCompanySearch(query, limit = 20) {
  const cacheKey = `${CACHE_KEYS.COMPANY_SEARCH}:${query}:${limit}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    // This will be imported dynamically when needed
    const { createAdminClient } = await import('./supabase');
    const supabase = createAdminClient();
    
    // Use the optimized search function
    const { data, error } = await supabase
      .rpc('search_companies', {
        search_term: query,
        limit_count: limit
      });

    if (error) throw error;

    const result = data || [];
    cache.set(cacheKey, result, 300000); // 5 minutes
    return result;
  } catch (error) {
    console.error('Cached company search error:', error);
    return [];
  }
}

// Cached company details
export async function getCachedCompanyDetails(siren) {
  const cacheKey = `${CACHE_KEYS.COMPANY_DETAILS}:${siren}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    // This will be imported dynamically when needed
    const { createAdminClient } = await import('./supabase');
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        documents(
          id,
          date_publication,
          type_document,
          source,
          description
        ),
        financial_ratios(
          year,
          ratio_type,
          value
        )
      `)
      .eq('siren', siren)
      .order('documents(date_publication)', { ascending: false })
      .order('financial_ratios(year)', { ascending: false })
      .limit(10, { foreignTable: 'documents' })
      .limit(5, { foreignTable: 'financial_ratios' })
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const result = data || null;
    cache.set(cacheKey, result, 600000); // 10 minutes
    return result;
  } catch (error) {
    console.error('Cached company details error:', error);
    return null;
  }
}

// Debounced search function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Performance monitoring
export class PerformanceMonitor {
  static startTimer(label) {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  }

  static measureAsync(label, asyncFn) {
    return async (...args) => {
      const timer = this.startTimer(label);
      try {
        const result = await asyncFn(...args);
        timer.end();
        return result;
      } catch (error) {
        timer.end();
        throw error;
      }
    };
  }
}

// API response caching middleware
export function withCache(ttlMs = 300000) {
  return function cacheMiddleware(handler) {
    return async (req, res) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return handler(req, res);
      }

      const cacheKey = `api:${req.url}`;
      
      if (cache.has(cacheKey)) {
        const cachedResponse = cache.get(cacheKey);
        return res.status(200).json({
          ...cachedResponse,
          _cached: true,
          _cacheTime: new Date().toISOString()
        });
      }

      // Intercept res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200) {
          cache.set(cacheKey, data, ttlMs);
        }
        return originalJson.call(this, data);
      };

      return handler(req, res);
    };
  };
}

// Bundle size optimization helpers
export const lazy = {
  // Lazy load heavy components
  loadComponent: async (importFn) => {
    const React = await import('react');
    return React.lazy(importFn);
  },

  // Lazy load libraries
  loadLibrary: async (importFn) => {
    const moduleResult = await importFn();
    return moduleResult.default || moduleResult;
  }
};

// Database query optimization
export const dbOptimizations = {
  // Batch multiple queries
  batchQueries: async (queries) => {
    const results = await Promise.allSettled(queries);
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  },

  // Paginated query helper
  paginatedQuery: async (table, { page = 1, limit = 20, filters = {}, orderBy = 'created_at' }) => {
    const { createAdminClient } = await import('./supabase');
    const supabase = createAdminClient();
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from(table)
      .select('*', { count: 'exact' });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error, count } = await query
      .order(orderBy, { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: to < (count || 0) - 1,
        hasPrev: page > 1
      }
    };
  }
};

export default {
  cache,
  CACHE_KEYS,
  getCachedCompanySearch,
  getCachedCompanyDetails,
  debounce,
  PerformanceMonitor,
  withCache,
  lazy,
  dbOptimizations
};