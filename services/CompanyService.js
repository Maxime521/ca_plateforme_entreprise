class CompanyService {
  constructor() {
    this.inseeService = new INSEEService();
    this.bodaccService = new BODACCService();
    this.inpiService = new INPIService();
    this.databaseService = new DatabaseService();
  }

  // Main company search method
  async searchCompanies(query, options = {}) {
    const { sources = ['all'], limit = 20 } = options;
    const results = new Map(); // Use Map to avoid duplicates by SIREN
    const errors = [];

    // Parallel searches with error isolation
    const searchPromises = [];

    if (sources.includes('all') || sources.includes('local')) {
      searchPromises.push(
        this.searchLocal(query, limit).catch(error => {
          errors.push({ source: 'local', error: error.message });
          return { results: [] };
        })
      );
    }

    if (sources.includes('all') || sources.includes('insee')) {
      searchPromises.push(
        this.inseeService.search(query, limit).catch(error => {
          errors.push({ source: 'insee', error: error.message });
          return { results: [] };
        })
      );
    }

    if (sources.includes('all') || sources.includes('bodacc')) {
      searchPromises.push(
        this.bodaccService.search(query, limit).catch(error => {
          errors.push({ source: 'bodacc', error: error.message });
          return { results: [] };
        })
      );
    }

    // Wait for all searches to complete
    const searchResults = await Promise.allSettled(searchPromises);

    // Merge results, prioritizing quality sources
    searchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.results) {
        result.value.results.forEach(company => {
          if (company.siren && !results.has(company.siren)) {
            results.set(company.siren, company);
          }
        });
      }
    });

    // Background task: Save new companies to database
    this.saveNewCompaniesBackground(Array.from(results.values()));

    return {
      results: Array.from(results.values()).slice(0, limit),
      total: results.size,
      errors,
      sources: {
        local: searchResults[0]?.value?.results?.length || 0,
        insee: searchResults[1]?.value?.results?.length || 0,
        bodacc: searchResults[2]?.value?.results?.length || 0
      }
    };
  }

  // Get company details with enrichment
  async getCompanyDetails(siren) {
    const details = {
      company: null,
      establishments: [],
      announcements: [],
      documents: [],
      errors: []
    };

    // Get basic company info (prioritize local, fallback to INSEE)
    try {
      details.company = await this.databaseService.getCompany(siren);
      if (!details.company) {
        details.company = await this.inseeService.getCompany(siren);
        if (details.company) {
          await this.databaseService.saveCompany(details.company);
        }
      }
    } catch (error) {
      details.errors.push({ source: 'company', error: error.message });
    }

    if (!details.company) {
      throw new Error('Company not found');
    }

    // Parallel enrichment
    const enrichmentPromises = [
      this.inseeService.getEstablishments(siren).catch(error => {
        details.errors.push({ source: 'establishments', error: error.message });
        return [];
      }),
      this.bodaccService.getAnnouncements(siren).catch(error => {
        details.errors.push({ source: 'announcements', error: error.message });
        return [];
      }),
      this.databaseService.getDocuments(siren).catch(error => {
        details.errors.push({ source: 'documents', error: error.message });
        return [];
      })
    ];

    const [establishments, announcements, documents] = await Promise.all(enrichmentPromises);

    details.establishments = establishments;
    details.announcements = announcements;
    details.documents = documents;

    return details;
  }

  // Background company saving (fire and forget)
  async saveNewCompaniesBackground(companies) {
    if (companies.length === 0) return;

    try {
      // Use a queue or background job in production
      setTimeout(() => {
        this.databaseService.saveMultipleCompanies(companies)
          .catch(error => console.error('Background save failed:', error));
      }, 100);
    } catch (error) {
      console.error('Failed to queue background save:', error);
    }
  }

  // Local database search
  async searchLocal(query, limit) {
    return this.databaseService.searchCompanies(query, limit);
  }
}
