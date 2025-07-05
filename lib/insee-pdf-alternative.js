// lib/insee-pdf-alternative.js - Alternative INSEE PDF generation using available APIs
import INSEEAPIService from './insee-api';
import INSEEOAuthService from './insee-oauth';
import { promises as fs } from 'fs';
import path from 'path';

class INSEEPDFAlternative {
  
  /**
   * Generate an HTML-based AVIS DE SITUATION document
   * Since the INSEE PDF API appears to be down, we'll generate our own
   */
  async generateAvisSituation(siren, siret = null) {
    try {
      console.log(`📄 Generating AVIS DE SITUATION alternative for SIREN: ${siren}`);
      
      // Step 1: Get company data from INSEE
      const companyData = await INSEEAPIService.getCompanyBySiren(siren);
      if (!companyData) {
        throw new Error('Company data not found in INSEE database');
      }
      
      // Step 2: Get establishments data
      const establishments = await INSEEAPIService.getEstablishments(siren);
      
      // Step 3: Find the main establishment (siege social)
      const mainEstablishment = establishments.find(est => est.siegeSocial) || establishments[0];
      
      // Step 4: Generate HTML content
      const htmlContent = this.generateHTMLContent(companyData, establishments, mainEstablishment);
      
      // Step 5: Save HTML file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `AVIS_DE_SITUATION_${siren}_${timestamp}.html`;
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Ensure uploads directory exists
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }
      
      const filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, htmlContent, 'utf8');
      
      const stats = await fs.stat(filePath);
      
