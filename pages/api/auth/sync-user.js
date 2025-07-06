import { createAdminClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { uid, email, displayName, photoURL } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ message: 'Missing required fields: uid and email' });
    }

    // Determine user role based on email or manual assignment
    const isAdminEmail = email === 'admin@datacorp.fr' || 
                        email === 'scdr1905@gmail.com' || // Your current email
                        email.endsWith('@datacorp.admin'); // Admin domain

    const userRole = isAdminEmail ? 'admin' : 'user';
    
    // Debug logging for admin assignment
    console.log(`🔍 Role assignment for ${email}:`, {
      isAdminEmail,
      userRole,
      email
    });

    // Get Supabase admin client
    const supabase = createAdminClient();
    
    // Check if user already exists to preserve display name
    const { data: existingUser } = await supabase
      .from('users')
      .select('display_name, email')
      .eq('email', email)
      .single();

    // Preserve existing display name or use provided displayName
    const finalDisplayName = existingUser?.display_name || 
                             displayName || 
                             email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Use upsert with proper conflict resolution
    let user;
    const { data: userData, error } = await supabase
      .from('users')
      .upsert({
        uid,
        email,
        display_name: finalDisplayName,
        photo_url: photoURL,
        role: userRole,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (!error && userData) {
      user = userData;
    } else {
      // If upsert by email fails, try to update existing user by uid or email
      console.log('🔄 Upsert failed, trying manual update:', error.message);
      
      // Find existing user by uid or email
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .or(`uid.eq.${uid},email.eq.${email}`)
        .single();

      if (existingUser) {
        // Update existing user
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            uid, // Ensure UID is updated too
            email,
            display_name: displayName || email.split('@')[0],
            photo_url: photoURL,
            role: userRole,
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) throw updateError;
        user = updatedUser;
      } else {
        throw error; // Re-throw original error if no existing user found
      }
    }

    if (!user) {
      throw new Error('Failed to sync user data');
    }

    console.log(`✅ User synced: ${user.email} as ${user.role}`);

    return res.status(200).json({ 
      success: true, 
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Sync user error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}
