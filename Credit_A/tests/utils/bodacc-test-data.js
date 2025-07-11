// tests/utils/bodacc-test-data.js - Test data and mocks for BODACC tests

export const mockBODACCApiResponse = {
  total_count: 3,
  records: [
    {
      record: {
        fields: {
          id: 'B202501222451',
          publicationavis: 'B',
          publicationavis_facette: 'Bodacc B',
          parution: '20250627',
          dateparution: '2025-06-27',
          numeroannonce: 2451,
          typeavis: 'annonce',
          typeavis_lib: 'Avis initial',
          familleavis: 'modification',
          familleavis_lib: 'Modifications diverses',
          numerodepartement: '75',
          departement_nom_officiel: 'Paris',
          region_code: 11,
          region_nom_officiel: 'Île-de-France',
          tribunal: 'Greffe du Tribunal des Activités Economiques de Paris',
          commercant: 'DANONE',
          ville: 'Paris',
          registre: ['552 032 534', '552032534'],
          cp: '75009',
          listepersonnes: '{"personne": {"numeroImmatriculation": {"numeroIdentification": "552 032 534", "codeRCS": "RCS", "nomGreffeImmat": "Paris"}, "adresseSiegeSocial": {"numeroVoie": "17", "typeVoie": "boulevard", "nomVoie": "Haussmann", "codePostal": "75009", "ville": "Paris", "pays": "france"}, "typePersonne": "pm", "denomination": "DANONE", "formeJuridique": "Société anonyme", "capital": {"montantCapital": "160948000", "devise": "EUR"}}}',
          listeetablissements: '{"etablissement": {"origineFonds": "Siège social", "qualiteEtablissement": "Etablissement principal", "activite": "Production de produits alimentaires", "adresse": {"numeroVoie": "17", "typeVoie": "boulevard", "nomVoie": "Haussmann", "codePostal": "75009", "ville": "Paris", "pays": "france"}, "siret": "55203253400001"}}',
          url_complete: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:B202501222451'
        }
      }
    },
    {
      record: {
        fields: {
          id: 'C202500996100',
          publicationavis: 'C',
          publicationavis_facette: 'Bodacc C',
          parution: '20250523',
          dateparution: '2025-05-23',
          numeroannonce: 6100,
          typeavis: 'annonce',
          typeavis_lib: 'Avis initial',
          familleavis: 'dpc',
          familleavis_lib: 'Dépôts des comptes',
          numerodepartement: '75',
          departement_nom_officiel: 'Paris',
          region_code: 11,
          region_nom_officiel: 'Île-de-France',
          tribunal: 'Greffe du Tribunal des Activités Economiques de paris',
          commercant: 'DANONE',
          ville: 'Paris',
          registre: ['552 032 534', '552032534'],
          cp: '75009',
          listepersonnes: '{"personne": {"typePersonne": "pm", "numeroImmatriculation": {"numeroIdentification": "552 032 534", "codeRCS": "RCS", "nomGreffeImmat": "Paris"}, "denomination": "DANONE", "formeJuridique": "Société anonyme"}}',
          depot: '{"dateCloture": "2024-12-31", "typeDepot": "Comptes annuels et rapports"}',
          url_complete: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:C202500996100'
        }
      }
    },
    {
      record: {
        fields: {
          id: 'A20160093860',
          publicationavis: 'A',
          publicationavis_facette: 'Bodacc A',
          parution: '20160511',
          dateparution: '2016-05-11',
          numeroannonce: 860,
          typeavis: 'annonce',
          typeavis_lib: 'Avis initial',
          familleavis: 'creation',
          familleavis_lib: 'Créations',
          numerodepartement: '75',
          departement_nom_officiel: 'Paris',
          region_code: 11,
          region_nom_officiel: 'Île-de-France',
          tribunal: 'GREFFE DU TRIBUNAL DE COMMERCE DE PARIS',
          commercant: 'SCI 147 CHARLES DE GAULLE',
          ville: 'Paris',
          registre: ['820 026 490', '820026490'],
          cp: '75009',
          listepersonnes: '{"personne": {"capital": {"montantCapital": "1000", "devise": "EUR"}, "adresseSiegeSocial": {"numeroVoie": "26", "typeVoie": "rue", "nomVoie": "Godot de Mauroy", "codePostal": "75009", "ville": "Paris", "pays": "france"}, "typePersonne": "pm", "numeroImmatriculation": {"numeroIdentification": "820 026 490", "codeRCS": "RCS", "nomGreffeImmat": "Paris"}, "denomination": "SCI 147 CHARLES DE GAULLE", "formeJuridique": "Société civile immobilière"}}',
          listeetablissements: '{"etablissement": {"origineFonds": "Création d\'un fonds de commerce", "qualiteEtablissement": "Etablissement principal", "activite": "L\'acquisition, l\'administration et la gestion par bail, location ou tout autre forme de tous immeubles et biens immobiliers", "adresse": {"numeroVoie": "26", "typeVoie": "rue", "nomVoie": "Godot de Mauroy", "codePostal": "75009", "ville": "Paris", "pays": "france"}, "siret": "82002649000001"}}',
          acte: '{"creation": {"categorieCreation": "Immatriculation d\'une personne morale (B, C, D) suite à création d\'un établissement principal"}, "dateImmatriculation": "2016-04-29", "dateCommencementActivite": "2016-04-21"}',
          url_complete: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A20160093860'
        }
      }
    }
  ]
};

