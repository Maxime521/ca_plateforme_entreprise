// pages/api/test/insee-company-data.js - Get INSEE Data and Generate HTML Report
import INSEEOAuthService from '../../../lib/insee-oauth';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren = '552032534' } = req.query;

  try {
    console.log(`🏛️ Getting INSEE company data for SIREN: ${siren}`);
    
    // Get OAuth token
    const token = await INSEEOAuthService.getAccessToken();
    
    // Fetch company data from INSEE SIRENE API
    const companyUrl = `https://api.insee.fr/entreprises/sirene/V3.11/siren/${siren}`;
    const establishmentsUrl = `https://api.insee.fr/entreprises/sirene/V3.11/siret?q=siren:${siren}`;
    
    const [companyResponse, establishmentsResponse] = await Promise.all([
      fetch(companyUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }),
      fetch(establishmentsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
    ]);

    if (!companyResponse.ok) {
      throw new Error(`INSEE API error: ${companyResponse.status}`);
    }

    const companyData = await companyResponse.json();
    const establishmentsData = await establishmentsResponse.json();
    
    // Generate HTML report
    const htmlReport = generateINSEEHTML(companyData, establishmentsData, siren);
    
    // Save HTML file
    const timestamp = Date.now();
    const filename = `INSEE_Report_${siren}_${timestamp}.html`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, htmlReport, 'utf8');
    
    return res.status(200).json({
      success: true,
      message: 'INSEE company report generated successfully',
      file: {
        filename: filename,
        path: `/uploads/${filename}`,
        format: 'HTML'
      },
      data: {
        company: companyData.uniteLegale?.denominationUniteLegale,
        siren: siren,
        establishments: establishmentsData.etablissements?.length || 0,
        active: companyData.uniteLegale?.etatAdministratifUniteLegale === 'A'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ INSEE data fetch failed:', error);
    return res.status(500).json({
      success: false,
      message: 'INSEE data fetch failed',
      error: error.message,
      siren: siren
    });
  }
}

function generateINSEEHTML(companyData, establishmentsData, siren) {
  const company = companyData.uniteLegale;
  const establishments = establishmentsData.etablissements || [];
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Non renseigné';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  const formatAddress = (adresse) => {
    if (!adresse) return 'Non renseignée';
    const parts = [
      adresse.numeroVoieEtablissement,
      adresse.typeVoieEtablissement,
      adresse.libelleVoieEtablissement,
      adresse.codePostalEtablissement,
      adresse.libelleCommuneEtablissement
    ].filter(Boolean);
    return parts.join(' ');
  };

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport INSEE - ${company?.denominationUniteLegale || siren}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #2196F3; }
        .header h1 { color: #2196F3; margin: 0; font-size: 28px; }
        .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; }
        .status.active { background: #4CAF50; color: white; }
        .status.inactive { background: #f44336; color: white; }
        .section { margin: 30px 0; }
        .section h2 { color: #1976D2; border-bottom: 2px solid #E3F2FD; padding-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; }
        .info-label { font-weight: bold; color: #333; margin-bottom: 5px; }
        .info-value { color: #666; }
        .establishment { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px 0; }
        .establishment.headquarters { border-left: 4px solid #4CAF50; background: #f1f8e9; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
        @media print { body { background: white; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏛️ Rapport INSEE SIRENE</h1>
            <h2>${company?.denominationUniteLegale || `Entreprise ${siren}`}</h2>
            <p>SIREN: <strong>${siren}</strong></p>
            <span class="status ${company?.etatAdministratifUniteLegale === 'A' ? 'active' : 'inactive'}">
                ${company?.etatAdministratifUniteLegale === 'A' ? '✅ Active' : '❌ Inactive'}
            </span>
            <p style="margin-top: 15px; color: #666;">
                Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </p>
        </div>

        <div class="section">
            <h2>📋 Informations générales</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Dénomination sociale</div>
                    <div class="info-value">${company?.denominationUniteLegale || 'Non renseignée'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Forme juridique</div>
                    <div class="info-value">${company?.categorieJuridiqueUniteLegale || 'Non renseignée'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Date de création</div>
                    <div class="info-value">${formatDate(company?.dateCreationUniteLegale)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Activité principale</div>
                    <div class="info-value">${company?.activitePrincipaleUniteLegale || 'Non renseignée'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tranche d'effectifs</div>
                    <div class="info-value">${company?.trancheEffectifsUniteLegale || 'Non renseignée'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Caractère employeur</div>
                    <div class="info-value">${company?.caractereEmployeurUniteLegale === 'O' ? 'Oui' : 'Non'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🏪 Établissements (${establishments.length})</h2>
            ${establishments.slice(0, 10).map(etab => `
                <div class="establishment ${etab.etablissementSiege ? 'headquarters' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: #1976D2;">
                            ${etab.etablissementSiege ? '🏛️ Siège social' : '🏪 Établissement'}
                        </h3>
                        <span class="status ${etab.etatAdministratifEtablissement === 'A' ? 'active' : 'inactive'}" style="font-size: 12px; padding: 4px 8px;">
                            ${etab.etatAdministratifEtablissement === 'A' ? 'Actif' : 'Fermé'}
                        </span>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">SIRET</div>
                            <div class="info-value">${etab.siret}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de création</div>
                            <div class="info-value">${formatDate(etab.dateCreationEtablissement)}</div>
                        </div>
                        <div class="info-item" style="grid-column: 1 / -1;">
                            <div class="info-label">Adresse</div>
                            <div class="info-value">${formatAddress(etab.adresseEtablissement)}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
            ${establishments.length > 10 ? `<p style="text-align: center; color: #666; margin-top: 20px;">... et ${establishments.length - 10} autres établissements</p>` : ''}
        </div>

        <div class="footer">
            <p><strong>Source:</strong> INSEE SIRENE - Données officielles</p>
            <p>Ce document a été généré automatiquement par DataCorp Platform</p>
            <p>Les informations présentées sont celles disponibles dans la base SIRENE à la date de génération</p>
        </div>
    </div>
</body>
</html>`;
}
