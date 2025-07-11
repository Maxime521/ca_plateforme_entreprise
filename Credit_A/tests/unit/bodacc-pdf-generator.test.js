// tests/unit/bodacc-pdf-generator.test.js - BODACC PDF Generator tests
import BODACCPDFGenerator from '../../lib/bodacc-pdf-generator.js';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs and fetch
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('BODACC PDF Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePDF', () => {
    it('should generate HTML file successfully', async () => {
      const mockBODACCData = {
        records: [
          {
            record: {
              fields: {
                id: 'B202501222451',
                commercant: 'DANONE',
                dateparution: '2025-06-27',
                familleavis_lib: 'Modifications diverses',
                tribunal: 'Greffe du Tribunal des Activités Economiques de Paris',
                ville: 'Paris',
                cp: '75009',
                listepersonnes: '{"personne": {"formeJuridique": "SA", "capital": {"montantCapital": "160948000", "devise": "EUR"}}}',
                listeetablissements: '{"etablissement": {"activite": "Production", "adresse": {"ville": "Paris"}}}'
              }
            }
          }
        ],
        total_count: 1
      };

      // Mock successful API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBODACCData)
      });

      // Mock file system operations
      fs.mkdir.mockResolvedValueOnce();
      fs.writeFile.mockResolvedValueOnce();

      const result = await BODACCPDFGenerator.generatePDF('552032534');

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(1);
      expect(result.totalRecords).toBe(1);
      expect(result.format).toBe('HTML');
      expect(result.filename).toMatch(/BODACC_Report_552032534_\d+\.html/);

      // Verify file operations
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.html'),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf8'
      );
    });

    it('should handle empty BODACC data', async () => {
      const emptyData = {
        records: [],
        total_count: 0
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyData)
      });

      const result = await BODACCPDFGenerator.generatePDF('999999999');

      expect(result.success).toBe(false);
      expect(result.message).toBe('No BODACC records found for this company');
    });

    it('should handle API fetch errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await BODACCPDFGenerator.generatePDF('552032534');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle file system errors', async () => {
      const mockData = {
        records: [{ record: { fields: { commercant: 'Test' } } }],
        total_count: 1
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      fs.mkdir.mockResolvedValueOnce();
      fs.writeFile.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await BODACCPDFGenerator.generatePDF('552032534');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('fetchBODACCData', () => {
    it('should format SIREN correctly in API URL', async () => {
      const mockData = { records: [], total_count: 0 };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      await BODACCPDFGenerator.fetchBODACCData('552032534', 10);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('552%20032%20534'),
        expect.objectContaining({
          headers: {
            'User-Agent': 'DataCorp-Platform/1.0'
          }
        })
      );
    });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(BODACCPDFGenerator.fetchBODACCData('552032534'))
        .rejects
        .toThrow('BODACC API error: 404');
    });
  });

  describe('generateHTML', () => {
    it('should generate valid HTML structure', () => {
      const mockData = {
        records: [
          {
            record: {
              fields: {
                id: 'test123',
                commercant: 'Test Company',
                dateparution: '2025-01-01',
                familleavis_lib: 'Test Type',
                tribunal: 'Test Tribunal',
                ville: 'Paris',
                cp: '75001',
                listepersonnes: '{"personne": {"formeJuridique": "SA", "capital": {"montantCapital": "1000", "devise": "EUR"}}}',
                listeetablissements: '{"etablissement": {"activite": "Test Activity", "adresse": {"ville": "Paris"}}}'
              }
            }
          }
        ],
        total_count: 1
      };

      const html = BODACCPDFGenerator.generateHTML(mockData, '552032534');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="fr">');
      expect(html).toContain('Test Company');
      expect(html).toContain('SIREN: 552032534');
      expect(html).toContain('1 annonce(s) trouvée(s)');
      expect(html).toContain('Test Type');
      expect(html).toContain('Test Tribunal');
      expect(html).toContain('Paris (75001)');
    });

    it('should handle missing company name gracefully', () => {
      const mockData = {
        records: [
          {
            record: {
              fields: {
                id: 'test123',
                // No commercant field
                dateparution: '2025-01-01'
              }
            }
          }
        ],
        total_count: 1
      };

      const html = BODACCPDFGenerator.generateHTML(mockData, '552032534');

      expect(html).toContain('Entreprise 552032534');
    });
  });

  describe('generateRecordHTML', () => {
    it('should generate record HTML with all fields', () => {
      const fields = {
        id: 'test123',
        dateparution: '2025-01-01',
        familleavis_lib: 'Modifications diverses',
        commercant: 'Test Company',
        ville: 'Paris',
        cp: '75001',
        tribunal: 'Test Tribunal',
        registre: ['552 032 534', '552032534'],
        listepersonnes: '{"personne": {"formeJuridique": "SA", "capital": {"montantCapital": "1000", "devise": "EUR"}}}',
        listeetablissements: '{"etablissement": {"activite": "Test Activity", "adresse": {"ville": "Paris"}}}',
        depot: '{"dateCloture": "2024-12-31", "typeDepot": "Comptes annuels"}',
        url_complete: 'https://example.com'
      };

      const html = BODACCPDFGenerator.generateRecordHTML(fields, 1);

      expect(html).toContain('Annonce #1');
      expect(html).toContain('Test Company');
      expect(html).toContain('Modifications diverses');
      expect(html).toContain('Paris (75001)');
      expect(html).toContain('Test Tribunal');
      expect(html).toContain('552 032 534, 552032534');
      expect(html).toContain('Société anonyme');
      expect(html).toContain('1 000 EUR');
      expect(html).toContain('Test Activity');
      expect(html).toContain('31/12/2024');
      expect(html).toContain('Comptes annuels');
      expect(html).toContain('https://example.com');
    });

    it('should handle malformed JSON gracefully', () => {
      const fields = {
        id: 'test123',
        dateparution: '2025-01-01',
        familleavis_lib: 'Test Type',
        commercant: 'Test Company',
        listepersonnes: 'invalid json{',
        listeetablissements: '{"malformed": json}',
        depot: 'not json at all'
      };

      const html = BODACCPDFGenerator.generateRecordHTML(fields, 1);

      expect(html).toContain('Test Company');
      expect(html).toContain('Test Type');
      // Should not crash on malformed JSON
      expect(html).toMatch(/<div class="record">/);
    });

    it('should format dates correctly', () => {
      const fields = {
        id: 'test123',
        dateparution: '2025-01-15',
        familleavis_lib: 'Test',
        commercant: 'Test'
      };

      const html = BODACCPDFGenerator.generateRecordHTML(fields, 1);

      expect(html).toContain('15/01/2025');
    });

    it('should handle invalid dates gracefully', () => {
      const fields = {
        id: 'test123',
        dateparution: 'invalid-date',
        familleavis_lib: 'Test',
        commercant: 'Test'
      };

      const html = BODACCPDFGenerator.generateRecordHTML(fields, 1);

      expect(html).toContain('invalid-date');
    });

    it('should format capital amounts with thousands separator', () => {
      const fields = {
        id: 'test123',
        dateparution: '2025-01-01',
        familleavis_lib: 'Test',
        commercant: 'Test',
        listepersonnes: '{"personne": {"capital": {"montantCapital": "1234567", "devise": "EUR"}}}'
      };

      const html = BODACCPDFGenerator.generateRecordHTML(fields, 1);

      expect(html).toContain('1 234 567 EUR');
    });
  });
});