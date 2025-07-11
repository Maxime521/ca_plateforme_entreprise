// services/DatabaseService.js - Database operations
class DatabaseService {
  async searchCompanies(query, limit = 20) {
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { siren: { contains: query } },
          { denomination: { contains: query, mode: 'insensitive' } },
          { libelleAPE: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit,
      orderBy: { updatedAt: 'desc' }
    });

    return {
      results: companies.map(this.formatCompany),
      total: companies.length
    };
  }

  async getCompany(siren) {
    const company = await prisma.company.findUnique({
      where: { siren },
      include: {
        documents: {
          orderBy: { datePublication: 'desc' },
          take: 10
        }
      }
    });

    return company ? this.formatCompany(company) : null;
  }

  async saveCompany(companyData) {
    const commonData = {
      denomination: companyData.denomination,
      active: companyData.active,
      formeJuridique: companyData.formeJuridique,
      codeAPE: companyData.codeAPE,
      dateCreation: companyData.dateCreation ? new Date(companyData.dateCreation) : null,
      updatedAt: new Date()
    };

    return prisma.company.upsert({
      where: { siren: companyData.siren },
      update: commonData,
      create: {
        siren: companyData.siren,
        ...commonData
      }
    });
  }

  async saveMultipleCompanies(companies) {
    const operations = companies.map(company =>
      this.saveCompany(company)
    );

    return prisma.$transaction(operations);
  }

  formatCompany(company) {
    return {
      id: company.id,
      siren: company.siren,
      denomination: company.denomination,
      active: company.active,
      formeJuridique: company.formeJuridique,
      dateCreation: company.dateCreation?.toISOString(),
      // ... other fields
    };
  }
}

// Export singleton instances
export const companyService = new CompanyService();
export const databaseService = new DatabaseService();
