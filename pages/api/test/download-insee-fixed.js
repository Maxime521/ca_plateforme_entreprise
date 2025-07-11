// pages/api/test/download-insee-fixed.js - Fixed INSEE PDF Download
import INSEEOAuthService from '../../../lib/insee-oauth';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren = '552032534', debug = 'false' } = req.query;

  try {
    console.log(`📄 Testing INSEE PDF download for SIREN: ${siren}`);
    
    // Get OAuth token
    const token = await INSEEOAuthService.getAccessToken();
    console.log('✅ OAuth token obtained');

    // Try different URL formats for INSEE PDF
    const urlFormats = [
      // Format 1: With spaces in SIRET
      `https://api-avis-situation-sirene.insee.fr/identification/pdf/${siren.substring(0,3)} ${siren.substring(3,6)} ${siren.substring(6,9)} 00001`,
      
      // Format 2: Without spaces
      `https://api-avis-situation-sirene.insee.fr/identification/pdf/${siren}00001`,
      
      // Format 3: SIREN only
      `https://api-avis-situation-sirene.insee.fr/identification/pdf/${siren}`,
      
      // Format 4: Different endpoint
      `https://api.insee.fr/entreprises/sirene/avis-situation/pdf/${siren}`
    ];

    let lastError = null;
    let attempts = [];

    for (let i = 0; i < urlFormats.length; i++) {
      const url = urlFormats[i];
      
      try {
        console.log(`🧪 Trying URL format ${i + 1}: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/pdf',
            'User-Agent': 'DataCorp-Platform/1.0'
          }
        });

        const attemptResult = {
          format: i + 1,
          url: url,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        };

        attempts.push(attemptResult);

        if (response.ok) {
          console.log(`✅ Success with format ${i + 1}!`);
          
          // Download the PDF
          const pdfBuffer = await response.arrayBuffer();
          
          // Save the PDF file
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });
          
          const filename = `INSEE_Avis_Situation_${siren}_${Date.now()}.pdf`;
          const filepath = path.join(uploadsDir, filename);
          await fs.writeFile(filepath, Buffer.from(pdfBuffer));
          
          return res.status(200).json({
            success: true,
            message: `INSEE PDF downloaded successfully using format ${i + 1}`,
            file: {
              filename: filename,
              size: pdfBuffer.byteLength,
              path: `/uploads/${filename}`,
              contentType: response.headers.get('content-type')
            },
            workingUrl: url,
            siren: siren,
            attempts: debug === 'true' ? attempts : undefined,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`❌ Format ${i + 1} failed: ${response.status} ${response.statusText}`);
          lastError = `${response.status} ${response.statusText}`;
        }
        
      } catch (error) {
        console.log(`❌ Format ${i + 1} error: ${error.message}`);
        attempts.push({
          format: i + 1,
          url: url,
          error: error.message
        });
        lastError = error.message;
      }
    }

    // All formats failed
    return res.status(500).json({
      success: false,
      message: 'All INSEE PDF URL formats failed',
      lastError: lastError,
      siren: siren,
      attempts: attempts,
      note: 'The INSEE PDF API might have changed or require different authentication',
      suggestions: [
        'Check INSEE API documentation for current PDF endpoint',
        'Verify if additional parameters are required',
        'Check if SIRET format needs to be different'
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ INSEE PDF download test failed:', error);
    return res.status(500).json({
      success: false,
      message: 'INSEE PDF download test failed',
      error: error.message,
      siren: siren
    });
  }
}
