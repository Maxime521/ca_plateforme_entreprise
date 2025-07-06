import INSEEOAuthService from '../../../lib/insee-oauth';
import INSEEAPIService from '../../../lib/insee-api';
import INSEEValidation from '../../../lib/insee-validation';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren, siret } = req.query;

  if (!siren) {
    return res.status(400).json({ 
      success: false,
      message: 'SIREN parameter required',
      example: '/api/test/insee-pdf-debug?siren=552032534'
    });
  }

  const results = {
    timestamp: new Date().toISOString(),
    siren: siren,
    siret: siret,
    tests: []
  };

  try {
    console.log(`🔍 Starting INSEE PDF API debug for SIREN: ${siren}`);

    // Test 1: Validate SIREN
    console.log('📋 Test 1: SIREN Validation');
    const sirenValidation = INSEEValidation.validateSIREN(siren);
    results.tests.push({
      test: 'SIREN Validation',
      success: sirenValidation.valid,
      data: sirenValidation
    });

    if (!sirenValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SIREN',
        results: results
      });
    }

    // Test 2: Get real establishments for this SIREN
    console.log('📋 Test 2: Get Real Establishments');
    let establishmentsData = null;
    try {
      establishmentsData = await INSEEAPIService.getEstablishments(siren);
      results.tests.push({
        test: 'Get Establishments',
        success: true,
        data: {
          count: establishmentsData.length,
          establishments: establishmentsData.slice(0, 5) // First 5 only
        }
      });
      console.log(`✅ Found ${establishmentsData.length} establishments`);
    } catch (error) {
      results.tests.push({
        test: 'Get Establishments',
        success: false,
        error: error.message
      });
      console.log(`❌ Failed to get establishments: ${error.message}`);
    }

    // Test 3: Test OAuth token
    console.log('📋 Test 3: OAuth Token Test');
    const tokenTest = await INSEEOAuthService.testToken();
    results.tests.push({
      test: 'OAuth Token',
      success: tokenTest.valid,
      data: tokenTest
    });

    if (!tokenTest.valid) {
      return res.status(400).json({
        success: false,
        message: 'OAuth token invalid',
        results: results
      });
    }

    // Test 4: Try different SIRET formats
    console.log('📋 Test 4: SIRET Format Tests');
    const siretsToTest = [];
    
    // Add provided SIRET if any
    if (siret) {
      siretsToTest.push(siret);
    }
    
    // Add default principal establishment
    siretsToTest.push(`${siren}00001`);
    
    // Add real establishments if we found any
    if (establishmentsData && establishmentsData.length > 0) {
      establishmentsData.slice(0, 3).forEach(est => {
        if (est.siret && !siretsToTest.includes(est.siret)) {
          siretsToTest.push(est.siret);
        }
      });
    }

    const siretTests = [];
    
    for (const testSiret of siretsToTest) {
      console.log(`🧪 Testing SIRET: ${testSiret}`);
      
      // Validate SIRET format
      const siretValidation = INSEEValidation.validateSIRET(testSiret);
      if (!siretValidation.valid) {
        siretTests.push({
          siret: testSiret,
          validation: siretValidation,
          pdfTest: { success: false, error: 'Invalid SIRET format' }
        });
        continue;
      }

      // Test PDF download for this SIRET
      try {
        const pdfResult = await testINSEEPDFEndpoint(testSiret);
        siretTests.push({
          siret: testSiret,
          validation: siretValidation,
          pdfTest: pdfResult
        });
        
        if (pdfResult.success) {
          console.log(`✅ PDF download successful for SIRET: ${testSiret}`);
          break; // Stop on first success
        } else {
          console.log(`❌ PDF download failed for SIRET: ${testSiret} - ${pdfResult.error}`);
        }
      } catch (error) {
        siretTests.push({
          siret: testSiret,
          validation: siretValidation,
          pdfTest: { success: false, error: error.message }
        });
        console.log(`❌ Exception testing SIRET: ${testSiret} - ${error.message}`);
      }
    }

    results.tests.push({
      test: 'SIRET PDF Tests',
      success: siretTests.some(t => t.pdfTest.success),
      data: siretTests
    });

    // Test 5: Manual API endpoint test
    console.log('📋 Test 5: Manual API Test');
    const manualTest = await testManualAPICall(siren);
    results.tests.push({
      test: 'Manual API Call',
      success: manualTest.success,
      data: manualTest
    });

    return res.status(200).json({
      success: true,
      message: 'INSEE PDF Debug completed',
      results: results,
      recommendations: generateRecommendations(results)
    });

  } catch (error) {
    console.error('Debug error:', error);
    results.tests.push({
      test: 'Overall Debug',
      success: false,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message,
      results: results
    });
  }
}

// Helper function to test INSEE PDF endpoint
async function testINSEEPDFEndpoint(siret) {
  try {
    const token = await INSEEOAuthService.getAccessToken();
    const formattedSIRET = INSEEValidation.formatSIRETForAPI(siret);
    const pdfUrl = `https://api-avis-situation-sirene.insee.fr/identification/pdf/${formattedSIRET}`;
    
    console.log(`🌐 Testing URL: ${pdfUrl}`);
    
    const response = await fetch(pdfUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    });

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      url: pdfUrl,
      formattedSIRET: formattedSIRET
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to test manual API call
async function testManualAPICall(siren) {
  try {
    const token = await INSEEOAuthService.getAccessToken();
    
    // Test the general INSEE API first
    const testUrl = `https://api.insee.fr/entreprises/sirene/V3.11/siren/${siren}`;
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        error: 'INSEE API general test failed'
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      status: response.status,
      message: 'INSEE API accessible',
      companyName: data.uniteLegale?.denominationUniteLegale,
      establishments: data.uniteLegale?.periodesUniteLegale?.[0]?.dateFin ? 'Company may be closed' : 'Company appears active'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Generate recommendations based on test results
function generateRecommendations(results) {
  const recommendations = [];
  
  const pdfTests = results.tests.find(t => t.test === 'SIRET PDF Tests');
  
  if (pdfTests && !pdfTests.success) {
    recommendations.push('❌ No SIRET worked for PDF download. This suggests:');
    recommendations.push('  • The INSEE PDF service may be down or restricted');
    recommendations.push('  • Your API credentials may not have PDF download permissions');
    recommendations.push('  • The company may not have valid establishments for PDF generation');
  }

  const tokenTest = results.tests.find(t => t.test === 'OAuth Token');
  if (tokenTest && !tokenTest.success) {
    recommendations.push('🔑 Fix OAuth token issues first');
  }

  const establishmentTest = results.tests.find(t => t.test === 'Get Establishments');
  if (establishmentTest && establishmentTest.success && establishmentTest.data.count > 0) {
    recommendations.push(`✅ Found ${establishmentTest.data.count} establishments - try using their SIRET numbers`);
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All tests passed - check specific error messages for details');
  }

  return recommendations;
}