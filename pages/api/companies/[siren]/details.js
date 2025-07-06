import { createAdminClient } from '../../../../lib/supabase';
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

    // 1. Get company from INSEE - Always try INSEE first for fresh data
    try {
      console.log(`📋 Attempting to get fresh company data from INSEE for SIREN: ${siren}`);
      const companyData = await INSEEAPIService.getCompanyBySiren(siren);
      if (companyData) {
        console.log(`📋 Fresh company data received from INSEE:`, {
          denomination: companyData.denomination,
          formeJuridique: companyData.formeJuridique,
          codeAPE: companyData.codeAPE,
          libelleAPE: companyData.libelleAPE,
          capitalSocial: companyData.capitalSocial
        });
        result.company = companyData;
        
        // Save fresh INSEE data to database
        await saveCompanyToDatabase(companyData);
      } else {
        console.log(`📋 No company data returned from INSEE for SIREN: ${siren}`);
        throw new Error('No data returned from INSEE API');
      }
    } catch (error) {
      console.log(`📋 INSEE API failed for SIREN ${siren}:`, error.message);
      result.errors.push({ source: 'insee', message: error.message });
      
      // Fall back to database only if INSEE completely fails
      console.log(`📋 INSEE API failed, checking database for SIREN: ${siren}`);
      const supabase = createAdminClient();
      const { data: localCompany, error: localError } = await supabase
        .from('companies')
        .select('*')
        .eq('siren', siren)
        .single();
      
      if (localCompany && !localError) {
        console.log(`📋 Using database fallback data for SIREN: ${siren}`);
        result.company = localCompany;
      } else {
        console.log(`📋 No database record found for SIREN: ${siren}`);
        result.company = null;
      }
    }

    // 2. Get establishments from INSEE
    try {
      const establishments = await INSEEAPIService.getEstablishments(siren);
      result.establishments = establishments.slice(0, 10); // Limit to 10
      
      // Add SIRET and additional data from main establishment (siège social) to company data
      if (result.company && establishments && establishments.length > 0) {
        const mainEstablishment = establishments.find(est => est.siegeSocial);
        const fallbackEstablishment = establishments[0];
        
        if (mainEstablishment && mainEstablishment.siret) {
          result.company.siret = mainEstablishment.siret;
          result.company.siretSource = 'siege_social';
          result.company.siretLabel = 'Siège social';
          // Add address from main establishment
          if (mainEstablishment.adresse) {
            result.company.adresseSiege = mainEstablishment.adresse;
          }
        } else if (fallbackEstablishment && fallbackEstablishment.siret) {
          result.company.siret = fallbackEstablishment.siret;
          result.company.siretSource = 'first_establishment';
          result.company.siretLabel = 'Premier établissement';
          // Add address from first establishment
          if (fallbackEstablishment.adresse) {
            result.company.adresseSiege = fallbackEstablishment.adresse;
          }
        }
      }
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

    // Debug: Log final result before sending
    console.log(`📋 Final company result:`, {
      siren: result.company?.siren, // Add SIREN to debug logging
      denomination: result.company?.denomination,
      formeJuridique: result.company?.formeJuridique,
      codeAPE: result.company?.codeAPE,
      libelleAPE: result.company?.libelleAPE,
      effectif: result.company?.effectif,
      capitalSocial: result.company?.capitalSocial
    });

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
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('companies')
      .upsert({
        siren: companyData.siren,
        denomination: companyData.denomination,
        active: companyData.active,
        forme_juridique: companyData.formeJuridique,
        code_ape: companyData.codeAPE,
        date_creation: companyData.dateCreation ? new Date(companyData.dateCreation).toISOString() : null,
        capital_social: companyData.capitalSocial,
        updated_at: new Date().toISOString()
      }, { onConflict: 'siren', ignoreDuplicates: false });
    
    if (error) {
      console.error('Database save error:', error);
    }
  } catch (error) {
    console.error('Database save error:', error);
  }
}
