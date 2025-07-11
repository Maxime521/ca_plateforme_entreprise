// hooks/useAuth.js - ENHANCED VERSION with Auto-Redirect - MIGRATED TO SUPABASE
import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { canAccessFeature, hasPermission, ROLES } from '../utils/rolePermissions';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [permissions, setPermissions] = useState({});
  const [syncCache, setSyncCache] = useState(new Map()); // Cache for user sync data
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      }
      await handleAuthStateChange(session);
      setLoading(false);
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔥 Supabase auth event:', event);
      await handleAuthStateChange(session);
    });

    getInitialSession();

    const timeoutId = setTimeout(() => {
      console.log('⏰ Auth timeout - setting loading to false');
      setLoading(false);
    }, 5000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [router]);

  const handleAuthStateChange = async (session) => {
    try {
      if (session?.user) {
        console.log('🔥 User signed in:', session.user.email);
        
        // Sync user with database and get role
        const userData = await syncUserWithDatabase(session.user);
        
        // Combine Supabase auth user with database user data
        const enhancedUser = {
          ...session.user,
          displayName: userData?.display_name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
          name: userData?.display_name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
          role: userData?.role || 'user',
          photoURL: userData?.photo_url || session.user.user_metadata?.avatar_url
        };

        // Debug log for troubleshooting display names (will be removed)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Enhanced user data:', {
            email: session.user.email,
            databaseDisplayName: userData?.display_name,
            finalDisplayName: enhancedUser.displayName
          });
        }
        
        setUser(enhancedUser);
        
        // Set role with fallback and explicit logging
        const finalRole = userData?.role || 'user';
        console.log('🔑 Setting final user role:', finalRole, 'for user:', session.user.email);
        setUserRole(finalRole);
        setPermissions(userData?.permissions || {});
      } else {
        console.log('👋 User signed out - redirecting to home');
        
        // ✅ AUTO-REDIRECT ON LOGOUT
        setUser(null);
        setUserRole('user');
        setPermissions({});
        
        // Only redirect if not already on home page or login page
        const currentPath = router.pathname;
        const publicPaths = ['/', '/login', '/register'];
        
        if (!publicPaths.includes(currentPath)) {
          console.log(`🏠 Auto-redirecting from ${currentPath} to home page`);
          await router.replace('/');
        }
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      setUser(null);
      setUserRole('user');
      setPermissions({});
      
      // Redirect to home on error too
      if (router.pathname !== '/') {
        await router.replace('/');
      }
    }
  };

  const syncUserWithDatabase = async (supabaseUser) => {
    try {
      // Check cache first to avoid redundant API calls
      const cacheKey = `${supabaseUser.id}_${supabaseUser.email}`;
      const cachedData = syncCache.get(cacheKey);
      
      // Return cached data if it's less than 5 minutes old
      if (cachedData && (Date.now() - cachedData.timestamp) < 5 * 60 * 1000) {
        console.log('🚀 Using cached user data for:', supabaseUser.email);
        return cachedData.data;
      }
      
      console.log('🔄 Syncing user with database:', supabaseUser.email);
      
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token).catch(() => 'no-token')}`
        },
        body: JSON.stringify({
          uid: supabaseUser.id,
          email: supabaseUser.email,
          displayName: supabaseUser.user_metadata?.displayName || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
          photoURL: supabaseUser.user_metadata?.photoURL || supabaseUser.user_metadata?.avatar_url
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Database sync failed:', errorData.message || 'Unknown error');
        return null;
      }

      const data = await response.json();
      console.log('✅ User synced with database:', data.user?.email, 'Role:', data.user?.role);
      
      // Cache the result to avoid redundant calls (reuse existing cacheKey)
      setSyncCache(prevCache => {
        const newCache = new Map(prevCache);
        newCache.set(cacheKey, {
          data: data.user,
          timestamp: Date.now()
        });
        return newCache;
      });
      
      // Force update the role state immediately
      if (data.user?.role) {
        console.log('🔄 Setting user role to:', data.user.role);
        setUserRole(data.user.role);
      }
      
      return data.user;
    } catch (error) {
      console.warn('Database sync error (continuing anyway):', error.message);
      return null;
    }
  };

  // Role checking utilities
  const isAdmin = () => userRole === ROLES.ADMIN;
  const isUser = () => userRole === ROLES.USER;
  const hasUserPermission = (permission) => hasPermission(userRole, permission);
  const canUserAccessFeature = (feature) => canAccessFeature(userRole, feature);

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // ✅ REDIRECT TO SEARCH PAGE AFTER LOGIN
      console.log('🎯 Login successful - redirecting to search page');
      await router.push('/recherche');
      
      return data.user;
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName = '') => {
    try {
      setError(null);
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            displayName: displayName,
            full_name: displayName
          }
        }
      });
      
      if (error) throw error;
      
      // ✅ REDIRECT TO SEARCH PAGE AFTER REGISTRATION
      console.log('🎯 Registration successful - redirecting to search page');
      await router.push('/recherche');
      
      return data.user;
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('🚪 Logging out user...');
    
    // Clear local state immediately
    setUser(null);
    setUserRole('user');
    setPermissions({});
    setError(null);
    
    // Try to sign out from Supabase in background
    supabase.auth.signOut().catch(error => {
      console.warn('Background logout warning (ignored):', error.message);
    });
    
    // Redirect immediately
    console.log('✅ Logout completed - redirecting to home');
    await router.replace('/');
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const getErrorMessage = (error) => {
    // Supabase error codes and messages
    switch (error.message) {
      case 'Email not confirmed':
        return 'Veuillez confirmer votre email avant de vous connecter';
      case 'Invalid login credentials':
      case 'Invalid email or password':
        return 'Email ou mot de passe incorrect';
      case 'User already registered':
        return 'Cette adresse email est déjà utilisée';
      case 'Password should be at least 6 characters':
        return 'Le mot de passe doit contenir au moins 6 caractères';
      case 'Unable to validate email address: invalid format':
        return 'Adresse email invalide';
      case 'Email rate limit exceeded':
        return 'Trop de tentatives. Veuillez réessayer plus tard';
      case 'signup is disabled':
        return 'Les inscriptions sont temporairement désactivées';
      default:
        return error.message || 'Une erreur est survenue';
    }
  };

  // Debug function to check current state
  const debugAuthState = () => {
    console.log('🔍 Current Auth State:', {
      user: user?.email,
      userRole,
      isAdmin: isAdmin(),
      permissions,
      loading
    });
  };

  const value = {
    user,
    loading,
    error,
    userRole,
    permissions,
    isAdmin,
    isUser,
    hasPermission: hasUserPermission,
    canAccessFeature: canUserAccessFeature,
    login,
    register,
    logout,
    resetPassword,
    clearError,
    debugAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
