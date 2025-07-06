const { createAdminClient } = require('../lib/supabase');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function updateUserProfile() {
  console.log('🔄 Updating user profiles...');
  
  const supabase = createAdminClient();
  
  try {
    // Update Joao Carlos profile
    const { data: user, error } = await supabase
      .from('users')
      .update({
        display_name: 'Joao Carlos',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'jc@gmail.com')
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user profile:', error);
      return;
    }

    if (user) {
      console.log('✅ Successfully updated user profile:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Display Name: ${user.display_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Updated: ${user.updated_at}`);
    } else {
      console.log('⚠️  User not found: jc@gmail.com');
      
      // Try to find the user first
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'jc@gmail.com');
        
      if (findError) {
        console.error('Error finding user:', findError);
      } else {
        console.log('Found users:', existingUser);
      }
    }

    // Also update the admin user if needed
    console.log('\n🔄 Updating admin user profile...');
    
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .update({
        display_name: 'Admin User',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'scdr1905@gmail.com')
      .select()
      .single();

    if (adminError) {
      console.log('⚠️  Admin user not found or error:', adminError.message);
    } else if (adminUser) {
      console.log('✅ Successfully updated admin profile:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Display Name: ${adminUser.display_name}`);
      console.log(`   Role: ${adminUser.role}`);
    }

    // List all users for verification
    console.log('\n📋 Current users in database:');
    const { data: allUsers, error: listError } = await supabase
      .from('users')
      .select('email, display_name, role, created_at')
      .order('created_at', { ascending: false });

    if (listError) {
      console.error('Error listing users:', listError);
    } else {
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.display_name} (${user.email}) - ${user.role}`);
      });
    }

  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

// Run the script
if (require.main === module) {
  updateUserProfile()
    .then(() => {
      console.log('\n🎉 User profile update completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 User profile update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateUserProfile };