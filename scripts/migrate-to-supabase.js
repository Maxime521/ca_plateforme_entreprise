// scripts/migrate-to-supabase.js
// Data migration script from SQLite to Supabase PostgreSQL
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Configuration
const BATCH_SIZE = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Initialize clients
const prisma = new PrismaClient();

// Supabase admin client (requires service role key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please set:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const retryOperation = async (operation, operationName, maxRetries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`❌ ${operationName} failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`⏳ Retrying in ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY);
    }
  }
};

// Data transformation functions
const transformUser = (user) => ({
  // Don't include id - let PostgreSQL generate new UUIDs
  uid: user.uid,
  email: user.email,
  display_name: user.displayName,
  photo_url: user.photoURL,
  role: user.role,
  last_login_at: user.lastLoginAt?.toISOString(),
  created_at: user.createdAt.toISOString(),
  updated_at: user.updatedAt.toISOString()
});

const transformCompany = (company) => ({
  // Don't include id - let PostgreSQL generate new UUIDs
  siren: company.siren,
  denomination: company.denomination,
  date_creation: company.dateCreation?.toISOString(),
  date_immatriculation: company.dateImmatriculation?.toISOString(),
  active: company.active,
  adresse_siege: company.adresseSiege,
  nature_entreprise: company.natureEntreprise,
  forme_juridique: company.formeJuridique,
  code_ape: company.codeAPE,
  libelle_ape: company.libelleAPE,
  capital_social: company.capitalSocial,
  created_at: company.createdAt.toISOString(),
  updated_at: company.updatedAt.toISOString()
});

const transformDocument = (document) => ({
  id: document.id,
  company_id: document.companyId,
  date_publication: document.datePublication.toISOString(),
  type_document: document.typeDocument,
  source: document.source,
  type_avis: document.typeAvis,
  reference: document.reference,
  description: document.description,
  contenu: document.contenu,
  lien_document: document.lienDocument,
  created_at: document.createdAt.toISOString(),
  updated_at: document.updatedAt.toISOString()
});

const transformFinancialRatio = (ratio) => ({
  id: ratio.id,
  company_id: ratio.companyId,
  year: ratio.year,
  ratio_type: ratio.ratioType,
  value: ratio.value,
  created_at: ratio.createdAt.toISOString()
});

