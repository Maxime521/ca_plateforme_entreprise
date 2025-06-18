// test-siren-search.js - Test SIREN search specifically
const axios = require('axios');

async function testSIRENSearch() {
  console.log('🔢 Testing SIREN Search Issue');
  console.log('==============================\n');

  const testCases = [
    {
      name: 'CARREFOUR by name',
      query: 'CARREFOUR',
      expectedSiren: '652014051'
    },
    {
      name: 'CARREFOUR by SIREN',
      query: '652014051',
      expectedSiren: '652014051'
    },
    {
      name: 'DANONE by name',
      query: 'DANONE',
      expectedSiren: '552032534'
    },
    {
      name: 'DANONE by SIREN',
      query: '552032534',
      expectedSiren: '552032534'
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`🧪 ${testCase.name}...`);
      
      const response = await axios.get(`http://localhost:3000/api/companies/search-v2?q=${testCase.query}`, {
        timeout: 10000
      });

      if (response.data.success && response.data.results.length > 0) {
        const firstResult = response.data.results[0];
        console.log(`✅ Success!`);
        console.log(`   Company: ${firstResult.denomination || 'N/A'}`);
        console.log(`   SIREN: ${firstResult.siren || 'N/A'}`);
        console.log(`   Source: ${firstResult.source || 'N/A'}`);
        
        if (firstResult.siren === testCase.expectedSiren) {
          console.log(`   ✅ SIREN matches expected value`);
        } else {
          console.log(`   ⚠️  SIREN differs from expected (${testCase.expectedSiren})`);
        }
      } else {
        console.log(`❌ No results found`);
        console.log(`   Errors: ${JSON.stringify(response.data.errors || [])}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    console.log('');
  }

  console.log('🏁 SIREN search test completed!');
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get('http://localhost:3000', { timeout: 3000 });
    return true;
  } catch (error) {
    console.log('❌ Server is not running on localhost:3000');
    console.log('Please start your server with: npm run dev');
    return false;
  }
}

// Run the test
async function runTest() {
  if (await checkServer()) {
    await testSIRENSearch();
  }
}

runTest().catch(console.error);
