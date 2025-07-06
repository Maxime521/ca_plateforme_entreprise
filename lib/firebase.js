import { supabase } from './supabase';

// Export Supabase auth for compatibility with existing code
export const auth = {
  // Sign in with email and password
  signInWithEmailAndPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { user: data.user };
  },

  // Sign up with email and password
  createUserWithEmailAndPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return { user: data.user };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  get currentUser() {
    return supabase.auth.getUser();
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
};

// For backward compatibility, export supabase as default
export default supabase;
