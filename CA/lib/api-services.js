import axios from 'axios';

const INSEE_API_BASE = 'https://api.insee.fr/entreprises/sirene/V3.11';
const RNE_API_BASE = 'https://data.inpi.fr/entreprises';
const BODACC_API_BASE = 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales';

class APIService {
  constructor() {
    this.inseeToken = process.env.INSEE_API_TOKEN;
    this.inpiToken = process.env.INPI_API_TOKEN;
  }

  async searchSIRENE(query) {
    try {
      const response = await axios.get(`${INSEE_API_BASE}/siret`, {
        params: {
          q: query,
          nombre: 20
        },
        headers: {
          'Authorization': `Bearer ${this.inseeToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('SIRENE API Error:', error);
      throw error;
    }
  }

  async getCompanyByIdSIREN(siren) {
    try {
      const response = await axios.get(`${INSEE_API_BASE}/siren/${siren}`, {
        headers: {
          'Authorization': `Bearer ${this.inseeToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('SIRENE API Error:', error);
      throw error;
    }
  }

  async getRNEData(siren) {
    try {
      const response = await axios.get(`${RNE_API_BASE}/${siren}`, {
        headers: {
          'Authorization': `Bearer ${this.inpiToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('RNE API Error:', error);
      throw error;
    }
  }

  async getBODACCPublications(siren) {
    try {
      const response = await axios.get(`${BODACC_API_BASE}/records`, {
        params: {
          where: `siren="${siren}"`,
          limit: 50,
          order_by: 'dateparution desc'
        }
      });
      return response.data;
    } catch (error) {
      console.error('BODACC API Error:', error);
      throw error;
    }
  }

  async getFinancialRatios(siren) {
    try {
      const response = await axios.get('https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/ratios_inpi_bce/records', {
        params: {
          where: `siren="${siren}"`,
          limit: 100
        }
      });
      return response.data;
    } catch (error) {
      console.error('Financial Ratios API Error:', error);
      throw error;
    }
  }
}

export default new APIService();
