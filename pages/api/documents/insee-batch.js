// pages/api/documents/insee-batch.js - Batch download INSEE "Avis de situation" PDFs
import INSEEOAuthService from '../../../lib/insee-oauth';
import INSEEAPIService from '../../../lib/insee-api';
import INSEEValidation from '../../../lib/insee-validation';
import { promises as fs } from 'fs';
import path from 'path';
import { createAdminClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { companies, options = {} } = req.body;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Rate limiting for batch operations (stricter limits)
  const rateLimit = INSEEValidation.checkRateLimit(`batch_${clientIP}`, 3, 300000); // 3 batch requests per 5 minutes
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Batch rate limit exceeded. Please wait before starting another batch operation.',
      code: 'BATCH_RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimit.retryAfter
    });
  }

  // Enhanced batch validation
  const validation = INSEEValidation.validateBatchRequest(companies, options);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: 'Batch validation failed',
      errors: validation.errors,
      invalidCompanies: validation.invalidCompanies,
      code: 'BATCH_VALIDATION_FAILED'
    });
  }

  try {
    console.log(`📄 Starting batch INSEE PDF download for ${companies.length} companies`);
    
    const results = [];
    const errors = [];
    
    // Process each company
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const { siren, siret, denomination } = company;
      
      try {
        console.log(`[${i + 1}/${companies.length}] Processing SIREN: ${siren}`);
        
        // Call the individual INSEE PDF download function
        const result = await downloadINSEEPDFForCompany(siren, siret, denomination);
        
        results.push({
          siren,
          siret: result.siret,
          denomination: denomination || result.denomination,
          success: true,
          document: result.document,
          downloadedAt: new Date().toISOString()
        });
        
        // Add delay between requests to respect rate limits
        if (i < companies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, options.delayMs || 500));
        }
        
      } catch (error) {
        console.error(`Error processing SIREN ${siren}:`, error.message);
        
        errors.push({
          siren,
          siret,
          denomination,
          success: false,
          error: error.message,
          errorAt: new Date().toISOString()
        });
      }
    }
    
    const summary = {
      total: companies.length,
      successful: results.length,
      failed: errors.length,
      successRate: `${Math.round((results.length / companies.length) * 100)}%`
    };
    
    console.log(`📊 Batch processing summary:`, summary);
    
    return res.status(200).json({
      success: true,
      message: `Batch processing completed: ${summary.successful}/${summary.total} successful`,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Batch processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Batch processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

// Helper function to download INSEE PDF for a single company
async function downloadINSEEPDFForCompany(siren, siret = null, denomination = null) {
  // Step 1: Get actual SIRET if not provided
  let actualSIRET = siret;
  if (!actualSIRET) {
    try {
      const companyData = await INSEEAPIService.getCompanyBySiren(siren);
      if (companyData && companyData.siret) {
        actualSIRET = companyData.siret;
      } else {
        actualSIRET = `${siren}00001`;
      }
    } catch (error) {
      actualSIRET = `${siren}00001`;
    }
  }

  // Step 2: Download PDF from INSEE
  const pdfResult = await INSEEOAuthService.downloadINSEEPDF(siren, actualSIRET);

  if (!pdfResult.success) {
    throw new Error(`Failed to download INSEE PDF: ${pdfResult.error}`);
  }

  // Step 3: Save PDF to uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `INSEE_Avis_Situation_${siren}_${timestamp}.pdf`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, pdfResult.data);

  // Step 4: Save document metadata to database
  let documentRecord = null;
  try {
    const supabase = createAdminClient();
    
    // Find or create company
    let { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('siren', siren)
      .single();

    if (companyError && companyError.code === 'PGRST116') {
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          siren,
          denomination: denomination || `Entreprise ${siren}`,
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
        type_document: 'PDF INSEE',
        source: 'INSEE',
        description: 'Avis de situation au répertoire Sirene',
        lien_document: `/uploads/${fileName}`,
        date_publication: new Date().toISOString(),
        reference: `INSEE_${siren}_${timestamp}`
      })
      .select()
      .single();

    if (docError) throw docError;
    documentRecord = document;

  } catch (dbError) {
    console.error('Database error:', dbError);
    // Continue without database record - file is still saved
  }

  return {
    siren,
    siret: actualSIRET,
    denomination: denomination || `Entreprise ${siren}`,
    document: {
      id: documentRecord?.id || 'no-db-record',
      fileName: fileName,
      type: 'avis-situation',
      path: `/uploads/${fileName}`,
      url: `/api/serve-file/uploads/${fileName}`,
      size: pdfResult.size,
      contentType: 'application/pdf',
      description: 'Avis de situation au répertoire Sirene',
      officialName: 'Avis de situation au répertoire Sirene',
      displayName: 'AVIS DE SITUATION',
      category: 'INSEE_OFFICIAL',
      isValidated: true,
      source: 'INSEE'
    }
  };
}