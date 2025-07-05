// lib/supabase.js - Supabase client configuration
import { createClient } from '@supabase/supabase-js';

// Public client for client-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'datacorp-platform@1.0.0'
    }
  }
});

// Admin client for server-side operations (with service role key)
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin operations');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });
};

// Database table names - keeping consistency with Prisma schema
export const TABLES = {
  COMPANIES: 'companies',
  DOCUMENTS: 'documents', 
  FINANCIAL_RATIOS: 'financial_ratios',
  USERS: 'users'
};

// Helper function to handle Supabase errors
export const handleSupabaseError = (error, operation = 'Database operation') => {
  console.error(`${operation} failed:`, error);
  
  // Common Supabase error handling
  if (error?.code === 'PGRST116') {
    throw new Error('Resource not found');
  }
  
  if (error?.code === '23505') {
    throw new Error('Duplicate entry - resource already exists');
  }
  
  if (error?.code === '42501') {
    throw new Error('Insufficient permissions');
  }
  
  throw new Error(error?.message || 'Database operation failed');
};

// Utility functions for common operations
export const supabaseUtils = {
  // Generic insert with error handling
  async insert(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, `Insert into ${table}`);
    }
    
    return result;
  },

  // Generic update with error handling
  async update(table, id, data) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, `Update ${table}`);
    }
    
    return result;
  },

  // Generic delete with error handling
  async delete(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) {
      handleSupabaseError(error, `Delete from ${table}`);
    }
    
    return true;
  },

  // Generic find by ID
  async findById(table, id) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      handleSupabaseError(error, `Find by ID in ${table}`);
    }
    
    return data;
  },

  // Generic search with pagination
  async search(table, filters = {}, options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      orderBy = 'created_at', 
      ascending = false 
    } = options;
    
    let query = supabase.from(table).select('*', { count: 'exact' });
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'string' && value.includes('%')) {
          query = query.ilike(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });
    
    // Apply pagination and ordering
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .order(orderBy, { ascending })
      .range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
      handleSupabaseError(error, `Search in ${table}`);
    }
    
    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }
};

export default supabase;