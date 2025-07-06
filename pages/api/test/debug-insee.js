export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siret = '55203253400679' } = req.query;

  try {
    console.log(`🧪 Testing INSEE API with SIRET: ${siret}`);
    
    const inseeUrl = `https://api-avis-situation-sirene.insee.fr/identification/pdf/${siret}`;
    console.log(`🔗 URL: ${inseeUrl}`);
    
    const response = await fetch(inseeUrl, {
      headers: {
        'Accept': 'application/pdf',
        'User-Agent': 'DataCorp-Platform/1.0 (Debug Test)'
      }
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      return res.status(200).json({
        success: true,
        url: inseeUrl,
        status: response.status,
        statusText: response.statusText,
        contentType,
        contentLength,
        headers: Object.fromEntries(response.headers.entries())
      });
    } else {
      const errorText = await response.text().catch(() => 'No error text');
      return res.status(response.status).json({
        success: false,
        url: inseeUrl,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
    }
    
  } catch (error) {
    console.error('❌ Debug INSEE error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}