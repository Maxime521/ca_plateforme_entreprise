// lib/api-services.js
import axios from 'axios';

const INSEE_API_BASE = 'https://api.insee.fr/entreprises/sirene/V3.11';
const RNE_API_BASE = 'https://data.inpi.fr/entreprises';
const BODACC_API_BASE = 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales';

class APIService {
  constructor() {
    // These will come from environment variables
    this.inseeToken = process.env.INSEE_API_TOKEN;
    this.inpiToken = process.env.INPI_API_TOKEN;
  }

  // SIRENE API Methods
  async searchSIRENE(query) {
    try {
      const response = await axios.get(`${INSEE_API_BASE}/siret`, {
        params: {
          q: query,
          nombre: 20,
          debut: 0,
          champs: 'siren,nic,siret,dateCreationEtablissement,denominationUniteLegale,activitePrincipaleUniteLegale,nomenclatureActivitePrincipaleUniteLegale,caractereEmployeurUniteLegale,trancheEffectifsUniteLegale,categorieJuridiqueUniteLegale,etatAdministratifUniteLegale,adresseEtablissement'
        },
        headers: {
          'Authorization': `Bearer ${this.inseeToken}`,
          'Accept': 'application/json'
        }
      });
      
      return this.formatSIRENEResponse(response.data);
    } catch (error) {
      console.error('SIRENE API Error:', error.response?.data || error.message);
      throw this.handleAPIError(error, 'SIRENE');
    }
  }

  async getCompanyByIdSIREN(siren) {
    try {
      const response = await axios.get(`${INSEE_API_BASE}/siren/${siren}`, {
        headers: {
          'Authorization': `Bearer ${this.inseeToken}`,
          'Accept': 'application/json'
        }
      });
      
      return this.formatSIRENECompany(response.data);
    } catch (error) {
      console.error('SIRENE API Error:', error.response?.data || error.message);
      throw this.handleAPIError(error, 'SIRENE');
    }
  }

  // RNE API Methods
  async getRNEData(siren) {
    try {
      const response = await axios.get(`${RNE_API_BASE}/${siren}`, {
        headers: {
          'Authorization': `Bearer ${this.inpiToken}`,
          'Accept': 'application/json'
        }
      });
      
      return this.formatRNEResponse(response.data);
    } catch (error) {
      console.error('RNE API Error:', error.response?.data || error.message);
      throw this.handleAPIError(error, 'RNE');
    }
  }

  // BODACC API Methods (Public API - No auth needed)
  async getBODACCPublications(siren) {
    try {
      const response = await axios.get(`${BODACC_API_BASE}/records`, {
        params: {
          where: `registre_numero_siren="${siren}"`,
          limit: 50,
          order_by: 'date_parution desc',
          select: 'registre_numero_siren,date_parution,type_annonce,registre_denomination,registre_siege,registre_statut,annonce_texte,depot_date,acte_date,publicite_ligne'
        }
      });
      
      return this.formatBODACCResponse(response.data);
    } catch (error) {
      console.error('BODACC API Error:', error.response?.data || error.message);
      throw this.handleAPIError(error, 'BODACC');
    }
  }

  // Financial Ratios API (Public)
  async getFinancialRatios(siren) {
    try {
      const response = await axios.get('https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/ratios_inpi_bce/records', {
        params: {
          where: `siren="${siren}"`,
          limit: 100,
          order_by: 'annee desc'
        }
      });
      
      return this.formatFinancialRatiosResponse(response.data);
    } catch (error) {
      console.error('Financial Ratios API Error:', error.response?.data || error.message);
      throw this.handleAPIError(error, 'Financial Ratios');
    }
  }

