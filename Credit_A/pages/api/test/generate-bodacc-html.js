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
    
    // Debug: Check if content was generated
    console.log(`📄 Generated HTML content length: ${htmlContent.length} characters`);
    console.log(`📄 Content preview: ${htmlContent.substring(0, 200)}...`);
    
    // Save as HTML file
    const timestamp = Date.now();
    const filename = `BODACC_Report_${siren}_${timestamp}.html`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    await fs.mkdir(uploadsDir, { recursive: true });
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, htmlContent, 'utf8');
    
    // Verify file was written
    const stats = await fs.stat(filepath);
    console.log(`✅ BODACC HTML report generated: ${filename} (${stats.size} bytes)`);
    
    return res.status(200).json({
      success: true,
      message: 'BODACC HTML report generated successfully',
      file: {
        filename: filename,
        path: `/uploads/${filename}`,
        recordCount: bodaccData.records.length,
        totalRecords: bodaccData.total_count,
        format: 'HTML',
        size: `${Math.round(htmlContent.length / 1024)} KB`,
        actualSize: `${stats.size} bytes`
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

  // Generate records HTML
  const recordsHtml = records.map((record, index) => {
    const fields = record.record?.fields || {};
    const extractedSiren = extractSIRENSafe(fields.registre);
    
    return `
      <div class="record-card">
        <div class="record-header">
          <h3>Annonce #${index + 1}</h3>
          <span class="record-date">${fields.dateparution || 'Date non disponible'}</span>
        </div>
        
        <div class="record-content">
          <div class="company-info">
            <h4>${fields.commercant || 'Nom non disponible'}</h4>
            <p><strong>SIREN:</strong> ${extractedSiren || 'Non disponible'}</p>
            ${fields.adresse ? `<p><strong>Adresse:</strong> ${fields.adresse}</p>` : ''}
            ${fields.codepostal ? `<p><strong>Code postal:</strong> ${fields.codepostal}</p>` : ''}
            ${fields.ville ? `<p><strong>Ville:</strong> ${fields.ville}</p>` : ''}
          </div>
          
          <div class="legal-info">
            ${fields.famille ? `<p><strong>Famille:</strong> ${fields.famille}</p>` : ''}
            ${fields.rubrique ? `<p><strong>Rubrique:</strong> ${fields.rubrique}</p>` : ''}
            ${fields.numerodepartement ? `<p><strong>Département:</strong> ${fields.numerodepartement}</p>` : ''}
            ${fields.typeagriculture ? `<p><strong>Type agriculture:</strong> ${fields.typeagriculture}</p>` : ''}
          </div>
          
          ${fields.texteannonce ? `
            <div class="announcement-text">
              <h5>Texte de l'annonce:</h5>
              <div class="announcement-content">${fields.texteannonce}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport BODACC - ${companyName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .header {
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            font-weight: 300;
        }
        
        .header p {
            margin: 0.5rem 0 0 0;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .summary {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .summary h2 {
            margin-top: 0;
            color: #4a5568;
        }
        
        .record-card {
            background: white;
            margin-bottom: 1.5rem;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }
        
        .record-header {
            background: #f8f9fa;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .record-header h3 {
            margin: 0;
            color: #495057;
            font-size: 1.2rem;
        }
        
        .record-date {
            background: #667eea;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .record-content {
            padding: 1.5rem;
        }
        
        .company-info {
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e9ecef;
        }
        
        .company-info h4 {
            margin: 0 0 0.75rem 0;
            color: #2d3748;
            font-size: 1.3rem;
        }
        
        .company-info p, .legal-info p {
            margin: 0.5rem 0;
            color: #4a5568;
        }
        
        .legal-info {
            margin-bottom: 1rem;
        }
        
        .announcement-text {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 6px;
            margin-top: 1rem;
        }
        
        .announcement-text h5 {
            margin: 0 0 0.75rem 0;
            color: #495057;
        }
        
        .announcement-content {
            background: white;
            padding: 1rem;
            border-radius: 4px;
            border-left: 3px solid #667eea;
            line-height: 1.7;
            white-space: pre-wrap;
        }
        
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .footer p {
            margin: 0;
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        @media print {
            body { 
                background: white; 
                margin: 0; 
                padding: 10px; 
            }
            .record-card { 
                break-inside: avoid; 
                box-shadow: none; 
                border: 1px solid #ddd; 
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📰 Rapport BODACC</h1>
        <p>Bulletin Officiel des Annonces Civiles et Commerciales</p>
        <p><strong>Entreprise:</strong> ${companyName} • <strong>SIREN:</strong> ${siren}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Résumé</h2>
        <p><strong>Nombre d'annonces:</strong> ${records.length}</p>
        <p><strong>Date de génération:</strong> ${new Date().toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        <p><strong>Période couverte:</strong> Toutes les annonces disponibles dans BODACC</p>
    </div>
    
    <div class="records">
        ${recordsHtml}
    </div>
    
    <div class="footer">
        <p>Rapport généré automatiquement depuis les données publiques BODACC</p>
        <p>Source: https://bodacc-datadila.opendatasoft.com/</p>
        <p>© ${new Date().getFullYear()} DataCorp - Plateforme d'Analyse Entreprise</p>
    </div>
</body>
</html>`;
}
