const { prisma } = require('./prisma');

class OptimizedDatabaseService {
  constructor() {
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // 🚀 OPTIMIZED: Company search with proper indexing
  async searchCompanies(query, options = {}) {
    const { limit = 20, offset = 0, filters = {} } = options;
    
    // Build where clause efficiently
    const whereClause = {
      AND: [
        // Text search across multiple fields
        {
          OR: [
            { siren: { contains: query } },
            { denomination: { contains: query, mode: 'insensitive' } },
            { libelleAPE: { contains: query, mode: 'insensitive' } }
          ]
        },
        // Apply filters
        ...(filters.active !== undefined ? [{ active: filters.active }] : []),
        ...(filters.formeJuridique ? [{ formeJuridique: filters.formeJuridique }] : []),
        ...(filters.codeAPE ? [{ codeAPE: { startsWith: filters.codeAPE } }] : [])
      ]
    };

    // Use transaction for consistency
    const [companies, total] = await prisma.$transaction([
      // Get paginated results
      prisma.company.findMany({
        where: whereClause,
        select: {
          id: true,
          siren: true,
          denomination: true,
          active: true,
          formeJuridique: true,
          codeAPE: true,
          libelleAPE: true,
          dateCreation: true,
          adresseSiege: true,
          updatedAt: true
        },
        orderBy: [
          { active: 'desc' },      // Active companies first
          { updatedAt: 'desc' },   // Recently updated first
          { denomination: 'asc' }  // Then alphabetical
        ],
        take: limit,
        skip: offset
      }),
      // Get total count for pagination
      prisma.company.count({ where: whereClause })
    ]);

    return {
      results: companies.map(this.formatCompanyForAPI),
      total,
      hasMore: (offset + limit) < total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  }

  // 🚀 OPTIMIZED: Get company with related data
  async getCompanyDetails(siren) {
    const cacheKey = `company_details_${siren}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const company = await prisma.company.findUnique({
      where: { siren },
      include: {
        documents: {
          select: {
            id: true,
            datePublication: true,
            typeDocument: true,
            source: true,
            description: true,
            lienDocument: true
          },
          orderBy: { datePublication: 'desc' },
          take: 10 // Limit to recent documents
        },
        financialRatios: {
          select: {
            year: true,
            ratioType: true,
            value: true
          },
          orderBy: { year: 'desc' },
          take: 5 // Last 5 years
        }
      }
    });

    if (!company) return null;

    const result = {
      ...this.formatCompanyForAPI(company),
      documents: company.documents,
      financialRatios: company.financialRatios
    };

    this.setCache(cacheKey, result);
    return result;
  }

  // 🚀 OPTIMIZED: Batch company creation/updates
  async saveMultipleCompanies(companiesData) {
    if (!companiesData.length) return [];

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    const results = [];

    for (let i = 0; i < companiesData.length; i += batchSize) {
      const batch = companiesData.slice(i, i + batchSize);
      
      try {
        // Use transaction for consistency
        const batchResults = await prisma.$transaction(
          batch.map(companyData => this.upsertCompany(companyData)),
          { timeout: 10000 } // 10 second timeout
        );
        
        results.push(...batchResults);
        
        // Small delay between batches to prevent overwhelming
        if (i + batchSize < companiesData.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Batch ${i}-${i + batchSize} failed:`, error);
        
        // Fallback: Process individually
        for (const companyData of batch) {
          try {
            const result = await this.upsertCompany(companyData);
            results.push(result);
          } catch (individualError) {
            console.error(`Failed to save company ${companyData.siren}:`, individualError);
            results.push(null);
          }
        }
      }
    }

    // Clear relevant caches
    this.clearCachePattern('company_');
    return results.filter(Boolean);
  }

  // 🚀 OPTIMIZED: Single company upsert
  async upsertCompany(companyData) {
    const commonData = {
      denomination: companyData.denomination || 'Entreprise inconnue',
      active: companyData.active ?? true,
      formeJuridique: companyData.formeJuridique,
      codeAPE: companyData.codeAPE,
      libelleAPE: companyData.libelleAPE,
      dateCreation: companyData.dateCreation ? new Date(companyData.dateCreation) : null,
      adresseSiege: companyData.adresseSiege,
      capitalSocial: companyData.capitalSocial ? parseFloat(companyData.capitalSocial) : null,
      updatedAt: new Date()
    };

    return prisma.company.upsert({
      where: { siren: companyData.siren },
      update: commonData,
      create: {
        siren: companyData.siren,
        ...commonData
      },
      select: {
        id: true,
        siren: true,
        denomination: true,
        active: true
      }
    });
  }

  // 🚀 OPTIMIZED: Analytics queries
  async getAnalyticsData(timeRange = 'last12months') {
    const cacheKey = `analytics_${timeRange}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const dateFrom = this.getDateFromTimeRange(timeRange, now);

    const [
      totalCompanies,
      activeCompanies,
      recentlyAdded,
      companiesByForm,
      companiesByRegion
    ] = await prisma.$transaction([
      // Total companies
      prisma.company.count(),
      
      // Active companies
      prisma.company.count({ where: { active: true } }),
      
      // Recently added
      prisma.company.count({
        where: { createdAt: { gte: dateFrom } }
      }),
      
      // By legal form
      prisma.company.groupBy({
        by: ['formeJuridique'],
        _count: { formeJuridique: true },
        where: { formeJuridique: { not: null } },
        orderBy: { _count: { formeJuridique: 'desc' } },
        take: 10
      }),
      
      // By region (simplified - you'd need proper region data)
      prisma.company.groupBy({
        by: ['codeAPE'],
        _count: { codeAPE: true },
        where: { codeAPE: { not: null } },
        orderBy: { _count: { codeAPE: 'desc' } },
        take: 10
      })
    ]);

    const result = {
      summary: {
        totalCompanies,
        activeCompanies,
        recentlyAdded,
        inactiveCompanies: totalCompanies - activeCompanies
      },
      companiesByForm: companiesByForm.map(item => ({
        form: item.formeJuridique,
        count: item._count.formeJuridique
      })),
      companiesByAPE: companiesByRegion.map(item => ({
        code: item.codeAPE,
        count: item._count.codeAPE
      }))
    };

    this.setCache(cacheKey, result, 10 * 60 * 1000); // 10 minutes cache
    return result;
  }

  // 🚀 CACHE MANAGEMENT
  getFromCache(key) {
    const item = this.queryCache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.timeout) {
      this.queryCache.delete(key);
      return null;
    }
    
    return item.data;
  }

  setCache(key, data, timeout = this.cacheTimeout) {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      timeout
    });
  }

  clearCachePattern(pattern) {
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  // Utility methods
  formatCompanyForAPI(company) {
    return {
      id: company.id,
      siren: company.siren,
      denomination: company.denomination,
      active: company.active,
      formeJuridique: company.formeJuridique,
      codeAPE: company.codeAPE,
      libelleAPE: company.libelleAPE,
      dateCreation: company.dateCreation?.toISOString(),
      adresseSiege: company.adresseSiege,
      capitalSocial: company.capitalSocial,
      updatedAt: company.updatedAt?.toISOString()
    };
  }

  getDateFromTimeRange(timeRange, now) {
    switch (timeRange) {
      case 'last7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last30days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'last12months':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case 'lastyear':
        return new Date(now.getFullYear() - 1, 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  // 🚀 HEALTH CHECK
  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date().toISOString() 
      };
    }
  }
}

// Export singleton
const optimizedDatabaseService = new OptimizedDatabaseService();
module.exports = { optimizedDatabaseService };
