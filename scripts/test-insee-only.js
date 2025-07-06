import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🔑 Testing INSEE API with your credentials');
console.log('==========================================\n');

async function testINSEE() {
  const consumerKey = process.env.INSEE_CONSUMER_KEY;
  const consumerSecret = process.env.INSEE_CONSUMER_SECRET;
  
  console.log(`Consumer Key: ${consumerKey}`);
  console.log(`Consumer Secret: ${consumerSecret ? consumerSecret.substring(0, 10) + '...' : 'Not found'}`);
  console.log('');
  
  if (!consumerKey || !consumerSecret) {
    console.log('❌ Missing INSEE credentials in .env.local');
    return;
  }
  
  try {
    // Step 1: Get access token
    console.log('🔑 Step 1: Getting access token...');
    
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
    
    console.log('✅ Access token obtained successfully!');
    console.log(`   Token type: ${tokenResponse.data.token_type}`);
    console.log(`   Expires in: ${tokenResponse.data.expires_in} seconds`);
    console.log(`   Scope: ${tokenResponse.data.scope}`);
    
    const accessToken = tokenResponse.data.access_token;
    
    // Step 2: Test search
    console.log('\n🔍 Step 2: Testing search...');
    
    const searchResponse = await axios.get(
      'https://api.insee.fr/entreprises/sirene/V3.11/siret',
      {
        params: {
          q: 'CARREFOUR',
          nombre: 3,
          debut: 0
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ Search successful!');
    console.log(`   Total results: ${searchResponse.data.header.total}`);
    console.log(`   Results returned: ${searchResponse.data.etablissements.length}`);
    
    if (searchResponse.data.etablissements.length > 0) {
      const first = searchResponse.data.etablissements[0];
      console.log('\n📊 First result:');
      console.log(`   SIREN: ${first.uniteLegale.siren}`);
      console.log(`   SIRET: ${first.siret}`);
      console.log(`   Company: ${first.uniteLegale.denominationUniteLegale || 'N/A'}`);
      console.log(`   Legal form: ${first.uniteLegale.categorieJuridiqueUniteLegale || 'N/A'}`);
      console.log(`   APE: ${first.uniteLegale.activitePrincipaleUniteLegale || 'N/A'}`);
      console.log(`   Active: ${first.uniteLegale.etatAdministratifUniteLegale === 'A' ? 'Yes' : 'No'}`);
    }
    
    // Step 3: Test specific SIREN lookup
    console.log('\n🏢 Step 3: Testing specific SIREN lookup...');
    
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
    console.log(`   Creation date: ${company.dateCreationUniteLegale}`);
    console.log(`   Active: ${company.etatAdministratifUniteLegale === 'A' ? 'Yes' : 'No'}`);
    
    console.log('\n🎉 All INSEE tests passed! Your credentials are working.');
    
  } catch (error) {
    console.log('❌ INSEE test failed:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.error || 'Unknown'}`);
      console.log(`   Description: ${error.response.data.error_description || 'No description'}`);
      
      if (error.response.status === 401) {
        console.log('\n💡 Tips for 401 errors:');
        console.log('   - Check your Consumer Key and Secret are correct');
        console.log('   - Make sure your application is activated in INSEE portal');
        console.log('   - Verify you have access to Sirene V3 API');
      }
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

testINSEE();
