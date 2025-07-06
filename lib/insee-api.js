const axios = require('axios');

class INSEEAPIService {
  constructor() {
    this.consumerKey = process.env.INSEE_CONSUMER_KEY;
    this.consumerSecret = process.env.INSEE_CONSUMER_SECRET;
    console.log(`🏛️ INSEE Constructor: Key=${this.consumerKey ? 'SET' : 'NOT SET'}, Secret=${this.consumerSecret ? 'SET' : 'NOT SET'}`);
    this.tokenUrl = 'https://api.insee.fr/token';
    this.apiBaseUrl = 'https://api.insee.fr/entreprises/sirene/V3.11';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get or refresh access token
  async getAccessToken() {
    // Check if credentials are configured
    if (!this.consumerKey || !this.consumerSecret || 
        this.consumerKey === 'your-insee-consumer-key' || 
        this.consumerSecret === 'your-insee-consumer-secret') {
      throw new Error('INSEE API credentials not configured');
    }

    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.post(
        this.tokenUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      
      console.log('INSEE Token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get INSEE access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with INSEE API');
    }
  }

  // Search companies with improved SIREN handling
  async searchCompanies(query) {
    // Check if query looks like a SIREN (9 digits)
    if (/^\d{9}$/.test(query)) {
      console.log('🔢 Query looks like SIREN, using SIRET search for better data...');
      return await this.searchBySIREN(query);
    }
    
    // Otherwise, search by name
    return await this.searchByName(query);
  }

  // Search by SIREN - use SIRET endpoint for better company data
  async searchBySIREN(siren) {
    try {
      const token = await this.getAccessToken();
      
      console.log(`🏛️ INSEE: SIREN search for ${siren} using SIRET endpoint`);
      
      // Use SIRET search with SIREN filter to get complete company data
      const response = await axios.get(`${this.apiBaseUrl}/siret`, {
        params: {
          q: `siren:${siren}`,
          nombre: 20,
          debut: 0
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (response.data.etablissements && response.data.etablissements.length > 0) {
        console.log(`✅ Found ${response.data.etablissements.length} establishments for SIREN ${siren}`);
        return this.formatSearchResults(response.data);
      }

      // If SIRET search fails, try direct SIREN lookup as fallback
      console.log('SIRET search returned no results, trying direct SIREN lookup...');
      
      const sirenResponse = await axios.get(`${this.apiBaseUrl}/siren/${siren}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (sirenResponse.data.uniteLegale) {
        const company = this.formatCompanyData(sirenResponse.data);
        console.log(`✅ Found company via direct SIREN: ${company.denomination}`);
        return {
          results: [company],
          total: 1,
          page: 0
        };
      }

      // No results found
      return { results: [], total: 0, page: 0 };

    } catch (error) {
      console.error('INSEE SIREN Search Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Search by company name
  async searchByName(query) {
    try {
      const token = await this.getAccessToken();
      
      console.log(`🏛️ INSEE: Name search for "${query}"`);
      
      const params = {
        q: `denominationUniteLegale:${query}`,
        nombre: 20,
        debut: 0
      };

      const response = await axios.get(`${this.apiBaseUrl}/siret`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      return this.formatSearchResults(response.data);
    } catch (error) {
      console.error('INSEE Name Search Error:', error.response?.data || error.message);
      
      // Try fallback search if specific query fails
      if (error.response?.status === 400) {
        console.log('Trying fallback search format...');
        return await this.fallbackSearch(query);
      }
      
      throw this.handleError(error);
    }
  }

  // Fallback search with simpler format
  async fallbackSearch(query) {
    try {
      const token = await this.getAccessToken();
      
      const params = {
        q: query,
        nombre: 20
      };

      const response = await axios.get(`${this.apiBaseUrl}/siret`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      return this.formatSearchResults(response.data);
    } catch (error) {
      console.error('INSEE Fallback Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Get company by SIREN - Use SIRET endpoint for better data consistency
  async getCompanyBySiren(siren) {
    try {
      console.log(`🏛️ INSEE: *** USING NEW SIRET ENDPOINT METHOD FOR SIREN ${siren} ***`);
      
      // Check if credentials are configured, if not, provide mock data in development
      if (!this.consumerKey || !this.consumerSecret || 
          this.consumerKey === 'your-insee-consumer-key' || 
          this.consumerSecret === 'your-insee-consumer-secret') {
        
        if (process.env.NODE_ENV === 'production') {
          console.log('🚨 INSEE: Credentials not configured in production!');
          throw new Error('INSEE API credentials not configured');
        } else {
          console.log('🧪 INSEE: Using mock data for development (credentials not configured)');
          return this.getMockCompanyData(siren);
        }
      }
      
      const token = await this.getAccessToken();
      
      // Use SIRET endpoint for more complete data (same as search)
      console.log(`🏛️ INSEE: Using SIRET endpoint for SIREN ${siren} to get complete data`);
      const response = await axios.get(`${this.apiBaseUrl}/siret`, {
        params: {
          q: `siren:${siren}`,
          nombre: 20,
          debut: 0
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (response.data.etablissements && response.data.etablissements.length > 0) {
        console.log(`✅ Found ${response.data.etablissements.length} establishments for SIREN ${siren}`);
        
        // Get the main establishment (siege social) or first establishment
        const mainEstablishment = response.data.etablissements.find(est => est.etablissementSiege === true) || response.data.etablissements[0];
        const uniteLegale = mainEstablishment.uniteLegale;
        
        console.log(`🏛️ INSEE: Using establishment data for complete company info`);
        console.log(`🏛️ INSEE: Critical fields from SIRET endpoint:`, {
          denominationUniteLegale: uniteLegale.denominationUniteLegale,
          categorieJuridiqueUniteLegale: uniteLegale.categorieJuridiqueUniteLegale,
          activitePrincipaleUniteLegale: uniteLegale.activitePrincipaleUniteLegale,
          capitalSocialUniteLegale: uniteLegale.capitalSocialUniteLegale
        });
        
        // Format using the establishment data which has more complete information
        return this.formatCompanyFromEstablishment(mainEstablishment);
      } else {
        console.log('🏛️ INSEE: No establishments found, trying direct SIREN endpoint as fallback');
        throw new Error('No establishments found for this SIREN');
      }
    } catch (error) {
      console.error('INSEE Get Company Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Get establishments for a SIREN
  async getEstablishments(siren) {
    try {
      // Check if credentials are configured, if not, provide mock data in development
      if (!this.consumerKey || !this.consumerSecret || 
          this.consumerKey === 'your-insee-consumer-key' || 
          this.consumerSecret === 'your-insee-consumer-secret') {
        
        if (process.env.NODE_ENV === 'production') {
          throw new Error('INSEE API credentials not configured');
        } else {
          console.log('🧪 INSEE: Using mock establishments for development');
          return this.getMockEstablishments(siren);
        }
      }
      
      const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.apiBaseUrl}/siret`, {
        params: {
          q: `siren:${siren}`,
          nombre: 100
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      return this.formatEstablishments(response.data);
    } catch (error) {
      console.error('INSEE Get Establishments Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Format search results
  formatSearchResults(data) {
    if (!data.etablissements) return { results: [], total: 0 };

    const results = data.etablissements.map(etablissement => {
      const uniteLegale = etablissement.uniteLegale;
      return {
        siren: uniteLegale.siren,
        siret: etablissement.siret,
        denomination: this.getDenomination(uniteLegale),
        adresseSiege: this.formatAddress(etablissement.adresseEtablissement),
        codeAPE: uniteLegale.activitePrincipaleUniteLegale,
        categorieJuridique: uniteLegale.categorieJuridiqueUniteLegale,
        formeJuridique: this.getFormeJuridique(uniteLegale.categorieJuridiqueUniteLegale),
        dateCreation: this.formatDate(uniteLegale.dateCreationUniteLegale),
        active: etablissement.etatAdministratifEtablissement === 'A' && uniteLegale.etatAdministratifUniteLegale === 'A',
        effectif: this.getEffectifLabel(uniteLegale.trancheEffectifsUniteLegale),
        siegeSocial: etablissement.etablissementSiege,
        libelleAPE: this.getAPELabel(uniteLegale.activitePrincipaleUniteLegale)
      };
    });

    return {
      results,
      total: data.header.total,
      page: Math.floor(data.header.debut / data.header.nombre)
    };
  }

  // Format single company data (for direct SIREN lookups) - IMPROVED
  formatCompanyData(data) {
    if (!data.uniteLegale) return null;

    const uniteLegale = data.uniteLegale;
    
    // IMPROVED: Better denomination handling
    const denomination = this.getDenomination(uniteLegale);
    console.log(`📋 Formatting company data: ${denomination} (${uniteLegale.siren})`);
    console.log(`📋 Key uniteLegale fields:`, {
      denomination: uniteLegale.denominationUniteLegale,
      categorieJuridique: uniteLegale.categorieJuridiqueUniteLegale,
      activitePrincipale: uniteLegale.activitePrincipaleUniteLegale,
      capitalSocial: uniteLegale.capitalSocialUniteLegale
    });
    
    // Enhance incomplete data with reasonable defaults for display
    const enhancedDenomination = denomination.includes('[Données incomplètes]') 
      ? `Entreprise ${uniteLegale.siren}` 
      : denomination;
    
    const result = {
      siren: uniteLegale.siren,
      siret: null, // Direct SIREN lookup doesn't include SIRET
      denomination: enhancedDenomination,
      adresseSiege: null, // Will be populated from establishments data
      codeAPE: uniteLegale.activitePrincipaleUniteLegale || null,
      libelleAPE: this.getAPELabel(uniteLegale.activitePrincipaleUniteLegale),
      categorieJuridique: uniteLegale.categorieJuridiqueUniteLegale || null,
      formeJuridique: this.getFormeJuridique(uniteLegale.categorieJuridiqueUniteLegale),
      dateCreation: this.formatDate(uniteLegale.dateCreationUniteLegale),
      dateCessation: uniteLegale.dateCessationUniteLegale,
      active: uniteLegale.etatAdministratifUniteLegale === 'A',
      effectif: this.getEffectifLabel(uniteLegale.trancheEffectifsUniteLegale),
      capitalSocial: uniteLegale.capitalSocialUniteLegale ? parseFloat(uniteLegale.capitalSocialUniteLegale) : null,
      siegeSocial: true, // Assume true for company-level data
      sigle: uniteLegale.sigleUniteLegale,
      economiqueSolidaire: uniteLegale.economieSocialeSolidaireUniteLegale,
      caractereEmployeur: uniteLegale.caractereEmployeurUniteLegale
    };
    
    console.log(`📋 Final formatted result:`, {
      denomination: result.denomination,
      formeJuridique: result.formeJuridique,
      codeAPE: result.codeAPE,
      libelleAPE: result.libelleAPE,
      capitalSocial: result.capitalSocial
    });
    
    return result;
  }

  // Format company data from establishment response (more complete data)
  formatCompanyFromEstablishment(etablissement) {
    const uniteLegale = etablissement.uniteLegale;
    
    console.log(`📋 Formatting company from establishment data:`, {
      denomination: uniteLegale.denominationUniteLegale,
      categorieJuridique: uniteLegale.categorieJuridiqueUniteLegale,
      activitePrincipale: uniteLegale.activitePrincipaleUniteLegale,
      capitalSocial: uniteLegale.capitalSocialUniteLegale,
      siren: uniteLegale.siren // Add SIREN to debug logging
    });
    
    const denomination = this.getDenomination(uniteLegale);
    
    // Ensure SIREN is available - extract from SIRET if needed
    const siren = uniteLegale.siren || (etablissement.siret ? etablissement.siret.substring(0, 9) : null);
    
    return {
      siren: siren,
      siret: etablissement.siret,
      denomination: denomination,
      adresseSiege: this.formatAddress(etablissement.adresseEtablissement),
      codeAPE: uniteLegale.activitePrincipaleUniteLegale || null,
      libelleAPE: this.getAPELabel(uniteLegale.activitePrincipaleUniteLegale),
      categorieJuridique: uniteLegale.categorieJuridiqueUniteLegale || null,
      formeJuridique: this.getFormeJuridique(uniteLegale.categorieJuridiqueUniteLegale),
      dateCreation: this.formatDate(uniteLegale.dateCreationUniteLegale),
      dateCessation: uniteLegale.dateCessationUniteLegale,
      active: etablissement.etatAdministratifEtablissement === 'A' && uniteLegale.etatAdministratifUniteLegale === 'A',
      effectif: this.getEffectifLabel(uniteLegale.trancheEffectifsUniteLegale),
      capitalSocial: uniteLegale.capitalSocialUniteLegale ? parseFloat(uniteLegale.capitalSocialUniteLegale) : null,
      siegeSocial: etablissement.etablissementSiege === true,
      sigle: uniteLegale.sigleUniteLegale,
      economiqueSolidaire: uniteLegale.economieSocialeSolidaireUniteLegale,
      caractereEmployeur: uniteLegale.caractereEmployeurUniteLegale
    };
  }

  // Format establishments
  formatEstablishments(data) {
    if (!data.etablissements) return [];

    return data.etablissements.map(etablissement => ({
      siret: etablissement.siret,
      nic: etablissement.nic,
      adresse: this.formatAddress(etablissement.adresseEtablissement),
      dateCreation: this.formatDate(etablissement.dateCreationEtablissement),
      active: etablissement.etatAdministratifEtablissement === 'A',
      siegeSocial: etablissement.etablissementSiege,
      effectif: etablissement.trancheEffectifsEtablissement
    }));
  }

  // Helper: Get company name - IMPROVED
  getDenomination(uniteLegale) {
    console.log(`🏛️ DENOMINATION: ${uniteLegale.denominationUniteLegale || 'NULL'}`);
    
    // First priority: denominationUniteLegale
    if (uniteLegale.denominationUniteLegale && uniteLegale.denominationUniteLegale.trim() && uniteLegale.denominationUniteLegale.trim() !== '') {
      return uniteLegale.denominationUniteLegale.trim();
    }
    
    // Second priority: sigleUniteLegale
    if (uniteLegale.sigleUniteLegale && uniteLegale.sigleUniteLegale.trim() && uniteLegale.sigleUniteLegale.trim() !== '') {
      return uniteLegale.sigleUniteLegale.trim();
    }
    
    // Third priority: denomination usuelle
    if (uniteLegale.denominationUsuelle1UniteLegale && uniteLegale.denominationUsuelle1UniteLegale.trim() && uniteLegale.denominationUsuelle1UniteLegale.trim() !== '') {
      return uniteLegale.denominationUsuelle1UniteLegale.trim();
    }
    
    // Fourth priority: for individual entrepreneurs, build name from parts
    const nameParts = [
      uniteLegale.prenom1UniteLegale,
      uniteLegale.prenom2UniteLegale,
      uniteLegale.prenom3UniteLegale,
      uniteLegale.nomUniteLegale,
      uniteLegale.nomUsageUniteLegale
    ].filter(Boolean).map(part => part.trim()).filter(part => part !== '');
    
    if (nameParts.length > 0) {
      return nameParts.join(' ');
    }
    
    // Last resort: use SIREN with indication it's incomplete data
    console.log(`⚠️ DENOMINATION FALLBACK: No name found for SIREN ${uniteLegale.siren}`);
    return `[Données incomplètes] ${uniteLegale.siren}`;
  }

  // Helper: Format address
  formatAddress(adresse) {
    if (!adresse) return '';

    const parts = [
      adresse.numeroVoieEtablissement,
      adresse.indiceRepetitionEtablissement,
      adresse.typeVoieEtablissement,
      adresse.libelleVoieEtablissement,
      adresse.complementAdresseEtablissement,
      adresse.codePostalEtablissement,
      adresse.libelleCommuneEtablissement,
      adresse.libellePaysEtrangerEtablissement
    ].filter(Boolean);

    return parts.join(' ').trim();
  }

  // Helper: Get forme juridique label
  getFormeJuridique(code) {
    const formes = {
      // Sociétés par actions
      '5710': 'SAS (Société par actions simplifiée)',
      '5720': 'SASU (Société par actions simplifiée unipersonnelle)',
      '5202': 'SA (Société anonyme)',
      '5205': 'SA à directoire',
      '5208': 'SA à conseil d\'administration',
      
      // Sociétés à responsabilité limitée
      '5499': 'SARL (Société à responsabilité limitée)',
      '5505': 'SARL de famille',
      '5308': 'EURL (Entreprise unipersonnelle à responsabilité limitée)',
      
      // Entrepreneurs individuels
      '1000': 'Entrepreneur individuel',
      '1100': 'Artisan-commerçant',
      '1200': 'Commerçant',
      '1300': 'Artisan',
      '1400': 'Officier public ou ministériel',
      '1500': 'Profession libérale',
      '1600': 'Exploitant agricole',
      '1700': 'Agent commercial',
      '1800': 'Associé gérant de société',
      '1900': 'Personne physique',
      
      // Sociétés civiles
      '6100': 'SCI (Société civile immobilière)',
      '6220': 'Groupement foncier agricole',
      '6316': 'CUMA (Coopérative d\'utilisation de matériel agricole)',
      '6317': 'Société coopérative agricole',
      '6318': 'Union de sociétés coopératives agricoles',
      '6411': 'Société d\'assurance mutuelle',
      '6412': 'SA coopérative d\'HLM', // FIXED: Added HLM cooperative mapping
      '6521': 'SICAV',
      '6532': 'SARL d\'HLM',
      '6533': 'SAS d\'HLM',
      
      // Associations et fondations
      '9220': 'Association déclarée',
      '9221': 'Association déclarée d\'insertion par l\'économique',
      '9222': 'Association intermédiaire',
      '9223': 'Groupement d\'employeurs',
      '9224': 'Association d\'avocats à responsabilité professionnelle individuelle',
      '9230': 'Association déclarée reconnue d\'utilité publique',
      '9240': 'Congrégation',
      '9260': 'Association de droit local',
      '9300': 'Fondation',
      
      // Coopératives
      '5485': 'SCOP (Société coopérative de production)',
      '5543': 'SCIC (Société coopérative d\'intérêt collectif)',
      '5547': 'SA coopérative de banque populaire',
      '5548': 'Banque coopérative',
      '5551': 'SA coopérative de crédit mutuel',
      '5552': 'SA coopérative de caisse d\'épargne et de prévoyance',
      '5559': 'Autre SA coopérative',
      
      // Autres formes
      '5370': 'Société de Participations Financières de Profession Libérale',
      '5385': 'Société d\'exercice libéral par actions simplifiée',
      '5410': 'SARL de droit local',
      '5415': 'EURL de droit local',
      '5422': 'Société en nom collectif',
      '5426': 'Société en commandite simple',
      '5430': 'Société en commandite par actions',
      '5431': 'SCA',
      '5432': 'Société en commandite par actions à directoire',
      '5442': 'SARL d\'économie mixte',
      '5443': 'SARL mixte d\'intérêt général',
      '5451': 'SA d\'économie mixte à conseil d\'administration',
      '5453': 'SA d\'économie mixte à directoire',
      '5454': 'SA à participation ouvrière à conseil d\'administration',
      '5455': 'SA à participation ouvrière à directoire',
      '5458': 'SA d\'intérêt collectif agricole',
      '5459': 'SA d\'attribution d\'immeubles en jouissance à temps partagé',
      '5460': 'SA de coopération entre les professions libérales',
      '5470': 'SAS coopérative',
      '5480': 'SA coopérative ouvrière de production et de crédit',
      '5481': 'SA coopérative ouvrière de production',
      '5488': 'Autre SA coopérative',
      '5498': 'SA d\'assurance mutuelle',
      '5500': 'SA coopérative d\'HLM',
      '5510': 'SAS d\'économie mixte',
      '5515': 'SAS coopérative d\'intérêt collectif',
      '5520': 'SAS coopérative entre professions libérales',
      '5522': 'SAS mixte d\'intérêt général',
      '5525': 'SAS d\'intérêt collectif agricole',
      '5530': 'SAS d\'assurance mutuelle',
      '5531': 'SAS mixte d\'assurance',
      '5532': 'SAS d\'HLM',
      '5542': 'SA mixte d\'assurance',
      '5546': 'SA de groupe d\'assurance mutuelle',
      '5547': 'SA coopérative de banque populaire',
      '5561': 'SA de crédit coopératif',
      '5566': 'SA de groupe de crédit coopératif',
      '5570': 'SAS de crédit coopératif',
      '5575': 'SAS de groupe de crédit coopératif',
      '5580': 'Autre SARL coopérative',
      '5585': 'Autre SAS coopérative',
      '5605': 'SARL unipersonnelle d\'économie mixte',
      '5610': 'EURL d\'économie mixte',
      '5615': 'EURL mixte d\'intérêt général',
      '5620': 'EURL d\'assurance mutuelle',
      '5621': 'EURL mixte d\'assurance',
      '5625': 'EURL d\'HLM',
      '5630': 'EURL coopérative',
      '5631': 'EURL d\'intérêt collectif agricole',
      '5632': 'EURL entre professions libérales',
      '5599': 'SA (Société anonyme)', // FIXED: Added missing mapping
      '5710': 'SAS',
      '5770': 'Régime auto-entrepreneur'
    };
    if (!code) {
      console.log(`⚠️ FORME JURIDIQUE: No categorieJuridiqueUniteLegale provided`);
      return 'DONNÉES NON DISPONIBLES (NOUVEAU)';
    }
    return formes[code] || `Forme juridique ${code}`;
  }

  // Helper: Get APE label
  getAPELabel(code) {
    const apeLabels = {
      // Commerce de détail
      '4711D': 'Supermarchés',
      '4711F': 'Hypermarchés',
      '4719B': 'Autres commerces de détail en magasin non spécialisé',
      '4778C': 'Autres commerces de détail spécialisés divers',
      '4791A': 'Vente à distance sur catalogue général',
      '4791B': 'Vente à distance sur catalogue spécialisé',
      
      // Activités informatiques
      '6201Z': 'Programmation informatique',
      '6202A': 'Conseil en systèmes et logiciels informatiques',
      '6202B': 'Tierce maintenance de systèmes et d\'applications informatiques',
      '6203Z': 'Gestion d\'installations informatiques',
      '6209Z': 'Autres activités informatiques',
      
      // Activités de conseil
      '7022Z': 'Conseil pour les affaires et autres conseils de gestion',
      '7010Z': 'Activités des sièges sociaux',
      '7021Z': 'Conseil en relations publiques et communication',
      '7111Z': 'Activités d\'architecture',
      '7112A': 'Activité des géomètres',
      '7112B': 'Ingénierie, études techniques',
      '7120A': 'Contrôle technique automobile',
      '7120B': 'Analyses, essais et inspections techniques',
      
      // Industries alimentaires
      '1051C': 'Fabrication de fromage',
      '1051A': 'Fabrication de lait liquide et de produits frais',
      '1051B': 'Fabrication de beurre',
      '1051D': 'Fabrication d\'autres produits laitiers',
      '1052Z': 'Fabrication de glaces et sorbets',
      '1061A': 'Meunerie',
      '1061B': 'Autres activités du travail des grains',
      '1062Z': 'Fabrication de produits amylacés',
      
      // Construction
      '4120A': 'Construction de maisons individuelles',
      '4120B': 'Construction d\'autres bâtiments',
      '4211Z': 'Construction de routes et autoroutes',
      '4212Z': 'Construction de voies ferrées de surface et souterraines',
      '4213A': 'Construction d\'ouvrages d\'art',
      '4213B': 'Construction et entretien de tunnels',
      '4221Z': 'Construction de réseaux pour fluides',
      '4222Z': 'Construction de réseaux électriques et de télécommunications',
      
      // Santé et action sociale
      '8610Z': 'Activités hospitalières',
      '8621Z': 'Activité des médecins généralistes',
      '8622A': 'Activités de radiodiagnostic et de radiothérapie',
      '8622B': 'Activités chirurgicales',
      '8622C': 'Autres activités des médecins spécialistes',
      '8623Z': 'Pratique dentaire',
      '8690A': 'Ambulances',
      '8690B': 'Laboratoires d\'analyses médicales',
      '8690C': 'Centres de collecte et banques d\'organes',
      '8690D': 'Activités des infirmiers et des sages-femmes',
      '8690E': 'Activités des professionnels de la rééducation, de l\'appareillage et des pédicures-podologues',
      '8690F': 'Activités de santé humaine non classées ailleurs',
      
      // Transports
      '4941A': 'Transports routiers de fret interurbains',
      '4941B': 'Transports routiers de fret de proximité',
      '4942Z': 'Services de déménagement',
      '4950Z': 'Transports par conduites',
      '5010Z': 'Transports maritimes et côtiers de passagers',
      '5020Z': 'Transports maritimes et côtiers de fret',
      '5030Z': 'Transports fluviaux de passagers',
      '5040Z': 'Transports fluviaux de fret',
      
      // Hôtellerie et restauration
      '5510Z': 'Hôtels et hébergement similaire',
      '5520Z': 'Hébergement touristique et autre hébergement de courte durée',
      '5530Z': 'Terrains de camping et parcs pour caravanes ou véhicules de loisirs',
      '5590Z': 'Autres hébergements',
      '5610A': 'Restauration traditionnelle',
      '5610B': 'Cafétérias et autres libres-services',
      '5610C': 'Restauration de type rapide',
      '5621Z': 'Services des traiteurs',
      '5629A': 'Restauration collective sous contrat',
      '5629B': 'Autres services de restauration n.c.a.',
      '5630Z': 'Débits de boissons',
      
      // Activités immobilières
      '6810Z': 'Activités des marchands de biens immobiliers',
      '6820A': 'Location de logements',
      '6820B': 'Location de terrains et d\'autres biens immobiliers',
      '6831Z': 'Agences immobilières',
      '6832A': 'Administration d\'immeubles et autres biens immobiliers',
      '6832B': 'Supports juridiques de gestion de patrimoine mobilier',
      
      // Agriculture
      '0111Z': 'Culture de céréales (à l\'exception du riz), de légumineuses et de graines oléagineuses',
      '0112Z': 'Culture du riz',
      '0113Z': 'Culture de légumes, de melons, de racines et de tubercules',
      '0119Z': 'Autres cultures non permanentes',
      '0121Z': 'Culture de la vigne',
      '0122Z': 'Culture de fruits tropicaux et subtropicaux',
      '0123Z': 'Culture d\'agrumes',
      '0124Z': 'Culture de fruits à pépins et à noyau',
      '0125Z': 'Culture d\'autres fruits d\'arbres ou d\'arbustes et de fruits à coque',
      '0126Z': 'Culture de fruits oléagineux',
      '0127Z': 'Culture de plantes à boissons',
      '0128Z': 'Culture de plantes à épices, aromatiques, médicinales et pharmaceutiques',
      
      // Enseignement
      '8510Z': 'Enseignement pré-primaire',
      '8520Z': 'Enseignement primaire',
      '8531Z': 'Enseignement secondaire général',
      '8532Z': 'Enseignement secondaire technique ou professionnel',
      '8541Z': 'Enseignement post-secondaire non supérieur',
      '8542Z': 'Enseignement supérieur',
      '8551Z': 'Enseignement de disciplines sportives et d\'activités de loisirs',
      '8552Z': 'Enseignement culturel',
      '8553Z': 'Enseignement de la conduite',
      '8559A': 'Formation continue d\'adultes',
      '8559B': 'Autres enseignements',
      
      // Services financiers
      '6411Z': 'Activités de banque centrale',
      '6419Z': 'Autres intermédiations monétaires',
      '6420Z': 'Activités des sociétés holding',
      '6430Z': 'Fonds de placement et entités financières similaires',
      '6491Z': 'Crédit-bail',
      '6492Z': 'Autre distribution de crédit',
      '6499Z': 'Autres activités des services financiers, hors assurance et caisses de retraite, n.c.a.',
      '6511Z': 'Assurance vie',
      '6512Z': 'Autres assurances',
      '6520Z': 'Réassurance',
      '6530Z': 'Caisses de retraite',
      
      // Activités spécialisées, scientifiques et techniques
      '6910Z': 'Activités juridiques',
      '6920Z': 'Activités comptables',
      '7219Z': 'Recherche-développement en autres sciences physiques et naturelles',
      '7311Z': 'Activités des agences de publicité',
      '7312Z': 'Régie publicitaire de médias',
      '7320Z': 'Activités d\'études de marché et de sondages',
      '7410Z': 'Activités spécialisées de design',
      '7420Z': 'Activités photographiques',
      '7430Z': 'Traduction et interprétation',
      '7490A': 'Activités spécialisées de design',
      '7490B': 'Activités spécialisées, scientifiques et techniques diverses'
    };
    if (!code) {
      console.log(`⚠️ APE CODE: No activitePrincipaleUniteLegale provided`);
      return 'Données non disponibles';
    }
    // FIXED: Better handling for invalid APE codes
    if (!code || code === '00.97' || code === 'Non disponible') {
      return 'Activité non renseignée';
    }
    return apeLabels[code] || `${code} - Activité non répertoriée`;
  }

  // Helper: Format date with validation - ADDED
  formatDate(dateString) {
    if (!dateString) {
      return null;
    }
    
    // Check for invalid/placeholder dates
    if (dateString === '1899-12-31' || dateString.startsWith('1899') || dateString.startsWith('1900')) {
      return null; // Don't show placeholder dates
    }
    
    try {
      const date = new Date(dateString);
      // Check if date is valid and reasonable (after 1950)
      if (isNaN(date.getTime()) || date.getFullYear() < 1950) {
        return null;
      }
      return dateString; // Return original format for now
    } catch (error) {
      console.log(`⚠️ Invalid date format: ${dateString}`);
      return null;
    }
  }

  // Helper: Get effectif label
  getEffectifLabel(code) {
    const effectifLabels = {
      'NN': 'Non renseigné',
      '00': '0 salarié',
      '01': '1 ou 2 salariés',
      '02': '3 à 5 salariés',
      '03': '6 à 9 salariés',
      '11': '10 à 19 salariés',
      '12': '20 à 49 salariés',
      '21': '50 à 99 salariés',
      '22': '100 à 199 salariés',
      '31': '200 à 249 salariés',
      '32': '250 à 499 salariés',
      '41': '500 à 999 salariés',
      '42': '1 000 à 1 999 salariés',
      '51': '2 000 à 4 999 salariés',
      '52': '5 000 à 9 999 salariés',
      '53': '10 000 salariés et plus'
    };
    return effectifLabels[code] || (code ? `Tranche ${code}` : 'Non renseigné');
  }

  // Mock data for development when INSEE credentials aren't configured
  getMockCompanyData(siren) {
    console.log(`🧪 MOCK: Getting mock data for SIREN ${siren}`);
    const mockCompanies = {
      '552032534': {
        siren: '552032534',
        siret: null,
        denomination: 'GOOGLE FRANCE',
        adresseSiege: null,
        codeAPE: '6201Z',
        libelleAPE: 'Programmation informatique',
        categorieJuridique: '5710',
        formeJuridique: 'SAS (Société par actions simplifiée)',
        dateCreation: '2004-11-15',
        dateCessation: null,
        active: true,
        effectif: '250 à 499 salariés',
        capitalSocial: 500000,
        siegeSocial: true,
        sigle: null,
        economiqueSolidaire: null,
        caractereEmployeur: 'O'
      },
      '123456789': {
        siren: '123456789',
        siret: null,
        denomination: 'EXEMPLE ENTREPRISE SAS',
        adresseSiege: null,
        codeAPE: '7022Z',
        libelleAPE: 'Conseil pour les affaires et autres conseils de gestion',
        categorieJuridique: '5710',
        formeJuridique: 'SAS (Société par actions simplifiée)',
        dateCreation: '2020-01-15',
        dateCessation: null,
        active: true,
        effectif: '10 à 19 salariés',
        capitalSocial: 100000,
        siegeSocial: true,
        sigle: 'EES',
        economiqueSolidaire: null,
        caractereEmployeur: 'O'
      }
    };

    const result = mockCompanies[siren] || {
      siren: siren,
      siret: null,
      denomination: `Entreprise Mock ${siren}`,
      adresseSiege: null,
      codeAPE: '6420Z',
      libelleAPE: 'Activités des sociétés holding',
      categorieJuridique: '5499',
      formeJuridique: 'SARL (Société à responsabilité limitée)',
      dateCreation: '2020-01-01',
      dateCessation: null,
      active: true,
      effectif: '3 à 5 salariés',
      capitalSocial: 10000,
      siegeSocial: true,
      sigle: null,
      economiqueSolidaire: null,
      caractereEmployeur: 'O'
    };
    
    console.log(`🧪 MOCK: Returning data for SIREN ${siren}:`, result);
    return result;
  }

  // Mock establishments for development
  getMockEstablishments(siren) {
    return [
      {
        siret: `${siren}00015`,
        nic: '00015',
        adresse: '8 Rue de Londres, 75009 PARIS 9',
        dateCreation: '2004-11-15',
        active: true,
        siegeSocial: true,
        effectif: '250 à 499 salariés'
      }
    ];
  }

  // Error handler
  handleError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error_description || error.response.data?.message || error.response.statusText;
      
      switch (status) {
        case 401:
          this.accessToken = null; // Reset token
          return new Error('Authentification INSEE échouée. Vérifiez vos identifiants.');
        case 403:
          return new Error('Accès refusé par l\'API INSEE.');
        case 404:
          return new Error('Entreprise non trouvée dans la base SIRENE.');
        case 400:
          return new Error(`Erreur de requête INSEE: ${message}`);
        case 429:
          return new Error('Limite de requêtes INSEE atteinte. Réessayez dans quelques instants.');
        case 500:
          return new Error('Erreur serveur INSEE. Réessayez plus tard.');
        default:
          return new Error(`Erreur INSEE: ${message}`);
      }
    }
    return new Error('Erreur de connexion à l\'API INSEE');
  }
}

module.exports = new INSEEAPIService();
