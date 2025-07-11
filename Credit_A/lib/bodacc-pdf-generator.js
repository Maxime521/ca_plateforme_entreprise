// lib/bodacc-pdf-generator.js - Convert BODACC JSON to PDF
import { promises as fs } from 'fs';
import path from 'path';

class BODACCPDFGenerator {
  
  // Generate PDF from BODACC data
  async generatePDF(siren, options = {}) {
    try {
      console.log(`📰 Generating BODACC PDF for SIREN: ${siren}`);
      
      // Fetch BODACC data
      const bodaccData = await this.fetchBODACCData(siren, options.limit || 50);
      
      if (bodaccData.records.length === 0) {
        return {
          success: false,
          message: 'No BODACC records found for this company'
        };
      }

      // Generate HTML content
      const htmlContent = this.generateHTML(bodaccData, siren);
      
      // Save as HTML file (can be converted to PDF later)
      const timestamp = Date.now();
      const filename = `BODACC_Report_${siren}_${timestamp}.html`;
      const filepath = path.join(process.cwd(), 'uploads', filename);
      
      // Ensure uploads directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      
      // Write HTML file
      await fs.writeFile(filepath, htmlContent, 'utf8');
      
      return {
        success: true,
        filename: filename,
        filepath: filepath,
        recordCount: bodaccData.records.length,
        totalRecords: bodaccData.total_count,
        format: 'HTML',
        note: 'HTML generated - can be converted to PDF using browser print or PDF libraries'
      };
      
    } catch (error) {
      console.error('❌ BODACC PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch BODACC data
  async fetchBODACCData(siren, limit = 50) {
    // Format SIREN with spaces for BODACC API search (e.g., "404223521" -> "404 223 521")
    const formattedSiren = siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    const url = `https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records?where=registre%20like%20%22${formattedSiren}%25%22&limit=${limit}&order_by=dateparution%20desc`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DataCorp-Platform/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`BODACC API error: ${response.status}`);
    }

    return await response.json();
  }

  // Generate HTML content from BODACC data
  generateHTML(bodaccData, siren) {
    const records = bodaccData.records;
    const companyName = records[0]?.record?.fields?.commercant || `Entreprise ${siren}`;
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport BODACC - ${companyName}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #007bff;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 24px;
        }
        .header .subtitle {
            color: #666;
            margin-top: 5px;
            font-size: 14px;
        }
        .summary {
            background: #e9f7ff;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 25px;
            border-left: 4px solid #007bff;
        }
        .record {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .record-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .record-title {
            font-weight: bold;
            color: #007bff;
            font-size: 16px;
        }
        .record-date {
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
        }
        .record-type {
            display: inline-block;
            background: #6c757d;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            margin-bottom: 10px;
        }
        .record-details {
            line-height: 1.6;
        }
        .detail-row {
            margin-bottom: 8px;
        }
        .detail-label {
            font-weight: bold;
            color: #495057;
            min-width: 120px;
            display: inline-block;
        }
        .detail-value {
            color: #212529;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📰 Rapport BODACC</h1>
            <div class="subtitle">Bulletin Officiel des Annonces Commerciales</div>
            <div class="subtitle"><strong>${companyName}</strong> (SIREN: ${siren})</div>
            <div class="subtitle">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
        </div>

        <div class="summary">
            <strong>📊 Résumé:</strong> ${records.length} annonce(s) trouvée(s) sur ${bodaccData.total_count} au total
        </div>

        ${records.map((record, index) => this.generateRecordHTML(record.record.fields, index + 1)).join('')}

        <div class="footer">
            <p>Document généré automatiquement par DataCorp Platform</p>
            <p>Source: data.gouv.fr - BODACC (Journal Officiel)</p>
            <p>Les informations contenues dans ce document sont publiques et officielles</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Generate HTML for individual record
  generateRecordHTML(fields, index) {
    const formatDate = (dateStr) => {
      try {
        return new Date(dateStr).toLocaleDateString('fr-FR');
      } catch {
        return dateStr;
      }
    };

    // Parse complex JSON fields safely
    let personneInfo = {};
    let etablissementInfo = {};
    let depotInfo = {};
    
    try {
      // Handle listepersonnes - can be JSON string or object
      if (fields.listepersonnes) {
        if (typeof fields.listepersonnes === 'string') {
          const parsed = JSON.parse(fields.listepersonnes);
          personneInfo = parsed.personne || parsed || {};
        } else if (typeof fields.listepersonnes === 'object') {
          personneInfo = fields.listepersonnes.personne || fields.listepersonnes || {};
        }
      }
      
      // Handle listeetablissements - can be JSON string or object  
      if (fields.listeetablissements) {
        if (typeof fields.listeetablissements === 'string') {
          const parsed = JSON.parse(fields.listeetablissements);
          etablissementInfo = parsed.etablissement || parsed || {};
        } else if (typeof fields.listeetablissements === 'object') {
          etablissementInfo = fields.listeetablissements.etablissement || fields.listeetablissements || {};
        }
      }
      
      if (fields.depot) {
        if (typeof fields.depot === 'string') {
          depotInfo = JSON.parse(fields.depot);
        } else if (typeof fields.depot === 'object') {
          depotInfo = fields.depot;
        }
      }
    } catch (e) {
      // JSON parsing failed, continue with available data
      console.warn('Failed to parse BODACC JSON fields in PDF generator:', e.message);
    }

    return `
        <div class="record">
            <div class="record-header">
                <div class="record-title">📄 Annonce #${index} - ${fields.id || 'N/A'}</div>
                <div class="record-date">${formatDate(fields.dateparution)}</div>
            </div>
            
            <div class="record-type">${fields.familleavis_lib || fields.typeavis_lib || 'Type non spécifié'}</div>
            
            <div class="record-details">
                <div class="detail-row">
                    <span class="detail-label">🏢 Entreprise:</span>
                    <span class="detail-value">${fields.commercant || 'Non spécifié'}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">📍 Ville:</span>
                    <span class="detail-value">${fields.ville || 'Non spécifiée'}${fields.cp ? ` (${fields.cp})` : ''}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">⚖️ Tribunal:</span>
                    <span class="detail-value">${fields.tribunal || 'Non spécifié'}</span>
                </div>

                ${fields.registre ? `
                <div class="detail-row">
                    <span class="detail-label">📋 Registre:</span>
                    <span class="detail-value">${Array.isArray(fields.registre) ? fields.registre.join(', ') : fields.registre}</span>
                </div>
                ` : ''}

                ${personneInfo.formeJuridique ? `
                <div class="detail-row">
                    <span class="detail-label">🏛️ Forme juridique:</span>
                    <span class="detail-value">${personneInfo.formeJuridique}</span>
                </div>
                ` : ''}

                ${personneInfo.capital?.montantCapital ? `
                <div class="detail-row">
                    <span class="detail-label">💰 Capital:</span>
                    <span class="detail-value">${parseInt(personneInfo.capital.montantCapital).toLocaleString()} ${personneInfo.capital.devise || 'EUR'}</span>
                </div>
                ` : ''}

                ${depotInfo.typeDepot ? `
                <div class="detail-row">
                    <span class="detail-label">📊 Type de dépôt:</span>
                    <span class="detail-value">${depotInfo.typeDepot}</span>
                </div>
                ` : ''}

                ${depotInfo.dateCloture ? `
                <div class="detail-row">
                    <span class="detail-label">📅 Date de clôture:</span>
                    <span class="detail-value">${formatDate(depotInfo.dateCloture)}</span>
                </div>
                ` : ''}

                ${etablissementInfo.adresse ? `
                <div class="detail-row">
                    <span class="detail-label">🏢 Adresse établissement:</span>
                    <span class="detail-value">${etablissementInfo.adresse}</span>
                </div>
                ` : ''}

                ${etablissementInfo.activite ? `
                <div class="detail-row">
                    <span class="detail-label">🎯 Activité:</span>
                    <span class="detail-value">${etablissementInfo.activite}</span>
                </div>
                ` : ''}

                ${etablissementInfo.siret ? `
                <div class="detail-row">
                    <span class="detail-label">🏛️ SIRET:</span>
                    <span class="detail-value">${etablissementInfo.siret}</span>
                </div>
                ` : ''}

                ${etablissementInfo.enseigne ? `
                <div class="detail-row">
                    <span class="detail-label">🏪 Enseigne:</span>
                    <span class="detail-value">${etablissementInfo.enseigne}</span>
                </div>
                ` : ''}

                ${fields.modificationsgenerales ? `
                <div class="detail-row">
                    <span class="detail-label">🔄 Modifications:</span>
                    <span class="detail-value">${JSON.parse(fields.modificationsgenerales).descriptif || 'Voir détails'}</span>
                </div>
                ` : ''}

                ${fields.url_complete ? `
                <div class="detail-row">
                    <span class="detail-label">🔗 Lien:</span>
                    <span class="detail-value"><a href="${fields.url_complete}" target="_blank">Voir l'annonce complète</a></span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
  }
}

export default new BODACCPDFGenerator();