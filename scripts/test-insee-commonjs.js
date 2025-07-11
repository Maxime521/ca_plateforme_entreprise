// scripts/test-insee-commonjs.js
// Run with: node scripts/test-insee-commonjs.js

const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🧪 Testing INSEE Implementation (CommonJS)');
console.log('==========================================\n');

async function testINSEE() {
  const consumerKey = process.env.INSEE_CONSUMER_KEY;
  const consumerSecret = process.env.INSEE_CONSUMER_SECRET;
  
  console.log(`🔑 Consumer Key: ${consumerKey}`);
  console.log(`🔐 Consumer Secret: ${consumerSecret ? 'Found' : 'Missing'}\n`);
  
  if (!consumerKey || !consumerSecret) {
    console.log('❌ Missing INSEE credentials');
    return;
  }
  
  try {
    // Step 1: Get token
    console.log('1️⃣ Getting access token...');
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const tokenResponse = await axios.post(
      'https://api.insee.fr/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✅ Token obtained successfully');
    const accessToken = tokenResponse.data.access_token;
    
    // Step 2: Test search with working format
    console.log('\n2️⃣ Testing company search...');
    
    const searchResponse = await axios.get(
      'https://api.insee.fr/entreprises/sirene/V3.11/siret',
      {
        params: {
          q: 'denominationUniteLegale:CARREFOUR',
          nombre: 3,
          debut: 0
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Search successful!');
    console.log(`   Total results: ${searchResponse.data.header.total}`);
    console.log(`   Results returned: ${searchResponse.data.etablissements.length}`);
    
    if (searchResponse.data.etablissements.length > 0) {
      const first = searchResponse.data.etablissements[0];
      console.log('\n📊 Sample result:');
      console.log(`   SIREN: ${first.uniteLegale.siren}`);
      console.log(`   Company: ${first.uniteLegale.denominationUniteLegale}`);
      console.log(`   Active: ${first.uniteLegale.etatAdministratifUniteLegale === 'A' ? 'Yes' : 'No'}`);
      console.log(`   Legal form: ${first.uniteLegale.categorieJuridiqueUniteLegale}`);
    }
    
    // Step 3: Test SIREN lookup
    console.log('\n3️⃣ Testing SIREN lookup...');
    
    const sirenResponse = await axios.get(
      'https://api.insee.fr/entreprises/sirene/V3.11/siren/542107651',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ SIREN lookup successful!');
    const company = sirenResponse.data.uniteLegale;
    console.log(`   Company: ${company.denominationUniteLegale}`);
    console.log(`   Creation: ${company.dateCreationUniteLegale}`);
    console.log(`   Active: ${company.etatAdministratifUniteLegale === 'A' ? 'Yes' : 'No'}`);
    
    console.log('\n🎉 All INSEE tests passed!');
    console.log('\n✅ Your INSEE API is fully working!');
    console.log('📝 Query format to use: denominationUniteLegale:COMPANY_NAME');
    
  } catch (error) {
    console.log('❌ Test failed:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

testINSEE();
