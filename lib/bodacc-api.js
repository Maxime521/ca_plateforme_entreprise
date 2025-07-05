// lib/bodacc-api.js - Improved version with better error handling
const axios = require('axios');

class BODACCAPIService {
  constructor() {
    this.apiBaseUrl = 'https://bodacc-datadila.opendatasoft.com/api/v2';
  }

  // Search BODACC announcements by SIREN
  async getAnnouncementsBySiren(siren) {
    try {
      // Use the correct field name: 'registre' contains SIREN
      const response = await axios.get(`${this.apiBaseUrl}/catalog/datasets/annonces-commerciales/records`, {
        params: {
          where: `registre like "${siren}%"`,
          limit: 20,
          order_by: 'dateparution desc',
          timezone: 'Europe/Paris'
        },
        timeout: 5000, // Reduced timeout
        headers: {
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });

      return this.formatAnnouncements(response.data);
    } catch (error) {
      console.error('BODACC API Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Search by company name with better error handling
  async searchByName(name) {
    try {
      console.log(`📰 BODACC: Searching for "${name}"`);
      
      // Use the correct field name: 'commercant' contains company name
      const response = await axios.get(`${this.apiBaseUrl}/catalog/datasets/annonces-commerciales/records`, {
        params: {
          where: `commercant like "%${name}%"`,
          limit: 20,
          order_by: 'dateparution desc',
          timezone: 'Europe/Paris'
        },
        timeout: 5000, // 5 second timeout
        headers: {
          'User-Agent': 'DataCorp-Platform/1.0',
          'Accept': 'application/json'
        }
      });

      console.log(`📰 BODACC: Response received, ${response.data.total_count || 0} total records`);
      return this.formatAnnouncements(response.data);
    } catch (error) {
      console.error('BODACC Search Error:', error.code || error.message);
      
      // More specific error handling
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('BODACC API non accessible - problème de réseau');
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('BODACC API timeout - service lent');
      } else {
        throw this.handleError(error);
      }
    }
  }

  // Test BODACC connectivity with a simple query
  async testConnectivity() {
    try {
      console.log('🧪 Testing BODACC connectivity...');
      
      const response = await axios.get(`${this.apiBaseUrl}/catalog/datasets/annonces-commerciales/records`, {
        params: {
          limit: 1,
          timezone: 'Europe/Paris'
        },
        timeout: 3000,
        headers: {
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });

      console.log(`✅ BODACC connectivity OK - ${response.data.total_count || 0} records available`);
      return true;
    } catch (error) {
      console.error(`❌ BODACC connectivity failed: ${error.message}`);
      return false;
    }
  }

  // Search by city (for testing)
  async searchByCity(city) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/catalog/datasets/annonces-commerciales/records`, {
        params: {
          where: `ville like "%${city}%"`,
          limit: 20,
          order_by: 'dateparution desc',
          timezone: 'Europe/Paris'
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });

      return this.formatAnnouncements(response.data);
    } catch (error) {
      console.error('BODACC City Search Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Get a simple sample to test connectivity
  async getSample() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/catalog/datasets/annonces-commerciales/records`, {
        params: {
          limit: 5,
          timezone: 'Europe/Paris'
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });

      return this.formatAnnouncements(response.data);
    } catch (error) {
      console.error('BODACC Sample Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Get announcements by type
  async getAnnouncementsByType(siren, type) {
    try {
      const typeMap = {
        'creation': 'creation',
        'modification': 'modification',
        'radiation': 'radiation',
        'procol': 'procol',
        'depot': 'depot'
      };

      const targetType = typeMap[type] || type;

      const response = await axios.get(`${this.apiBaseUrl}/catalog/datasets/annonces-commerciales/records`, {
        params: {
          where: `registre like "${siren}%" AND familleavis="${targetType}"`,
          limit: 20,
          order_by: 'dateparution desc',
          timezone: 'Europe/Paris'
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });

      return this.formatAnnouncements(response.data);
    } catch (error) {
      console.error('BODACC Type Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Get recent announcements (last 7 days)
  async getRecentAnnouncements(days = 7) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      const dateFromStr = dateFrom.toISOString().split('T')[0];

      const response = await axios.get(`${this.apiBaseUrl}/catalog/datasets/annonces-commerciales/records`, {
        params: {
          where: `dateparution >= date'${dateFromStr}'`,
          limit: 100,
          order_by: 'dateparution desc',
          timezone: 'Europe/Paris'
        },
        timeout: 8000, // Longer timeout for larger queries
        headers: {
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });

      return this.formatAnnouncements(response.data);
    } catch (error) {
      console.error('BODACC Recent Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Format announcements with correct field mapping
  formatAnnouncements(data) {
    if (!data || !data.records) return { results: [], total: 0 };

    const results = data.records.map(record => {
      const fields = record.record?.fields || record.fields || {};
      
      // Extract SIREN from registre field
      let siren = '';
      if (fields.registre && typeof fields.registre === 'string') {
        // registre format: "820 026 490,820026490" -> extract "820026490"
        const parts = fields.registre.split(',');
        if (parts.length > 1) {
          siren = parts[1].trim(); // Take the second part (without spaces)
        } else {
          // If no comma, try to extract digits
          const match = fields.registre.match(/(\d{9})/);
          siren = match ? match[1] : '';
        }
      } else if (fields.registre) {
        // If registre is not a string, try to extract SIREN digits from it
        const registreStr = String(fields.registre);
        const match = registreStr.match(/(\d{9})/);
        siren = match ? match[1] : '';
      }

      // Parse complex JSON fields safely
      let personneInfo = {};
      let etablissementInfo = {};
      
      try {
        if (fields.listepersonnes && typeof fields.listepersonnes === 'object') {
          personneInfo = fields.listepersonnes.personne || {};
        }
        if (fields.listeetablissements && typeof fields.listeetablissements === 'object') {
          etablissementInfo = fields.listeetablissements.etablissement || {};
        }
      } catch (e) {
        // JSON parsing failed, use empty objects
      }

      return {
        id: fields.id || `bodacc-${siren}-${Date.now()}`,
        siren: siren,
        siret: siren ? `${siren}00001` : null, // FIXED: Generate SIRET for headquarters (SIREN + 00001)
        registre: fields.registre,
        denomination: fields.commercant || fields.denomination,
        formeJuridique: personneInfo.formeJuridique || null,
        capital: personneInfo.capital?.montantCapital || null,
        adresse: this.formatBodaccAddress(fields),
        dateParution: fields.dateparution,
        typeAnnonce: fields.familleavis_lib || fields.familleavis,
        numeroAnnonce: fields.numeroannonce,
        tribunal: fields.tribunal,
        ville: fields.ville,
        codePostal: fields.cp,
        departement: fields.departement_nom_officiel,
        region: fields.region_nom_officiel,
        details: fields.publicationavis,
        urlComplete: fields.url_complete,
        // Additional structured data
        acte: fields.acte,
        depot: fields.depot,
        jugement: fields.jugement,
        personnes: personneInfo,
        etablissements: etablissementInfo
      };
    });

    return {
      results: results.filter(r => r.siren), // Only return results with valid SIREN
      total: data.total_count || results.length,
      facets: data.facets
    };
  }

  // Format BODACC address
  formatBodaccAddress(fields) {
    const parts = [
      fields.ville,
      fields.cp,
      fields.departement_nom_officiel
    ].filter(Boolean);

    return parts.join(', ');
  }

  // Get statistics for a company
  async getCompanyStatistics(siren) {
    try {
      const announcements = await this.getAnnouncementsBySiren(siren);
      
      // Count by type
      const typeCount = {};
      announcements.results.forEach(announcement => {
        const type = announcement.typeAnnonce || 'Unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      return Object.entries(typeCount).map(([type, count]) => ({
        type,
        count
      }));
    } catch (error) {
      console.error('BODACC Statistics Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Improved error handler
  handleError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      
      switch (status) {
        case 400:
          return new Error('Requête BODACC invalide. Vérifiez les paramètres.');
        case 404:
          return new Error('Aucune annonce BODACC trouvée.');
        case 429:
          return new Error('Limite de requêtes BODACC atteinte. Réessayez dans quelques instants.');
        case 500:
          return new Error('Erreur serveur BODACC. Réessayez plus tard.');
        case 502:
        case 503:
          return new Error('Service BODACC temporairement indisponible.');
        default:
          return new Error(`Erreur BODACC: ${message}`);
      }
    } else if (error.code) {
      // Network errors
      switch (error.code) {
        case 'ENOTFOUND':
          return new Error('Impossible de joindre le serveur BODACC');
        case 'ECONNREFUSED':
          return new Error('Connexion refusée par le serveur BODACC');
        case 'ECONNABORTED':
        case 'ETIMEDOUT':
          return new Error('Timeout BODACC - service lent');
        default:
          return new Error(`Erreur réseau BODACC: ${error.code}`);
      }
    }
    return new Error('Erreur de connexion à l\'API BODACC');
  }
}

module.exports = new BODACCAPIService();
