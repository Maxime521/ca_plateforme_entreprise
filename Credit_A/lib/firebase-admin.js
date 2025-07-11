//lib/firebase-admin.js - MIGRATED TO SUPABASE
import { createAdminClient } from './supabase';

// Supabase admin client for server-side operations
const getAdminClient = () => {
  try {
    return createAdminClient();
  } catch (error) {
    console.error('❌ Supabase Admin client initialization failed:', error.message);
    return null;
  }
};

// Export admin client for backward compatibility
export default {
  // Mock Firebase Admin auth for compatibility
  auth: () => ({
    // Verify ID token using Supabase
    verifyIdToken: async (token) => {
      const adminClient = getAdminClient();
      if (!adminClient) {
        throw new Error('Supabase admin client not available');
      }
      
      const { data: { user }, error } = await adminClient.auth.getUser(token);
      if (error) throw error;
      
      // Return Firebase-like user object for compatibility
      return {
        uid: user.id,
        email: user.email,
        email_verified: user.email_confirmed_at !== null,
        name: user.user_metadata?.displayName || user.user_metadata?.full_name,
        picture: user.user_metadata?.photoURL || user.user_metadata?.avatar_url
      };
    },
    
    // Get user by UID
    getUser: async (uid) => {
      const adminClient = getAdminClient();
      if (!adminClient) {
        throw new Error('Supabase admin client not available');
      }
      
      const { data: user, error } = await adminClient.auth.admin.getUserById(uid);
      if (error) throw error;
      
      return {
        uid: user.id,
        email: user.email,
        emailVerified: user.email_confirmed_at !== null,
        displayName: user.user_metadata?.displayName || user.user_metadata?.full_name,
        photoURL: user.user_metadata?.photoURL || user.user_metadata?.avatar_url
      };
    }
  })
};