  // Response Formatters
  formatSIRENEResponse(data) {
    if (!data.etablissements) return { results: [] };
    
    return {
      results: data.etablissements.map(etablissement => ({
        siren: etablissement.uniteLegale.siren,
        siret: etablissement.siret,
        denomination: etablissement.uniteLegale.denominationUniteLegale || 
                     `${etablissement.uniteLegale.prenom1UniteLegale || ''} ${etablissement.uniteLegale.nomUniteLegale || ''}`.trim(),
        dateCreation: etablissement.dateCreationEtablissement,
        active: etablissement.uniteLegale.etatAdministratifUniteLegale === 'A',
        categorieJuridique: etablissement.uniteLegale.categorieJuridiqueUniteLegale,
        formeJuridique: etablissement.uniteLegale.categorieJuridiqueUniteLegale, // Will be mapped by standardizer
        codeAPE: etablissement.uniteLegale.activitePrincipaleUniteLegale,
        libelleAPE: etablissement.uniteLegale.activitePrincipaleUniteLegale,
        adresse: this.formatAddress(etablissement.adresseEtablissement),
        adresseSiege: this.formatAddress(etablissement.adresseEtablissement),
        effectif: etablissement.uniteLegale.trancheEffectifsUniteLegale,
        trancheEffectifsUniteLegale: etablissement.uniteLegale.trancheEffectifsUniteLegale
      })),
      total: data.header.total,
      page: data.header.debut / data.header.nombre
    };
  }

  formatSIRENECompany(data) {
    if (!data.uniteLegale) return null;
    
    const uniteLegale = data.uniteLegale;
    return {
      siren: uniteLegale.siren,
      denomination: uniteLegale.denominationUniteLegale || 
                   `${uniteLegale.prenom1UniteLegale || ''} ${uniteLegale.nomUniteLegale || ''}`.trim(),
      dateCreation: uniteLegale.dateCreationUniteLegale,
      active: uniteLegale.etatAdministratifUniteLegale === 'A',
      formeJuridique: uniteLegale.categorieJuridiqueUniteLegale,
      codeAPE: uniteLegale.activitePrincipaleUniteLegale,
      effectif: uniteLegale.trancheEffectifsUniteLegale,
      capitalSocial: uniteLegale.capitalSocialUniteLegale
    };
  }

  formatRNEResponse(data) {
    // Format based on actual RNE API response structure
    return {
      immatriculation: data.immatriculation,
      formeJuridique: data.forme_juridique,
      capital: data.capital_social,
      adresseSiege: data.adresse_siege,
      dateImmatriculation: data.date_immatriculation,
      activites: data.activites || []
    };
  }

  formatBODACCResponse(data) {
    if (!data.results) return { results: [] };
    
    return {
      results: data.results.map(record => ({
        siren: record.registre_numero_siren,
        denomination: record.registre_denomination,
        datePublication: record.date_parution,
        typeAnnonce: record.type_annonce,
        texteAnnonce: record.annonce_texte,
        dateDepot: record.depot_date,
        dateActe: record.acte_date,
        publicite: record.publicite_ligne
      })),
      total: data.total_count
    };
  }

  formatFinancialRatiosResponse(data) {
    if (!data.results) return { results: [] };
    
    return {
      results: data.results.map(record => ({
        siren: record.siren,
        annee: record.annee,
        ca: record.ca,
        resultat: record.resultat,
        effectif: record.effectif,
        ratios: {
          marge_brute: record.marge_brute,
          taux_marge: record.taux_marge,
          rentabilite: record.rentabilite
        }
      }))
    };
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
    
    return parts.join(' ');
  }

  // Error Handler
  handleAPIError(error, apiName) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      
      switch (status) {
        case 401:
          return new Error(`${apiName}: Authentification échouée. Vérifiez votre clé API.`);
        case 403:
          return new Error(`${apiName}: Accès refusé. Permissions insuffisantes.`);
        case 404:
          return new Error(`${apiName}: Ressource non trouvée.`);
        case 429:
          return new Error(`${apiName}: Limite de requêtes atteinte. Réessayez plus tard.`);
        default:
          return new Error(`${apiName}: ${message}`);
      }
    } else if (error.request) {
      return new Error(`${apiName}: Pas de réponse du serveur. Vérifiez votre connexion.`);
    } else {
      return new Error(`${apiName}: ${error.message}`);
    }
  }
}

export default new APIService();
