// scripts/set-admin-role.js
// Script to manually set admin role for specific user
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const setAdminRole = async () => {
  console.log('🔧 Setting admin role for scdr1905@gmail.com...');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update user role to admin
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'scdr1905@gmail.com')
      .select();

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      console.log('✅ Admin role set successfully for:', data[0].email);
      console.log('   User details:', {
        id: data[0].id,
        email: data[0].email,
        role: data[0].role,
        display_name: data[0].display_name
      });
    } else {
      console.log('⚠️  No user found with email: scdr1905@gmail.com');
      console.log('   Please login first to create the user record');
    }

    // Verify the change
    const { data: verifyData } = await supabase
      .from('users')
      .select('email, role')
      .eq('email', 'scdr1905@gmail.com')
      .single();

    if (verifyData) {
      console.log('🔍 Verification - Current role:', verifyData.role);
    }

  } catch (error) {
    console.error('❌ Error setting admin role:', error.message);
  }
};

// Run script if called directly
if (require.main === module) {
  setAdminRole().then(() => {
    process.exit(0);
  }).catch(console.error);
}

module.exports = { setAdminRole };