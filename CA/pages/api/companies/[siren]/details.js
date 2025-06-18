// pages/api/companies/[siren]/details.js
import { prisma } from '../../../../lib/prisma';
import INSEEAPIService from '../../../../lib/insee-api';
import BODACCAPIService from '../../../../lib/bodacc-api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren } = req.query;
  
  if (!siren || !/^\d{9}$/.test(siren)) {
    return res.status(400).json({ message: 'Invalid SIREN format' });
  }

  try {
    const result = {
      company: null,
      establishments: [],
      announcements: [],
      statistics: [],
      errors: []
    };

    // 1. Get company from INSEE
    try {
      const companyData = await INSEEAPIService.getCompanyBySiren(siren);
      if (companyData) {
        result.company = companyData;
        
        // Save/update in database
        await saveCompanyToDatabase(companyData);
      }
    } catch (error) {
      result.errors.push({ source: 'insee', message: error.message });
      
      // Try to get from local database if INSEE fails
      const localCompany = await prisma.company.findUnique({
        where: { siren }
      });
      if (localCompany) {
        result.company = localCompany;
      }
    }

    // 2. Get establishments from INSEE
    try {
      const establishments = await INSEEAPIService.getEstablishments(siren);
      result.establishments = establishments.slice(0, 10); // Limit to 10
    } catch (error) {
      result.errors.push({ source: 'insee-establishments', message: error.message });
    }

    // 3. Get BODACC announcements
    try {
      const announcements = await BODACCAPIService.getAnnouncementsBySiren(siren);
      result.announcements = announcements.results.slice(0, 10); // Limit to 10
    } catch (error) {
      result.errors.push({ source: 'bodacc', message: error.message });
    }

    // 4. Get BODACC statistics
    try {
      const statistics = await BODACCAPIService.getCompanyStatistics(siren);
      result.statistics = statistics;
    } catch (error) {
      result.errors.push({ source: 'bodacc-stats', message: error.message });
    }

    // Check if we found any data
    if (!result.company && result.errors.length > 0) {
      return res.status(404).json({ 
        message: 'Company not found',
        errors: result.errors 
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Company details error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching company details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function saveCompanyToDatabase(companyData) {
  try {
    await prisma.company.upsert({
      where: { siren: companyData.siren },
      update: {
        denomination: companyData.denomination,
        active: companyData.active,
        formeJuridique: companyData.formeJuridique,
        codeAPE: companyData.codeAPE,
        dateCreation: companyData.dateCreation ? new Date(companyData.dateCreation) : null,
        capitalSocial: companyData.capitalSocial,
        updatedAt: new Date()
      },
      create: {
        siren: companyData.siren,
        denomination: companyData.denomination,
        active: companyData.active,
        formeJuridique: companyData.formeJuridique,
        codeAPE: companyData.codeAPE,
        dateCreation: companyData.dateCreation ? new Date(companyData.dateCreation) : null,
        capitalSocial: companyData.capitalSocial
      }
    });
  } catch (error) {
    console.error('Database save error:', error);
  }
}
