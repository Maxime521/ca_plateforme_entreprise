import { createAdminClient } from '../../../lib/supabase';
import axios from 'axios';
import { validateSearchQuery, sanitizeQuery, securityHeaders } from '../../../lib/middleware/validation';
import { withLogging, measurePerformance } from '../../../lib/middleware/logging';
import { serverAnalytics } from '../../../lib/analytics';
import logger from '../../../lib/logger';

// Import rate limiter dynamically since it uses ES6 modules
let searchLimiter = null;

// Simplified middleware without rate limiting for now
const withMiddleware = (handler) => {
  return async (req, res) => {
    // Apply security headers
    securityHeaders(req, res, () => {});
    
    // Skip rate limiting temporarily to fix the immediate issue
    // TODO: Fix rate limiting module import issue
    
    // Validate input
    return new Promise((resolve, reject) => {
      validateSearchQuery(req, res, () => {
        handler(req, res).then(resolve).catch(reject);
      });
    });
  };
};

async function handler(req, res) {
  const perf = measurePerformance('search_request')
  
  if (req.method !== 'GET') {
    logger.warn('Invalid method on search endpoint', {
      method: req.method,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    })
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  // Input is already validated by middleware
  const { q, source = 'all' } = req.query;
  
  // Additional sanitization
  const sanitizedQuery = sanitizeQuery(q)
  
  // Log search attempt
  logger.info('Search request initiated', {
    query: q,
    sanitizedQuery,
    source,
    ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  })

  try {
    const results = {
      local: [],
      insee: [],
      bodacc: [],
      errors: []
    };

    console.log(`🔍 Search for: "${sanitizedQuery}" (sanitized from: "${q}")`);

    // 1. Search local database (Supabase) with enrichment
    if (source === 'all' || source === 'local') {
      try {
        const supabase = createAdminClient();
        
        const { data: localResults, error } = await supabase
          .from('companies')
          .select('*')
          .or(`siren.ilike.%${sanitizedQuery}%,denomination.ilike.%${sanitizedQuery}%`)
          .limit(10);
        
        if (error) throw error;
        
        // Enrich local results if query looks like SIREN
        if (/^\d{9}$/.test(sanitizedQuery) && localResults && localResults.length > 0) {
          console.log('🔄 Enriching local SIREN result...');
          try {
            const { default: INSEEAPIService } = await import('../../../lib/insee-api');
            
            const enrichedLocal = await Promise.all(
              localResults.map(async (company) => {
                if (company.siren === sanitizedQuery) {
                  try {
                    const [freshCompany, establishments] = await Promise.all([
                      INSEEAPIService.getCompanyBySiren(company.siren).catch(() => null),
                      INSEEAPIService.getEstablishments(company.siren).catch(() => [])
                    ]);
                    
                    if (freshCompany) {
                      const mainEstablishment = establishments.find(est => est.siegeSocial) || establishments[0];
                      
                      // Update database with fresh data
                      await supabase
                        .from('companies')
                        .update({
                          denomination: freshCompany.denomination,
                          forme_juridique: freshCompany.formeJuridique,
                          libelle_ape: freshCompany.libelleAPE,
                          adresse_siege: freshCompany.adresseSiege || (mainEstablishment ? mainEstablishment.adresse : null),
                          capital_social: freshCompany.capitalSocial,
                          active: freshCompany.active,
                          updated_at: new Date().toISOString()
                        })
                        .eq('siren', company.siren);
                      
                      return {
                        ...company,
                        denomination: freshCompany.denomination,
                        forme_juridique: freshCompany.formeJuridique,
                        adresse_siege: freshCompany.adresseSiege || (mainEstablishment ? mainEstablishment.adresse : null),
                        libelle_ape: freshCompany.libelleAPE,
                        active: freshCompany.active,
                        siret: freshCompany.siret || (mainEstablishment ? mainEstablishment.siret : null),
                        effectif: freshCompany.effectif || 'Non renseigné',
                        capital_social: freshCompany.capitalSocial,
                        _enriched: true
                      };
                    }
                  } catch (enrichError) {
                    console.log(`⚠️ Failed to enrich local ${company.siren}:`, enrichError.message);
                  }
                }
                return company;
              })
            );
            
            results.local = enrichedLocal;
            console.log(`📂 Found ${results.local.length} enriched local results`);
          } catch (enrichmentError) {
            console.log('⚠️ Local enrichment failed:', enrichmentError.message);
            results.local = localResults || [];
            console.log(`📂 Found ${results.local.length} local results (not enriched)`);
          }
        } else {
          results.local = localResults || [];
          console.log(`📂 Found ${results.local.length} local results`);
        }
      } catch (error) {
        console.error('Local database error:', error);
        results.errors.push({ 
          source: 'local', 
          message: 'Erreur base de données locale',
          type: 'DATABASE_ERROR' 
        });
      }
    }

    // 2. Search INSEE API with enrichment
    if ((source === 'all' || source === 'insee') && results.local.length < 5) {
      try {
        console.log('🏛️ Searching INSEE API with enrichment...');
        const { default: INSEEAPIService } = await import('../../../lib/insee-api');
        const inseeResults = await INSEEAPIService.searchCompanies(sanitizedQuery);
        
        if (inseeResults.results && inseeResults.results.length > 0) {
          // Enrich INSEE results with establishment data
          const enrichedINSEE = await Promise.all(
            inseeResults.results.slice(0, 10).map(async (company) => {
              try {
                const establishments = await INSEEAPIService.getEstablishments(company.siren).catch(() => []);
                const mainEstablishment = establishments.find(est => est.siegeSocial) || establishments[0];
                
                return {
                  ...company,
                  adresseSiege: company.adresseSiege || (mainEstablishment ? mainEstablishment.adresse : null),
                  siret: company.siret || (mainEstablishment ? mainEstablishment.siret : null),
                  effectif: company.effectif || 'Non renseigné',
                  _enriched: true
                };
              } catch (error) {
                console.log(`⚠️ Failed to enrich INSEE ${company.siren}:`, error.message);
                return company;
              }
            })
          );
          
          results.insee = enrichedINSEE;
          console.log(`   Found ${results.insee.length} enriched INSEE results`);
        } else {
          results.insee = [];
        }
      } catch (error) {
        console.error('INSEE API error:', error);
        results.errors.push({ 
          source: 'insee', 
          message: 'API INSEE non disponible ou mal configurée',
          type: 'API_ERROR' 
        });
      }
    }

    // 3. Search BODACC API with FIXED SIREN extraction
    if (source === 'all' || source === 'bodacc') {
      try {
        console.log('📰 Searching BODACC API...');
        
        // FIXED: Use sanitized and properly encoded query
        const encodedQuery = encodeURIComponent(sanitizedQuery.replace(/[%_]/g, '\\$&'));
        
        const bodaccResponse = await axios.get('https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records', {
          params: {
            where: `commercant like "%${encodedQuery}%"`,
            limit: 20,
            order_by: 'dateparution desc',
            timezone: 'Europe/Paris'
          },
          timeout: 8000,
          headers: {
            'User-Agent': 'DataCorp-Platform/1.0',
            'Accept': 'application/json'
          }
        });

        console.log(`📰 BODACC raw response: ${bodaccResponse.data.total_count || 0} total records`);
        
        // Use the FIXED formatting function
        const bodaccResults = formatBODACCAnnouncements(bodaccResponse.data);
        results.bodacc = bodaccResults.results || [];
        console.log(`   Formatted ${results.bodacc.length} BODACC results`);
        
      } catch (error) {
        console.error('BODACC API error:', error);
        results.errors.push({ 
          source: 'bodacc', 
          message: 'Erreur API BODACC',
          type: 'API_ERROR' 
        });
      }
    }

    // Merge all results with query for relevance sorting
    const mergedResults = mergeSearchResults(results, sanitizedQuery);
    const duration = perf.end()
    
    logger.info('Search completed successfully', {
      query: sanitizedQuery,
      resultsCount: mergedResults.length,
      sources: {
        local: results.local.length,
        insee: results.insee.length,
        bodacc: results.bodacc.length
      },
      errorsCount: results.errors.length,
      duration: `${duration}ms`
    })

    // Track analytics
    serverAnalytics.search(sanitizedQuery, mergedResults.length, null, {
      source,
      duration,
      sources: {
        local: results.local.length,
        insee: results.insee.length,
        bodacc: results.bodacc.length
      }
    })

    console.log(`✅ Total merged results: ${mergedResults.length}`);

    return res.status(200).json({
      success: true,
      query: sanitizedQuery,
      originalQuery: q,
      results: mergedResults,
      sources: {
        local: results.local.length,
        insee: results.insee.length,
        bodacc: results.bodacc.length
      },
      errors: results.errors,
      timestamp: new Date().toISOString(),
      performance: {
        duration: `${duration}ms`
      }
    });

  } catch (error) {
    const duration = perf.end()
    
    logger.error('Search operation failed', {
      query: sanitizedQuery,
      source,
      duration: `${duration}ms`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    })

    // Track error in analytics
    serverAnalytics.error('search_error', error.message, null, {
      query: sanitizedQuery,
      source,
      duration
    })

    console.error('Search operation error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la recherche',
      type: 'SEARCH_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// FIXED: Enhanced SIREN extraction function
function extractSIREN(registre) {
  if (!registre) return '';
  
  // Convert to string if it's not already
  const registreStr = String(registre);
  
  // Method 1: Split by comma and take second part (this is the key fix!)
  if (registreStr.includes(',')) {
    const parts = registreStr.split(',');
    if (parts.length > 1) {
      const siren = parts[1].trim(); // Take the second part after comma
      if (siren.length === 9 && /^\d{9}$/.test(siren)) {
        return siren;
      }
    }
  }
  
  // Method 2: Extract first 9 consecutive digits as fallback
  const match = registreStr.match(/(\d{9})/);
  if (match) {
    return match[1];
  }
  
  return '';
}

// FIXED: BODACC formatting with proper SIREN extraction
function formatBODACCAnnouncements(data) {
  if (!data || !data.records) {
    console.log('❌ No BODACC data or records');
    return { results: [], total: 0 };
  }

  console.log(`🔄 Processing ${data.records.length} BODACC records...`);
  const results = [];

  for (let i = 0; i < data.records.length; i++) {
    try {
      const record = data.records[i];
      const fields = record.record?.fields || record.fields || {};
      
      // Use the FIXED SIREN extraction
      const siren = extractSIREN(fields.registre);
      
      if (siren) {
        const result = {
          id: fields.id || `bodacc-${siren}-${Date.now()}-${i}`,
          siren: siren,
          registre: fields.registre,
          denomination: fields.commercant || fields.denomination || 'Entreprise inconnue',
          formeJuridique: null,
          adresse: formatBodaccAddress(fields),
          dateParution: fields.dateparution,
          typeAnnonce: fields.familleavis_lib || fields.familleavis || 'Annonce',
          numeroAnnonce: fields.numeroannonce,
          tribunal: fields.tribunal,
          ville: fields.ville,
          codePostal: fields.cp,
          departement: fields.departement_nom_officiel,
          region: fields.region_nom_officiel,
          details: fields.publicationavis
        };
        
        results.push(result);
        
        // Log first few results for debugging
        if (i < 3) {
          console.log(`   ✅ BODACC Record ${i + 1}: ${result.denomination} (${result.siren})`);
        }
      } else {
        // Log first few failed extractions for debugging
        if (i < 3) {
          console.log(`   ⚠️  BODACC Record ${i + 1}: No SIREN from "${fields.registre}"`);
        }
      }
      
    } catch (recordError) {
      console.error(`❌ Error processing BODACC record ${i}:`, recordError.message);
      continue;
    }
  }

  console.log(`✅ BODACC: ${results.length} valid results out of ${data.records.length} total`);
  
  return {
    results: results,
    total: data.total_count || results.length
  };
}

// Helper function for BODACC address formatting
function formatBodaccAddress(fields) {
  try {
    const parts = [
      fields.ville,
      fields.cp,
      fields.departement_nom_officiel
    ].filter(Boolean).filter(part => String(part).trim() !== '');

    return parts.length > 0 ? parts.join(', ') : 'Adresse non disponible';
  } catch (error) {
    return 'Adresse non disponible';
  }
}

// Merge results from all sources with standardization
function mergeSearchResults(results, query = '') {
  // Import standardization functions
  const { standardizeCompanyResult, sortResultsByQuality } = require('../../../lib/result-standardizer');
  
  const seen = new Set();
  const merged = [];

  // Standardize and add local results first (highest priority)
  results.local.forEach(company => {
    const standardized = standardizeCompanyResult(company, 'local');
    if (standardized && standardized.siren && !seen.has(standardized.siren)) {
      seen.add(standardized.siren);
      merged.push(standardized);
    }
  });

  // Standardize and add INSEE results
  results.insee.forEach(company => {
    const standardized = standardizeCompanyResult(company, 'insee');
    if (standardized && standardized.siren && !seen.has(standardized.siren)) {
      seen.add(standardized.siren);
      merged.push(standardized);
    }
  });

  // Standardize and add BODACC results
  results.bodacc.forEach(announcement => {
    const standardized = standardizeCompanyResult(announcement, 'bodacc');
    if (standardized && standardized.siren && !seen.has(standardized.siren)) {
      seen.add(standardized.siren);
      merged.push(standardized);
    }
  });

  // Sort by quality and relevance
  const sorted = sortResultsByQuality(merged, query);
  
  return sorted.slice(0, 20);
}

// Export with middleware applied
export default withMiddleware(handler);
