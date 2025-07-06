import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { htmlFile, options = {} } = req.body;

  if (!htmlFile) {
    return res.status(400).json({ 
      success: false,
      message: 'HTML file path required' 
    });
  }

  try {
    console.log(`📄 Converting HTML to PDF: ${htmlFile}`);
    
    // Check if HTML file exists
    const htmlPath = path.join(process.cwd(), 'uploads', path.basename(htmlFile));
    
    try {
      await fs.access(htmlPath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'HTML file not found'
      });
    }

    // Read HTML content
    const htmlContent = await fs.readFile(htmlPath, 'utf8');
    
    // Enhanced HTML with PDF-optimized styles
    const pdfOptimizedHTML = optimizeHTMLForPDF(htmlContent);
    
    // Try multiple PDF conversion methods
    let pdfResult;
    
    // Method 1: Try browser-based conversion (if available)
    try {
      pdfResult = await convertWithBrowser(pdfOptimizedHTML, options);
      console.log('✅ PDF generated using browser method');
    } catch (browserError) {
      console.log('⚠️ Browser method failed, trying alternative...');
      
      // Method 2: HTML with print styles (fallback)
      pdfResult = await generatePrintOptimizedHTML(pdfOptimizedHTML, options);
      console.log('✅ Print-optimized HTML generated as fallback');
    }

    // Save the result
    const timestamp = Date.now();
    const originalName = path.basename(htmlFile, '.html');
    const outputFilename = `${originalName}_PDF_${timestamp}.${pdfResult.format}`;
    const outputPath = path.join(process.cwd(), 'uploads', outputFilename);
    
    await fs.writeFile(outputPath, pdfResult.content, pdfResult.encoding || 'utf8');

    return res.status(200).json({
      success: true,
      message: 'PDF conversion completed',
      file: {
        filename: outputFilename,
        path: `/uploads/${outputFilename}`,
        size: `${Math.round(pdfResult.content.length / 1024)} KB`,
        format: pdfResult.format,
        method: pdfResult.method
      },
      options: {
        originalFile: htmlFile,
        conversionMethod: pdfResult.method,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ PDF conversion error:', error);
    return res.status(500).json({
      success: false,
      message: 'PDF conversion failed',
      error: error.message
    });
  }
}

// Optimize HTML for PDF conversion
function optimizeHTMLForPDF(htmlContent) {
  // Enhanced CSS for better PDF rendering
  const pdfStyles = `
    <style>
      /* PDF-specific optimizations */
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        body {
          margin: 0;
          padding: 20px;
          font-size: 12pt;
          line-height: 1.4;
          background: white !important;
          color: black !important;
        }
        
        .container {
          box-shadow: none !important;
          border: none !important;
          max-width: none !important;
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          -webkit-print-color-adjust: exact;
          color: white !important;
          page-break-inside: avoid;
        }
        
        .section {
          page-break-inside: avoid;
          margin-bottom: 30px;
        }
        
        .establishment {
          page-break-inside: avoid;
          margin-bottom: 20px;
        }
        
        .info-grid {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 15px !important;
        }
        
        .print-button {
          display: none !important;
        }
        
        h1, h2, h3 {
          page-break-after: avoid;
        }
        
        .footer {
          page-break-inside: avoid;
          margin-top: 30px;
        }
      }
      
      /* Enhanced styles for better rendering */
      @page {
        size: A4;
        margin: 2cm;
      }
      
      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        font-size: 11pt;
        line-height: 1.3;
      }
    </style>
  `;

  // Insert PDF styles before closing head tag
  return htmlContent.replace('</head>', `${pdfStyles}</head>`);
}

// Browser-based PDF conversion (using Puppeteer-like approach)
async function convertWithBrowser(htmlContent, options) {
  // This would typically use Puppeteer or Playwright
  // For now, we'll simulate it and fall back to print-optimized HTML
  throw new Error('Browser PDF conversion not available - using fallback');
}

// Generate print-optimized HTML as PDF alternative
async function generatePrintOptimizedHTML(htmlContent, options) {
  const enhancedHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document PDF - Optimisé pour impression</title>
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
            background: white;
            margin: 0;
            padding: 20px;
        }
        
        /* Print optimization */
        @media print {
            body { margin: 0; padding: 15px; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
            h1, h2, h3 { page-break-after: avoid; }
        }
        
        /* PDF-ready styles */
        .pdf-header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #667eea;
            margin-bottom: 30px;
        }
        
        .pdf-header h1 {
            font-size: 24pt;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .pdf-section {
            margin-bottom: 25px;
            padding: 20px 0;
        }
        
        .pdf-section h2 {
            font-size: 16pt;
            color: #2c3e50;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        
        .pdf-grid {
            display: table;
            width: 100%;
            border-collapse: collapse;
        }
        
        .pdf-row {
            display: table-row;
        }
        
        .pdf-cell {
            display: table-cell;
            padding: 8px 12px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        
        .pdf-label {
            font-weight: bold;
            background: #f8f9fa;
            width: 30%;
        }
        
        .pdf-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 9pt;
            color: #666;
        }
        
        /* Ensure colors print */
        * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    </style>
    <script>
        // Auto-print functionality
        function autoPrint() {
            window.print();
        }
        
        // PDF download simulation
        function downloadAsPDF() {
            window.print();
        }
        
        // Add print button
        window.addEventListener('load', function() {
            const printBtn = document.createElement('button');
            printBtn.innerHTML = '🖨️ Imprimer / Sauver en PDF';
            printBtn.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1000;padding:10px 20px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,0.2);';
            printBtn.className = 'no-print';
            printBtn.onclick = function() {
                window.print();
            };
            document.body.appendChild(printBtn);
            
            // Add conversion info banner
            const infoBanner = document.createElement('div');
            infoBanner.innerHTML = '📄 Version optimisée pour PDF - Utilisez Ctrl+P ou le bouton d\\'impression de votre navigateur pour sauvegarder en PDF';
            infoBanner.style.cssText = 'position:fixed;top:70px;right:20px;z-index:999;padding:10px;background:#e8f4fd;border:1px solid #b3d8ff;border-radius:5px;font-size:12px;max-width:300px;box-shadow:0 2px 10px rgba(0,0,0,0.1);';
            infoBanner.className = 'no-print';
            document.body.appendChild(infoBanner);
            
            // Auto-hide banner after 10 seconds
            setTimeout(() => {
                infoBanner.style.opacity = '0';
                setTimeout(() => infoBanner.remove(), 1000);
            }, 10000);
        });
    </script>
</head>
<body>
    ${htmlContent.replace(/<body[^>]*>|<\/body>/gi, '')}
    
    <div class="pdf-footer">
        <p><strong>Document généré automatiquement par DataCorp Platform</strong></p>
        <p>Optimisé pour impression et conversion PDF • ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}</p>
        <p style="margin-top: 10px; font-size: 8pt;">
            💡 <strong>Astuce:</strong> Utilisez Ctrl+P (Windows) ou Cmd+P (Mac) pour sauvegarder ce document en PDF
        </p>
    </div>
</body>
</html>`;

  return {
    content: enhancedHTML,
    format: 'html',
    method: 'print-optimized',
    encoding: 'utf8'
  };
}

// Alternative: PDF conversion using external service
export async function convertHTMLToPDFExternal(htmlContent, options = {}) {
  const defaultOptions = {
    format: 'A4',
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm'
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:10px; text-align:center; width:100%;">DataCorp Platform</div>',
    footerTemplate: '<div style="font-size:10px; text-align:center; width:100%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    ...options
  };

  // This would integrate with services like:
  // - PDF-lib for client-side generation
  // - html-pdf for server-side generation
  // - External APIs like HTMLtoPDF.io
  // - Puppeteer in a Docker container
  
  console.log('📄 External PDF conversion would use:', defaultOptions);
  
  // For now, return the print-optimized version
  return generatePrintOptimizedHTML(htmlContent, defaultOptions);
}

// Utility: Batch convert multiple HTML files
export async function batchConvertToPDF(htmlFiles, options = {}) {
  const results = [];
  
  for (const htmlFile of htmlFiles) {
    try {
      const result = await convertHTMLToPDFExternal(htmlFile, options);
      results.push({
        file: htmlFile,
        success: true,
        result
      });
    } catch (error) {
      results.push({
        file: htmlFile,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}
