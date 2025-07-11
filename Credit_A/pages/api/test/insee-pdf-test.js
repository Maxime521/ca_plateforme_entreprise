// pages/api/test/insee-pdf-test.js - Test INSEE PDF Download (Simple No-Auth)
import INSEEPDFSimple from '../../../lib/insee-pdf-simple';
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
      example: '/api/test/insee-pdf-test?siren=552032534&siret=55203253400679'
    });
  }

  try {
    console.log(`🧪 Testing INSEE PDF download for SIREN: ${siren}`);

    // Test 1: Check credentials
    const hasCredentials = !!(process.env.INSEE_CONSUMER_KEY && process.env.INSEE_CONSUMER_SECRET);
    
    if (!hasCredentials) {
      return res.status(400).json({
        success: false,
        message: 'INSEE credentials not configured',
        setup: 'Add INSEE_CONSUMER_KEY and INSEE_CONSUMER_SECRET to .env.local',
        documentation: 'https://api.insee.fr/catalogue/'
      });
    }

    // Test 2: Simple validation check
    console.log('✅ No OAuth required for INSEE PDF endpoint');

    // Test 3: Validate SIREN/SIRET
    const sirenValidation = INSEEValidation.validateSIREN(siren);
    if (!sirenValidation.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid SIREN: ${sirenValidation.error}`,
        code: sirenValidation.code
      });
    }

    if (siret) {
      const siretValidation = INSEEValidation.validateSIRET(siret);
      if (!siretValidation.valid) {
        return res.status(400).json({
          success: false,
          message: `Invalid SIRET: ${siretValidation.error}`,
          code: siretValidation.code
        });
      }
    }

    // Test 3: Try simple direct PDF download
    console.log('🔄 Using simple direct INSEE PDF download...');
    const documentResult = await INSEEPDFSimple.downloadINSEEPDF(sirenValidation.cleanSiren, siret);

    if (documentResult.success) {
      // Return PDF file directly
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${documentResult.fileName}"`);
      res.setHeader('Content-Length', documentResult.size);
      res.send(documentResult.data);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Simple INSEE PDF download failed',
        error: documentResult.error,
        method: documentResult.method,
        siren: sirenValidation.cleanSiren,
        siret: siret
      });
    }

  } catch (error) {
    console.error('INSEE PDF test error:', error);
    return res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message,
      siren: siren
    });
  }
}