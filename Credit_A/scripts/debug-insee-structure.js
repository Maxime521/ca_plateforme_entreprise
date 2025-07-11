// scripts/debug-insee-structure.js
// Run with: node scripts/debug-insee-structure.js

const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🔍 Debugging INSEE Data Structure');
console.log('=================================\n');

async function debugINSEEStructure() {
  const consumerKey = process.env.INSEE_CONSUMER_KEY;
  const consumerSecret = process.env.INSEE_CONSUMER_SECRET;
  
  try {
    // Get token
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
    
    const accessToken = tokenResponse.data.access_token;
    
    // Get one result and examine its structure
    const response = await axios.get(
      'https://api.insee.fr/entreprises/sirene/V3.11/siret',
      {
        params: {
          q: 'denominationUniteLegale:CARREFOUR',
          nombre: 1
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('📊 Full INSEE Response Structure:');
    console.log('=================================');
    
    if (response.data.etablissements && response.data.etablissements.length > 0) {
      const etablissement = response.data.etablissements[0];
      
      console.log('\n🏢 Etablissement structure:');
      console.log('Keys:', Object.keys(etablissement));
      
      console.log('\n🏛️ Unite Legale structure:');
      if (etablissement.uniteLegale) {
        console.log('Keys:', Object.keys(etablissement.uniteLegale));
        
        console.log('\n📋 Sample values:');
        console.log('SIREN:', etablissement.uniteLegale.siren);
        console.log('SIRET:', etablissement.siret);
        console.log('Denomination:', etablissement.uniteLegale.denominationUniteLegale);
        console.log('Legal category:', etablissement.uniteLegale.categorieJuridiqueUniteLegale);
        console.log('APE:', etablissement.uniteLegale.activitePrincipaleUniteLegale);
        console.log('Creation date:', etablissement.uniteLegale.dateCreationUniteLegale);
        console.log('Admin state:', etablissement.uniteLegale.etatAdministratifUniteLegale);
        
        console.log('\n🗂️ Full etablissement object:');
        console.log(JSON.stringify(etablissement, null, 2));
      }
    }
    
  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

debugINSEEStructure();
