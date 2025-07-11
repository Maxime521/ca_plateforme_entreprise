// pages/api/test/inpi-download.js - Test INPI PDF Download
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren = '552032534' } = req.query;

  try {
    console.log(`🏛️ Testing INPI PDF download for SIREN: ${siren}`);
    
    const inpiToken = process.env.INPI_API_TOKEN;
    if (!inpiToken) {
      return res.status(400).json({
        success: false,
        message: 'INPI token not configured',
        note: 'Add INPI_API_TOKEN to .env.local'
      });
    }

    const inpiUrl = `https://data.inpi.fr/export/companies?format=pdf&ids=[%22${siren}%22]&est=all`;
    
    const response = await fetch(inpiUrl, {
      headers: {
        'Authorization': `Bearer ${inpiToken}`,
        'User-Agent': 'DataCorp-Platform/1.0'
      }
    });

    if (response.ok) {
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      
      return res.status(200).json({
        success: true,
        message: 'INPI PDF is accessible',
        file: {
          url: inpiUrl,
          size: contentLength ? `${Math.round(contentLength / 1024)} KB` : 'Unknown',
          contentType: contentType,
          httpStatus: response.status
        },
        siren: siren,
        note: 'PDF can be downloaded - response headers indicate valid PDF',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: `INPI API error: ${response.status} ${response.statusText}`,
        siren: siren,
        httpStatus: response.status
      });
    }
    
  } catch (error) {
    console.error('❌ INPI download test failed:', error);
    return res.status(500).json({
      success: false,
      message: 'INPI download test failed',
      error: error.message,
      siren: siren
    });
  }
}
