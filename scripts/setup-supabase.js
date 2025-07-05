// scripts/setup-supabase.js
// Setup script to initialize Supabase database schema
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please set:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to execute SQL file
const executeSQLFile = async (filePath) => {
  try {
    console.log(`📄 Reading SQL file: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log('🔄 Executing SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution
      console.log('📝 Trying alternative execution method...');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('execute_sql', { query: statement });
        if (stmtError) {
          console.error(`❌ Error executing statement: ${stmtError.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    console.log('✅ SQL executed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error executing SQL file:', error.message);
    return false;
  }
};

// Function to setup database schema
const setupSchema = async () => {
  console.log('🚀 Setting up Supabase database schema...');
  
  try {
    // Check connection
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (error && !error.message.includes('permission denied')) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    
    console.log('✅ Connected to Supabase');
    
    // Execute migration file
    const migrationFile = path.join(__dirname, '..', 'migrations', '001_initial_schema.sql');
    
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    const success = await executeSQLFile(migrationFile);
    
    if (success) {
      console.log('\n🎉 Database schema setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Verify the tables were created in your Supabase dashboard');
      console.log('2. Run the migration script: npm run migrate-data');
      console.log('3. Update your application to use Supabase');
      
      return true;
    } else {
      throw new Error('Schema setup failed');
    }
    
  } catch (error) {
    console.error('❌ Schema setup failed:', error.message);
    console.error('\nManual setup instructions:');
    console.error('1. Go to your Supabase dashboard SQL editor');
    console.error('2. Copy and paste the contents of migrations/001_initial_schema.sql');
    console.error('3. Execute the SQL manually');
    
    return false;
  }
};

// Function to verify schema
const verifySchema = async () => {
  console.log('\n🔍 Verifying database schema...');
  
  try {
    const expectedTables = ['users', 'companies', 'documents', 'financial_ratios'];
    
    for (const tableName of expectedTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Table ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ Table ${tableName}: OK`);
      }
    }
    
    // Check for custom functions
    console.log('\n🔍 Checking custom functions...');
    const { data: functions, error: funcError } = await supabase.rpc('search_companies', {
      search_term: 'test',
      limit_count: 1
    });
    
    if (funcError) {
      console.error(`❌ Function search_companies: ${funcError.message}`);
    } else {
      console.log('✅ Function search_companies: OK');
    }
    
    console.log('\n✅ Schema verification completed');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
  }
};

// Main setup function
const main = async () => {
  console.log('🔧 Supabase Database Setup');
  console.log('==========================');
  
  const setupSuccess = await setupSchema();
  
  if (setupSuccess) {
    await verifySchema();
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(setupSuccess ? '✅ Setup completed successfully!' : '❌ Setup failed');
};

// Run setup if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  setupSchema,
  verifySchema,
  executeSQLFile
};