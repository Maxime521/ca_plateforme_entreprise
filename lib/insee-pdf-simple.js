// lib/insee-pdf-simple.js - Simple INSEE PDF download without OAuth
import { promises as fs } from 'fs';
import path from 'path';

class INSEEPDFSimple {
  
  // Format SIRET with spaces as INSEE expects
  formatSIRETWithSpaces(siret) {
    if (!siret || siret.length !== 14) {
      throw new Error('SIRET must be exactly 14 digits');
    }
    
    // Remove any existing spaces and format as: XXX XXX XXX XXXXX
    const cleanSiret = siret.replace(/\s/g, '');
    return `${cleanSiret.substring(0, 3)} ${cleanSiret.substring(3, 6)} ${cleanSiret.substring(6, 9)} ${cleanSiret.substring(9, 14)}`;
  }

  // Generate default SIRET from SIREN if not provided
  generateDefaultSIRET(siren) {
    if (!siren || siren.length !== 9) {
      throw new Error('SIREN must be exactly 9 digits');
    }
    return `${siren}00001`; // Principal establishment
  }

  // Download INSEE PDF directly (no authentication required)
  async downloadINSEEPDF(siren, siret = null) {
    try {
      // Use provided SIRET or generate default
      const targetSIRET = siret || this.generateDefaultSIRET(siren);
      
      // Format SIRET for INSEE API
      const formattedSIRET = this.formatSIRETWithSpaces(targetSIRET);
      const pdfUrl = `https://api-avis-situation-sirene.insee.fr/identification/pdf/${formattedSIRET}`;
      
      console.log(`📄 Downloading INSEE PDF for SIRET: ${formattedSIRET}`);
      console.log(`🔗 URL: ${pdfUrl}`);
      
      const response = await fetch(pdfUrl, {
        headers: {
          'Accept': 'application/pdf',
          'User-Agent': 'DataCorp-Platform/1.0 (Enterprise Data Platform)'
        }
      });

      if (!response.ok) {
        throw new Error(`INSEE PDF download failed: ${response.status} - ${response.statusText}`);
      }

      const pdfBuffer = await response.arrayBuffer();
      const fileName = `INSEE_Avis_Situation_${siren}_${targetSIRET}.pdf`;
      
      // Save to uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, Buffer.from(pdfBuffer));
      
      console.log(`✅ INSEE PDF saved: ${filePath}`);
      
      return {
        success: true,
        data: Buffer.from(pdfBuffer),
        fileName: fileName,
        filePath: filePath,
        url: `/uploads/${fileName}`,
        size: pdfBuffer.byteLength,
        contentType: 'application/pdf',
        method: 'direct_no_auth',
        siren: siren,
        siret: targetSIRET,
        formattedSIRET: formattedSIRET,
        downloadedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ INSEE PDF download error:', error);
      return {
        success: false,
        error: error.message,
        method: 'direct_no_auth'
      };
    }
  }
}

export default new INSEEPDFSimple();