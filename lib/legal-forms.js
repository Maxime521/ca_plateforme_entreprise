// lib/legal-forms.js - Legal form mappings for French companies
// Based on official INSEE categorieJuridique codes

export const LEGAL_FORMS = {
  // Sociétés commerciales
  '5499': 'SA',
  '5505': 'SA à participation ouvrière',
  '5510': 'SAS',
  '5515': 'SASU',
  '5520': 'SARL',
  '5525': 'EURL',
  '5530': 'SNC',
  '5540': 'SCS',
  '5550': 'SCA',
  '5555': 'SEM',
  '5560': 'SEML',
  '5570': 'SCIC',
  '5580': 'SCOP',
  '5585': 'SCOP à forme SARL',
  '5590': 'Société anonyme simplifiée',
  '5595': 'SASU (Société par actions simplifiée unipersonnelle)',
  '5599': 'SA (Société anonyme)',
  
  // Sociétés civiles et autres
  '6100': 'Caisse d\'épargne et de prévoyance',
  '6210': 'GEIE',
  '6220': 'GIE',
  '6316': 'SICA',
  '6317': 'SICAV',
  '6318': 'Société de placement à prépondérance immobilière',
  '6411': 'SA coopérative',
  '6521': 'SARL coopérative',
  '6532': 'SCOP',
  '6533': 'SCIC',
  '6534': 'SCOP d\'HLM',
  '6535': 'SCOP de construction',
  '6536': 'SCOP de consommation',
  '6537': 'SCOP de crédit',
  '6538': 'SCOP de service',
  '6539': 'SCOP de production',
  '6540': 'SCOP de transport',
  '6541': 'SCOP artisanale',
  '6542': 'SCOP maritime',
  '6543': 'SCOP agricole',
  '6544': 'SCOP de pêche',
  '6545': 'Union de coopératives',
  '6546': 'SCOP de HLM',
  '6547': 'Société coopérative de crédit mutuel',
  
  // Organismes publics
  '7111': 'Autorité administrative indépendante',
  '7112': 'Régie d\'une collectivité locale à caractère administratif',
  '7113': 'Régie d\'une collectivité locale à caractère industriel ou commercial',
  '7120': 'Service départemental d\'incendie et de secours',
  '7160': 'Établissement public local d\'enseignement',
  '7210': 'Commune',
  '7220': 'Département',
  '7225': 'Collectivité territoriale d\'outre-mer',
  '7229': 'Région',
  '7230': 'Communauté urbaine',
  '7231': 'Communauté d\'agglomération',
  '7232': 'Communauté de communes',
  '7233': 'District',
  '7234': 'Syndicat intercommunal à vocation multiple',
  '7235': 'Syndicat intercommunal à vocation unique',
  '7236': 'Communauté de villes',
  '7237': 'Communauté de communes ou communauté d\'agglomération',
  
  // Associations et fondations
  '9110': 'Association non déclarée',
  '9150': 'Association déclarée',
  '9160': 'Association déclarée reconnue d\'utilité publique',
  '9170': 'Fondation',
  '9190': 'Association de droit local',
  '9210': 'Congrégation',
  '9220': 'Association diocésaine',
  '9230': 'Mense épiscopale',
  '9240': 'Fabrique de paroisse',
  '9260': 'Association cultuelle de la loi de 1905',
  '9300': 'Fondation d\'entreprise',
  '9900': 'Personne morale de droit étranger'
};

// Function to get readable legal form
export function getLegalForm(code) {
  if (!code) return 'Non renseignée';
  
  // Handle both string and number codes
  const codeStr = String(code);
  
  // Return mapped form or fallback with code
  return LEGAL_FORMS[codeStr] || `Forme juridique ${codeStr}`;
}

// Function to get category from legal form code
export function getLegalCategory(code) {
  if (!code) return 'Autre';
  
  const codeStr = String(code);
  const firstTwo = codeStr.substring(0, 2);
  
  switch (firstTwo) {
    case '54':
    case '55':
    case '56':
    case '57':
    case '58':
    case '59':
      return 'Société commerciale';
    case '61':
    case '62':
    case '63':
    case '64':
    case '65':
      return 'Société civile/coopérative';
    case '71':
    case '72':
      return 'Organisme public';
    case '91':
    case '92':
    case '93':
      return 'Association/Fondation';
    case '99':
      return 'Personne morale étrangère';
    default:
      return 'Autre';
  }
}

export default { LEGAL_FORMS, getLegalForm, getLegalCategory };