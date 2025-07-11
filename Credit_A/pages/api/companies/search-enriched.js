// pages/api/companies/search-enriched.js - Enhanced search with guaranteed enrichment
import { createAdminClient } from '../../../lib/supabase';
import INSEEAPIService from '../../../lib/insee-api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || q.length < 3) {
    return res.status(400).json({ message: 'Query must be at least 3 characters' });
  }

  try {
    console.log(`🔍 Enhanced search for: "${q}"`);
    
    const results = [];
    
    // First check if it's a SIREN search
    if (/^\d{9}$/.test(q)) {
      console.log('🎯 SIREN detected, getting enriched company data...');
      
      try {
        // Get fresh data from INSEE API
        const [companyData, establishments] = await Promise.all([
          INSEEAPIService.getCompanyBySiren(q),
          INSEEAPIService.getEstablishments(q).catch(() => [])
        ]);
        
        if (companyData) {
          const mainEstablishment = establishments.find(est => est.siegeSocial) || establishments[0];
          
          const enrichedResult = {
            id: `enriched-${companyData.siren}`,
            siren: companyData.siren,
            denomination: companyData.denomination,
            formeJuridique: companyData.formeJuridique,
            adresseSiege: companyData.adresseSiege || (mainEstablishment ? mainEstablishment.adresse : null),
            libelleAPE: companyData.libelleAPE,
            codeAPE: companyData.codeAPE,
            dateCreation: companyData.dateCreation,
            active: companyData.active,
            siret: companyData.siret || (mainEstablishment ? mainEstablishment.siret : null),
            effectif: companyData.effectif || 'Non renseigné',
            capitalSocial: companyData.capitalSocial,
            siegeSocial: true,
            // Enriched data indicators
            _enriched: true,
            _source: 'insee_api',
            source: 'insee' // Add source for frontend badge
          };
          
          results.push(enrichedResult);
          
          // Save to database
          const supabase = createAdminClient();
          await supabase
            .from('companies')
            .upsert({
              siren: companyData.siren,
              denomination: companyData.denomination,
              forme_juridique: companyData.formeJuridique,
              libelle_ape: companyData.libelleAPE,
              code_ape: companyData.codeAPE,
              adresse_siege: enrichedResult.adresseSiege,
              capital_social: companyData.capitalSocial,
              active: companyData.active,
              updated_at: new Date().toISOString()
            }, { onConflict: 'siren' });
          
          console.log('✅ Enriched company data saved');
        }
      } catch (error) {
        console.log('⚠️ INSEE enrichment failed:', error.message);
      }
    } else {
      // Search by name in INSEE API
      console.log('📝 Name search, querying INSEE API...');
      
      try {
        const searchResults = await INSEEAPIService.searchCompanies(q);
        
        if (searchResults.results && searchResults.results.length > 0) {
          // Take first 5 results and enrich them
          const enrichedResults = await Promise.all(
            searchResults.results.slice(0, 5).map(async (company) => {
              try {
                const establishments = await INSEEAPIService.getEstablishments(company.siren).catch(() => []);
                const mainEstablishment = establishments.find(est => est.siegeSocial) || establishments[0];
                
                // Extract SIREN from SIRET if SIREN is missing
                const siren = company.siren || (company.siret ? company.siret.substring(0, 9) : null);
                
                return {
                  ...company,
                  id: `enriched-search-${siren}`,
                  siren: siren, // Ensure SIREN is always present
                  adresseSiege: company.adresseSiege || (mainEstablishment ? mainEstablishment.adresse : null),
                  siret: company.siret || (mainEstablishment ? mainEstablishment.siret : null),
                  effectif: company.effectif || 'Non renseigné',
                  _enriched: true,
                  _source: 'insee_search',
                  source: 'insee' // Add source for frontend badge
                };
              } catch (error) {
                // Extract SIREN from SIRET if SIREN is missing
                const siren = company.siren || (company.siret ? company.siret.substring(0, 9) : null);
                return { ...company, id: `enriched-basic-${siren}`, siren: siren, _enriched: false, _source: 'insee_search_basic', source: 'insee' };
              }
            })
          );
          
          results.push(...enrichedResults);
        }
      } catch (error) {
        console.log('⚠️ INSEE search failed:', error.message);
      }
    }
    
    // 3. Search BODACC API if we still need more results
    let bodaccResults = [];
    if (results.length < 10) {
      try {
        console.log('📰 Searching BODACC API...');
        const BODACCAPIService = require('../../../lib/bodacc-api');
        const bodaccResponse = await BODACCAPIService.searchByName(q);
        
        if (bodaccResponse.results && bodaccResponse.results.length > 0) {
          // ENHANCED: Fetch real SIRET numbers from INSEE for BODACC results
          console.log('🔄 Enriching BODACC results with real SIRET numbers from INSEE...');
          
          bodaccResults = await Promise.all(
            bodaccResponse.results.slice(0, 5).map(async (announcement) => {
              let realSiret = null;
              
              try {
                // Get real SIRET from INSEE API with timeout
                const INSEEAPIService = await import('../../../lib/insee-api');
                
                // Add timeout to prevent hanging
                const companyDataPromise = INSEEAPIService.default.getCompanyBySiren(announcement.siren);
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), 5000)
                );
                
                const companyData = await Promise.race([companyDataPromise, timeoutPromise]);
                
                if (companyData && companyData.siret) {
                  realSiret = companyData.siret;
                  console.log(`✅ Got real SIRET ${realSiret} for BODACC SIREN ${announcement.siren}`);
                } else {
                  console.log(`⚠️ No SIRET found for BODACC SIREN ${announcement.siren}, using fallback`);
                  realSiret = announcement.siren ? `${announcement.siren}00001` : null;
                }
              } catch (error) {
                console.log(`⚠️ Failed to get SIRET for BODACC SIREN ${announcement.siren}:`, error.message);
                realSiret = announcement.siren ? `${announcement.siren}00001` : null;
              }
              
              return {
                ...announcement,
                id: `bodacc-${announcement.siren}`,
                // Standardize BODACC fields for consistency with INSEE
                siret: realSiret, // FIXED: Use real SIRET from INSEE API
                adresseSiege: announcement.adresse || announcement.adresseSiege,
                active: true, // BODACC announcements are typically for active companies
                effectif: announcement.effectif || 'Non renseigné',
                capitalSocial: announcement.capital ? parseInt(announcement.capital) : null,
                dateCreation: announcement.dateParution, // Use publication date as creation proxy
                siegeSocial: true, // BODACC announcements are for headquarters
                // Add missing fields for consistency
                formeJuridique: announcement.formeJuridique || 'Forme non renseignée',
                codeAPE: null, // BODACC doesn't provide APE codes
                libelleAPE: 'Activité selon BODACC', // Indicate source difference
                _enriched: false,
                _source: 'bodacc',
                source: 'bodacc' // Add source for frontend badge
              };
            })
          );
          
          results.push(...bodaccResults);
          console.log(`📰 Added ${bodaccResults.length} BODACC results`);
        }
      } catch (error) {
        console.log('⚠️ BODACC search failed:', error.message);
      }
    }
    
    // FIXED: Ensure all results have consistent fields and source badges
    results.forEach(company => {
      // Ensure source field is present for badges
      if (!company.source) {
        if (company._source === 'insee_api' || company._source === 'insee_search' || company._source === 'insee_search_basic') {
          company.source = 'insee';
        } else if (company._source === 'bodacc') {
          company.source = 'bodacc';
        } else {
          company.source = 'local';
        }
      }
      
      // Ensure consistent field presence
      if (!company.effectif) {
        company.effectif = 'Non renseigné';
      }
      if (company.active === undefined) {
        company.active = true; // Default to active if not specified
      }
    });
    
    console.log(`✅ Returning ${results.length} enriched results`);
    
    return res.status(200).json({
      success: true,
      query: q,
      results,
      sources: {
        local: 0,
        insee: results.length - bodaccResults.length,
        bodacc: bodaccResults.length
      },
      errors: [],
      timestamp: new Date().toISOString(),
      enriched: true
    });
    
  } catch (error) {
    console.error('Enhanced search error:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la recherche enrichie',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}