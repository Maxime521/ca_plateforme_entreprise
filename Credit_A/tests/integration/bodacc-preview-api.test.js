// tests/integration/bodacc-preview-api.test.js - Integration tests for BODACC preview API
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/documents/preview-bodacc.js';

// Mock fetch to control external API responses
global.fetch = jest.fn();

describe('/api/documents/preview-bodacc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should return HTML preview for valid SIREN', async () => {
      const mockBODACCResponse = {
        total_count: 1,
        records: [
          {
            record: {
              fields: {
                id: 'B202501222451',
                publicationavis: 'B',
                dateparution: '2025-06-27',
                familleavis_lib: 'Modifications diverses',
                tribunal: 'Greffe du Tribunal des Activités Economiques de Paris',
                commercant: 'DANONE',
                ville: 'Paris',
                cp: '75009',
                numeroannonce: 2451,
                listepersonnes: '{"personne": {"formeJuridique": "SA", "capital": {"montantCapital": "160948000", "devise": "EUR"}}}',
                listeetablissements: '{"etablissement": {"activite": "Production alimentaire", "adresse": {"ville": "Paris", "codePostal": "75009"}}}'
              }
            }
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBODACCResponse)
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { siren: '552032534' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()['content-type']).toBe('text/html; charset=utf-8');
      
      const htmlResponse = res._getData();
      expect(htmlResponse).toContain('<!DOCTYPE html>');
      expect(htmlResponse).toContain('BODACC - Annonces Commerciales');
      expect(htmlResponse).toContain('SIREN: 552032534');
      expect(htmlResponse).toContain('1 annonce(s) trouvée(s)');
      expect(htmlResponse).toContain('DANONE');
      expect(htmlResponse).toContain('Modifications diverses');
      expect(htmlResponse).toContain('Paris (75009)');
      expect(htmlResponse).toContain('Société anonyme');
      expect(htmlResponse).toContain('160 948 000 EUR');
      expect(htmlResponse).toContain('Production alimentaire');
    });

    it('should use default SIREN when none provided', async () => {
      const mockResponse = {
        total_count: 0,
        records: []
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {} // No SIREN provided
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('552%20032%20534') // Default SIREN formatted
      );
    });

    it('should display no records message when no announcements found', async () => {
      const mockResponse = {
        total_count: 0,
        records: []
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { siren: '999999999' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const htmlResponse = res._getData();
      expect(htmlResponse).toContain('0 annonce(s) trouvée(s)');
      expect(htmlResponse).toContain('Aucune annonce trouvée pour ce SIREN');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { siren: '552032534' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(502);
      expect(res._getHeaders()['content-type']).toBe('text/html; charset=utf-8');
      
      const htmlResponse = res._getData();
      expect(htmlResponse).toContain('Erreur BODACC');
      expect(htmlResponse).toContain('Impossible de charger les données BODACC');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network timeout'));

      const { req, res } = createMocks({
        method: 'GET',
        query: { siren: '552032534' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(502);
      const htmlResponse = res._getData();
      expect(htmlResponse).toContain('Erreur BODACC');
      expect(htmlResponse).toContain('Network timeout');
    });

    it('should set correct security headers', async () => {
      const mockResponse = {
        total_count: 0,
        records: []
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { siren: '552032534' }
      });

      await handler(req, res);

      const headers = res._getHeaders();
      expect(headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      expect(headers['pragma']).toBe('no-cache');
      expect(headers['expires']).toBe('0');
      expect(headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should format SIREN correctly in API call', async () => {
      const mockResponse = {
        total_count: 0,
        records: []
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { siren: '552032534' }
      });

      await handler(req, res);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('registre+like+%22552%20032%20534%25%22')
      );
    });

    it('should handle complex JSON fields correctly', async () => {
      const mockResponse = {
        total_count: 1,
        records: [
          {
            record: {
              fields: {
                id: 'test123',
                publicationavis: 'B',
                dateparution: '2025-01-01',
                familleavis_lib: 'Créations',
                tribunal: 'Test Tribunal',
                commercant: 'Test Company',
                ville: 'Paris',
                cp: '75001',
                numeroannonce: 123,
                listepersonnes: '{"personne": {"formeJuridique": "SCI", "capital": {"montantCapital": "5000", "devise": "EUR"}, "administration": "Gérant: Test Person"}}',
                listeetablissements: '{"etablissement": {"activite": "Gestion immobilière", "adresse": {"numeroVoie": "123", "typeVoie": "rue", "nomVoie": "Test", "ville": "Paris", "codePostal": "75001"}, "siret": "12345678901234"}}'
              }
            }
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { siren: '123456789' }
      });

      await handler(req, res);

      const htmlResponse = res._getData();
      expect(htmlResponse).toContain('SCI');
      expect(htmlResponse).toContain('5 000 EUR');
      expect(htmlResponse).toContain('Gestion immobilière');
      expect(htmlResponse).toContain('123, rue Test, Paris, 75001');
      expect(htmlResponse).toContain('12345678901234');
    });

    it('should handle malformed JSON in listepersonnes gracefully', async () => {
      const mockResponse = {
        total_count: 1,
        records: [
          {
            record: {
              fields: {
                id: 'test123',
                publicationavis: 'B',
                dateparution: '2025-01-01',
                familleavis_lib: 'Test',
                tribunal: 'Test Tribunal',
                commercant: 'Test Company',
                ville: 'Paris',
                cp: '75001',
                numeroannonce: 123,
                listepersonnes: 'invalid json{',
                listeetablissements: '{"malformed": json}'
              }
            }
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { siren: '123456789' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const htmlResponse = res._getData();
      expect(htmlResponse).toContain('Test Company');
      expect(htmlResponse).toContain('1 annonce(s) trouvée(s)');
      // Should not contain additional fields from malformed JSON
      expect(htmlResponse).not.toContain('Forme juridique');
    });
  });

  describe('HTTP methods', () => {
    it('should reject non-GET requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { siren: '552032534' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(res._getJSONData()).toEqual({
        message: 'Method not allowed'
      });
    });

    it('should reject PUT requests', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { siren: '552032534' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should reject DELETE requests', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { siren: '552032534' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });
});