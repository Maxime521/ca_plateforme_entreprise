// pages/api/user/profile.js - User Profile Management API
import { createAdminClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  const supabase = createAdminClient();

  // GET - Fetch user profile
  if (req.method === 'GET') {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
          created_at: user.created_at,
          last_login_at: user.last_login_at
        }
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUT - Update user profile
  if (req.method === 'PUT') {
    try {
      const { email, display_name } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      if (!display_name || display_name.trim().length === 0) {
        return res.status(400).json({ message: 'Display name is required' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .update({
          display_name: display_name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return res.status(400).json({ message: 'Failed to update profile' });
      }

      console.log(`✅ Updated profile for ${email}: ${display_name}`);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
          updated_at: user.updated_at
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}