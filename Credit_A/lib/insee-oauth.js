// lib/insee-oauth.js - INSEE OAuth Token Management
class INSEEOAuthService {
  constructor() {
    this.consumerKey = process.env.INSEE_CONSUMER_KEY;
    this.consumerSecret = process.env.INSEE_CONSUMER_SECRET;
    this.tokenUrl = 'https://api.insee.fr/token';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get or refresh access token
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      console.log('🔄 Using cached INSEE token');
      return this.accessToken;
    }

    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error('INSEE credentials not configured. Add INSEE_CONSUMER_KEY and INSEE_CONSUMER_SECRET to .env.local');
    }

    try {
      console.log('🔑 Requesting new INSEE access token...');
      
      // Create Basic Auth header
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'DataCorp-Platform/1.0'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`INSEE OAuth failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Store token with expiry buffer (subtract 60 seconds for safety)
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + ((data.expires_in - 60) * 1000));
      
      console.log(`✅ INSEE token obtained, expires at: ${this.tokenExpiry.toISOString()}`);
      
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ INSEE OAuth error:', error);
      throw new Error(`Failed to get INSEE access token: ${error.message}`);
    }
  }

  // Test token validity
  async testToken() {
    try {
      const token = await this.getAccessToken();
      
      // Test with a simple API call
      const testResponse = await fetch('https://api.insee.fr/entreprises/sirene/V3.11/siren/552032534', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      return {
        valid: testResponse.ok,
        status: testResponse.status,
        message: testResponse.ok ? 'Token working' : `API test failed: ${testResponse.status}`
      };
      
    } catch (error) {
      return {
        valid: false,
        message: error.message
      };
    }
  }

  // Download INSEE PDF
  async downloadINSEEPDF(siren, siret = null) {
    try {
      const token = await this.getAccessToken();
      
      // If no SIRET provided, construct default principal establishment
      if (!siret) {
        siret = `${siren}00001`;
      }
      
      // INSEE API expects clean SIRET without spaces
      const formattedSIRET = this.formatSIRETWithSpaces(siret); // For display only
      const pdfUrl = `https://api-avis-situation-sirene.insee.fr/identification/pdf/${siret}`;
      
      console.log(`📄 Downloading INSEE PDF for SIRET: ${formattedSIRET}`);
      
      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        throw new Error(`INSEE PDF download failed: ${response.status} - ${response.statusText}`);
      }

      const pdfBuffer = await response.arrayBuffer();
      
      return {
        success: true,
        data: Buffer.from(pdfBuffer),
        filename: `INSEE_Avis_Situation_${siren}.pdf`,
        size: pdfBuffer.byteLength,
        contentType: 'application/pdf'
      };
      
    } catch (error) {
      console.error('❌ INSEE PDF download error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper: Format SIRET with spaces (XXX XXX XXX XXXXX)
  formatSIRETWithSpaces(siret) {
    const cleanSIRET = siret.replace(/\s/g, '');
    if (cleanSIRET.length !== 14) {
      throw new Error(`Invalid SIRET length: ${cleanSIRET.length}, expected 14 digits`);
    }
    return `${cleanSIRET.substring(0, 3)} ${cleanSIRET.substring(3, 6)} ${cleanSIRET.substring(6, 9)} ${cleanSIRET.substring(9, 14)}`;
  }

  // Clear cached token (for testing)
  clearToken() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }
}

// Export singleton instance
export default new INSEEOAuthService();
