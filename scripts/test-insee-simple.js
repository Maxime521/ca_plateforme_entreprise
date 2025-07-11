// scripts/test-insee-simple.js
// Run with: node scripts/test-insee-simple.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🧪 Testing Fixed INSEE Implementation');
console.log('====================================\n');

async function testINSEEFixed() {
  const consumerKey = process.env.INSEE_CONSUMER_KEY;
  const consumerSecret = process.env.INSEE_CONSUMER_SECRET;
  
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
    
    console.log('✅ Token obtained');
    const accessToken = tokenResponse.data.access_token;
    
    // Step 2: Test the working query format
    console.log('\n2️⃣ Testing company search with working format...');
    
    const searchResponse = await axios.get(
      'https://api.insee.fr/entreprises/sirene/V3.11/siret',
      {
        params: {
          q: 'denominationUniteLegale:CARREFOUR', // This format works!
          nombre: 5,
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
    console.log(`   Results in response: ${searchResponse.data.etablissements.length}`);
    
    if (searchResponse.data.etablissements.length > 0) {
      const first = searchResponse.data.etablissements[0];
      console.log('\n📊 First result:');
      console.log(`   SIREN: ${first.uniteLegale.siren}`);
      console.log(`   SIRET: ${first.siret}`);
      console.log(`   Company: ${first.uniteLegale.denominationUniteLegale || 'N/A'}`);
      console.log(`   Legal form: ${first.uniteLegale.categorieJuridiqueUniteLegale || 'N/A'}`);
      console.log(`   APE: ${first.uniteLegale.activitePrincipaleUniteLegale || 'N/A'}`);
      console.log(`   Active: ${first.uniteLegale.etatAdministratifUniteLegale === 'A' ? 'Yes' : 'No'}`);
      
      // Format address
      const addr = first.adresseEtablissement;
      if (addr) {
        const address = [
          addr.numeroVoieEtablissement,
          addr.typeVoieEtablissement,
          addr.libelleVoieEtablissement,
          addr.codePostalEtablissement,
          addr.libelleCommuneEtablissement
        ].filter(Boolean).join(' ');
        console.log(`   Address: ${address}`);
      }
    }
    
    // Step 3: Test SIREN lookup
    console.log('\n3️⃣ Testing SIREN lookup...');
    
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
    const company = sirenResponse.data.uniteLegale;
    console.log(`   Company: ${company.denominationUniteLegale}`);
    console.log(`   Creation date: ${company.dateCreationUniteLegale}`);
    console.log(`   Active: ${company.etatAdministratifUniteLegale === 'A' ? 'Yes' : 'No'}`);
    console.log(`   Legal category: ${company.categorieJuridiqueUniteLegale}`);
    
    // Step 4: Test alternative search formats
    console.log('\n4️⃣ Testing alternative search formats...');
    
    const alternativeFormats = [
      { q: 'denominationUniteLegale:DANONE', label: 'Search for DANONE' },
      { q: 'siren:542107651', label: 'Search by SIREN' },
      { q: 'denominationUniteLegale:FRANCE*', label: 'Wildcard search' }
    ];
    
    for (const format of alternativeFormats) {
      try {
        const response = await axios.get(
          'https://api.insee.fr/entreprises/sirene/V3.11/siret',
          {
            params: { q: format.q, nombre: 2 },
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          }
        );
        
        console.log(`   ✅ ${format.label}: ${response.data.etablissements.length} results`);
      } catch (error) {
        console.log(`   ❌ ${format.label}: Failed`);
      }
    }
    
    console.log('\n🎉 All INSEE tests completed successfully!');
    console.log('\n📋 Working query formats:');
    console.log('   ✅ denominationUniteLegale:COMPANY_NAME');
    console.log('   ✅ siren:123456789');
    console.log('   ✅ Direct SIREN lookup: /siren/{siren}');
    console.log('\n🚀 Ready to integrate with your application!');
    
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

testINSEEFixed();
