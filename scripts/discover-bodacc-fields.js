import axios from 'axios';

console.log('🔍 BODACC API Field Discovery');
console.log('==============================\n');

async function discoverBodaccFields() {
  try {
    console.log('📊 Getting dataset information...');
    
    // Get dataset information
    const datasetResponse = await axios.get(
      'https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales'
    );
    
    console.log('✅ Dataset info retrieved');
    console.log(`   Dataset ID: ${datasetResponse.data.dataset_id || 'annonces-commerciales'}`);
    
    // Check if we have metas and records_count
    if (datasetResponse.data.metas && datasetResponse.data.metas.default) {
      console.log(`   Records count: ${datasetResponse.data.metas.default.records_count}`);
    } else {
      console.log('   Records count: Not available in metas');
    }
    
    // Get field information
    if (datasetResponse.data.fields) {
      console.log('\n📋 Available fields:');
      datasetResponse.data.fields.forEach(field => {
        console.log(`   - ${field.name} (${field.type}): ${field.label || 'No label'}`);
      });
    } else {
      console.log('\n📋 Fields information not available in dataset info');
    }
    
    console.log('\n🔍 Testing sample query without filters...');
    
    // Get a few sample records to see actual structure
    const sampleResponse = await axios.get(
      'https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records',
      {
        params: {
          limit: 3,
          timezone: 'Europe/Paris'
        }
      }
    );
    
    console.log('✅ Sample data retrieved');
    console.log(`   Total records available: ${sampleResponse.data.total_count}`);
    
    if (sampleResponse.data.records && sampleResponse.data.records.length > 0) {
      console.log('\n📄 Sample record fields:');
      const sampleFields = sampleResponse.data.records[0].record.fields;
      const fieldNames = Object.keys(sampleFields).sort();
      
      fieldNames.forEach(key => {
        const value = sampleFields[key];
        let preview = value;
        if (typeof value === 'string' && value.length > 50) {
          preview = value.substring(0, 50) + '...';
        }
        console.log(`   - ${key}: ${preview}`);
      });
      
      // Look for company name fields
      console.log('\n🏢 Company name related fields:');
      fieldNames.forEach(key => {
        if (key.toLowerCase().includes('denomination') || 
            key.toLowerCase().includes('nom') || 
            key.toLowerCase().includes('raison') ||
            key.toLowerCase().includes('commercial') ||
            key.toLowerCase().includes('entreprise')) {
          console.log(`   ✨ ${key}: ${sampleFields[key]}`);
        }
      });
      
      // Look for SIREN related fields
      console.log('\n🔢 SIREN/RCS related fields:');
      fieldNames.forEach(key => {
        if (key.toLowerCase().includes('siren') || 
            key.toLowerCase().includes('rcs') || 
            key.toLowerCase().includes('numero')) {
          console.log(`   ✨ ${key}: ${sampleFields[key]}`);
        }
      });
      
      // Look for address fields
      console.log('\n📍 Address related fields:');
      fieldNames.forEach(key => {
        if (key.toLowerCase().includes('adresse') || 
            key.toLowerCase().includes('voie') || 
            key.toLowerCase().includes('ville') ||
            key.toLowerCase().includes('postal') ||
            key.toLowerCase().includes('siege')) {
          console.log(`   ✨ ${key}: ${sampleFields[key]}`);
        }
      });
      
      // Test a few search queries with different field names
      console.log('\n🧪 Testing search queries...');
      
      const testQueries = [
        'denomination like "%CARREFOUR%"',
        'nom like "%CARREFOUR%"',
        'raison_sociale like "%CARREFOUR%"',
        'denomination_sociale like "%CARREFOUR%"'
      ];
      
      for (const query of testQueries) {
        try {
          const testResponse = await axios.get(
            'https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records',
            {
              params: {
                where: query,
                limit: 1,
                timezone: 'Europe/Paris'
              }
            }
          );
          console.log(`   ✅ Query "${query}" works! Found ${testResponse.data.total_count} results`);
          break; // Stop at first working query
        } catch (error) {
          console.log(`   ❌ Query "${query}" failed: ${error.response?.data?.message || error.message}`);
        }
      }
      
    } else {
      console.log('❌ No sample records found');
    }
    
  } catch (error) {
    console.log('❌ Error discovering BODACC fields:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

discoverBodaccFields();
