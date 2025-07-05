// pages/api/documents/preview/[...params].js - Document Preview Proxy API
import { promises as fs } from 'fs';
import path from 'path';
import previewCache from '../../../../lib/preview-cache';
import previewLogger from '../../../../lib/preview-logger';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { params } = req.query;
  
  if (!params || !Array.isArray(params)) {
    return res.status(400).json({ 
      error: 'Invalid parameters',
      message: 'Usage: /api/documents/preview/[type]/[siren]/[siret?]' 
    });
  }

  const [type, siren, siret] = params;
  
  console.log(`🔍 Route params: type=${type}, siren=${siren}, siret=${siret}, all params:`, params);

  if (!type || !siren) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      message: 'Type and SIREN are required',
      receivedParams: params
    });
  }

  const startTime = Date.now();
  
  try {
    // Log the request
    await previewLogger.logOperation(type, siren, siret, 'preview_request', {
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    // Check cache first
    const cached = await previewCache.get(type, siren, siret);
    if (cached && cached.available) {
      await previewLogger.logCacheOperation('hit', type, siren, siret, true);
      
      // If it's a direct file response, serve it
      if (cached.buffer) {
        // Log performance
        const duration = Date.now() - startTime;
        await previewLogger.logPerformance(type, siren, siret, duration, cached.size);
        
        // Set headers and send binary data
        res.setHeader('Content-Type', cached.contentType || 'application/pdf');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Cache-Control', 'public, max-age=300');
        if (cached.size) {
          res.setHeader('Content-Length', cached.size);
        }
        
        // Ensure buffer is actually a Buffer instance
        const buffer = Buffer.isBuffer(cached.buffer) ? cached.buffer : Buffer.from(cached.buffer);
        
        // Write raw buffer directly
        res.statusCode = 200;
        res.end(buffer);
      }
    } else {
      await previewLogger.logCacheOperation('miss', type, siren, siret, false);
    }

    console.log(`🔍 Routing to handler for type: ${type.toLowerCase()}`);
    
    switch (type.toLowerCase()) {
      case 'inpi':
        console.log('📋 Calling INPI handler');
        return await handleINPIPreview(req, res, siren);
      
      case 'insee':
        console.log('🏛️ Calling INSEE handler');
        return await handleINSEEPreview(req, res, siren, siret);
      
      case 'bodacc':
        console.log('📰 Calling BODACC handler');
        return await handleBODACCPreview(req, res, siren);
      
      default:
        return res.status(400).json({ 
          error: 'Unsupported document type',
          supportedTypes: ['inpi', 'insee', 'bodacc']
        });
    }
  } catch (error) {
    // Log the error
    await previewLogger.logError(type, siren, siret, error, {
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      duration: Date.now() - startTime
    });
    
    return res.status(500).json({ 
      error: 'Preview generation failed',
      message: error.message,
      type: type,
      siren: siren,
      timestamp: new Date().toISOString()
    });
  }
}

async function handleINPIPreview(req, res, siren) {
  const inpiToken = process.env.INPI_API_TOKEN;
  
  if (!inpiToken) {
    return res.status(503).json({
      error: 'INPI service not configured',
      message: 'INPI API token not available'
    });
  }

  const inpiUrl = `https://data.inpi.fr/export/companies?format=pdf&ids=[%22${siren}%22]&est=all`;
  
  try {
    const response = await fetch(inpiUrl, {
      headers: {
        'Authorization': `Bearer ${inpiToken}`,
        'User-Agent': 'DataCorp-Platform/1.0 (Document Preview Service)'
      }
    });

    if (!response.ok) {
      throw new Error(`INPI API error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentLength = response.headers.get('content-length');
    
    // Stream the PDF directly to the client
    const buffer = await response.arrayBuffer();
    const bufferData = Buffer.from(buffer);
    
    // Cache the response
    await previewCache.set('inpi', siren, {
      buffer: bufferData,
      contentType: contentType,
      size: bufferData.length,
      available: true,
      timestamp: Date.now()
    });
    
    // Set headers and send binary data
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Length', bufferData.length);
    
    res.statusCode = 200;
    res.end(bufferData);
    
  } catch (error) {
    console.error('❌ INPI preview error:', error);
    return res.status(502).json({
      error: 'INPI service unavailable',
      message: error.message
    });
  }
}

async function handleINSEEPreview(req, res, siren, siret) {
  try {
    console.log(`🔍 INSEE Preview - Raw params: siren=${siren}, siret=${siret}`);
    
    // Use provided SIRET or generate default
    const targetSIRET = siret || `${siren}00001`;
    
    // Clean SIRET (remove any spaces) - INSEE API expects raw SIRET in URL
    const cleanSIRET = targetSIRET.replace(/\s/g, '');
    
    console.log(`🔍 INSEE Preview - Target SIRET: ${targetSIRET}, Clean SIRET: ${cleanSIRET}`);
    
    // Validate SIRET format
    if (!validateSIRET(cleanSIRET)) {
      throw new Error(`Invalid SIRET format: ${cleanSIRET}`);
    }
    
    const inseeUrl = `https://api-avis-situation-sirene.insee.fr/identification/pdf/${cleanSIRET}`;
    
    console.log(`📄 INSEE API request: ${inseeUrl}`);
    
    const response = await fetch(inseeUrl, {
      headers: {
        'Accept': 'application/pdf',
        'User-Agent': 'DataCorp-Platform/1.0 (Document Preview Service)'
      }
    });

    console.log(`📊 INSEE API response: ${response.status} ${response.statusText}`);
    console.log(`📊 INSEE API headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error text available');
      console.error(`❌ INSEE API error response:`, errorText);
      console.error(`❌ Full response details:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: inseeUrl
      });
      throw new Error(`INSEE API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentLength = response.headers.get('content-length');
    
    // Stream the PDF directly to the client
    const buffer = await response.arrayBuffer();
    const bufferData = Buffer.from(buffer);
    
    console.log(`✅ INSEE PDF downloaded successfully, size: ${bufferData.length} bytes`);
    
    // Cache the response
    await previewCache.set('insee', siren, {
      buffer: bufferData,
      contentType: contentType,
      size: bufferData.length,
      available: true,
      timestamp: Date.now(),
      siret: cleanSIRET
    }, cleanSIRET);
    
    // Set headers and send binary data
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Length', bufferData.length);
    
    res.statusCode = 200;
    res.end(bufferData);
    
  } catch (error) {
    console.error('❌ INSEE preview error:', error);
    return res.status(502).json({
      error: 'INSEE service unavailable',
      message: error.message
    });
  }
}

async function handleBODACCPreview(req, res, siren) {
  try {
    console.log(`📰 BODACC HTML preview request for SIREN: ${siren}`);
    
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
    console.error('❌ BODACC preview error:', error);
    
    // Generate error HTML page
    const errorHtml = generateBODACCErrorHTML(siren, error.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    return res.status(502).send(errorHtml);
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

function generateBODACCErrorHTML(siren, errorMessage) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erreur BODACC - SIREN ${siren}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .error-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 40px;
            text-align: center;
            max-width: 400px;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .error-title {
            font-size: 20px;
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 8px;
        }
        .error-message {
            color: #64748b;
            margin-bottom: 24px;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #f97316;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Erreur BODACC</div>
        <div class="error-message">
            Impossible de charger les données BODACC<br>
            <small>${errorMessage}</small>
        </div>
        <a href="https://data.economie.gouv.fr/explore/dataset/bodacc-c/table/?refine.siren=${siren}" target="_blank" class="btn">
            Voir sur BODACC →
        </a>
    </div>
</body>
</html>
  `;
}

// Helper function to format SIRET with spaces
function formatSIRETWithSpaces(siret) {
  if (!siret || siret.length !== 14) {
    throw new Error('SIRET must be exactly 14 digits');
  }
  
  const cleanSiret = siret.replace(/\s/g, '');
  return `${cleanSiret.substring(0, 3)} ${cleanSiret.substring(3, 6)} ${cleanSiret.substring(6, 9)} ${cleanSiret.substring(9, 14)}`;
}

// Helper function to validate SIREN
function validateSIREN(siren) {
  return /^\d{9}$/.test(siren);
}

// Helper function to validate SIRET
function validateSIRET(siret) {
  return /^\d{14}$/.test(siret);
}