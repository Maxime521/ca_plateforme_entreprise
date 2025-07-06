import { createAdminClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token } = req.body;

  try {
    const supabase = createAdminClient();
    
    // Verify token with Supabase
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    
    // Check if user exists in our database
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('uid', supabaseUser.id)
      .single();

    // Create user if doesn't exist
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          uid: supabaseUser.id,
          email: supabaseUser.email,
          display_name: supabaseUser.user_metadata?.displayName || supabaseUser.email,
          role: 'user'
        })
        .select()
        .single();

      if (createError) throw createError;

      return res.status(200).json({ 
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.display_name,
          role: newUser.role
        }
      });
    }

    return res.status(200).json({ 
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
