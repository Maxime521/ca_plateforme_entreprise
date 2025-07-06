require('dotenv').config({ path: '.env.local' });
const { setupSchema, verifySchema } = require('./setup-supabase');
const { testSupabaseConnection } = require('./test-supabase-connection');

const quickSetup = async () => {
  console.log('🚀 Supabase Quick Setup');
  console.log('========================');
  console.log('This will:');
  console.log('1. Test your connection');
  console.log('2. Set up the database schema');
  console.log('3. Verify everything works');
  console.log('');

  try {
    // Step 1: Test connection
    console.log('📋 Step 1: Testing Connection...');
    const connectionOk = await testSupabaseConnection();
    
    if (!connectionOk) {
      console.error('❌ Setup aborted due to connection issues');
      process.exit(1);
    }

    // Step 2: Setup schema
    console.log('\n📋 Step 2: Setting up Database Schema...');
    const schemaOk = await setupSchema();
    
    if (!schemaOk) {
      console.error('❌ Schema setup failed');
      process.exit(1);
    }

    // Step 3: Verify schema
    console.log('\n📋 Step 3: Verifying Setup...');
    await verifySchema();

    // Success message
    console.log('\n' + '='.repeat(50));
    console.log('🎉 SUPABASE SETUP COMPLETE!');
    console.log('='.repeat(50));
    console.log('');
    console.log('✅ What was set up:');
    console.log('   • Database connection tested');
    console.log('   • Tables created (users, companies, documents, financial_ratios)');
    console.log('   • Indexes optimized for performance');
    console.log('   • Row Level Security (RLS) enabled');
    console.log('   • Full-text search configured');
    console.log('   • Custom functions installed');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Run: npm run supabase:migrate');
    console.log('   2. Update your app to use Supabase');
    console.log('   3. Test your application');
    console.log('');
    console.log('📊 Database Dashboard:');
    console.log(`   ${process.env.NEXT_PUBLIC_SUPABASE_URL}/project/default/editor`);

  } catch (error) {
    console.error('\n❌ Quick setup failed:', error.message);
    console.error('\nFor manual setup:');
    console.error('1. Check your .env.local configuration');
    console.error('2. Run: npm run test:supabase');
    console.error('3. Run: npm run supabase:setup');
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  quickSetup().catch(console.error);
}

module.exports = { quickSetup };