// Migration functions
const migrateTable = async (tableName, prismaModel, transformFn, supabaseTable) => {
  console.log(`\n📊 Starting migration for ${tableName}...`);
  
  try {
    // Get total count
    const totalCount = await prismaModel.count();
    console.log(`   Found ${totalCount} records to migrate`);
    
    if (totalCount === 0) {
      console.log(`   ✅ No ${tableName} to migrate`);
      return { success: true, migrated: 0, errors: 0 };
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    let skip = 0;
    
    // Process in batches
    while (skip < totalCount) {
      console.log(`   📦 Processing batch ${Math.floor(skip / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)}...`);
      
      try {
        // Fetch batch from SQLite
        const batch = await prismaModel.findMany({
          skip,
          take: BATCH_SIZE,
          include: tableName === 'companies' ? { documents: false, financialRatios: false } : undefined
        });
        
        // Transform data
        const transformedBatch = batch.map(transformFn);
        
        // Insert into Supabase
        await retryOperation(async () => {
          const { data, error } = await supabase
            .from(supabaseTable)
            .insert(transformedBatch);
          
          if (error) {
            throw error;
          }
          
          return data;
        }, `Insert batch for ${tableName}`);
        
        migratedCount += batch.length;
        console.log(`   ✅ Migrated ${migratedCount}/${totalCount} ${tableName}`);
        
      } catch (error) {
        console.error(`   ❌ Error migrating batch for ${tableName}:`, error.message);
        errorCount += BATCH_SIZE;
      }
      
      skip += BATCH_SIZE;
      
      // Small delay to avoid overwhelming the database
      await sleep(100);
    }
    
    console.log(`\n✅ ${tableName} migration completed:`);
    console.log(`   Migrated: ${migratedCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    return { success: errorCount === 0, migrated: migratedCount, errors: errorCount };
    
  } catch (error) {
    console.error(`❌ Failed to migrate ${tableName}:`, error.message);
    return { success: false, migrated: 0, errors: -1 };
  }
};

// Pre-migration checks
const runPreMigrationChecks = async () => {
  console.log('🔍 Running pre-migration checks...');
  
  try {
    // Check Supabase connection
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error && !error.message.includes('relation "users" does not exist')) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    console.log('   ✅ Supabase connection successful');
    
    // Check Prisma connection
    await prisma.$connect();
    console.log('   ✅ SQLite connection successful');
    
    // Check if schema exists in Supabase
    const { data: tables } = await supabase.rpc('get_table_names') || [];
    console.log(`   ℹ️  Found ${tables?.length || 0} tables in Supabase`);
    
    return true;
  } catch (error) {
    console.error('❌ Pre-migration check failed:', error.message);
    return false;
  }
};

// Post-migration validation
const validateMigration = async () => {
  console.log('\n🔍 Validating migration...');
  
  try {
    const validations = [
      { name: 'users', prismaModel: prisma.user, table: 'users' },
      { name: 'companies', prismaModel: prisma.company, table: 'companies' },
      { name: 'documents', prismaModel: prisma.document, table: 'documents' },
      { name: 'financial_ratios', prismaModel: prisma.financialRatio, table: 'financial_ratios' }
    ];
    
    for (const validation of validations) {
      const prismaCount = await validation.prismaModel.count();
      const { count: supabaseCount } = await supabase
        .from(validation.table)
        .select('*', { count: 'exact', head: true });
      
      console.log(`   ${validation.name}: SQLite(${prismaCount}) → Supabase(${supabaseCount || 0}) ${prismaCount === (supabaseCount || 0) ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }
};

// Main migration function
const runMigration = async () => {
  console.log('🚀 Starting SQLite to Supabase migration...');
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Max retries: ${MAX_RETRIES}`);
  
  const startTime = Date.now();
  
  try {
    // Pre-migration checks
    const checksPass = await runPreMigrationChecks();
    if (!checksPass) {
      console.error('❌ Pre-migration checks failed. Aborting migration.');
      process.exit(1);
    }
    
    // Migrate tables in dependency order
    const migrations = [
      { name: 'users', prismaModel: prisma.user, transformFn: transformUser, table: 'users' },
      { name: 'companies', prismaModel: prisma.company, transformFn: transformCompany, table: 'companies' },
      { name: 'documents', prismaModel: prisma.document, transformFn: transformDocument, table: 'documents' },
      { name: 'financial_ratios', prismaModel: prisma.financialRatio, transformFn: transformFinancialRatio, table: 'financial_ratios' }
    ];
    
    const results = {};
    
    for (const migration of migrations) {
      results[migration.name] = await migrateTable(
        migration.name,
        migration.prismaModel,
        migration.transformFn,
        migration.table
      );
    }
    
    // Validation
    await validateMigration();
    
    // Summary
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📋 Migration Summary:');
    console.log('=====================================');
    
    let totalMigrated = 0;
    let totalErrors = 0;
    let allSuccessful = true;
    
    Object.entries(results).forEach(([table, result]) => {
      console.log(`${table.padEnd(20)}: ${result.migrated} migrated, ${result.errors} errors ${result.success ? '✅' : '❌'}`);
      totalMigrated += result.migrated;
      totalErrors += result.errors;
      if (!result.success) allSuccessful = false;
    });
    
    console.log('=====================================');
    console.log(`Total migrated: ${totalMigrated}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Status: ${allSuccessful ? '✅ SUCCESS' : '❌ PARTIAL FAILURE'}`);
    
    if (allSuccessful) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('Next steps:');
      console.log('1. Update your .env.local to use Supabase instead of SQLite');
      console.log('2. Test your application with the new database');
      console.log('3. Update your Prisma schema to point to PostgreSQL');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

// Run migration if called directly
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = {
  runMigration,
  migrateTable,
  validateMigration
};