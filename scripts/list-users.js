// scripts/list-users.js - List all users in the database
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function listUsers() {
  console.log('📋 Listing all users in database...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, serviceKey);
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, display_name, role, created_at, last_login_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('📭 No users found in database');
      return;
    }

    console.log(`👥 Found ${users.length} user(s):\n`);
    
    users.forEach((user, index) => {
      const isAdmin = user.role === 'admin';
      const adminBadge = isAdmin ? ' 👑 ADMIN' : '';
      
      console.log(`${index + 1}. ${user.display_name}${adminBadge}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   🏷️  Role: ${user.role}`);
      console.log(`   📅 Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   🔓 Last Login: ${user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}`);
      console.log('');
    });

    // Summary
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;
    
    console.log('📊 Summary:');
    console.log(`   👑 Admins: ${adminCount}`);
    console.log(`   👤 Users: ${userCount}`);
    console.log(`   📈 Total: ${users.length}`);

  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

// Run the script
if (require.main === module) {
  listUsers()
    .then(() => {
      console.log('\n✅ User listing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 User listing failed:', error);
      process.exit(1);
    });
}

module.exports = { listUsers };