// pages/api/test/generate-insee-html.js - Alternative INSEE Solution
import INSEEOAuthService from '../../../lib/insee-oauth';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren = '552032534' } = req.query;

  try {
    console.log(`🏛️ Generating INSEE HTML report for SIREN: ${siren}`);
    
    // Get OAuth token
    const token = await INSEEOAuthService.getAccessToken();
    
    // Fetch comprehensive INSEE data
    const [companyResponse, establishmentsResponse] = await Promise.all([
      fetch(`https://api.insee.fr/entreprises/sirene/V3.11/siren/${siren}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }),
      fetch(`https://api.insee.fr/entreprises/sirene/V3.11/siret?q=siren:${siren}&nombre=50`, {
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
    
    // Generate enhanced HTML report
    const htmlReport = generateINSEEEnhancedHTML(companyData, establishmentsData, siren);
    
    // Save HTML file
    const timestamp = Date.now();
    const filename = `INSEE_Complete_Report_${siren}_${timestamp}.html`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, htmlReport, 'utf8');
    
    return res.status(200).json({
      success: true,
      message: 'INSEE HTML report generated successfully',
      file: {
        filename: filename,
        path: `/uploads/${filename}`,
        format: 'HTML',
        size: `${Math.round(htmlReport.length / 1024)} KB`
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
    console.error('❌ INSEE HTML report generation failed:', error);
    return res.status(500).json({
      success: false,
      message: 'INSEE HTML report generation failed',
      error: error.message,
      siren: siren
    });
  }
}

function generateINSEEEnhancedHTML(companyData, establishmentsData, siren) {
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

  const getFormeJuridique = (code) => {
    const formes = {
      '5710': 'SAS',
      '5499': 'SARL',
      '5308': 'EURL',
      '5202': 'SA',
      '1000': 'Entrepreneur individuel'
    };
    return formes[code] || code;
  };

  const getDenomination = (uniteLegale) => {
    if (uniteLegale.denominationUniteLegale) return uniteLegale.denominationUniteLegale;
    if (uniteLegale.sigleUniteLegale) return uniteLegale.sigleUniteLegale;
    
    const nameParts = [
      uniteLegale.prenom1UniteLegale,
      uniteLegale.nomUniteLegale
    ].filter(Boolean);
    
    return nameParts.length > 0 ? nameParts.join(' ') : `Entreprise ${siren}`;
  };

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport INSEE Complet - ${getDenomination(company)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 20px;
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
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="white" opacity="0.1"/></svg>') repeat;
        }
        
        .header-content {
            position: relative;
            z-index: 1;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header .company-name {
            font-size: 1.8rem;
            font-weight: 600;
            margin: 20px 0;
            background: rgba(255,255,255,0.2);
            padding: 15px 30px;
            border-radius: 50px;
            display: inline-block;
        }
        
        .status-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 25px;
            font-weight: 600;
            font-size: 0.9rem;
            margin-top: 10px;
        }
        
        .status-active {
            background: rgba(46, 204, 113, 0.2);
            color: #27ae60;
            border: 2px solid rgba(46, 204, 113, 0.5);
        }
        
        .status-inactive {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            border: 2px solid rgba(231, 76, 60, 0.5);
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 40px;
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            border-left: 5px solid #667eea;
        }
        
        .section h2 {
            color: #2c3e50;
            font-size: 1.5rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }
        
        .section h2 .icon {
            font-size: 1.8rem;
            margin-right: 15px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .info-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border-left: 4px solid #3498db;
        }
        
        .info-label {
            font-weight: 600;
            color: #7f8c8d;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .info-value {
            color: #2c3e50;
            font-size: 1.1rem;
            font-weight: 500;
            word-break: break-word;
        }
        
        .establishment {
            background: white;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border-left: 4px solid #e74c3c;
            transition: transform 0.3s ease;
        }
        
        .establishment:hover {
            transform: translateY(-2px);
        }
        
        .establishment.headquarters {
            border-left-color: #27ae60;
            background: linear-gradient(135deg, #f8fff8 0%, #e8f5e8 100%);
        }
        
        .establishment-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        .establishment-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2c3e50;
            display: flex;
            align-items: center;
        }
        
        .establishment-title .icon {
            margin-right: 10px;
            font-size: 1.5rem;
        }
        
        .quick-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .stat-card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 5px;
            position: relative;
            z-index: 1;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        
        .timeline {
            position: relative;
            padding-left: 30px;
        }
        
        .timeline::before {
            content: '';
            position: absolute;
            left: 15px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, #667eea, #764ba2);
        }
        
        .timeline-item {
            position: relative;
            padding: 20px 0;
        }
        
        .timeline-item::before {
            content: '';
            position: absolute;
            left: -22px;
            top: 25px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #667eea;
            border: 3px solid white;
            box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
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
            .header .company-name { font-size: 1.4rem; }
            .content { padding: 20px; }
            .section { padding: 20px; }
            .info-grid { grid-template-columns: 1fr; }
            .quick-stats { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <h1>🏛️ Rapport INSEE SIRENE</h1>
                <div class="company-name">${getDenomination(company)}</div>
                <div>
                    <strong>SIREN:</strong> ${siren} • 
                    <strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
                </div>
                <div class="status-badge ${company?.etatAdministratifUniteLegale === 'A' ? 'status-active' : 'status-inactive'}">
                    ${company?.etatAdministratifUniteLegale === 'A' ? '✅ Entreprise Active' : '❌ Entreprise Inactive'}
                </div>
            </div>
        </div>

        <div class="content">
            <!-- Quick Stats -->
            <div class="quick-stats">
                <div class="stat-card">
                    <div class="stat-value">${siren}</div>
                    <div class="stat-label">Numéro SIREN</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${establishments.length}</div>
                    <div class="stat-label">Établissements</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${company?.dateCreationUniteLegale ? new Date(company.dateCreationUniteLegale).getFullYear() : 'N/A'}</div>
                    <div class="stat-label">Année de création</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${getFormeJuridique(company?.categorieJuridiqueUniteLegale)}</div>
                    <div class="stat-label">Forme juridique</div>
                </div>
            </div>

            <!-- Company Information -->
            <div class="section">
                <h2><span class="icon">ℹ️</span>Informations générales</h2>
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-label">Dénomination sociale</div>
                        <div class="info-value">${getDenomination(company)}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Sigle</div>
                        <div class="info-value">${company?.sigleUniteLegale || 'Non renseigné'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Forme juridique</div>
                        <div class="info-value">${getFormeJuridique(company?.categorieJuridiqueUniteLegale)} (${company?.categorieJuridiqueUniteLegale})</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Date de création</div>
                        <div class="info-value">${formatDate(company?.dateCreationUniteLegale)}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Activité principale</div>
                        <div class="info-value">${company?.activitePrincipaleUniteLegale || 'Non renseignée'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Caractère employeur</div>
                        <div class="info-value">${company?.caractereEmployeurUniteLegale === 'O' ? 'Oui' : 'Non'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Tranche d'effectifs</div>
                        <div class="info-value">${company?.trancheEffectifsUniteLegale || 'Non renseignée'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Économie sociale et solidaire</div>
                        <div class="info-value">${company?.economieSocialeSolidaireUniteLegale === 'O' ? 'Oui' : 'Non'}</div>
                    </div>
                </div>
            </div>

            <!-- Establishments -->
            <div class="section">
                <h2><span class="icon">🏪</span>Établissements (${establishments.length})</h2>
                ${establishments.slice(0, 10).map((etab, index) => `
                    <div class="establishment ${etab.etablissementSiege ? 'headquarters' : ''}">
                        <div class="establishment-header">
                            <div class="establishment-title">
                                <span class="icon">${etab.etablissementSiege ? '🏛️' : '🏪'}</span>
                                ${etab.etablissementSiege ? 'Siège social' : `Établissement ${index + 1}`}
                            </div>
                            <div class="status-badge ${etab.etatAdministratifEtablissement === 'A' ? 'status-active' : 'status-inactive'}">
                                ${etab.etatAdministratifEtablissement === 'A' ? 'Actif' : 'Fermé'}
                            </div>
                        </div>
                        <div class="info-grid">
                            <div class="info-card">
                                <div class="info-label">SIRET</div>
                                <div class="info-value">${etab.siret}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-label">Date de création</div>
                                <div class="info-value">${formatDate(etab.dateCreationEtablissement)}</div>
                            </div>
                            <div class="info-card" style="grid-column: 1 / -1;">
                                <div class="info-label">Adresse</div>
                                <div class="info-value">${formatAddress(etab.adresseEtablissement)}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${establishments.length > 10 ? `
                    <div class="info-card" style="text-align: center; background: #e8f4fd; border-left-color: #3498db;">
                        <div class="info-value" style="color: #2980b9;">
                            ... et ${establishments.length - 10} autres établissements
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Timeline -->
            <div class="section">
                <h2><span class="icon">📅</span>Chronologie</h2>
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="info-label">Création de l'entreprise</div>
                        <div class="info-value">${formatDate(company?.dateCreationUniteLegale)}</div>
                    </div>
                    ${establishments.filter(e => e.etablissementSiege).map(etab => `
                        <div class="timeline-item">
                            <div class="info-label">Création du siège social</div>
                            <div class="info-value">${formatDate(etab.dateCreationEtablissement)}</div>
                        </div>
                    `).join('')}
                    <div class="timeline-item">
                        <div class="info-label">Dernière mise à jour</div>
                        <div class="info-value">${new Date().toLocaleDateString('fr-FR')}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>Source:</strong> INSEE SIRENE - Données officielles françaises</p>
            <p>Ce rapport a été généré automatiquement par DataCorp Platform</p>
            <p>Les informations sont celles disponibles dans la base SIRENE à la date de génération</p>
            <p style="margin-top: 15px; font-size: 0.9rem;">
                🔗 <strong>API INSEE SIRENE V3.11</strong> • 
                📊 <strong>${establishments.length} établissement(s) analysé(s)</strong> • 
                ⚡ <strong>Rapport généré en temps réel</strong>
            </p>
        </div>
    </div>

    <button class="print-button" onclick="window.print()">
        🖨️ Imprimer
    </button>

    <script>
        // Add smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });

        // Add click-to-copy for SIREN/SIRET
        document.querySelectorAll('.info-value').forEach(element => {
            if (element.textContent.match(/\\d{9,14}/)) {
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

        // Auto-refresh functionality
        let refreshInterval;
        function startAutoRefresh() {
            refreshInterval = setInterval(() => {
                const refreshBanner = document.createElement('div');
                refreshBanner.innerHTML = '🔄 Actualisation automatique disponible - <a href="#" onclick="location.reload()">Cliquer pour actualiser</a>';
                refreshBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#667eea;color:white;padding:10px;text-align:center;z-index:1000;';
                document.body.prepend(refreshBanner);
            }, 300000); // 5 minutes
        }

        // Initialize auto-refresh
        startAutoRefresh();
    </script>
</body>
</html>`;
}
