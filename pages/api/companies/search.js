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

