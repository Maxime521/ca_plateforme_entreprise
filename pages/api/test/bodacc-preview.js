export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren = '552032534' } = req.query;

  try {
    console.log(`📰 Testing BODACC preview for SIREN: ${siren}`);
    
    // Generate an HTML preview page for BODACC data
    const bodaccUrl = `https://data.economie.gouv.fr/explore/dataset/bodacc-c/table/?refine.siren=${siren}`;
    const apiUrl = `https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records?where=registre+like+%22${siren}%25%22&limit=10`;
    
    // Fetch BODACC data
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`BODACC API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Generate HTML preview
    const htmlPreview = generateBODACCPreviewHTML(siren, data, bodaccUrl);
    
    // Set headers for HTML response
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    return res.send(htmlPreview);
    
  } catch (error) {
    console.error('❌ BODACC preview test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function generateBODACCPreviewHTML(siren, data, fullUrl) {
  const records = data.records || [];
  const totalCount = data.total_count || 0;
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BODACC - Annonces Commerciales - SIREN ${siren}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
        }
        .summary {
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
            background: #f1f5f9;
        }
        .content {
            padding: 0;
        }
        .record {
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
        }
        .record:last-child {
            border-bottom: none;
        }
        .record-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        .record-title {
            font-weight: 600;
            color: #1e293b;
            font-size: 16px;
        }
        .record-date {
            background: #f1f5f9;
            color: #64748b;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
        }
        .record-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-top: 12px;
        }
        .detail-item {
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
        }
        .detail-label {
            font-weight: 500;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .detail-value {
            color: #1e293b;
            margin-top: 2px;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-b {
            background: #dbeafe;
            color: #1e40af;
        }
        .badge-c {
            background: #dcfce7;
            color: #166534;
        }
        .footer {
            padding: 20px 24px;
            background: #f8fafc;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #f97316;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #ea580c;
        }
        .no-records {
            text-align: center;
            padding: 40px 24px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📰 BODACC - Annonces Commerciales</h1>
            <p>Bulletin Officiel des Annonces Civiles et Commerciales</p>
            <p>SIREN: ${siren}</p>
        </div>
        
        <div class="summary">
            <strong>${totalCount} annonce(s) trouvée(s)</strong> pour ce SIREN
        </div>
        
        <div class="content">
            ${records.length > 0 ? records.map(record => {
                const fields = record.record.fields;
                const publicationBadge = fields.publicationavis === 'B' ? 'badge-b' : 'badge-c';
                
                return `
                <div class="record">
                    <div class="record-header">
                        <div class="record-title">
                            <span class="badge ${publicationBadge}">BODACC ${fields.publicationavis}</span>
                            ${fields.commercant || 'N/A'}
                        </div>
                        <div class="record-date">
                            ${new Date(fields.dateparution).toLocaleDateString('fr-FR')}
                        </div>
                    </div>
                    
                    <div class="record-details">
                        <div class="detail-item">
                            <div class="detail-label">Type d'avis</div>
                            <div class="detail-value">${fields.familleavis_lib || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Tribunal</div>
                            <div class="detail-value">${fields.tribunal || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Ville</div>
                            <div class="detail-value">${fields.ville || 'N/A'} (${fields.cp || 'N/A'})</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">N° Annonce</div>
                            <div class="detail-value">${fields.numeroannonce || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                `;
            }).join('') : `
                <div class="no-records">
                    <p>Aucune annonce trouvée pour ce SIREN</p>
                </div>
            `}
        </div>
        
        <div class="footer">
            <a href="${fullUrl}" target="_blank" class="btn">
                Voir toutes les annonces sur BODACC →
            </a>
        </div>
    </div>
</body>
</html>
  `;
}