// test-bodacc-connectivity.js - Test BODACC connectivity
const axios = require('axios');

async function testBODACCConnectivity() {
  console.log('🧪 Testing BODACC API connectivity...');
  console.log('====================================\n');

  const tests = [
    {
      name: 'Basic connectivity test',
      url: 'https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records',
      params: { limit: 1, timezone: 'Europe/Paris' }
    },
    {
      name: 'Search by company name',
      url: 'https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records',
      params: { 
        where: 'commercant like "%CARREFOUR%"',
        limit: 3,
        timezone: 'Europe/Paris'
      }
    },
    {
      name: 'Search by SIREN',
      url: 'https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records',
      params: { 
        where: 'registre like "542107651%"',
        limit: 3,
        timezone: 'Europe/Paris'
      }
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🔍 ${test.name}...`);
      
      const response = await axios.get(test.url, {
        params: test.params,
        timeout: 5000,
        headers: {
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });

      console.log(`✅ Success! Found ${response.data.total_count || 0} records`);
      
      if (response.data.records && response.data.records.length > 0) {
        const first = response.data.records[0].record.fields;
        console.log(`   Sample: ${first.commercant || 'N/A'} (${first.registre || 'N/A'})`);
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      if (error.code) {
        console.log(`   Error code: ${error.code}`);
      }
      if (error.response) {
        console.log(`   HTTP status: ${error.response.status}`);
      }
    }
    console.log('');
  }

  console.log('🏁 BODACC connectivity test completed!');
  console.log('\n💡 If all tests failed:');
  console.log('   1. Check your internet connection');
  console.log('   2. Try accessing the URL in your browser');
  console.log('   3. BODACC API might be temporarily down');
  console.log('\n🌐 BODACC Portal: https://bodacc-datadila.opendatasoft.com');
}

// Run the test
testBODACCConnectivity().catch(console.error);
