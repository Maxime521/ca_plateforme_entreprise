import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🔬 Detailed INSEE API Diagnostic');
console.log('=================================\n');

async function detailedINSEEDiagnostic() {
  const consumerKey = process.env.INSEE_CONSUMER_KEY;
  const consumerSecret = process.env.INSEE_CONSUMER_SECRET;
  
  try {
    // Step 1: Get access token (we know this works)
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
    
    console.log('✅ Token obtained');
    const accessToken = tokenResponse.data.access_token;
    
    // Step 2: Test different API endpoints to find what works
    console.log('\n2️⃣ Testing various API endpoints...\n');
    
    // Test 2a: Simple siret endpoint
    console.log('🧪 Test 2a: Basic siret endpoint...');
    try {
      const response = await axios.get(
        'https://api.insee.fr/entreprises/sirene/V3.11/siret',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      console.log('✅ Basic siret endpoint works!');
      console.log(`   Total results: ${response.data.header?.total || 'unknown'}`);
    } catch (error) {
      console.log('❌ Basic siret endpoint failed:');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Data: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
    
    // Test 2b: Siret with simple query
    console.log('\n🧪 Test 2b: Siret with simple query...');
    try {
      const response = await axios.get(
        'https://api.insee.fr/entreprises/sirene/V3.11/siret',
        {
          params: {
            q: 'denominationUniteLegale:CARREFOUR'
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      console.log('✅ Simple query works!');
      console.log(`   Results: ${response.data.etablissements?.length || 0}`);
    } catch (error) {
      console.log('❌ Simple query failed:');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Data: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
    
    // Test 2c: Different query format
    console.log('\n🧪 Test 2c: Different query format...');
    try {
      const response = await axios.get(
        'https://api.insee.fr/entreprises/sirene/V3.11/siret',
        {
          params: {
            q: 'CARREFOUR',
            nombre: 1
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      console.log('✅ Different format works!');
      console.log(`   Results: ${response.data.etablissements?.length || 0}`);
    } catch (error) {
      console.log('❌ Different format failed:');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Data: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
    
    // Test 2d: Specific SIREN lookup (should always work if API is active)
    console.log('\n🧪 Test 2d: Specific SIREN lookup...');
    try {
      const response = await axios.get(
        'https://api.insee.fr/entreprises/sirene/V3.11/siren/542107651',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      console.log('✅ SIREN lookup works!');
      console.log(`   Company: ${response.data.uniteLegale?.denominationUniteLegale || 'Unknown'}`);
    } catch (error) {
      console.log('❌ SIREN lookup failed:');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Data: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
    
    // Test 2e: Try older API version
    console.log('\n🧪 Test 2e: Testing older API version (V3.11 vs V3)...');
    try {
      const response = await axios.get(
        'https://api.insee.fr/entreprises/sirene/V3/siret',
        {
          params: {
            q: 'CARREFOUR',
            nombre: 1
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      console.log('✅ Older API version works!');
      console.log(`   Results: ${response.data.etablissements?.length || 0}`);
    } catch (error) {
      console.log('❌ Older API version failed:');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Data: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
    
    console.log('\n📊 Diagnostic Summary:');
    console.log('======================');
    console.log('✅ Authentication: Working');
    console.log('✅ API Access: Partial');
    console.log('❓ Sirene Database: Need to check specific endpoints');
    
    console.log('\n💡 Next Steps:');
    console.log('1. Check which specific test passed');
    console.log('2. Update your INSEE service to use working endpoint');
    console.log('3. If all failed, check INSEE portal for Sirene V3 subscription');
    console.log('4. Contact INSEE support if needed');
    
  } catch (error) {
    console.log('❌ Diagnostic failed:');
    console.log(error.message);
  }
}

detailedINSEEDiagnostic();
