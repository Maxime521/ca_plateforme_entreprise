// pages/api/documents/generate-pdfs.js - FIXED VERSION WITHOUT IMPORTS
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren } = req.query;

  if (!siren || !/^\d{9}$/.test(siren)) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid SIREN format. Must be 9 digits.',
      example: 'Example: ?siren=552032534'
    });
  }

  try {
    console.log(`🔍 Generating PDFs for SIREN: ${siren}`);
    
    // Check environment variables
    const hasInseeCredentials = !!(process.env.INSEE_CONSUMER_KEY && process.env.INSEE_CONSUMER_SECRET);
    const hasInpiToken = !!process.env.INPI_API_TOKEN;
    
    console.log(`📋 Environment check:`);
    console.log(`   INSEE credentials: ${hasInseeCredentials}`);
    console.log(`   INPI token: ${hasInpiToken}`);

    // Test BODACC connectivity and get actual data count
    let bodaccInfo = {
      status: 'unknown',
      count: 0,
      tested: false
    };

    try {
      console.log('🧪 Testing BODACC API connectivity...');
      
      const bodaccUrl = `https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records?where=registre%20like%20%22${siren}%25%22&limit=1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const bodaccResponse = await fetch(bodaccUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (bodaccResponse.ok) {
        const data = await bodaccResponse.json();
        bodaccInfo = {
          status: 'working',
          count: data.total_count || 0,
          tested: true,
          sample_record: data.records?.[0]?.record?.fields ? {
            id: data.records[0].record.fields.id,
            date: data.records[0].record.fields.dateparution,
            type: data.records[0].record.fields.familleavis_lib,
            company: data.records[0].record.fields.commercant
          } : null
        };
        console.log(`✅ BODACC: Found ${bodaccInfo.count} records for SIREN ${siren}`);
      } else {
        bodaccInfo.status = 'error';
        bodaccInfo.httpStatus = bodaccResponse.status;
      }
      
    } catch (error) {
      bodaccInfo.status = 'timeout';
      bodaccInfo.error = error.message;
      console.log('⚠️ BODACC test failed:', error.message);
    }

    // Generate document sources information
    const documents = [
      {
        id: `insee_${siren}`,
        name: `INSEE_Avis_Situation_${siren}.pdf`,
        type: 'insee',
        source: 'INSEE SIRENE',
        url: `https://api-avis-situation-sirene.insee.fr/identification/pdf/${siren.substring(0,3)} ${siren.substring(3,6)} ${siren.substring(6,9)} 00001`,
        siren: siren,
        description: 'Avis de situation administrative (certificat INSEE)',
        format: 'PDF',
        requiresAuth: true,
        available: hasInseeCredentials,
        error: !hasInseeCredentials ? 'INSEE credentials required in .env.local' : undefined,
        notes: hasInseeCredentials ? 
          'Credentials configured - OAuth token implementation needed' : 
          'Add INSEE_CONSUMER_KEY and INSEE_CONSUMER_SECRET to .env.local',
        documentation: 'https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=SireneAvisSituation&version=V3&provider=insee'
      },
      {
        id: `bodacc_${siren}`,
        name: `BODACC_Data_${siren}.json`,
        type: 'bodacc',
        source: 'BODACC (Journal Officiel)',
        url: `https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records?where=registre%20like%20%22${siren}%25%22&limit=50`,
        siren: siren,
        description: `Annonces commerciales officielles (${bodaccInfo.count} trouvées)`,
        format: 'JSON',
        requiresAuth: false,
        available: bodaccInfo.status === 'working',
        tested: bodaccInfo.tested,
        recordCount: bodaccInfo.count,
        sampleData: bodaccInfo.sample_record,
        notes: bodaccInfo.status === 'working' ? 
          `${bodaccInfo.count} annonces disponibles - format JSON uniquement` :
          'Service BODACC temporairement indisponible',
        pdfNote: 'BODACC ne fournit que JSON/CSV/Excel - conversion PDF possible côté serveur',
        realTimeTest: true
      },
      {
        id: `inpi_${siren}`,
        name: `INPI_RNE_${siren}.pdf`,
        type: 'inpi',
        source: 'INPI (Registre National des Entreprises)',
        url: `https://data.inpi.fr/export/companies?format=pdf&ids=[%22${siren}%22]&est=all`,
        siren: siren,
        description: 'Extrait d\'immatriculation RNE complet',
        format: 'PDF',
        requiresAuth: true,
        available: hasInpiToken,
        error: !hasInpiToken ? 'Token INPI requis - inscription gratuite sur data.inpi.fr' : undefined,
        notes: hasInpiToken ? 
          'Token configuré - prêt pour téléchargement' : 
          'Créer un compte sur https://data.inpi.fr pour obtenir un token API',
        documentation: 'https://data.inpi.fr/'
      }
    ];

    const availableCount = documents.filter(doc => doc.available).length;
    const workingCount = documents.filter(doc => doc.available && (!doc.tested || doc.recordCount > 0)).length;

    console.log(`✅ Generated ${documents.length} document sources`);
    console.log(`   Available: ${availableCount}`);
    console.log(`   Working: ${workingCount}`);

    // Determine overall system status
    let systemStatus = 'partial';
    if (workingCount === 0) systemStatus = 'needs_setup';
    if (workingCount === documents.length) systemStatus = 'fully_operational';

    return res.status(200).json({
      success: true,
      siren: siren,
      documents: documents,
      summary: {
        total: documents.length,
        available: availableCount,
        working: workingCount,
        needsSetup: documents.length - availableCount
      },
      systemStatus: systemStatus,
      timestamp: new Date().toISOString(),
      environment: {
        inseeConfigured: hasInseeCredentials,
        inpiConfigured: hasInpiToken,
        bodaccWorking: bodaccInfo.status === 'working'
      },
      realTimeData: {
        bodaccRecords: bodaccInfo.count,
        bodaccTested: bodaccInfo.tested,
        bodaccStatus: bodaccInfo.status
      },
      nextSteps: [
        !hasInseeCredentials ? '1. Add INSEE credentials to .env.local' : '✅ INSEE credentials configured',
        hasInseeCredentials ? '2. Implement INSEE OAuth token flow' : '2. Get INSEE OAuth token (after step 1)',
        !hasInpiToken ? '3. Register at data.inpi.fr and add INPI_API_TOKEN to .env.local' : '✅ INPI token configured',
        bodaccInfo.status === 'working' ? '✅ BODACC service operational' : '4. Check BODACC service status',
        workingCount > 0 ? '✅ System partially operational' : '5. Complete setup to enable document access'
      ].filter(Boolean),
      notes: [
        'This API provides document source information and availability',
        'BODACC data tested in real-time - JSON format only',
        'INSEE and INPI require authentication tokens',
        `Found ${bodaccInfo.count} BODACC records for this company`,
        systemStatus === 'fully_operational' ? 
          'All document sources are available' : 
          'Some configuration needed for full functionality'
      ]
    });

  } catch (error) {
    console.error('Document generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating document information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      siren: siren,
      timestamp: new Date().toISOString()
    });
  }
}
