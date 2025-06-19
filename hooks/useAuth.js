import { useState, useEffect, useContext, createContext } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          console.log('🔥 User signed in:', firebaseUser.email);
          
          // Sync user with our database (don't wait for it)
          syncUserWithDatabase(firebaseUser).catch(error => {
            console.warn('Database sync failed:', error.message);
          });
          
          setUser(firebaseUser);
        } else {
          // User is signed out
          console.log('👋 User signed out');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
      } finally {
        // Always set loading to false
        setLoading(false);
      }
    });

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⏰ Auth timeout - setting loading to false');
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

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
        // Don't throw - let user continue even if DB sync fails
        return;
      }

      const data = await response.json();
      console.log('✅ User synced with database:', data.user?.email);
    } catch (error) {
      console.warn('Database sync error (continuing anyway):', error.message);
      // Don't throw - let user continue even if DB sync fails
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
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
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
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
      await signOut(auth);
    } catch (error) {
      setError(getErrorMessage(error));
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
