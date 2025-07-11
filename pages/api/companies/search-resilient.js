// pages/api/companies/search-resilient.js
// A resilient version that works even with partial INSEE access

import { prisma } from '../../../lib/prisma';
import BODACCAPIService from '../../../lib/bodacc-api';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { q, source = 'all' } = req.query;

  if (!q || q.length < 3) {
    return res.status(400).json({ message: 'Query must be at least 3 characters' });
  }

  try {
    const results = {
      local: [],
      insee: [],
      bodacc: [],
      mock: [],
      errors: []
    };

    console.log(`🔍 Resilient search for: "${q}"`);

    // 1. Search local database
    if (source === 'all' || source === 'local') {
      try {
        const localResults = await prisma.company.findMany({
          where: {
            OR: [
              { siren: { contains: q } },
              { denomination: { contains: q } }
            ]
          },
          take: 10
        });
        results.local = localResults;
        console.log(`📂 Found ${localResults.length} local results`);
      } catch (error) {
        console.error('Local search error:', error);
        results.errors.push({ source: 'local', message: error.message });
      }
    }

    // 2. Try INSEE with multiple fallback strategies
    if (source === 'all' || source === 'insee') {
      const inseeResults = await tryINSEESearch(q);
      results.insee = inseeResults.results || [];
      if (inseeResults.error) {
        results.errors.push(inseeResults.error);
      }
      console.log(`🏛️ Found ${results.insee.length} INSEE results`);
    }

    // 3. Search BODACC (working)
    if (source === 'all' || source === 'bodacc') {
      try {
        const bodaccResults = await BODACCAPIService.searchByName(q);
        results.bodacc = bodaccResults.results || [];
        console.log(`📰 Found ${results.bodacc.length} BODACC results`);
      } catch (error) {
        console.error('BODACC search error:', error);
        results.errors.push({ source: 'bodacc', message: error.message });
      }
    }

    // 4. Add mock data if we have very few results
    const totalResults = results.local.length + results.insee.length + results.bodacc.length;
    if (totalResults < 3) {
      results.mock = getMockCompanies(q);
      console.log(`🎭 Added ${results.mock.length} mock results`);
    }

    // Merge all results
    const mergedResults = mergeAllResults(results);
    console.log(`✅ Total merged results: ${mergedResults.length}`);

    return res.status(200).json({
      success: true,
      query: q,
      results: mergedResults,
      sources: {
        local: results.local.length,
        insee: results.insee.length,
        bodacc: results.bodacc.length,
        mock: results.mock.length
      },
      errors: results.errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la recherche',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Try INSEE with multiple strategies
async function tryINSEESearch(query) {
  const consumerKey = process.env.INSEE_CONSUMER_KEY;
  const consumerSecret = process.env.INSEE_CONSUMER_SECRET;
  
  if (!consumerKey || !consumerSecret) {
    return { results: [], error: { source: 'insee', message: 'Missing credentials' } };
  }

  try {
    // Get token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await axios.post(
      'https://api.insee.fr/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Strategy 1: Try SIREN lookup if query looks like SIREN
    if (/^\d{9}$/.test(query)) {
      try {
        const response = await axios.get(
          `https://api.insee.fr/entreprises/sirene/V3.11/siren/${query}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          }
        );

        return {
          results: [{
            siren: response.data.uniteLegale.siren,
            denomination: response.data.uniteLegale.denominationUniteLegale,
            dateCreation: response.data.uniteLegale.dateCreationUniteLegale,
            active: response.data.uniteLegale.etatAdministratifUniteLegale === 'A',
            formeJuridique: response.data.uniteLegale.categorieJuridiqueUniteLegale,
            codeAPE: response.data.uniteLegale.activitePrincipaleUniteLegale
          }]
        };
      } catch (error) {
        console.log('SIREN lookup failed, trying search...');
      }
    }

    // Strategy 2: Try simple search
    const searchStrategies = [
      { q: query, nombre: 5 },
      { q: `denominationUniteLegale:${query}`, nombre: 5 },
      { q: query, nombre: 3, debut: 0 }
    ];

    for (const params of searchStrategies) {
      try {
        const response = await axios.get(
          'https://api.insee.fr/entreprises/sirene/V3.11/siret',
          {
            params,
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          }
        );

        if (response.data.etablissements && response.data.etablissements.length > 0) {
          return {
            results: response.data.etablissements.map(etablissement => ({
              siren: etablissement.uniteLegale.siren,
              siret: etablissement.siret,
              denomination: etablissement.uniteLegale.denominationUniteLegale,
              dateCreation: etablissement.uniteLegale.dateCreationUniteLegale,
              active: etablissement.uniteLegale.etatAdministratifUniteLegale === 'A',
              formeJuridique: etablissement.uniteLegale.categorieJuridiqueUniteLegale,
              codeAPE: etablissement.uniteLegale.activitePrincipaleUniteLegale,
              adresse: formatINSEEAddress(etablissement.adresseEtablissement)
            }))
          };
        }
      } catch (error) {
        console.log(`Strategy failed: ${JSON.stringify(params)}`);
        continue;
      }
    }

    return { results: [], error: { source: 'insee', message: 'No results found' } };

  } catch (error) {
    return { 
      results: [], 
      error: { 
        source: 'insee', 
        message: `API Error: ${error.response?.status || error.message}` 
      } 
    };
  }
}

// Format INSEE address
function formatINSEEAddress(adresse) {
  if (!adresse) return '';
  
  const parts = [
    adresse.numeroVoieEtablissement,
    adresse.typeVoieEtablissement,
    adresse.libelleVoieEtablissement,
    adresse.codePostalEtablissement,
    adresse.libelleCommuneEtablissement
  ].filter(Boolean);
  
  return parts.join(' ');
}

// Get mock companies for testing
function getMockCompanies(query) {
  const mockCompanies = [
    {
      siren: '542107651',
      denomination: 'CARREFOUR FRANCE',
      formeJuridique: 'SAS',
      adresseSiege: '93 AVENUE DE PARIS 91300 MASSY',
      codeAPE: '4711D',
      libelleAPE: 'Supermarchés',
      active: true,
      dateCreation: '1960-01-01T00:00:00.000Z'
    },
    {
      siren: '552032534',
      denomination: 'DANONE',
      formeJuridique: 'SA',
      adresseSiege: '17 BOULEVARD HAUSSMANN 75009 PARIS',
      codeAPE: '1051C',
      libelleAPE: 'Fabrication de fromage',
      active: true,
      dateCreation: '1919-01-01T00:00:00.000Z'
    },
    {
      siren: '775665135',
      denomination: 'FRANCE TELECOM SA',
      formeJuridique: 'SA',
      adresseSiege: '78 RUE OLIVIER DE SERRES 75015 PARIS',
      codeAPE: '6110Z',
      libelleAPE: 'Télécommunications filaires',
      active: true,
      dateCreation: '1988-01-01T00:00:00.000Z'
    }
  ];

  return mockCompanies.filter(company => 
    company.siren.includes(query) || 
    company.denomination.toLowerCase().includes(query.toLowerCase())
  );
}

// Merge all results
function mergeAllResults(results) {
  const seen = new Set();
  const merged = [];

  // Add local results first
  results.local.forEach(company => {
    if (company.siren) {
      seen.add(company.siren);
      merged.push({ ...company, source: 'local' });
    }
  });

  // Add INSEE results
  results.insee.forEach(company => {
    if (company.siren && !seen.has(company.siren)) {
      seen.add(company.siren);
      merged.push({ ...company, source: 'insee', id: `insee-${company.siren}` });
    }
  });

  // Add BODACC results
  results.bodacc.forEach(announcement => {
    if (announcement.siren && !seen.has(announcement.siren)) {
      seen.add(announcement.siren);
      merged.push({
        siren: announcement.siren,
        denomination: announcement.denomination,
        formeJuridique: announcement.formeJuridique,
        adresseSiege: `${announcement.ville || ''} ${announcement.codePostal || ''}`.trim(),
        active: true,
        source: 'bodacc',
        id: `bodacc-${announcement.siren}`,
        lastAnnouncement: {
          type: announcement.typeAnnonce,
          date: announcement.dateParution
        }
      });
    }
  });

  // Add mock results if needed
  results.mock.forEach(company => {
    if (company.siren && !seen.has(company.siren)) {
      seen.add(company.siren);
      merged.push({ ...company, source: 'mock', id: `mock-${company.siren}` });
    }
  });

  return merged.slice(0, 20);
}
