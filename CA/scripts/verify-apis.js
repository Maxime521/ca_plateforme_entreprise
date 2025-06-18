// scripts/verify-apis.js
// Run with: node scripts/verify-apis.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🔍 API Verification Script');
console.log('==========================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`INSEE_CONSUMER_KEY: ${process.env.INSEE_CONSUMER_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`INSEE_CONSUMER_SECRET: ${process.env.INSEE_CONSUMER_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log('');

async function testINSEEAuth() {
  console.log('🔑 Testing INSEE Authentication...');
  
  if (!process.env.INSEE_CONSUMER_KEY || !process.env.INSEE_CONSUMER_SECRET) {
    console.log('❌ INSEE credentials missing in environment variables');
    return null;
  }

  try {
    const auth = Buffer.from(`${process.env.INSEE_CONSUMER_KEY}:${process.env.INSEE_CONSUMER_SECRET}`).toString('base64');
    
    const response = await axios.post(
      'https://api.insee.fr/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ INSEE Authentication successful!');
    console.log(`   Token type: ${response.data.token_type}`);
    console.log(`   Expires in: ${response.data.expires_in} seconds`);
    console.log(`   Scope: ${response.data.scope}`);
    
    return response.data.access_token;
  } catch (error) {
    console.log('❌ INSEE Authentication failed:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.error}`);
      console.log(`   Description: ${error.response.data.error_description}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return null;
  }
}

async function testINSEESearch(token) {
  if (!token) {
    console.log('⏭️  Skipping INSEE search test (no token)');
    return;
  }

  console.log('\n🔍 Testing INSEE Search...');
  
  try {
    const response = await axios.get('https://api.insee.fr/entreprises/sirene/V3.11/siret', {
      params: {
        q: 'CARREFOUR',
        nombre: 5,
        debut: 0
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log('✅ INSEE Search successful!');
    console.log(`   Total results: ${response.data.header.total}`);
    console.log(`   Results returned: ${response.data.etablissements.length}`);
    if (response.data.etablissements.length > 0) {
      const first = response.data.etablissements[0];
      console.log(`   First result: ${first.uniteLegale.denominationUniteLegale || 'N/A'} (${first.uniteLegale.siren})`);
    }
  } catch (error) {
    console.log('❌ INSEE Search failed:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.error || 'Unknown error'}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

async function testBODACC() {
  console.log('\n📰 Testing BODACC API...');
  
  try {
    const response = await axios.get('https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records', {
      params: {
        where: 'registre_denomination like "%CARREFOUR%"',
        limit: 5,
        order_by: 'date_parution desc',
        timezone: 'Europe/Paris'
      }
    });

    console.log('✅ BODACC API successful!');
    console.log(`   Total results: ${response.data.total_count}`);
    console.log(`   Results returned: ${response.data.records.length}`);
    if (response.data.records.length > 0) {
      const first = response.data.records[0].record.fields;
      console.log(`   First result: ${first.registre_denomination || 'N/A'}`);
      console.log(`   Date: ${first.date_parution || 'N/A'}`);
      console.log(`   Type: ${first.type_annonce || 'N/A'}`);
    }
  } catch (error) {
    console.log('❌ BODACC API failed:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

async function testDatabaseConnection() {
  console.log('\n💾 Testing Database Connection...');
  
  try {
    // Dynamic import to avoid top-level await issues
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`   Users in database: ${userCount}`);
    
    const companyCount = await prisma.company.count();
    console.log(`   Companies in database: ${companyCount}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.log('❌ Database connection failed:');
    console.log(`   Error: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  const token = await testINSEEAuth();
  await testINSEESearch(token);
  await testBODACC();
  await testDatabaseConnection();
  
  console.log('\n🏁 Tests completed!');
  console.log('\nNext steps:');
  console.log('1. If INSEE auth failed, check your credentials at https://api.insee.fr');
  console.log('2. If BODACC failed, the API might be down temporarily');
  console.log('3. If database failed, run: npx prisma generate && npx prisma db push');
}

runAllTests().catch(console.error);
