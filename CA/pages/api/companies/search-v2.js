// pages/api/companies/search-v2.js - COMPLETE REPLACEMENT
const { prisma } = require('../../../lib/prisma');
const INSEEAPIService = require('../../../lib/insee-api');
const axios = require('axios');

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
      errors: []
    };

    console.log(`🔍 Search for: "${q}"`);

    // 1. Search local database (SQLite compatible)
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

    // 2. Search INSEE API
    if (source === 'all' || source === 'insee') {
      try {
        console.log('🏛️ Searching INSEE API...');
        const inseeResults = await INSEEAPIService.searchCompanies(q);
        results.insee = inseeResults.results || [];
        console.log(`   Found ${results.insee.length} INSEE results`);
      } catch (error) {
        console.error('INSEE search error:', error);
        results.errors.push({ source: 'insee', message: error.message });
      }
    }

    // 3. Search BODACC API with FIXED SIREN extraction
    if (source === 'all' || source === 'bodacc') {
      try {
        console.log('📰 Searching BODACC API...');
        
        const bodaccResponse = await axios.get('https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records', {
          params: {
            where: `commercant like "%${q}%"`,
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
        console.error('BODACC search error:', error);
        results.errors.push({ source: 'bodacc', message: 'BODACC API erreur' });
      }
    }

    // Merge all results
    const mergedResults = mergeSearchResults(results);
    console.log(`✅ Total merged results: ${mergedResults.length}`);

    return res.status(200).json({
      success: true,
      query: q,
      results: mergedResults,
      sources: {
        local: results.local.length,
        insee: results.insee.length,
        bodacc: results.bodacc.length
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

// Merge results from all sources
function mergeSearchResults(results) {
  const seen = new Set();
  const merged = [];

  // Add local results first
  results.local.forEach(company => {
    if (company.siren) {
      seen.add(company.siren);
      merged.push({
        ...company,
        source: 'local',
        id: company.id,
        active: company.active ?? true,
        dateCreation: company.dateCreation?.toISOString ? company.dateCreation.toISOString() : company.dateCreation
      });
    }
  });

  // Add INSEE results
  results.insee.forEach(company => {
    let siren = company.siren;
    if (!siren && company.siret) {
      siren = company.siret.substring(0, 9);
    }
    
    if (siren && !seen.has(siren)) {
      seen.add(siren);
      merged.push({
        ...company,
        siren: siren,
        source: 'insee',
        id: `insee-${siren}`,
        adresseSiege: company.adresse || company.adresseSiege,
        formeJuridique: company.formeJuridique || company.categorieJuridique
      });
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
        adresseSiege: announcement.adresse,
        active: true,
        source: 'bodacc',
        id: `bodacc-${announcement.siren}`,
        lastAnnouncement: {
          type: announcement.typeAnnonce,
          date: announcement.dateParution,
          tribunal: announcement.tribunal
        }
      });
    }
  });

  return merged.slice(0, 20);
}
