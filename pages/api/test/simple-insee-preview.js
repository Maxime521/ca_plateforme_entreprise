export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren = '552032534', siret = '55203253400679' } = req.query;

  try {
    console.log(`🧪 Simple INSEE preview test: siren=${siren}, siret=${siret}`);
    
    const inseeUrl = `https://api-avis-situation-sirene.insee.fr/identification/pdf/${siret}`;
    console.log(`🔗 URL: ${inseeUrl}`);
    
    const response = await fetch(inseeUrl, {
      headers: {
        'Accept': 'application/pdf',
        'User-Agent': 'DataCorp-Platform/1.0 (Simple Test)'
      }
    });

    console.log(`📊 Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error text');
      return res.status(response.status).json({
        success: false,
        error: `INSEE API error: ${response.status} ${response.statusText}`,
        details: errorText,
        url: inseeUrl
      });
    }

    // Set headers for PDF streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'public, max-age=300');

    // Stream the PDF
    const buffer = await response.arrayBuffer();
    const bufferData = Buffer.from(buffer);
    
    console.log(`✅ PDF streamed successfully, size: ${bufferData.length} bytes`);
    
    return res.send(bufferData);
    
  } catch (error) {
    console.error('❌ Simple INSEE test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}