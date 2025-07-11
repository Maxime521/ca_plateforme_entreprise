// pages/api/companies/search-filtered.js - Enhanced company search with filters and enrichment
import { createAdminClient } from '../../../lib/supabase';
import APIService from '../../../lib/api-services';
import INSEEAPIService from '../../../lib/insee-api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { 
    q = '', 
    forme = '', 
    secteur = '', 
    active = 'all',
    region = '',
    codeAPE = '',
    sortBy = 'denomination',
    page = 1,
    limit = 20
  } = req.query;

  try {
    const supabase = createAdminClient();
    
    // Build the query
    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' });

    // Apply search filter if provided
    if (q && q.length >= 2) {
      const searchTerm = `%${q}%`;
      query = query.or(`denomination.ilike.${searchTerm},siren.ilike.${searchTerm},libelle_ape.ilike.${searchTerm},code_ape.ilike.${searchTerm}`);
    }

    // Apply forme juridique filter
    if (forme) {
      query = query.eq('forme_juridique', forme);
    }

    // Apply active status filter
    if (active !== 'all') {
      query = query.eq('active', active === 'active');
    }

    // Apply code APE filter
    if (codeAPE) {
      query = query.eq('code_ape', codeAPE);
    }

    // Apply region filter (if we have this data)
    if (region) {
      query = query.ilike('adresse_siege', `%${region}%`);
    }

    // Apply sorting
    let orderField = 'denomination';
    let ascending = true;
    
    switch (sortBy) {
      case 'denomination':
      case 'name':
        orderField = 'denomination';
        ascending = true;
        break;
      case 'date':
      case 'dateCreation':
        orderField = 'date_creation';
        ascending = false; // Newest first
        break;
      case 'capital':
      case 'capitalSocial':
        orderField = 'capital_social';
        ascending = false; // Highest first
        break;
      case 'updated':
        orderField = 'updated_at';
        ascending = false;
        break;
      default:
        orderField = 'denomination';
        ascending = true;
    }

    // Apply pagination and ordering
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query
      .order(orderField, { ascending })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: companies, error, count } = await query;

    if (error) {
      console.error('Company search error:', error);
      throw error;
    }

    // Format the results
    const formattedResults = (companies || []).map(formatCompanyForResponse);

    // Enhanced search strategy: enrich existing results and get external data
    let externalResults = [];
    let enrichedLocalResults = formattedResults;
    
    // If we have a search term, try to enrich and get external data
    if (q && q.length >= 3) {
      try {
        // For SIREN searches, enrich local results with fresh INSEE data
        if (/^\d{9}$/.test(q) && formattedResults.length > 0) {
          console.log('🔄 Enriching local SIREN result...');
          enrichedLocalResults = await Promise.all(
            formattedResults.map(async (company) => {
              try {
                if (company.siren === q) {
                  const [freshCompany, establishments] = await Promise.all([
                    INSEEAPIService.getCompanyBySiren(company.siren).catch(() => null),
                    INSEEAPIService.getEstablishments(company.siren).catch(() => [])
                  ]);
                  
                  if (freshCompany) {
                    const mainEstablishment = establishments.find(est => est.siegeSocial) || establishments[0];
                    
                    // Update database with fresh data
                    const supabase = createAdminClient();
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
                      formeJuridique: freshCompany.formeJuridique,
                      adresseSiege: freshCompany.adresseSiege || (mainEstablishment ? mainEstablishment.adresse : null),
                      libelleAPE: freshCompany.libelleAPE,
                      active: freshCompany.active,
                      siret: freshCompany.siret || (mainEstablishment ? mainEstablishment.siret : null),
                      effectif: freshCompany.effectif || 'Non renseigné',
                      capitalSocial: freshCompany.capitalSocial,
                      _enriched: true
                    };
                  }
                }
                return company;
              } catch (error) {
                console.log(`⚠️ Failed to enrich local ${company.siren}:`, error.message);
                return company;
              }
            })
          );
        }
        
        // Get external results if we have few local results
        if (enrichedLocalResults.length < 5) {
          externalResults = await searchExternalAPIs(q);
          // Save new companies in background
          if (externalResults.length > 0) {
            saveNewCompanies(externalResults).catch(console.error);
          }
        }
      } catch (apiError) {
        console.error('Enhanced search failed:', apiError);
      }
    }

    // Merge enriched local results with external ones
    const allResults = externalResults.length > 0 
      ? mergeResults(enrichedLocalResults, externalResults)
      : enrichedLocalResults;

    return res.status(200).json({
      results: allResults,
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
      hasExternalResults: externalResults.length > 0
    });
    
  } catch (error) {
    console.error('Company search error:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la recherche d\'entreprises',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function searchExternalAPIs(query) {
  const results = [];
  
  try {
    console.log(`🔍 Enhanced external search for: "${query}"`);
    const sireneData = await INSEEAPIService.searchCompanies(query);
    
    if (sireneData.results && sireneData.results.length > 0) {
      // Enrich each result with establishment data
      const enrichedResults = await Promise.all(
        sireneData.results.slice(0, 10).map(async (company) => {
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
            console.log(`⚠️ Failed to enrich ${company.siren}:`, error.message);
            return company;
          }
        })
      );
      
      results.push(...enrichedResults.map(formatSireneResult));
      console.log(`✅ Found ${enrichedResults.length} enriched external results`);
    }
  } catch (error) {
    console.error('Enhanced SIRENE search failed:', error.message);
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
      merged.push({ ...company, isExternal: true });
    }
  });
  
  return merged;
}

