// pages/api/documents/download/[type]/[siren].js - Server-side document download API
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { type, siren } = req.query;
  const { siret } = req.query; // Optional SIRET parameter

  console.log(`📥 Download request: ${type}/${siren}${siret ? `/${siret}` : ''}`);

  try {
    switch (type.toLowerCase()) {
      case 'inpi':
        return await handleINPIDownload(req, res, siren);
      
      case 'insee':
        return await handleINSEEDownload(req, res, siren, siret);
      
      case 'bodacc':
        return await handleBODACCDownload(req, res, siren);
      
      default:
        return res.status(400).json({ 
          error: 'Unsupported document type',
          supportedTypes: ['inpi', 'insee', 'bodacc']
        });
    }
  } catch (error) {
    console.error('❌ Download error:', error);
    return res.status(500).json({ 
      error: 'Download failed',
      message: error.message 
    });
  }
}

async function handleINPIDownload(req, res, siren) {
  const inpiToken = process.env.INPI_API_TOKEN;
  
  if (!inpiToken) {
    return res.status(503).json({
      error: 'INPI service not configured',
      message: 'INPI API token not available'
    });
  }

  const inpiUrl = `https://data.inpi.fr/export/companies?format=pdf&ids=[%22${siren}%22]&est=all`;
  
  try {
    console.log(`📋 Downloading INPI document: ${inpiUrl}`);
    
    const response = await fetch(inpiUrl, {
      headers: {
        'Authorization': `Bearer ${inpiToken}`,
        'User-Agent': 'DataCorp-Platform/1.0 (Document Download Service)'
      }
    });

    if (!response.ok) {
      throw new Error(`INPI API error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentLength = response.headers.get('content-length');
    
    // Set download headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="INPI_RNE_${siren}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the PDF directly to the client
    const buffer = await response.arrayBuffer();
    return res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('❌ INPI download error:', error);
    return res.status(502).json({
      error: 'INPI service unavailable',
      message: error.message
    });
  }
}

async function handleINSEEDownload(req, res, siren, siret) {
  try {
    // Use provided SIRET or generate default
    const targetSIRET = siret || `${siren}00001`;
    
    // Clean SIRET (remove any spaces)
    const cleanSIRET = targetSIRET.replace(/\s/g, '');
    
    // Validate SIRET format
    if (!validateSIRET(cleanSIRET)) {
      throw new Error(`Invalid SIRET format: ${cleanSIRET}`);
    }
    
    const inseeUrl = `https://api-avis-situation-sirene.insee.fr/identification/pdf/${cleanSIRET}`;
    
    console.log(`🏛️ Downloading INSEE document: ${inseeUrl}`);
    
    const response = await fetch(inseeUrl, {
      headers: {
        'Accept': 'application/pdf',
        'User-Agent': 'DataCorp-Platform/1.0 (Document Download Service)'
      }
    });

    if (!response.ok) {
      throw new Error(`INSEE API error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentLength = response.headers.get('content-length');
    
    // Set download headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="INSEE_Avis_Situation_${siren}_${cleanSIRET}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the PDF directly to the client
    const buffer = await response.arrayBuffer();
    return res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('❌ INSEE download error:', error);
    return res.status(502).json({
      error: 'INSEE service unavailable',
      message: error.message
    });
  }
}

async function handleBODACCDownload(req, res, siren) {
  try {
    console.log(`📰 Generating BODACC JSON download for SIREN: ${siren}`);
    
    // Fetch BODACC data
    const apiUrl = `https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records?where=registre+like+%22${siren}%25%22&limit=100`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`BODACC API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Format the data nicely
    const formattedData = {
      siren: siren,
      total_count: data.total_count || 0,
      download_date: new Date().toISOString(),
      records: data.records || []
    };
    
    const jsonContent = JSON.stringify(formattedData, null, 2);
    
    // Set download headers
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="BODACC_Data_${siren}.json"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Length', Buffer.byteLength(jsonContent, 'utf8'));
    
    return res.send(jsonContent);
    
  } catch (error) {
    console.error('❌ BODACC download error:', error);
    return res.status(502).json({
      error: 'BODACC service unavailable',
      message: error.message
    });
  }
}

// Helper function to validate SIRET
function validateSIRET(siret) {
  return /^\d{14}$/.test(siret);
}