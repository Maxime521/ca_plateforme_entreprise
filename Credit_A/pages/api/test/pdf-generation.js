// Simple test endpoint to verify PDF generation is working
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🔧 Testing PDF generation...');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test PDF</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #007bff; }
        </style>
      </head>
      <body>
        <h1>PDF Generation Test</h1>
        <p>This is a test PDF generated at: ${new Date().toISOString()}</p>
        <p>If you can see this as a PDF, then the PDF generation is working correctly!</p>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true 
    });
    
    await browser.close();

    // Verify it's a valid PDF
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      throw new Error('Generated buffer is not a valid PDF');
    }

    console.log(`✅ Test PDF generated successfully: ${pdfBuffer.length} bytes`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.end(pdfBuffer);
    
  } catch (error) {
    console.error('❌ Test PDF generation failed:', error);
    return res.status(500).json({
      error: 'PDF generation test failed',
      message: error.message
    });
  }
}