async function saveNewCompanies(companies) {
  const supabase = createAdminClient();
  
  for (const company of companies) {
    try {
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
    dateImmatriculation: company.date_immatriculation,
    active: company.active,
    capitalSocial: company.capital_social,
    natureEntreprise: company.nature_entreprise,
    // Derived fields for UI
    secteur: mapCodeAPEToSector(company.code_ape),
    region: extractRegionFromAddress(company.adresse_siege),
    // Generate SIRET from SIREN (basic format)
    siret: company.siren ? `${company.siren}00001` : null
  };
}

function formatSireneResult(sireneCompany) {
  return {
    siren: sireneCompany.siren,
    denomination: sireneCompany.denomination,
    formeJuridique: sireneCompany.formeJuridique,
    adresseSiege: sireneCompany.adresseSiege || sireneCompany.adresse,
    libelleAPE: sireneCompany.libelleAPE || sireneCompany.activitePrincipale,
    codeAPE: sireneCompany.codeAPE,
    dateCreation: sireneCompany.dateCreation,
    active: sireneCompany.active,
    capitalSocial: sireneCompany.capitalSocial,
    effectif: sireneCompany.effectif || 'Non renseigné',
    secteur: mapCodeAPEToSector(sireneCompany.codeAPE),
    region: extractRegionFromAddress(sireneCompany.adresseSiege || sireneCompany.adresse),
    siret: sireneCompany.siret,
    isExternal: true,
    _enriched: sireneCompany._enriched || false
  };
}

function mapCodeAPEToSector(codeAPE) {
  if (!codeAPE) return 'Autre';
  
  const code = codeAPE.substring(0, 2);
  const sectorMap = {
    '01': 'Agriculture',
    '02': 'Sylviculture',
    '03': 'Pêche',
    '05': 'Extraction',
    '06': 'Extraction',
    '07': 'Extraction',
    '08': 'Extraction',
    '09': 'Extraction',
    '10': 'Industrie alimentaire',
    '11': 'Industrie alimentaire',
    '12': 'Industrie alimentaire',
    '13': 'Textile',
    '14': 'Textile',
    '15': 'Textile',
    '16': 'Bois',
    '17': 'Papier',
    '18': 'Imprimerie',
    '19': 'Pétrole',
    '20': 'Chimie',
    '21': 'Pharmacie',
    '22': 'Plastique',
    '23': 'Minéraux',
    '24': 'Métallurgie',
    '25': 'Métallurgie',
    '26': 'Informatique',
    '27': 'Électrique',
    '28': 'Machines',
    '29': 'Automobile',
    '30': 'Transport',
    '31': 'Mobilier',
    '32': 'Autre industrie',
    '33': 'Réparation',
    '35': 'Énergie',
    '36': 'Eau',
    '37': 'Assainissement',
    '38': 'Déchets',
    '39': 'Dépollution',
    '41': 'Construction',
    '42': 'Construction',
    '43': 'Construction',
    '45': 'Automobile',
    '46': 'Commerce',
    '47': 'Commerce',
    '49': 'Transport',
    '50': 'Transport',
    '51': 'Transport',
    '52': 'Entreposage',
    '53': 'Poste',
    '55': 'Hébergement',
    '56': 'Restauration',
    '58': 'Édition',
    '59': 'Audiovisuel',
    '60': 'Audiovisuel',
    '61': 'Télécommunications',
    '62': 'Informatique',
    '63': 'Information',
    '64': 'Finance',
    '65': 'Assurance',
    '66': 'Finance',
    '68': 'Immobilier',
    '69': 'Juridique',
    '70': 'Conseil',
    '71': 'Architecture',
    '72': 'Recherche',
    '73': 'Publicité',
    '74': 'Design',
    '75': 'Vétérinaire',
    '77': 'Location',
    '78': 'Emploi',
    '79': 'Voyage',
    '80': 'Sécurité',
    '81': 'Services',
    '82': 'Services',
    '84': 'Administration',
    '85': 'Enseignement',
    '86': 'Santé',
    '87': 'Social',
    '88': 'Social',
    '90': 'Arts',
    '91': 'Culture',
    '92': 'Jeux',
    '93': 'Sport',
    '94': 'Associations',
    '95': 'Réparation',
    '96': 'Services personnels',
    '97': 'Ménages',
    '98': 'Ménages',
    '99': 'Organisations'
  };
  
  return sectorMap[code] || 'Autre';
}

function extractRegionFromAddress(address) {
  if (!address) return 'Non spécifiée';
  
  const regionKeywords = {
    'Paris': 'Île-de-France',
    '75': 'Île-de-France',
    'Lyon': 'Auvergne-Rhône-Alpes',
    '69': 'Auvergne-Rhône-Alpes',
    'Marseille': 'Provence-Alpes-Côte d\'Azur',
    '13': 'Provence-Alpes-Côte d\'Azur',
    'Nice': 'Provence-Alpes-Côte d\'Azur',
    '06': 'Provence-Alpes-Côte d\'Azur',
    'Bordeaux': 'Nouvelle-Aquitaine',
    '33': 'Nouvelle-Aquitaine',
    'Toulouse': 'Occitanie',
    '31': 'Occitanie',
    'Lille': 'Hauts-de-France',
    '59': 'Hauts-de-France',
    'Nantes': 'Pays de la Loire',
    '44': 'Pays de la Loire',
    'Strasbourg': 'Grand Est',
    '67': 'Grand Est',
    'Rennes': 'Bretagne',
    '35': 'Bretagne',
    'Montpellier': 'Occitanie',
    '34': 'Occitanie'
  };
  
  for (const [keyword, region] of Object.entries(regionKeywords)) {
    if (address.includes(keyword)) {
      return region;
    }
  }
  
  return 'Non spécifiée';
}