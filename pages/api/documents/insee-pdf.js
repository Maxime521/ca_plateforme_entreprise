import INSEEPDFSimple from '../../../lib/insee-pdf-simple';
import INSEEValidation from '../../../lib/insee-validation';
import INSEEPDFAlternative from '../../../lib/insee-pdf-alternative';
import { promises as fs } from 'fs';
import path from 'path';
import { createAdminClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren, siret } = req.body;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Enhanced validation
  if (!siren) {
    return res.status(400).json({ 
      success: false,
      message: 'SIREN is required',
      code: 'MISSING_SIREN'
    });
  }

  // Validate SIREN format and checksum
  const sirenValidation = INSEEValidation.validateSIREN(siren);
  if (!sirenValidation.valid) {
    return res.status(400).json({ 
      success: false,
      message: `Invalid SIREN: ${sirenValidation.error}`,
      code: sirenValidation.code
    });
  }

  // Validate SIRET if provided
  if (siret) {
    const siretValidation = INSEEValidation.validateSIRET(siret);
    if (!siretValidation.valid) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid SIRET: ${siretValidation.error}`,
        code: siretValidation.code
      });
    }
    
    // Check if SIRET matches SIREN
    if (siretValidation.siren !== sirenValidation.cleanSiren) {
      return res.status(400).json({ 
        success: false,
        message: 'SIRET does not match the provided SIREN',
        code: 'SIRET_SIREN_MISMATCH'
      });
    }
  }

  // Rate limiting check
  const rateLimit = INSEEValidation.checkRateLimit(clientIP, 10, 60000); // 10 requests per minute
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimit.retryAfter
    });
  }

  try {
    console.log(`📄 Starting INSEE AVIS DE SITUATION for SIREN: ${sirenValidation.cleanSiren}`);

    // Try simple direct approach first (no authentication required)
    console.log('🔄 Attempting simple direct INSEE PDF download...');
    let documentResult = await INSEEPDFSimple.downloadINSEEPDF(sirenValidation.cleanSiren, siret);
    
    // If simple approach fails, fall back to alternative system
    if (!documentResult.success) {
      console.log('⚠️ Simple approach failed, trying enhanced alternative...');
      documentResult = await INSEEPDFAlternative.getAvisSituation(sirenValidation.cleanSiren, siret);
    }

    if (!documentResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate AVIS DE SITUATION',
        error: documentResult.error,
        siren: sirenValidation.cleanSiren,
        siret: siret
      });
    }

    console.log(`✅ AVIS DE SITUATION generated: ${documentResult.fileName}`);

    // Step 2: Save document metadata to database
    let documentRecord = null;
    try {
      const supabase = createAdminClient();
      
      // Find or create company
      let { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('siren', sirenValidation.cleanSiren)
        .single();

      if (companyError && companyError.code === 'PGRST116') {
        // Company doesn't exist, create it
        const companyName = documentResult.data?.denomination || `Entreprise ${sirenValidation.cleanSiren}`;
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            siren: sirenValidation.cleanSiren,
            denomination: companyName,
            active: true
          })
          .select('id')
          .single();

        if (createError) throw createError;
        company = newCompany;
      } else if (companyError) {
        throw companyError;
      }

      // Create document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          company_id: company.id,
          type_document: documentResult.contentType === 'application/pdf' ? 'PDF INSEE' : 'HTML INSEE',
          source: documentResult.source || 'INSEE',
          description: 'Avis de situation au répertoire Sirene',
          lien_document: documentResult.path,
          date_publication: new Date().toISOString(),
          reference: `AVIS_${sirenValidation.cleanSiren}_${new Date().toISOString().replace(/[:.]/g, '-')}`
        })
        .select()
        .single();

      if (docError) throw docError;
      documentRecord = document;
      console.log(`📝 Document record created: ${document.id}`);

    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue without database record - file is still saved
    }

    // Step 3: Return success response with enhanced AVIS DE SITUATION data
    return res.status(200).json({
      success: true,
      message: documentResult.message || 'AVIS DE SITUATION generated successfully',
      document: {
        id: documentRecord?.id || 'no-db-record',
        fileName: documentResult.fileName,
        type: 'avis-situation',
        siren: sirenValidation.cleanSiren,
        siret: siret,
        path: documentResult.path,
        url: documentResult.url,
        size: documentResult.size,
        contentType: documentResult.contentType,
        downloadedAt: documentResult.generatedAt || documentResult.downloadedAt || new Date().toISOString(),
        description: 'Avis de situation au répertoire Sirene',
        officialName: 'Avis de situation au répertoire Sirene',
        displayName: 'AVIS DE SITUATION',
        category: 'INSEE_OFFICIAL',
        isValidated: true,
        source: documentResult.source || 'INSEE',
        method: documentResult.method || 'alternative',
        note: documentResult.note
      }
    });

  } catch (error) {
    console.error('INSEE PDF download error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download INSEE PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      siren: siren
    });
  }
}