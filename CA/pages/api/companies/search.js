// pages/api/companies/search.js
import { prisma } from '../../../lib/prisma';
import APIService from '../../../lib/api-services';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { q, source = 'all' } = req.query;

  if (!q || q.length < 3) {
    return res.status(400).json({ message: 'Query must be at least 3 characters' });
  }

  try {
    // First, search in local database
    const localResults = await searchLocalDatabase(q);
    
    // If we have enough local results, return them
    if (localResults.length >= 5) {
      return res.status(200).json({
        results: localResults,
        source: 'local',
        total: localResults.length
      });
    }

    // Otherwise, search external APIs
    const externalResults = await searchExternalAPIs(q, source);
    
    // Merge local and external results
    const mergedResults = mergeResults(localResults, externalResults);
    
    // Save new companies to database (background job)
    saveNewCompanies(externalResults).catch(console.error);
    
    return res.status(200).json({
      results: mergedResults.slice(0, 20),
      source: 'mixed',
      total: mergedResults.length
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
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { siren: { contains: query } },
        { denomination: { contains: query, mode: 'insensitive' } },
        { libelleAPE: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 20,
    orderBy: { updatedAt: 'desc' }
  });
  
  return companies.map(formatCompanyForResponse);
}

async function searchExternalAPIs(query, source) {
  const results = [];
  
  try {
    if (source === 'all' || source === 'sirene') {
      const sireneData = await APIService.searchSIRENE(query);
      results.push(...sireneData.results);
    }
  } catch (error) {
    console.error('SIRENE search failed:', error.message);
  }
  
  // Note: RNE doesn't have a search endpoint, only lookup by SIREN
  // BODACC search would be implemented similarly if needed
  
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
  for (const company of companies) {
    try {
      await prisma.company.upsert({
        where: { siren: company.siren },
        update: {
          denomination: company.denomination,
          active: company.active,
          formeJuridique: company.formeJuridique,
          codeAPE: company.codeAPE,
          adresseSiege: company.adresse,
          updatedAt: new Date()
        },
        create: {
          siren: company.siren,
          denomination: company.denomination,
          dateCreation: company.dateCreation ? new Date(company.dateCreation) : null,
          active: company.active,
          formeJuridique: company.formeJuridique,
          codeAPE: company.codeAPE,
          adresseSiege: company.adresse
        }
      });
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
    formeJuridique: company.formeJuridique,
    adresseSiege: company.adresseSiege,
    libelleAPE: company.libelleAPE,
    codeAPE: company.codeAPE,
    dateCreation: company.dateCreation?.toISOString(),
    active: company.active
  };
}

// pages/api/companies/[siren]/index.js
import { prisma } from '../../../../lib/prisma';
import APIService from '../../../../lib/api-services';

export default async function handler(req, res) {
  const { siren } = req.query;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check local database first
    let company = await prisma.company.findUnique({
      where: { siren },
      include: {
        documents: {
          orderBy: { datePublication: 'desc' },
          take: 10
        },
        financialRatios: {
          orderBy: { year: 'desc' },
          take: 5
        }
      }
    });

    // If not found locally, fetch from SIRENE
    if (!company) {
      const sireneData = await APIService.getCompanyByIdSIREN(siren);
      
      if (!sireneData) {
        return res.status(404).json({ message: 'Entreprise non trouvée' });
      }

      // Create company in database
      company = await prisma.company.create({
        data: {
          siren: sireneData.siren,
          denomination: sireneData.denomination,
          dateCreation: sireneData.dateCreation ? new Date(sireneData.dateCreation) : null,
          active: sireneData.active,
          formeJuridique: sireneData.formeJuridique,
          codeAPE: sireneData.codeAPE,
          capitalSocial: sireneData.capitalSocial
        }
      });
    }

    // Fetch additional data from other APIs
    const additionalData = await fetchAdditionalData(siren);

    return res.status(200).json({
      ...formatCompanyForResponse(company),
      ...additionalData
    });

  } catch (error) {
    console.error('Company fetch error:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération des données',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function fetchAdditionalData(siren) {
  const additional = {};

  // Fetch BODACC publications
  try {
    const bodaccData = await APIService.getBODACCPublications(siren);
    additional.publications = bodaccData.results.slice(0, 5);
  } catch (error) {
    console.error('BODACC fetch failed:', error.message);
    additional.publications = [];
  }

  // Fetch financial ratios
  try {
    const ratiosData = await APIService.getFinancialRatios(siren);
    additional.financialRatios = ratiosData.results.slice(0, 3);
  } catch (error) {
    console.error('Financial ratios fetch failed:', error.message);
    additional.financialRatios = [];
  }

  return additional;
}

function formatCompanyForResponse(company) {
  return {
    id: company.id,
    siren: company.siren,
    denomination: company.denomination,
    formeJuridique: company.formeJuridique,
    adresseSiege: company.adresseSiege,
    libelleAPE: company.libelleAPE,
    codeAPE: company.codeAPE,
    dateCreation: company.dateCreation?.toISOString(),
    active: company.active,
    capitalSocial: company.capitalSocial,
    documents: company.documents?.map(doc => ({
      id: doc.id,
      datePublication: doc.datePublication,
      typeDocument: doc.typeDocument,
      source: doc.source,
      description: doc.description
    })) || [],
    financialRatios: company.financialRatios?.map(ratio => ({
      year: ratio.year,
      type: ratio.ratioType,
      value: ratio.value
    })) || []
  };
}
