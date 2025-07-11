// tests/unit/bodacc-api.test.js - Comprehensive BODACC API tests
import BODACCAPIService from '../../lib/bodacc-api.js';

// Mock axios to control API responses
jest.mock('axios');
const axios = require('axios');

describe('BODACC API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnnouncementsBySiren', () => {
    it('should format SIREN correctly and return announcements', async () => {
      const mockResponse = {
        data: {
          total_count: 2,
          records: [
            {
              record: {
                fields: {
                  id: 'B202501222451',
                  registre: ['552 032 534', '552032534'],
                  commercant: 'DANONE',
                  dateparution: '2025-06-27',
                  familleavis_lib: 'Modifications diverses',
                  tribunal: 'Greffe du Tribunal des Activités Economiques de Paris',
                  ville: 'Paris',
                  cp: '75009',
                  listepersonnes: '{"personne": {"formeJuridique": "Société anonyme", "capital": {"montantCapital": "160948000", "devise": "EUR"}}}',
                  listeetablissements: '{"etablissement": {"activite": "Production alimentaire", "adresse": {"ville": "Paris", "codePostal": "75009"}}}',
                  url_complete: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:B202501222451'
                }
              }
            }
          ]
        }
      };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await BODACCAPIService.getAnnouncementsBySiren('552032534');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records'),
        expect.objectContaining({
          params: expect.objectContaining({
            where: 'registre like "552 032 534%"',
            limit: 20,
            order_by: 'dateparution desc'
          }),
          timeout: 5000,
          headers: expect.objectContaining({
            'User-Agent': 'DataCorp-Platform/1.0'
          })
        })
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          id: 'B202501222451',
          siren: '552032534',
          siret: '55203253400001',
          denomination: 'DANONE',
          formeJuridique: 'Société anonyme',
          capital: '160948000',
          personnes: expect.objectContaining({
            formeJuridique: 'Société anonyme',
            capital: expect.objectContaining({
              montantCapital: '160948000',
              devise: 'EUR'
            })
          }),
          etablissements: expect.objectContaining({
            activite: 'Production alimentaire',
            adresse: expect.objectContaining({
              ville: 'Paris',
              codePostal: '75009'
            })
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'No records found' }
        }
      };

      axios.get.mockRejectedValueOnce(mockError);

      await expect(BODACCAPIService.getAnnouncementsBySiren('999999999'))
        .rejects
        .toThrow('Aucune annonce BODACC trouvée.');
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';

      axios.get.mockRejectedValueOnce(timeoutError);

      await expect(BODACCAPIService.getAnnouncementsBySiren('552032534'))
        .rejects
        .toThrow('Timeout BODACC - service lent');
    });

    it('should handle network connection issues', async () => {
      const networkError = new Error('getaddrinfo ENOTFOUND');
      networkError.code = 'ENOTFOUND';

      axios.get.mockRejectedValueOnce(networkError);

      await expect(BODACCAPIService.getAnnouncementsBySiren('552032534'))
        .rejects
        .toThrow('Impossible de joindre le serveur BODACC');
    });
  });

  describe('formatAnnouncements', () => {
    it('should parse JSON fields correctly', () => {
      const mockData = {
        total_count: 1,
        records: [
          {
            record: {
              fields: {
                id: 'test123',
                registre: ['820 026 490', '820026490'],
                commercant: 'Test Company',
                listepersonnes: '{"personne": {"formeJuridique": "SCI", "capital": {"montantCapital": "1000", "devise": "EUR"}}}',
                listeetablissements: '{"etablissement": {"activite": "Test activity", "adresse": {"ville": "Paris", "codePostal": "75009"}}}'
              }
            }
          }
        ]
      };

      const result = BODACCAPIService.formatAnnouncements(mockData);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          siren: '820026490',
          denomination: 'Test Company',
          formeJuridique: 'SCI',
          capital: '1000',
          personnes: expect.objectContaining({
            formeJuridique: 'SCI',
            capital: expect.objectContaining({
              montantCapital: '1000',
              devise: 'EUR'
            })
          }),
          etablissements: expect.objectContaining({
            activite: 'Test activity',
            adresse: expect.objectContaining({
              ville: 'Paris',
              codePostal: '75009'
            })
          })
        })
      );
    });

    it('should handle malformed JSON fields gracefully', () => {
      const mockData = {
        total_count: 1,
        records: [
          {
            record: {
              fields: {
                id: 'test123',
                registre: ['820 026 490', '820026490'],
                commercant: 'Test Company',
                listepersonnes: 'invalid json{',
                listeetablissements: '{"malformed": json}'
              }
            }
          }
        ]
      };

      const result = BODACCAPIService.formatAnnouncements(mockData);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          siren: '820026490',
          denomination: 'Test Company',
          formeJuridique: null,
          capital: null,
          personnes: {},
          etablissements: {}
        })
      );
    });

    it('should extract SIREN from various registre formats', () => {
      const testCases = [
        {
          registre: ['552 032 534', '552032534'],
          expected: '552032534'
        },
        {
          registre: '552032534,552 032 534',
          expected: '552032534'
        },
        {
          registre: '552032534',
          expected: '552032534'
        }
      ];

      testCases.forEach(({ registre, expected }) => {
        const mockData = {
          total_count: 1,
          records: [
            {
              record: {
                fields: {
                  id: 'test',
                  registre,
                  commercant: 'Test'
                }
              }
            }
          ]
        };

        const result = BODACCAPIService.formatAnnouncements(mockData);
        // Handle both array and string formats
        const actualSiren = result.results[0].siren;
        expect(actualSiren.replace(/\s+/g, '')).toBe(expected);
      });
    });

    it('should filter out records without valid SIREN', () => {
      const mockData = {
        total_count: 2,
        records: [
          {
            record: {
              fields: {
                id: 'valid',
                registre: ['552 032 534', '552032534'],
                commercant: 'Valid Company'
              }
            }
          },
          {
            record: {
              fields: {
                id: 'invalid',
                registre: null,
                commercant: 'Invalid Company'
              }
            }
          }
        ]
      };

      const result = BODACCAPIService.formatAnnouncements(mockData);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].siren).toBe('552032534');
    });

    it('should return empty results for null/undefined data', () => {
      expect(BODACCAPIService.formatAnnouncements(null)).toEqual({
        results: [],
        total: 0
      });

      expect(BODACCAPIService.formatAnnouncements({})).toEqual({
        results: [],
        total: 0
      });

      expect(BODACCAPIService.formatAnnouncements({ records: null })).toEqual({
        results: [],
        total: 0
      });
    });
  });

  describe('searchByName', () => {
    it('should search by company name correctly', async () => {
      const mockResponse = {
        data: {
          total_count: 1,
          records: [
            {
              record: {
                fields: {
                  id: 'test',
                  registre: ['552 032 534', '552032534'],
                  commercant: 'DANONE'
                }
              }
            }
          ]
        }
      };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await BODACCAPIService.searchByName('DANONE');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records'),
        expect.objectContaining({
          params: expect.objectContaining({
            where: 'commercant like "%DANONE%"',
            limit: 20,
            order_by: 'dateparution desc'
          })
        })
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].denomination).toBe('DANONE');
    });
  });

  describe('getCompanyStatistics', () => {
    it('should generate statistics from announcements', async () => {
      const mockResponse = {
        data: {
          total_count: 3,
          records: [
            {
              record: {
                fields: {
                  id: '1',
                  registre: ['552 032 534', '552032534'],
                  familleavis_lib: 'Modifications diverses'
                }
              }
            },
            {
              record: {
                fields: {
                  id: '2',
                  registre: ['552 032 534', '552032534'],
                  familleavis_lib: 'Modifications diverses'
                }
              }
            },
            {
              record: {
                fields: {
                  id: '3',
                  registre: ['552 032 534', '552032534'],
                  familleavis_lib: 'Dépôts des comptes'
                }
              }
            }
          ]
        }
      };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await BODACCAPIService.getCompanyStatistics('552032534');

      expect(result).toEqual([
        { type: 'Modifications diverses', count: 2 },
        { type: 'Dépôts des comptes', count: 1 }
      ]);
    });
  });

  describe('testConnectivity', () => {
    it('should return true for successful connection', async () => {
      const mockResponse = {
        data: {
          total_count: 100,
          records: []
        }
      };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await BODACCAPIService.testConnectivity();

      expect(result).toBe(true);
    });

    it('should return false for connection failure', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await BODACCAPIService.testConnectivity();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should map HTTP status codes to French error messages', () => {
      const testCases = [
        { status: 400, expected: 'Requête BODACC invalide. Vérifiez les paramètres.' },
        { status: 404, expected: 'Aucune annonce BODACC trouvée.' },
        { status: 429, expected: 'Limite de requêtes BODACC atteinte. Réessayez dans quelques instants.' },
        { status: 500, expected: 'Erreur serveur BODACC. Réessayez plus tard.' },
        { status: 502, expected: 'Service BODACC temporairement indisponible.' },
        { status: 503, expected: 'Service BODACC temporairement indisponible.' }
      ];

      testCases.forEach(({ status, expected }) => {
        const error = {
          response: {
            status,
            statusText: 'Test Error',
            data: { message: 'Test message' }
          }
        };

        const result = BODACCAPIService.handleError(error);
        expect(result.message).toBe(expected);
      });
    });

    it('should handle network error codes', () => {
      const testCases = [
        { code: 'ENOTFOUND', expected: 'Impossible de joindre le serveur BODACC' },
        { code: 'ECONNREFUSED', expected: 'Connexion refusée par le serveur BODACC' },
        { code: 'ECONNABORTED', expected: 'Timeout BODACC - service lent' },
        { code: 'ETIMEDOUT', expected: 'Timeout BODACC - service lent' }
      ];

      testCases.forEach(({ code, expected }) => {
        const error = { code };
        const result = BODACCAPIService.handleError(error);
        expect(result.message).toBe(expected);
      });
    });
  });
});