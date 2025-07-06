import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import the fixed INSEE service (using dynamic import for CommonJS)
const { default: INSEEAPIService } = await import('../lib/insee-api.js');

console.log('🧪 Testing Fixed INSEE Service');
console.log('===============================\n');

async function testFixedINSEE() {
  try {
    console.log('1️⃣ Testing company search...');
    
    const searchResults = await INSEEAPIService.searchCompanies('CARREFOUR');
    console.log('✅ Search successful!');
    console.log(`   Total results: ${searchResults.total}`);
    console.log(`   Results returned: ${searchResults.results.length}`);
    
    if (searchResults.results.length > 0) {
      const first = searchResults.results[0];
      console.log('\n📊 First result:');
      console.log(`   SIREN: ${first.siren}`);
      console.log(`   Company: ${first.denomination}`);
      console.log(`   Legal form: ${first.formeJuridique}`);
      console.log(`   APE: ${first.codeAPE} - ${first.libelleAPE}`);
      console.log(`   Active: ${first.active ? 'Yes' : 'No'}`);
      console.log(`   Address: ${first.adresseSiege}`);
    }
    
    console.log('\n2️⃣ Testing SIREN lookup...');
    
    const company = await INSEEAPIService.getCompanyBySiren('542107651');
    console.log('✅ SIREN lookup successful!');
    console.log(`   Company: ${company.denomination}`);
    console.log(`   Created: ${company.dateCreation}`);
    console.log(`   Legal form: ${company.formeJuridique}`);
    console.log(`   APE: ${company.codeAPE}`);
    console.log(`   Active: ${company.active ? 'Yes' : 'No'}`);
    
    console.log('\n3️⃣ Testing establishments lookup...');
    
    const establishments = await INSEEAPIService.getEstablishments('542107651');
    console.log('✅ Establishments lookup successful!');
    console.log(`   Found ${establishments.length} establishments`);
    
    if (establishments.length > 0) {
      const firstEst = establishments[0];
      console.log(`   First establishment: ${firstEst.siret}`);
      console.log(`   Address: ${firstEst.adresse}`);
      console.log(`   Active: ${firstEst.active ? 'Yes' : 'No'}`);
      console.log(`   Head office: ${firstEst.siegeSocial ? 'Yes' : 'No'}`);
    }
    
    console.log('\n🎉 All tests passed! INSEE service is working perfectly.');
    console.log('\n✅ Ready to integrate with your search API!');
    
  } catch (error) {
    console.log('❌ Test failed:');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('400')) {
      console.log('\n💡 Query syntax might still need adjustment');
      console.log('   Check the exact error in INSEE response');
    }
  }
}

testFixedINSEE();
