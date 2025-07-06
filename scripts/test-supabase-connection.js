const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const testSupabaseConnection = async () => {
  console.log('🔍 Testing Supabase Connection...');
  console.log('================================');

  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('📋 Environment Variables:');
    console.log(`   URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Anon Key: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Service Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('\n❌ Missing required environment variables!');
      console.error('Please check your .env.local file');
      process.exit(1);
    }

    // Test basic connection
    console.log('\n🔌 Testing Basic Connection...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test with a simple query (this might fail if tables don't exist yet)
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error && !error.message.includes('relation "users" does not exist')) {
      console.error(`❌ Connection failed: ${error.message}`);
      process.exit(1);
    }

    console.log('✅ Basic connection successful');

    // Test service role connection
    if (supabaseServiceKey) {
      console.log('\n🔐 Testing Admin Connection...');
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: adminData, error: adminError } = await adminClient
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);

      if (adminError) {
        console.warn(`⚠️  Admin connection issue: ${adminError.message}`);
      } else {
        console.log('✅ Admin connection successful');
      }
    }

    // Test database info
    console.log('\n📊 Database Information:');
    try {
      const { data: dbInfo } = await supabase.rpc('version');
      console.log(`   PostgreSQL Version: ${dbInfo || 'Unknown'}`);
    } catch (e) {
      console.log('   PostgreSQL Version: Unable to determine');
    }

    console.log('\n🎉 All tests passed! Supabase is ready to use.');
    
    return true;

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your .env.local file has the correct values');
    console.error('2. Verify your Supabase project is running');
    console.error('3. Ensure your API keys are correct');
    
    return false;
  }
};

// Run test if called directly
if (require.main === module) {
  testSupabaseConnection()
    .then(success => process.exit(success ? 0 : 1))
    .catch(console.error);
}

module.exports = { testSupabaseConnection };