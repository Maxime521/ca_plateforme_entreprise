// scripts/test-insee-activation.js
// Run with: node scripts/test-insee-activation.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🔄 Testing INSEE API Activation');
console.log('================================\n');

async function testINSEEActivation() {
  const consumerKey = process.env.INSEE_CONSUMER_KEY;
  const consumerSecret = process.env.INSEE_CONSUMER_SECRET;
  
  console.log(`🔑 Using Consumer Key: ${consumerKey}`);
  console.log(`🔐 Consumer Secret: ${consumerSecret ? 'Found' : 'Missing'}\n`);
  
  if (!consumerKey || !consumerSecret) {
    console.log('❌ Missing INSEE credentials in .env.local');
    return false;
  }
  
  try {
    // Step 1: Get access token
    console.log('1️⃣ Getting access token...');
    
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const tokenResponse = await axios.post(
      'https://api.insee.fr/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    console.log('✅ Token obtained successfully!');
    console.log(`   Token type: ${tokenResponse.data.token_type}`);
    console.log(`   Expires in: ${tokenResponse.data.expires_in} seconds`);
    console.log(`   Scope: ${tokenResponse.data.scope}\n`);
    
    const accessToken = tokenResponse.data.access_token;
    
    // Step 2: Test simple search
    console.log('2️⃣ Testing company search...');
    
    const searchResponse = await axios.get(
      'https://api.insee.fr/entreprises/sirene/V3.11/siret',
      {
        params: {
          q: 'CARREFOUR',
          nombre: 2,
          debut: 0
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      }
    );
    
    console.log('✅ Search successful!');
    console.log(`   Total results found: ${searchResponse.data.header.total}`);
    console.log(`   Results in response: ${searchResponse.data.etablissements.length}\n`);
    
    if (searchResponse.data.etablissements.length > 0) {
      const company = searchResponse.data.etablissements[0];
      console.log('📊 Sample company data:');
      console.log(`   SIREN: ${company.uniteLegale.siren}`);
      console.log(`   SIRET: ${company.siret}`);
      console.log(`   Name: ${company.uniteLegale.denominationUniteLegale || 'N/A'}`);
      console.log(`   Legal form: ${company.uniteLegale.categorieJuridiqueUniteLegale || 'N/A'}`);
      console.log(`   APE code: ${company.uniteLegale.activitePrincipaleUniteLegale || 'N/A'}`);
      console.log(`   Active: ${company.uniteLegale.etatAdministratifUniteLegale === 'A' ? 'Yes' : 'No'}\n`);
    }
    
    // Step 3: Test SIREN lookup
    console.log('3️⃣ Testing SIREN lookup (542107651 - Carrefour)...');
    
    const sirenResponse = await axios.get(
      'https://api.insee.fr/entreprises/sirene/V3.11/siren/542107651',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );
    
    console.log('✅ SIREN lookup successful!');
    const companyDetail = sirenResponse.data.uniteLegale;
    console.log(`   Company: ${companyDetail.denominationUniteLegale}`);
    console.log(`   Creation date: ${companyDetail.dateCreationUniteLegale}`);
    console.log(`   Active: ${companyDetail.etatAdministratifUniteLegale === 'A' ? 'Yes' : 'No'}`);
    console.log(`   Legal category: ${companyDetail.categorieJuridiqueUniteLegale}`);
    console.log(`   APE: ${companyDetail.activitePrincipaleUniteLegale}\n`);
    
    console.log('🎉 All INSEE tests passed! Your API is fully activated and working.\n');
    console.log('✅ Ready to integrate with your application!');
    
    return true;
    
  } catch (error) {
    console.log('❌ INSEE test failed:');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.error || 'Unknown'}`);
      console.log(`   Description: ${error.response.data.error_description || 'No description'}`);
      
      if (error.response.status === 401) {
        console.log('\n💡 401 Error Solutions:');
        console.log('   1. Wait a few minutes - activation might still be processing');
        console.log('   2. Check your application status in INSEE portal');
        console.log('   3. Make sure you subscribed to "Sirene V3" API');
        console.log('   4. Try regenerating your credentials');
      } else if (error.response.status === 403) {
        console.log('\n💡 403 Error Solutions:');
        console.log('   1. Your app is activated but may not have Sirene access');
        console.log('   2. Check your subscription to Sirene V3 in the portal');
        console.log('   3. Contact INSEE support if issue persists');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.log('   Timeout - INSEE API might be slow, try again');
    } else {
      console.log(`   Network error: ${error.message}`);
    }
    
    console.log('\n⏳ If you just activated, wait 5-10 minutes and try again.');
    
    return false;
  }
}

testINSEEActivation();
