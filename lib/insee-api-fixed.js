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
      
      return this.accessToken;
    } catch (error) {
      throw new Error('Failed to authenticate with INSEE API');
    }
  }

  async searchCompanies(query) {
    try {
      const token = await this.getAccessToken();
      
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
      console.error('INSEE Search Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // FIXED: Better formatting to ensure SIREN is captured
  formatSearchResults(data) {
    if (!data.etablissements) return { results: [], total: 0 };

    const results = data.etablissements.map(etablissement => {
      const uniteLegale = etablissement.uniteLegale || {};
      
      // Extract SIREN from uniteLegale or fallback to siret
      let siren = uniteLegale.siren;
      if (!siren && etablissement.siret) {
        siren = etablissement.siret.substring(0, 9); // First 9 digits of SIRET
      }
      
      return {
        siren: siren,
        siret: etablissement.siret,
        denomination: uniteLegale.denominationUniteLegale || this.buildName(uniteLegale),
        adresseSiege: this.formatAddress(etablissement.adresseEtablissement),
        codeAPE: uniteLegale.activitePrincipaleUniteLegale,
        categorieJuridique: uniteLegale.categorieJuridiqueUniteLegale,
        formeJuridique: this.getFormeJuridique(uniteLegale.categorieJuridiqueUniteLegale),
        dateCreation: uniteLegale.dateCreationUniteLegale,
        active: etablissement.etatAdministratifEtablissement === 'A' && uniteLegale.etatAdministratifUniteLegale === 'A',
        effectif: uniteLegale.trancheEffectifsUniteLegale,
        siegeSocial: etablissement.etablissementSiege === true,
        libelleAPE: this.getAPELabel(uniteLegale.activitePrincipaleUniteLegale)
      };
    });

    return {
      results,
      total: data.header?.total || 0,
      page: data.header ? Math.floor(data.header.debut / data.header.nombre) : 0
    };
  }

  buildName(uniteLegale) {
    if (uniteLegale.denominationUniteLegale) {
      return uniteLegale.denominationUniteLegale;
    }
    
    const parts = [
      uniteLegale.prenom1UniteLegale,
      uniteLegale.nomUniteLegale
    ].filter(Boolean);
    
    return parts.join(' ') || 'Sans dénomination';
  }

  formatAddress(adresse) {
    if (!adresse) return '';

    const parts = [
      adresse.numeroVoieEtablissement,
      adresse.typeVoieEtablissement,
      adresse.libelleVoieEtablissement,
      adresse.codePostalEtablissement,
      adresse.libelleCommuneEtablissement
    ].filter(Boolean);

    return parts.join(' ').trim();
  }

  getFormeJuridique(code) {
    const formes = {
      '5710': 'SAS',
      '5499': 'SARL', 
      '5308': 'EURL',
      '5202': 'SA',
      '5599': 'SA (forme particulière)',
      '1000': 'Entrepreneur individuel'
    };
    return formes[code] || `Forme ${code}`;
  }

  getAPELabel(code) {
    const apeLabels = {
      '64.20Z': 'Activités des sociétés holding',
      '4711D': 'Supermarchés',
      '6201Z': 'Programmation informatique'
    };
    return apeLabels[code] || `Activité ${code}`;
  }

  async getCompanyBySiren(siren) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.apiBaseUrl}/siren/${siren}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const uniteLegale = response.data.uniteLegale;
      return {
        siren: uniteLegale.siren,
        denomination: uniteLegale.denominationUniteLegale || this.buildName(uniteLegale),
        dateCreation: uniteLegale.dateCreationUniteLegale,
        active: uniteLegale.etatAdministratifUniteLegale === 'A',
        formeJuridique: this.getFormeJuridique(uniteLegale.categorieJuridiqueUniteLegale),
        codeAPE: uniteLegale.activitePrincipaleUniteLegale
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response?.status === 401) {
      this.accessToken = null;
      return new Error('Authentification INSEE échouée');
    }
    return new Error(`Erreur INSEE: ${error.response?.data?.message || error.message}`);
  }
}

module.exports = new INSEEAPIService();
