import { createAdminClient } from '../../../lib/supabase';
import APIService from '../../../lib/api-services';
import INSEEAPIService from '../../../lib/insee-api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { q, source = 'all' } = req.query;

  if (!q || q.length < 3) {
    return res.status(400).json({ message: 'Query must be at least 3 characters' });
  }

  try {
    console.log(`🔍 Search query: "${q}", source: ${source}`);
    
    // Enhanced search strategy: always enrich data for better quality
    let localResults = [];
    let externalResults = [];
    
    // First, try enriched local search (fast for existing companies)
    try {
      localResults = await searchLocalDatabaseEnriched(q, true);
      console.log(`💾 Found ${localResults.length} enriched local results`);
    } catch (error) {
      console.log(`⚠️ Local enriched search failed:`, error.message);
      localResults = await searchLocalDatabase(q);
    }
    
    // If no local results or we want fresh external data, search APIs
    if (localResults.length === 0 || source === 'external' || source === 'all') {
      externalResults = await searchExternalAPIs(q, source);
      console.log(`🌐 Found ${externalResults.length} external results`);
    }
    
    // Merge and deduplicate results
    const mergedResults = mergeResults(localResults, externalResults);
    
    // Save new companies to database (background job)
    if (externalResults.length > 0) {
      saveNewCompanies(externalResults).catch(console.error);
    }
    
    const finalResults = mergedResults.slice(0, 20);
    console.log(`✅ Returning ${finalResults.length} enriched results`);
    
    return res.status(200).json({
      results: finalResults,
      source: localResults.length > 0 && externalResults.length > 0 ? 'mixed' : 
               localResults.length > 0 ? 'local' : 'external',
      total: finalResults.length
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la recherche',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function searchLocalDatabase(query) {
  const supabase = createAdminClient();
  
  // Use Supabase's search function for optimized full-text search
  const { data: companies, error } = await supabase
    .rpc('search_companies', {
      search_term: query,
      limit_count: 20
    });
  
  if (error) {
    console.error('Supabase search error:', error);
    // Fallback to basic search if full-text search fails
    const { data: fallbackCompanies, error: fallbackError } = await supabase
      .from('companies')
      .select('*')
      .or(`siren.ilike.%${query}%,denomination.ilike.%${query}%,libelle_ape.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(20);
    
    if (fallbackError) {
      throw fallbackError;
    }
    return (fallbackCompanies || []).map(formatCompanyForResponse);
  }
  
  return (companies || []).map(formatCompanyForResponse);
}

// NEW: Enhanced local search with enrichment option
async function searchLocalDatabaseEnriched(query, enrichWithAPI = false) {
  const supabase = createAdminClient();
  
  // Get basic local results first
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .or(`siren.ilike.%${query}%,denomination.ilike.%${query}%,libelle_ape.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (error) {
    throw error;
  }
  
  if (!enrichWithAPI) {
    return (companies || []).map(formatCompanyForResponse);
  }
  
  // Enrich local results with fresh INSEE data
  const enrichedResults = await Promise.all(
    (companies || []).map(async (company) => {
      try {
        console.log(`🔄 Enriching local company ${company.siren}...`);
        const [freshCompany, establishments] = await Promise.all([
          INSEEAPIService.getCompanyBySiren(company.siren).catch(() => null),
          INSEEAPIService.getEstablishments(company.siren).catch(() => [])
        ]);
        
        if (freshCompany) {
          // Save enriched data back to database
          await supabase
            .from('companies')
            .update({
              denomination: freshCompany.denomination,
              forme_juridique: freshCompany.formeJuridique,
              libelle_ape: freshCompany.libelleAPE,
              adresse_siege: freshCompany.adresseSiege,
              capital_social: freshCompany.capitalSocial,
              active: freshCompany.active,
              updated_at: new Date().toISOString()
            })
            .eq('siren', company.siren);
          
          return formatEnrichedCompanyForResponse(freshCompany, establishments);
        }
        
        return formatCompanyForResponse(company);
      } catch (error) {
        console.log(`⚠️ Failed to enrich ${company.siren}:`, error.message);
        return formatCompanyForResponse(company);
      }
    })
  );
  
  return enrichedResults;
}

async function searchExternalAPIs(query, source) {
  const results = [];
  
  try {
    if (source === 'all' || source === 'sirene') {
      console.log(`🔍 Searching INSEE API for: ${query}`);
      const sireneData = await INSEEAPIService.searchCompanies(query);
      
      // Enrich each result with establishment data for complete information
      const enrichedResults = await Promise.all(
        (sireneData.results || []).slice(0, 10).map(async (company) => {
          try {
            // Get detailed company data including establishments
            const [detailedCompany, establishments] = await Promise.all([
              INSEEAPIService.getCompanyBySiren(company.siren).catch(() => company),
              INSEEAPIService.getEstablishments(company.siren).catch(() => [])
            ]);
            
            // Use detailed data if available, fallback to search result
            const enrichedCompany = detailedCompany.siren ? detailedCompany : company;
            
            return formatEnrichedCompanyForResponse(enrichedCompany, establishments);
          } catch (error) {
            console.log(`⚠️ Failed to enrich ${company.siren}:`, error.message);
            return formatEnrichedCompanyForResponse(company, []);
          }
        })
      );
      
      results.push(...enrichedResults);
      console.log(`✅ Found ${enrichedResults.length} enriched results from INSEE`);
    }
  } catch (error) {
    console.error('SIRENE search failed:', error.message);
  }
  
  return results;
}

function mergeResults(local, external) {
  const seen = new Set();
  const merged = [];
  
  // Add local results first
  local.forEach(company => {
    seen.add(company.siren);
    merged.push(company);
  });
  
  // Add external results if not already in local
  external.forEach(company => {
    if (!seen.has(company.siren)) {
      seen.add(company.siren);
      merged.push(company);
    }
  });
  
  return merged;
}

async function saveNewCompanies(companies) {
  const supabase = createAdminClient();
  
  for (const company of companies) {
    try {
      // Use Supabase upsert functionality with enriched data
      const { error } = await supabase
        .from('companies')
        .upsert({
          siren: company.siren,
          denomination: company.denomination,
          date_creation: company.dateCreation ? new Date(company.dateCreation).toISOString() : null,
          active: company.active,
          forme_juridique: company.formeJuridique,
          code_ape: company.codeAPE,
          libelle_ape: company.libelleAPE,
          adresse_siege: company.adresseSiege,
          capital_social: company.capitalSocial,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'siren',
          ignoreDuplicates: false
        });
      
      if (error) {
        throw error;
      }
      console.log(`✅ Saved enriched data for ${company.siren}`);
    } catch (error) {
      console.error(`Failed to save company ${company.siren}:`, error.message);
    }
  }
}

function formatCompanyForResponse(company) {
  return {
    id: company.id,
    siren: company.siren,
    denomination: company.denomination,
    formeJuridique: company.forme_juridique,
    adresseSiege: company.adresse_siege,
    libelleAPE: company.libelle_ape,
    codeAPE: company.code_ape,
    dateCreation: company.date_creation,
    active: company.active,
    // Add enriched data fields
    siret: company.siret,
    effectif: company.effectif || 'Non renseigné',
    capitalSocial: company.capital_social
  };
}

// NEW: Enhanced formatting for enriched data
function formatEnrichedCompanyForResponse(company, establishments = []) {
  // Find main establishment for additional data
  const mainEstablishment = establishments.find(est => est.siegeSocial) || establishments[0];
  
  return {
    id: company.id || null,
    siren: company.siren,
    denomination: company.denomination,
    formeJuridique: company.formeJuridique,
    adresseSiege: company.adresseSiege || (mainEstablishment ? mainEstablishment.adresse : null),
    libelleAPE: company.libelleAPE || company.codeAPE,
    codeAPE: company.codeAPE,
    dateCreation: company.dateCreation,
    active: company.active,
    // Enhanced fields from details endpoint
    siret: company.siret || (mainEstablishment ? mainEstablishment.siret : null),
    effectif: company.effectif || 'Non renseigné',
    capitalSocial: company.capitalSocial,
    siegeSocial: true,
    categorieJuridique: company.categorieJuridique
  };
}

