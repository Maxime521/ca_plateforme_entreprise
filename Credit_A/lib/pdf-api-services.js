// lib/pdf-api-service.js - FIXED AND SIMPLIFIED VERSION
import axios from 'axios';

class PDFAPIService {
  constructor() {
    this.inseeConsumerKey = process.env.INSEE_CONSUMER_KEY;
    this.inseeConsumerSecret = process.env.INSEE_CONSUMER_SECRET;
    this.inpiToken = process.env.INPI_API_TOKEN;
    this.bodaccBaseUrl = 'https://www.bodacc.fr/telechargements/COMMERCIALES/PDF';
  }

  // SIMPLIFIED: INSEE PDF URL generation
  async getINSEEPDFUrl(siren) {
    const hasCredentials = !!(this.inseeConsumerKey && this.inseeConsumerSecret);
    
    // Try to get a SIRET for this SIREN (simplified approach)
    const siret = `${siren}00001`; // Most common principal establishment
    const formattedSIRET = this.formatSIRETWithSpaces(siret);
    
    return {
      id: `insee_${siren}`,
      name: `INSEE_Avis_Situation_${siren}.pdf`,
      type: 'insee',
      url: `https://api-avis-situation-sirene.insee.fr/identification/pdf/${siret}`,
      siren: siren,
      siret: siret,
      formattedSIRET: formattedSIRET,
      description: 'Avis de situation INSEE',
      requiresAuth: true,
      available: hasCredentials,
      error: !hasCredentials ? 'INSEE credentials required in .env.local' : undefined,
      notes: hasCredentials ? 'Credentials found, but OAuth token needed' : 'Missing INSEE_CONSUMER_KEY/SECRET'
    };
  }

  // SIMPLIFIED: BODACC PDF URL (using export API instead of direct files)
  async getBODACCPDFUrl(siren) {
    try {
      // Use the export API instead of trying to guess file paths
      const exportUrl = `https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/exports/pdf?where=registre%20like%20%22${siren}%25%22&limit=20`;
      
      return {
        id: `bodacc_${siren}`,
        name: `BODACC_Export_${siren}.pdf`,
        type: 'bodacc',
        url: exportUrl,
        siren: siren,
        description: 'Export BODACC (toutes annonces)',
        requiresAuth: false,
        available: true,
        notes: 'Uses BODACC export API - should work without auth'
      };
    } catch (error) {
      return {
        id: `bodacc_${siren}`,
        name: `BODACC_${siren}.pdf`,
        type: 'bodacc',
        url: '',
        siren: siren,
        description: 'Export BODACC (indisponible)',
        requiresAuth: false,
        available: false,
        error: 'BODACC service unavailable',
        notes: error.message
      };
    }
  }

  // SIMPLIFIED: INPI URL
  async getINPIPDFUrl(siren) {
    const hasToken = !!this.inpiToken;
    const url = `https://data.inpi.fr/export/companies?format=pdf&ids=[%22${siren}%22]&est=all`;
    
    return {
      id: `inpi_${siren}`,
      name: `INPI_RNE_${siren}.pdf`,
      type: 'inpi',
      url: url,
      siren: siren,
      description: 'Extrait RNE INPI',
      requiresAuth: true,
      available: hasToken,
      error: !hasToken ? 'INPI token required - register at data.inpi.fr' : undefined,
      notes: hasToken ? 'Token found in env' : 'Missing INPI_API_TOKEN'
    };
  }

  // Helper: Format SIRET with spaces
  formatSIRETWithSpaces(siret) {
    const cleanSIRET = siret.replace(/\s/g, '');
    if (cleanSIRET.length !== 14) {
      // If not 14 digits, assume it's a SIREN and add common NIC
      const paddedSIRET = cleanSIRET.padEnd(14, '00001');
      return `${paddedSIRET.substring(0, 3)} ${paddedSIRET.substring(3, 6)} ${paddedSIRET.substring(6, 9)} ${paddedSIRET.substring(9, 14)}`;
    }
    return `${cleanSIRET.substring(0, 3)} ${cleanSIRET.substring(3, 6)} ${cleanSIRET.substring(6, 9)} ${cleanSIRET.substring(9, 14)}`;
  }

  // Get all PDFs for a SIREN
  async getAllPDFsForSiren(siren) {
    console.log(`🔍 Generating PDFs for SIREN: ${siren}`);
    console.log(`📋 Environment check:`);
    console.log(`   INSEE credentials: ${!!(this.inseeConsumerKey && this.inseeConsumerSecret)}`);
    console.log(`   INPI token: ${!!this.inpiToken}`);

    try {
      const results = await Promise.allSettled([
        this.getINSEEPDFUrl(siren),
        this.getINPIPDFUrl(siren),
        this.getBODACCPDFUrl(siren)
      ]);

      const pdfs = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      console.log(`✅ Generated ${pdfs.length} PDF options`);
      console.log(`   Available: ${pdfs.filter(p => p.available).length}`);
      console.log(`   Require setup: ${pdfs.filter(p => !p.available).length}`);
      
      return pdfs;
    } catch (error) {
      console.error('Error getting PDFs for SIREN:', error);
      throw error;
    }
  }

  // Test PDF availability with better error handling
  async testPDFAvailability(pdfInfo) {
    if (pdfInfo.available === false) {
      return {
        ...pdfInfo,
        size: 'Configuration required',
        httpStatus: null,
        tested: false
      };
    }

    try {
      console.log(`🧪 Testing ${pdfInfo.type} PDF availability...`);
      
      const headers = {};
      
      // Add auth headers based on service type
      if (pdfInfo.type === 'insee' && this.inseeConsumerKey) {
        // For INSEE, we'd need to get OAuth token first
        console.log('INSEE: Would need OAuth token (skipping actual test)');
        return {
          ...pdfInfo,
          size: 'OAuth token needed',
          httpStatus: 'auth_required',
          tested: false,
          testNote: 'Need to implement OAuth flow'
        };
      }
      
      if (pdfInfo.type === 'inpi' && this.inpiToken) {
        headers['Authorization'] = `Bearer ${this.inpiToken}`;
      }

      // For BODACC, test the export API
      if (pdfInfo.type === 'bodacc') {
        console.log('Testing BODACC export API...');
        const response = await axios.head(pdfInfo.url, {
          timeout: 10000,
          validateStatus: (status) => status < 500
        });
        
        return {
          ...pdfInfo,
          available: response.status < 400,
          size: response.headers['content-length'] ? 
            `${Math.round(response.headers['content-length'] / 1024)} KB` : 
            'Size unknown',
          httpStatus: response.status,
          tested: true
        };
      }

      // For other services, return configuration info
      return {
        ...pdfInfo,
        size: 'Ready for testing',
        httpStatus: 'config_ready',
        tested: false,
        testNote: 'Service configured but not tested'
      };

    } catch (error) {
      console.error(`Error testing ${pdfInfo.type}:`, error.message);
      
      let errorMessage = error.message;
      if (error.code === 'ENOTFOUND') {
        errorMessage = 'Service unavailable';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout - service slow';
      }

      return {
        ...pdfInfo,
        available: false,
        error: errorMessage,
        size: 'Test failed',
        httpStatus: error.response?.status,
        tested: true
      };
    }
  }
}

// Export as ES module for Next.js
export default new PDFAPIService();
