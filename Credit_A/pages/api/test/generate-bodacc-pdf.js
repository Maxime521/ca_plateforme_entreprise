// pages/api/test/generate-bodacc-html.js - Missing BODACC HTML Generator
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren = '552032534', limit = 50 } = req.query;

  try {
    console.log(`📰 Generating BODACC HTML report for SIREN: ${siren}`);
    
    // Fetch BODACC data
    const bodaccData = await fetchBODACCData(siren, parseInt(limit));
    
    if (!bodaccData.records || bodaccData.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No BODACC records found for this company',
        siren: siren
      });
    }

    // Generate HTML content
    const htmlContent = generateBODACCHTML(bodaccData, siren);
    
    // Save as HTML file
    const timestamp = Date.now();
    const filename = `BODACC_Report_${siren}_${timestamp}.html`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filepath = path.join(uploadsDir, filename);
    
    // Write HTML file
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

// Fetch BODACC data
async function fetchBODACCData(siren, limit = 50) {
  const url = `https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records?where=registre%20like%20%22${siren}%25%22&limit=${limit}&order_by=dateparution%20desc`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DataCorp-Platform/1.0'
    },
    timeout: 10000
  });

  if (!response.ok) {
    throw new Error(`BODACC API error: ${response.status}`);
  }

  return await response.json();
}

// Generate enhanced HTML content
function generateBODACCHTML(bodaccData, siren) {
  const records = bodaccData.records || [];
  const companyName = records[0]?.record?.fields?.commercant || `Entreprise ${siren}`;
  
  const extractSIREN = (registre) => {
    if (!registre) return '';
    const registreStr = String(registre);
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
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr || 'Non renseigné';
    }
  };

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport BODACC - ${companyName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .company-name {
            font-size: 1.8rem;
            font-weight: 600;
            margin: 20px 0;
            background: rgba(255,255,255,0.2);
            padding: 15px 30px;
            border-radius: 50px;
            display: inline-block;
        }
        
        .summary {
            background: rgba(255,255,255,0.15);
            padding: 15px 30px;
            border-radius: 25px;
            margin-top: 20px;
            backdrop-filter: blur(10px);
        }
        
        .content {
            padding: 40px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .announcement {
            background: #f8f9fa;
            border-left: 5px solid #667eea;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .announcement:hover {
            transform: translateY(-2px);
        }
        
        .announcement-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .announcement-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2c3e50;
            flex: 1;
        }
        
        .announcement-date {
            background: #28a745;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        
        .announcement-details {
            line-height: 1.6;
        }
        
        .detail-row {
            margin-bottom: 10px;
            display: flex;
            flex-wrap: wrap;
        }
        
        .detail-label {
            font-weight: 600;
            color: #495057;
            min-width: 120px;
            margin-right: 15px;
        }
        
        .detail-value {
            color: #212529;
            flex: 1;
            word-break: break-word;
        }
        
        .footer {
            background: #2c3e50;
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .footer p {
            margin: 5px 0;
            opacity: 0.8;
        }
        
        .print-button {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #667eea;
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            font-size: 1rem;
            transition: all 0.3s ease;
            z-index: 1000;
        }
        
        .print-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
            .print-button { display: none; }
        }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .company-name { font-size: 1.4rem; padding: 10px 20px; }
            .content { padding: 20px; }
            .announcement { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📰 Rapport BODACC</h1>
            <div class="company-name">${companyName}</div>
            <div class="summary">
                <strong>SIREN:</strong> ${siren} • 
                <strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </div>
            <div class="summary">
                <strong>📊 ${records.length} annonce(s) trouvée(s)</strong> sur ${bodaccData.total_count || records.length} au total
            </div>
        </div>

        <div class="content">
            <!-- Statistics -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${siren}</div>
                    <div class="stat-label">Numéro SIREN</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${records.length}</div>
                    <div class="stat-label">Annonces trouvées</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${bodaccData.total_count || records.length}</div>
                    <div class="stat-label">Total disponible</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${new Date().getFullYear()}</div>
                    <div class="stat-label">Année de génération</div>
                </div>
            </div>

            <!-- Announcements -->
            ${records.map((record, index) => {
              const fields = record.record?.fields || record.fields || {};
              const sirenExtracted = extractSIREN(fields.registre);
              
              return `
                <div class="announcement">
                    <div class="announcement-header">
                        <div class="announcement-title">
                            📄 Annonce #${index + 1} - ${fields.id || 'N/A'}
                        </div>
                        <div class="announcement-date">${formatDate(fields.dateparution)}</div>
                    </div>
                    
                    <div class="announcement-details">
                        <div class="detail-row">
                            <span class="detail-label">🏢 Entreprise:</span>
                            <span class="detail-value">${fields.commercant || 'Non spécifié'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">📋 Type d'avis:</span>
                            <span class="detail-value">${fields.familleavis_lib || fields.typeavis_lib || 'Non spécifié'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">📍 Lieu:</span>
                            <span class="detail-value">${fields.ville || 'Non spécifié'}${fields.cp ? ` (${fields.cp})` : ''}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">⚖️ Tribunal:</span>
                            <span class="detail-value">${fields.tribunal || 'Non spécifié'}</span>
                        </div>

                        ${sirenExtracted ? `
                        <div class="detail-row">
                            <span class="detail-label">🆔 SIREN extrait:</span>
                            <span class="detail-value">${sirenExtracted}</span>
                        </div>
                        ` : ''}

                        ${fields.registre ? `
                        <div class="detail-row">
                            <span class="detail-label">📋 Registre:</span>
                            <span class="detail-value">${fields.registre}</span>
                        </div>
                        ` : ''}

                        ${fields.numeroannonce ? `
                        <div class="detail-row">
                            <span class="detail-label">📑 N° d'annonce:</span>
                            <span class="detail-value">${fields.numeroannonce}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
              `;
            }).join('')}
        </div>

        <div class="footer">
            <p><strong>Source:</strong> BODACC (Bulletin Officiel des Annonces Commerciales) - data.gouv.fr</p>
            <p>Ce rapport a été généré automatiquement par DataCorp Platform</p>
            <p>Les informations contenues dans ce document sont publiques et officielles</p>
            <p style="margin-top: 15px; font-size: 0.9rem;">
                🔗 <strong>API BODACC OpenDataSoft</strong> • 
                📊 <strong>${records.length} annonce(s) analysée(s)</strong> • 
                ⚡ <strong>Rapport généré en temps réel</strong>
            </p>
        </div>
    </div>

    <button class="print-button" onclick="window.print()">
        🖨️ Imprimer
    </button>

    <script>
        // Auto-scroll to top
        window.scrollTo(0, 0);
        
        // Add click-to-copy for SIREN
        document.querySelectorAll('.detail-value').forEach(element => {
            if (element.textContent.match(/\\d{9}/)) {
                element.style.cursor = 'pointer';
                element.title = 'Cliquer pour copier';
                element.addEventListener('click', () => {
                    navigator.clipboard.writeText(element.textContent.trim());
                    const original = element.textContent;
                    element.textContent = '✅ Copié !';
                    setTimeout(() => { element.textContent = original; }, 1000);
                });
            }
        });
        
        console.log('📰 BODACC Report loaded successfully');
        console.log('📊 Total announcements:', ${records.length});
    </script>
</body>
</html>`;
}
