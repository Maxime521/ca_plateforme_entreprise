// test-bodacc-in-nextjs.js - Fixed to match working API
const axios = require('axios');

async function testBODACCInNextJSContext() {
  console.log('🧪 Testing BODACC in Next.js API Context');
  console.log('==========================================\n');

  const query = 'CARREFOUR';
  
  try {
    console.log(`📰 Testing BODACC search for "${query}" with exact API parameters...`);
    
    const bodaccResponse = await axios.get('https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records', {
      params: {
        where: `commercant like "%${query}%"`,
        limit: 20,
        order_by: 'dateparution desc',
        timezone: 'Europe/Paris'
      },
      timeout: 8000,
      headers: {
        'User-Agent': 'DataCorp-Platform/1.0',
        'Accept': 'application/json'
      }
    });

    console.log(`✅ Raw BODACC response received`);
    console.log(`   Status: ${bodaccResponse.status}`);
    console.log(`   Total count: ${bodaccResponse.data.total_count || 0}`);
    console.log(`   Records: ${bodaccResponse.data.records?.length || 0}`);
    
    // Use the SAME formatting function as the working API
    const formattedResults = formatBODACCAnnouncements(bodaccResponse.data);
    console.log(`📝 Formatted results: ${formattedResults.results.length}`);
    
    if (formattedResults.results.length > 0) {
      console.log('\n📋 Sample results:');
      formattedResults.results.slice(0, 5).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.denomination} (${result.siren}) - ${result.ville}`);
      });
    }
    
    return formattedResults;
    
  } catch (error) {
    console.log(`❌ BODACC test failed: ${error.message}`);
    throw error;
  }
}

// FIXED: Use the SAME SIREN extraction as the working API
function extractSIREN(registre) {
  if (!registre) return '';
  
  const registreStr = String(registre);
  
  // Method 1: Split by comma and take second part (this works!)
  if (registreStr.includes(',')) {
    const parts = registreStr.split(',');
    if (parts.length > 1) {
      const siren = parts[1].trim();
      if (siren.length === 9 && /^\d{9}$/.test(siren)) {
        return siren;
      }
    }
  }
  
  // Method 2: Extract first 9 consecutive digits as fallback
  const match = registreStr.match(/(\d{9})/);
  if (match) {
    return match[1];
  }
  
  return '';
}

// FIXED: Use the SAME formatting function as the working API
function formatBODACCAnnouncements(data) {
  if (!data || !data.records) {
    console.log('❌ No BODACC data or records');
    return { results: [], total: 0 };
  }

  console.log(`🔄 Processing ${data.records.length} BODACC records...`);
  const results = [];

  for (let i = 0; i < data.records.length; i++) {
    try {
      const record = data.records[i];
      const fields = record.record?.fields || record.fields || {};
      
      // Use the FIXED SIREN extraction
      const siren = extractSIREN(fields.registre);
      
      if (siren) {
        const result = {
          id: fields.id || `bodacc-${siren}-${Date.now()}-${i}`,
          siren: siren,
          registre: fields.registre,
          denomination: fields.commercant || fields.denomination || 'Entreprise inconnue',
          formeJuridique: null,
          adresse: formatBodaccAddress(fields),
          dateParution: fields.dateparution,
          typeAnnonce: fields.familleavis_lib || fields.familleavis || 'Annonce',
          numeroAnnonce: fields.numeroannonce,
          tribunal: fields.tribunal,
          ville: fields.ville,
          codePostal: fields.cp,
          departement: fields.departement_nom_officiel,
          region: fields.region_nom_officiel,
          details: fields.publicationavis
        };
        
        results.push(result);
        
        if (i < 3) {
          console.log(`   ✅ Record ${i + 1}: ${result.denomination} (${result.siren})`);
        }
      } else {
        if (i < 3) {
          console.log(`   ⚠️  Record ${i + 1}: No SIREN from "${fields.registre}"`);
        }
      }
      
    } catch (recordError) {
      console.error(`❌ Error processing record ${i}:`, recordError.message);
      continue;
    }
  }

  console.log(`✅ Successfully processed ${results.length} valid results out of ${data.records.length} total`);
  
  return {
    results: results,
    total: data.total_count || results.length
  };
}

function formatBodaccAddress(fields) {
  try {
    const parts = [
      fields.ville,
      fields.cp,
      fields.departement_nom_officiel
    ].filter(Boolean).filter(part => String(part).trim() !== '');

    return parts.length > 0 ? parts.join(', ') : 'Adresse non disponible';
  } catch (error) {
    return 'Adresse non disponible';
  }
}

// Run the test
testBODACCInNextJSContext()
  .then(results => {
    console.log('\n🎉 BODACC test completed successfully!');
    console.log(`📊 Summary: ${results.results.length} valid results`);
  })
  .catch(error => {
    console.log('\n💥 BODACC test failed');
    console.log('Error:', error.message);
  });
