// pages/api/test/download-insee.js - Test INSEE PDF Download
import INSEEOAuthService from '../../../lib/insee-oauth';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren = '552032534' } = req.query; // Default to DANONE

  try {
    console.log(`📄 Testing INSEE PDF download for SIREN: ${siren}`);
    
    const result = await INSEEOAuthService.downloadINSEEPDF(siren);
    
    if (result.success) {
      // Save the PDF file
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const filepath = path.join(uploadsDir, result.filename);
      await fs.writeFile(filepath, result.data);
      
      return res.status(200).json({
        success: true,
        message: 'INSEE PDF downloaded successfully',
        file: {
          filename: result.filename,
          size: result.size,
          path: `/uploads/${result.filename}`,
          contentType: result.contentType
        },
        siren: siren,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'INSEE PDF download failed',
        error: result.error,
        siren: siren
      });
    }
    
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
