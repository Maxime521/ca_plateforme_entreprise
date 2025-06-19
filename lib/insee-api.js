// lib/insee-api.js - Fixed company name issue
const axios = require('axios');

class INSEEAPIService {
  constructor() {
    this.consumerKey = process.env.INSEE_CONSUMER_KEY;
    this.consumerSecret = process.env.INSEE_CONSUMER_SECRET;
    this.tokenUrl = 'https://api.insee.fr/token';
    this.apiBaseUrl = 'https://api.insee.fr/entreprises/sirene/V3.11';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get or refresh access token
  async getAccessToken() {
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

  // Get company by SIREN (this works according to diagnostic)
  async getCompanyBySiren(siren) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.apiBaseUrl}/siren/${siren}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      return this.formatCompanyData(response.data);
    } catch (error) {
      console.error('INSEE Get Company Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Get establishments for a SIREN
  async getEstablishments(siren) {
    try {
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
        dateCreation: uniteLegale.dateCreationUniteLegale,
        active: etablissement.etatAdministratifEtablissement === 'A' && uniteLegale.etatAdministratifUniteLegale === 'A',
        effectif: uniteLegale.trancheEffectifsUniteLegale,
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
    
    return {
      siren: uniteLegale.siren,
      siret: null, // Direct SIREN lookup doesn't include SIRET
      denomination: denomination,
      adresseSiege: 'Adresse du siège social', // Placeholder since direct SIREN doesn't include address
      codeAPE: uniteLegale.activitePrincipaleUniteLegale,
      categorieJuridique: uniteLegale.categorieJuridiqueUniteLegale,
      formeJuridique: this.getFormeJuridique(uniteLegale.categorieJuridiqueUniteLegale),
      dateCreation: uniteLegale.dateCreationUniteLegale,
      active: uniteLegale.etatAdministratifUniteLegale === 'A',
      effectif: uniteLegale.trancheEffectifsUniteLegale,
      siegeSocial: true, // Assume true for company-level data
      libelleAPE: this.getAPELabel(uniteLegale.activitePrincipaleUniteLegale),
      sigle: uniteLegale.sigleUniteLegale,
      dateCessation: uniteLegale.dateCessationUniteLegale,
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
      dateCreation: etablissement.dateCreationEtablissement,
      active: etablissement.etatAdministratifEtablissement === 'A',
      siegeSocial: etablissement.etablissementSiege,
      effectif: etablissement.trancheEffectifsEtablissement
    }));
  }

  // Helper: Get company name - IMPROVED
  getDenomination(uniteLegale) {
    // First priority: denominationUniteLegale
    if (uniteLegale.denominationUniteLegale && uniteLegale.denominationUniteLegale.trim()) {
      return uniteLegale.denominationUniteLegale.trim();
    }
    
    // Second priority: sigleUniteLegale
    if (uniteLegale.sigleUniteLegale && uniteLegale.sigleUniteLegale.trim()) {
      return uniteLegale.sigleUniteLegale.trim();
    }
    
    // Third priority: denomination usuelle
    if (uniteLegale.denominationUsuelle1UniteLegale && uniteLegale.denominationUsuelle1UniteLegale.trim()) {
      return uniteLegale.denominationUsuelle1UniteLegale.trim();
    }
    
    // Fourth priority: for individual entrepreneurs, build name from parts
    const nameParts = [
      uniteLegale.prenom1UniteLegale,
      uniteLegale.prenom2UniteLegale,
      uniteLegale.prenom3UniteLegale,
      uniteLegale.nomUniteLegale,
      uniteLegale.nomUsageUniteLegale
    ].filter(Boolean).map(part => part.trim());
    
    if (nameParts.length > 0) {
      return nameParts.join(' ');
    }
    
    // Last resort: use SIREN
    return `Entreprise ${uniteLegale.siren}`;
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
      '5710': 'SAS',
      '5499': 'SARL',
      '5308': 'EURL',
      '5202': 'SA',
      '1000': 'Entrepreneur individuel',
      '5720': 'SASU',
      '5485': 'SCOP',
      '9220': 'Association'
    };
    return formes[code] || `Forme ${code}`;
  }

  // Helper: Get APE label
  getAPELabel(code) {
    const apeLabels = {
      '4711D': 'Supermarchés',
      '1051C': 'Fabrication de fromage',
      '6201Z': 'Programmation informatique',
      '7022Z': 'Conseil pour les affaires et autres conseils de gestion'
    };
    return apeLabels[code] || `Activité ${code}`;
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
