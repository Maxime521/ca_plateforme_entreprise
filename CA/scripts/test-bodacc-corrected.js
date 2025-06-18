// scripts/test-bodacc-corrected.js
// Run with: node scripts/test-bodacc-corrected.js

import axios from 'axios';

console.log('🧪 Testing Corrected BODACC API');
console.log('================================\n');

async function testBODACCQueries() {
  const baseUrl = 'https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records';

  console.log('1. 🔍 Testing search by company name (commercant field)...');
  try {
    const response1 = await axios.get(baseUrl, {
      params: {
        where: 'commercant like "%CARREFOUR%"',
        limit: 3,
        timezone: 'Europe/Paris'
      }
    });
    console.log(`   ✅ Found ${response1.data.total_count} results for CARREFOUR`);
    if (response1.data.records.length > 0) {
      const first = response1.data.records[0].record.fields;
      console.log(`   First result: ${first.commercant}`);
      console.log(`   SIREN: ${first.registre}`);
      console.log(`   Date: ${first.dateparution}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.response?.data?.message || error.message}`);
  }

  console.log('\n2. 🔢 Testing search by SIREN (registre field)...');
  try {
    const response2 = await axios.get(baseUrl, {
      params: {
        where: 'registre like "542107651%"',
        limit: 3,
        timezone: 'Europe/Paris'
      }
    });
    console.log(`   ✅ Found ${response2.data.total_count} results for SIREN 542107651`);
    if (response2.data.records.length > 0) {
      const first = response2.data.records[0].record.fields;
      console.log(`   Company: ${first.commercant}`);
      console.log(`   Type: ${first.familleavis_lib}`);
      console.log(`   City: ${first.ville}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.response?.data?.message || error.message}`);
  }

  console.log('\n3. 🏙️ Testing search by city...');
  try {
    const response3 = await axios.get(baseUrl, {
      params: {
        where: 'ville like "Paris"',
        limit: 2,
        timezone: 'Europe/Paris'
      }
    });
    console.log(`   ✅ Found ${response3.data.total_count} results for Paris`);
    if (response3.data.records.length > 0) {
      const first = response3.data.records[0].record.fields;
      console.log(`   Company: ${first.commercant}`);
      console.log(`   Full registre: ${first.registre}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.response?.data?.message || error.message}`);
  }

  console.log('\n4. 📅 Testing recent announcements...');
  try {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30); // Last 30 days
    const dateFromStr = dateFrom.toISOString().split('T')[0];
    
    const response4 = await axios.get(baseUrl, {
      params: {
        where: `dateparution >= date'${dateFromStr}'`,
        limit: 2,
        order_by: 'dateparution desc',
        timezone: 'Europe/Paris'
      }
    });
    console.log(`   ✅ Found ${response4.data.total_count} announcements in last 30 days`);
    if (response4.data.records.length > 0) {
      const first = response4.data.records[0].record.fields;
      console.log(`   Most recent: ${first.commercant} on ${first.dateparution}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.response?.data?.message || error.message}`);
  }

  console.log('\n✅ BODACC field tests completed!');
  console.log('\n📋 Summary of working fields:');
  console.log('   - commercant: Company name');
  console.log('   - registre: SIREN (format: "123 456 789,123456789")');
  console.log('   - ville: City');
  console.log('   - dateparution: Publication date');
  console.log('   - familleavis_lib: Announcement type');
  console.log('   - tribunal: Court');
}

testBODACCQueries();
