// lib/result-standardizer.js - Standardize search results from different sources
import { getLegalForm, getLegalCategory } from './legal-forms';

// Effectif ranges mapping
const EFFECTIF_MAPPING = {
  '00': 'Non renseigné',
  '01': '1 ou 2 salariés',
  '02': '3 à 5 salariés',
  '03': '6 à 9 salariés',
  '11': '10 à 19 salariés',
  '12': '20 à 49 salariés',
  '21': '50 à 99 salariés',
  '22': '100 à 199 salariés',
  '31': '200 à 249 salariés',
  '32': '250 à 499 salariés',
  '41': '500 à 999 salariés',
  '42': '1 000 à 1 999 salariés',
  '51': '2 000 à 4 999 salariés',
  '52': '5 000 à 9 999 salariés',
  '53': '10 000 salariés ou plus'
};

function getEffectifLabel(code) {
  if (!code) return 'Non renseigné';
  return EFFECTIF_MAPPING[code] || `${code} salariés`;
}

// Standardize company data structure
export function standardizeCompanyResult(company, source = 'unknown') {
  if (!company) return null;

  // Ensure we have a SIREN
  let siren = company.siren;
  if (!siren && company.siret) {
    siren = company.siret.substring(0, 9);
  }
  
  if (!siren) return null;

  // Format date safely
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return null;
    }
  };

  // Clean and format denomination
  const denomination = (company.denomination || 
                       company.commercant || 
                       company.denominationUniteLegale ||
                       company.raisonSociale ||
                       'Entreprise sans nom').trim();

  // Standardize legal form
  const rawLegalForm = company.formeJuridique || 
                      company.forme_juridique ||
                      company.categorieJuridique || 
                      company.categorieJuridiqueUniteLegale;
  let formeJuridique = getLegalForm(rawLegalForm);
  
  // Only show fallback if we don't have enriched data
  if (!formeJuridique && !company._enriched) {
    formeJuridique = 'Non renseignée';
  }

  // Standardize address - only add fallback if not enriched
  let adresseSiege = company.adresseSiege || 
                     company.adresse_siege ||
                     company.adresse || 
                     formatAddress(company.adresseEtablissement) ||
                     formatBodaccAddress(company);
                     
  // Only add fallback text if we don't have enriched data
  if (!adresseSiege && !company._enriched) {
    adresseSiege = 'Adresse non renseignée';
  }

  // Standardize activity codes
  const codeAPE = company.codeAPE || 
                 company.activitePrincipaleUniteLegale || 
                 company.ape ||
                 null;

  const libelleAPE = company.libelleAPE || 
                    company.libelle_ape ||
                    company.activite || 
                    (codeAPE ? `${codeAPE}` : null);

  // Standardize effectif
  const effectifCode = company.effectif || 
                      company.trancheEffectifsUniteLegale || 
                      company.trancheEffectif;
  const effectif = getEffectifLabel(effectifCode);

  // Determine status
  let active = true;
  if (company.active !== undefined) {
    active = company.active;
  } else if (company.etatAdministratifUniteLegale) {
    active = company.etatAdministratifUniteLegale === 'A';
  } else if (company.etatAdministratif) {
    active = company.etatAdministratif === 'A';
  }

  // Create standardized result
  const standardized = {
    id: company.id || `${source}-${siren}`,
    siren: siren,
    siret: company.siret || (siren ? `${siren}00001` : null),
    denomination: denomination,
    formeJuridique: formeJuridique,
    categorieJuridique: getLegalCategory(rawLegalForm),
    adresseSiege: adresseSiege,
    codeAPE: codeAPE,
    libelleAPE: libelleAPE,
    effectif: effectif,
    dateCreation: formatDate(company.dateCreation || company.dateCreationEtablissement),
    dateImmatriculation: formatDate(company.dateImmatriculation),
    active: active,
    capitalSocial: company.capitalSocial || company.capital || null,
    source: source,
    
    // Source-specific data
    ...(source === 'bodacc' && company.lastAnnouncement && {
      lastAnnouncement: company.lastAnnouncement
    }),
    
    // Additional metadata
    dataQuality: calculateDataQuality(company, source),
    completeness: calculateCompleteness(company)
  };

  return standardized;
}

// Calculate data quality score (0-100)
function calculateDataQuality(company, source) {
  let score = 0;
  
  // Base score by source reliability
  switch (source) {
    case 'local': score += 30; break;
    case 'insee': score += 25; break;
    case 'bodacc': score += 20; break;
    default: score += 10; break;
  }
  
  // Bonus for having key fields
  if (company.denomination) score += 15;
  if (company.siren && /^\d{9}$/.test(company.siren)) score += 15;
  if (company.formeJuridique || company.categorieJuridique) score += 10;
  if (company.adresseSiege || company.adresse) score += 10;
  if (company.codeAPE) score += 10;
  if (company.dateCreation) score += 10;
  if (company.effectif) score += 5;
  if (company.capitalSocial) score += 5;
  
  return Math.min(100, score);
}

// Calculate completeness percentage
function calculateCompleteness(company) {
  const fields = [
    'denomination', 'siren', 'formeJuridique', 'adresseSiege',
    'codeAPE', 'dateCreation', 'effectif', 'capitalSocial'
  ];
  
  const filledFields = fields.filter(field => {
    const value = company[field] || company[field.replace('Siege', '')] || company[field + 'UniteLegale'];
    return value && value !== 'Non renseigné' && value !== 'N/A';
  });
  
  return Math.round((filledFields.length / fields.length) * 100);
}

// Format INSEE address
function formatAddress(adresse) {
  if (!adresse) return null;
  
  const parts = [
    adresse.numeroVoieEtablissement,
    adresse.typeVoieEtablissement,
    adresse.libelleVoieEtablissement,
    adresse.codePostalEtablissement,
    adresse.libelleCommuneEtablissement
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(' ') : null;
}

// Format BODACC address
function formatBodaccAddress(company) {
  if (!company.ville && !company.departement) return null;
  
  const parts = [
    company.ville,
    company.codePostal || company.cp,
    company.departement || company.departement_nom_officiel
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : null;
}

// Sort results by quality and relevance
export function sortResultsByQuality(results, query = '') {
  return results.sort((a, b) => {
    // First, sort by data quality
    const qualityDiff = (b.dataQuality || 0) - (a.dataQuality || 0);
    if (qualityDiff !== 0) return qualityDiff;
    
    // Then by query relevance (exact matches first)
    const aExact = a.denomination?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    const bExact = b.denomination?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    const relevanceDiff = bExact - aExact;
    if (relevanceDiff !== 0) return relevanceDiff;
    
    // Then by completeness
    const completenessDiff = (b.completeness || 0) - (a.completeness || 0);
    if (completenessDiff !== 0) return completenessDiff;
    
    // Finally by status (active first)
    const statusDiff = (b.active ? 1 : 0) - (a.active ? 1 : 0);
    return statusDiff;
  });
}

// Group results by source for display
export function groupResultsBySource(results) {
  const groups = {
    local: [],
    insee: [],
    bodacc: [],
    other: []
  };
  
  results.forEach(result => {
    const source = result.source || 'other';
    if (groups[source]) {
      groups[source].push(result);
    } else {
      groups.other.push(result);
    }
  });
  
  return groups;
}

export default {
  standardizeCompanyResult,
  sortResultsByQuality,
  groupResultsBySource
};