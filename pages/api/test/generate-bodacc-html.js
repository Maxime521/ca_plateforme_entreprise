// pages/api/test/generate-bodacc-html.js - MISSING FILE
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren = '552032534', limit = 50 } = req.query;

  try {
    console.log(`📰 Generating BODACC HTML report for SIREN: ${siren}`);
    
    // Fetch BODACC data with improved error handling
    const bodaccData = await fetchBODACCDataSafely(siren, parseInt(limit));
    
    if (!bodaccData.records || bodaccData.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No BODACC records found for this company',
        siren: siren
      });
    }

    // Generate HTML content
    const htmlContent = generateBODACCHTMLSafe(bodaccData, siren);
    
    // Save as HTML file
    const timestamp = Date.now();
    const filename = `BODACC_Report_${siren}_${timestamp}.html`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    await fs.mkdir(uploadsDir, { recursive: true });
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, htmlContent, 'utf8');
    
    console.log(`✅ BODACC HTML report generated: ${filename}`);
    
    return res.status(200).json({
      success: true,
      message: 'BODACC HTML report generated successfully',
      file: {
        filename: filename,
        path: `/uploads/${filename}`,
        recordCount: bodaccData.records.length,
        totalRecords: bodaccData.total_count,
        format: 'HTML',
        size: `${Math.round(htmlContent.length / 1024)} KB`
      },
      siren: siren,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ BODACC HTML generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'BODACC HTML generation failed',
      error: error.message,
      siren: siren
    });
  }
}

// Safe BODACC data fetcher
async function fetchBODACCDataSafely(siren, limit = 50) {
  const url = `https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records?where=registre%20like%20%22${siren}%25%22&limit=${limit}&order_by=dateparution%20desc`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'DataCorp-Platform/1.0' },
    timeout: 10000
  });

  if (!response.ok) {
    throw new Error(`BODACC API error: ${response.status}`);
  }

  return await response.json();
}

// Safe HTML generator with improved error handling
function generateBODACCHTMLSafe(bodaccData, siren) {
  const records = bodaccData.records || [];
  const companyName = records[0]?.record?.fields?.commercant || `Entreprise ${siren}`;
  
  // Extract SIREN safely
  const extractSIRENSafe = (registre) => {
    if (!registre) return '';
    
    try {
      let registreStr;
      if (typeof registre === 'string') {
        registreStr = registre;
      } else if (Array.isArray(registre)) {
        registreStr = registre.join(',');
      } else {
        registreStr = String(registre);
      }
      
      if (registreStr.includes(',')) {
        const parts = registreStr.split(',');
        if (parts.length > 1) {
          const siren = parts[1].trim();
          if (siren.length === 9 && /^\d{9}$/.test(siren)) {
            return siren;
          }
        }
      }
      
      const match = registreStr.match(/(\d{9})/);
      return match ? match[1] : '';
    } catch (error) {
      console.warn('Error extracting SIREN:', error);
      return '';
    }
  };

  // Rest of HTML generation logic...
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>BODACC Report - ${companyName}</title>
    <!-- Your existing styles -->
</head>
<body>
    <!-- Your existing HTML content -->
</body>
</html>`;
}