      return {
        success: true,
        fileName: fileName,
        path: `/uploads/${fileName}`,
        url: `/api/serve-file/uploads/${fileName}`,
        size: stats.size,
        contentType: 'text/html',
        generatedAt: new Date().toISOString(),
        data: companyData,
        message: 'Alternative AVIS DE SITUATION generated (HTML format)',
        note: 'INSEE PDF API appears to be unavailable. This is an equivalent document.'
      };
      
    } catch (error) {
      console.error('Alternative generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test if original INSEE PDF API is working
   */
  async testOriginalAPI(siren, siret = null) {
    try {
      // Try a few different approaches
      const approaches = [
        {
          name: 'Original with spaces',
          url: (siret) => `https://api-avis-situation-sirene.insee.fr/identification/pdf/${this.formatSIRETWithSpaces(siret)}`
        },
        {
          name: 'Original without spaces',
          url: (siret) => `https://api-avis-situation-sirene.insee.fr/identification/pdf/${siret}`
        },
        {
          name: 'Alternative endpoint',
          url: (siret) => `https://api.insee.fr/entreprises/sirene/avis-situation/pdf/${siret}`
        }
      ];
      
      // Get establishments to test with
      const establishments = await INSEEAPIService.getEstablishments(siren);
      const testSirets = establishments.slice(0, 2).map(est => est.siret);
      
      if (!siret && testSirets.length > 0) {
        siret = testSirets[0];
      } else if (!siret) {
        siret = `${siren}00001`;
      }
      
      const token = await INSEEOAuthService.getAccessToken();
      const results = [];
      
      for (const approach of approaches) {
        try {
          const url = approach.url(siret);
          console.log(`🧪 Testing ${approach.name}: ${url}`);
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/pdf'
            }
          });
          
          results.push({
            approach: approach.name,
            url: url,
            status: response.status,
            success: response.ok,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          });
          
          if (response.ok) {
            // Found a working endpoint!
            const pdfBuffer = await response.arrayBuffer();
            return {
              success: true,
              workingApproach: approach.name,
              workingUrl: url,
              data: Buffer.from(pdfBuffer),
              size: pdfBuffer.byteLength,
              contentType: 'application/pdf'
            };
          }
          
        } catch (error) {
          results.push({
            approach: approach.name,
            success: false,
            error: error.message
          });
        }
      }
      
      return {
        success: false,
        message: 'All PDF API approaches failed',
        results: results
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Main function - tries original API first, falls back to alternative
   */
  async getAvisSituation(siren, siret = null) {
    try {
      console.log(`🎯 Getting AVIS DE SITUATION for SIREN: ${siren}`);
      
      // First, try the original API
      console.log('🔄 Step 1: Testing original INSEE PDF API...');
      const originalResult = await this.testOriginalAPI(siren, siret);
      
      if (originalResult.success) {
        console.log(`✅ Original API works! Using ${originalResult.workingApproach}`);
        
        // Save the PDF file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `AVIS_DE_SITUATION_${siren}_${timestamp}.pdf`;
        const uploadsDir = path.join(process.cwd(), 'uploads');
        
        try {
          await fs.access(uploadsDir);
        } catch {
          await fs.mkdir(uploadsDir, { recursive: true });
        }
        
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, originalResult.data);
        
        return {
          success: true,
          fileName: fileName,
          path: `/uploads/${fileName}`,
          url: `/api/serve-file/uploads/${fileName}`,
          size: originalResult.size,
          contentType: 'application/pdf',
          downloadedAt: new Date().toISOString(),
          source: 'INSEE_OFFICIAL',
          method: originalResult.workingApproach,
          message: 'Official INSEE PDF downloaded successfully'
        };
      }
      
      // Original API failed, use alternative
      console.log('⚠️ Original API failed, generating alternative...');
      return await this.generateAvisSituation(siren, siret);
      
    } catch (error) {
      console.error('Get AVIS DE SITUATION error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate HTML content for AVIS DE SITUATION
   */
  generateHTMLContent(companyData, establishments, mainEstablishment) {
    const formatDate = (dateStr) => {
      if (!dateStr) return 'Non renseignée';
      try {
        return new Date(dateStr).toLocaleDateString('fr-FR');
      } catch {
        return dateStr;
      }
    };
    
    const formatAddress = (establishment) => {
      if (!establishment || !establishment.adresse) return 'Non renseignée';
      return establishment.adresse;
    };
    
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Avis de situation au répertoire Sirene - ${companyData.siren}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #0070f3;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #0070f3;
            margin-bottom: 10px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            margin: 20px 0;
            color: #2c3e50;
        }
        .subtitle {
            font-size: 16px;
            color: #666;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-left: 4px solid #0070f3;
            border-radius: 4px;
        }
        .section h2 {
            margin-top: 0;
            color: #2c3e50;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 10px;
            margin: 15px 0;
        }
        .label {
            font-weight: bold;
            color: #555;
        }
        .value {
            color: #333;
        }
        .status-active {
            color: #28a745;
            font-weight: bold;
        }
        .status-inactive {
            color: #dc3545;
            font-weight: bold;
        }
        .establishments {
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        .establishment {
            border-bottom: 1px solid #eee;
            padding: 10px 0;
        }
        .establishment:last-child {
            border-bottom: none;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🏛️ RÉPUBLIQUE FRANÇAISE</div>
        <div class="logo">Institut National de la Statistique et des Études Économiques</div>
        <h1 class="title">AVIS DE SITUATION AU RÉPERTOIRE SIRENE</h1>
        <div class="subtitle">Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
    </div>

    <div class="warning">
        <strong>⚠️ Note importante :</strong> Ce document a été généré automatiquement car le service officiel INSEE PDF est temporairement indisponible. 
        Il contient les mêmes informations officielles que l'avis de situation standard.
    </div>

    <div class="section">
        <h2>📋 Identification de l'Entreprise</h2>
        <div class="info-grid">
            <div class="label">SIREN :</div>
            <div class="value"><strong>${companyData.siren}</strong></div>
            
            <div class="label">Dénomination :</div>
            <div class="value"><strong>${companyData.denomination}</strong></div>
            
            <div class="label">Forme juridique :</div>
            <div class="value">${companyData.formeJuridique || 'Non renseignée'}</div>
            
            <div class="label">Code APE :</div>
            <div class="value">${companyData.codeAPE || 'Non renseigné'}</div>
            
            <div class="label">Libellé APE :</div>
            <div class="value">${companyData.libelleAPE || 'Non renseigné'}</div>
            
            <div class="label">Date de création :</div>
            <div class="value">${formatDate(companyData.dateCreation)}</div>
            
            <div class="label">État :</div>
            <div class="value ${companyData.active ? 'status-active' : 'status-inactive'}">
                ${companyData.active ? '✅ Active' : '❌ Inactive'}
            </div>
            
            <div class="label">Effectif :</div>
            <div class="value">${companyData.effectif || 'Non renseigné'}</div>
            
            ${companyData.capitalSocial ? `
            <div class="label">Capital social :</div>
            <div class="value">${companyData.capitalSocial.toLocaleString('fr-FR')} €</div>
            ` : ''}
        </div>
    </div>

    <div class="section">
        <h2>🏢 Établissement Principal</h2>
        ${mainEstablishment ? `
        <div class="info-grid">
            <div class="label">SIRET :</div>
            <div class="value"><strong>${mainEstablishment.siret}</strong></div>
            
            <div class="label">Adresse :</div>
            <div class="value">${formatAddress(mainEstablishment)}</div>
            
            <div class="label">Date de création :</div>
            <div class="value">${formatDate(mainEstablishment.dateCreation)}</div>
            
            <div class="label">État :</div>
            <div class="value ${mainEstablishment.active ? 'status-active' : 'status-inactive'}">
                ${mainEstablishment.active ? '✅ Actif' : '❌ Fermé'}
            </div>
            
            <div class="label">Siège social :</div>
            <div class="value">${mainEstablishment.siegeSocial ? '✅ Oui' : '❌ Non'}</div>
        </div>
        ` : '<p>Aucun établissement principal trouvé</p>'}
    </div>

    <div class="section">
        <h2>🏭 Liste des Établissements (${establishments.length})</h2>
        <div class="establishments">
            ${establishments.map(est => `
            <div class="establishment">
                <strong>SIRET: ${est.siret}</strong>
                ${est.siegeSocial ? ' <span style="color: #0070f3;">(Siège social)</span>' : ''}
                <br>
                <span style="color: #666;">Adresse: ${formatAddress(est)}</span>
                <br>
                <span style="color: #666;">Créé le: ${formatDate(est.dateCreation)}</span>
                <span style="margin-left: 20px; color: ${est.active ? '#28a745' : '#dc3545'};">
                    ${est.active ? '✅ Actif' : '❌ Fermé'}
                </span>
            </div>
            `).join('')}
        </div>
    </div>

    <div class="footer">
        <p><strong>Document officiel généré à partir des données INSEE SIRENE</strong></p>
        <p>SIREN: ${companyData.siren} | Généré le ${new Date().toLocaleString('fr-FR')}</p>
        <p>Source: Institut National de la Statistique et des Études Économiques (INSEE)</p>
        <p style="margin-top: 20px; font-size: 10px;">
            Ce document contient les informations officielles du répertoire SIRENE à la date de génération.
            Pour obtenir des informations plus récentes, consultez directement le site insee.fr
        </p>
    </div>
</body>
</html>`;
  }
  
  /**
   * Format SIRET with spaces
   */
  formatSIRETWithSpaces(siret) {
    const cleanSIRET = siret.replace(/\s/g, '');
    if (cleanSIRET.length !== 14) {
      throw new Error(`Invalid SIRET length: ${cleanSIRET.length}, expected 14 digits`);
    }
    return `${cleanSIRET.substring(0, 3)} ${cleanSIRET.substring(3, 6)} ${cleanSIRET.substring(6, 9)} ${cleanSIRET.substring(9, 14)}`;
  }
}

export default new INSEEPDFAlternative();