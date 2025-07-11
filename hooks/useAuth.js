// hooks/useAuth.js - ENHANCED VERSION with Auto-Redirect
import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/router';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { canAccessFeature, hasPermission, ROLES } from '../utils/rolePermissions';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [permissions, setPermissions] = useState({});
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('🔥 User signed in:', firebaseUser.email);
          
          // Sync user with database and get role
          const userData = await syncUserWithDatabase(firebaseUser);
          
          setUser(firebaseUser);
          setUserRole(userData?.role || 'user');
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
      } finally {
        setLoading(false);
      }
    });

    const timeoutId = setTimeout(() => {
      console.log('⏰ Auth timeout - setting loading to false');
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [router]);

  const syncUserWithDatabase = async (firebaseUser) => {
    try {
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser.getIdToken().catch(() => 'no-token')}`
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Database sync failed:', errorData.message || 'Unknown error');
        return null;
      }

      const data = await response.json();
      console.log('✅ User synced with database:', data.user?.email, 'Role:', data.user?.role);
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
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // ✅ REDIRECT TO DASHBOARD AFTER LOGIN
      console.log('🎯 Login successful - redirecting to dashboard');
      await router.push('/companies');
      
      return result.user;
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
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      // ✅ REDIRECT TO DASHBOARD AFTER REGISTRATION
      console.log('🎯 Registration successful - redirecting to dashboard');
      await router.push('/companies');
      
      return result.user;
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      console.log('🚪 Logging out user...');
      
      // Clear any pending navigation
      await router.prefetch('/');
      
      // Sign out from Firebase (this will trigger the onAuthStateChanged listener)
      await signOut(auth);
      
      // The redirect is handled automatically in the onAuthStateChanged listener
      console.log('✅ Logout completed');
      
    } catch (error) {
      console.error('Logout error:', error);
      setError(getErrorMessage(error));
      
      // Force redirect even if logout fails
      await router.replace('/');
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const getErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'Aucun compte trouvé avec cette adresse email';
      case 'auth/wrong-password':
        return 'Mot de passe incorrect';
      case 'auth/email-already-in-use':
        return 'Cette adresse email est déjà utilisée';
      case 'auth/weak-password':
        return 'Le mot de passe doit contenir au moins 6 caractères';
      case 'auth/invalid-email':
        return 'Adresse email invalide';
      case 'auth/too-many-requests':
        return 'Trop de tentatives. Veuillez réessayer plus tard';
      default:
        return error.message || 'Une erreur est survenue';
    }
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
    clearError
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