export const mockEmptyBODACCResponse = {
  total_count: 0,
  records: []
};

export const mockMalformedBODACCResponse = {
  total_count: 1,
  records: [
    {
      record: {
        fields: {
          id: 'MALFORMED123',
          registre: ['123 456 789', '123456789'],
          commercant: 'Test Company',
          listepersonnes: 'invalid json{',
          listeetablissements: '{"malformed": json}'
        }
      }
    }
  ]
};

export const mockBODACCError404 = {
  response: {
    status: 404,
    statusText: 'Not Found',
    data: { message: 'No records found' }
  }
};

export const mockBODACCError500 = {
  response: {
    status: 500,
    statusText: 'Internal Server Error',
    data: { message: 'Server error' }
  }
};

export const mockNetworkTimeoutError = {
  code: 'ECONNABORTED',
  message: 'timeout of 5000ms exceeded'
};

export const mockNetworkError = {
  code: 'ENOTFOUND',
  message: 'getaddrinfo ENOTFOUND bodacc-datadila.opendatasoft.com'
};

// Helper functions for creating test data
export function createMockBODACCRecord(overrides = {}) {
  return {
    record: {
      fields: {
        id: 'TEST123',
        registre: ['123 456 789', '123456789'],
        commercant: 'Test Company',
        dateparution: '2025-01-01',
        familleavis_lib: 'Test Type',
        tribunal: 'Test Tribunal',
        ville: 'Paris',
        cp: '75001',
        numeroannonce: 123,
        listepersonnes: '{"personne": {"formeJuridique": "SA", "capital": {"montantCapital": "1000", "devise": "EUR"}}}',
        listeetablissements: '{"etablissement": {"activite": "Test Activity", "adresse": {"ville": "Paris"}}}',
        ...overrides
      }
    }
  };
}

export function createMockBODACCResponse(records = [], totalCount = null) {
  return {
    total_count: totalCount ?? records.length,
    records: records.map(record => 
      typeof record === 'object' && record.record ? record : createMockBODACCRecord(record)
    )
  };
}

// Test data for different scenarios
export const testScenarios = {
  validSiren: '552032534',
  invalidSiren: '999999999',
  malformedSiren: 'invalid',
  emptySiren: '',
  
  validCompanyWithEstablishments: {
    siren: '820026490',
    expectedFields: ['formeJuridique', 'capital', 'activite', 'adresse']
  },
  
  largeCompany: {
    siren: '552032534',
    expectedName: 'DANONE',
    expectedRecordCount: 100 // Approximate
  }
};

// Mock axios responses for different test scenarios
export const axiosMocks = {
  success: (data = mockBODACCApiResponse) => ({
    data
  }),
  
  error404: () => {
    const error = new Error('Request failed with status code 404');
    error.response = mockBODACCError404.response;
    throw error;
  },
  
  error500: () => {
    const error = new Error('Request failed with status code 500');
    error.response = mockBODACCError500.response;
    throw error;
  },
  
  timeout: () => {
    const error = new Error('timeout of 5000ms exceeded');
    error.code = 'ECONNABORTED';
    throw error;
  },
  
  networkError: () => {
    const error = new Error('getaddrinfo ENOTFOUND');
    error.code = 'ENOTFOUND';
    throw error;
  }
};

// Expected formatted results for assertions
export const expectedFormattedResults = {
  danone: {
    siren: '552032534',
    siret: '55203253400001',
    denomination: 'DANONE',
    formeJuridique: 'Société anonyme',
    capital: '160948000',
    ville: 'Paris',
    codePostal: '75009'
  },
  
  sci: {
    siren: '820026490',
    siret: '82002649000001',
    denomination: 'SCI 147 CHARLES DE GAULLE',
    formeJuridique: 'Société civile immobilière',
    capital: '1000',
    ville: 'Paris',
    codePostal: '75009'
  }
};