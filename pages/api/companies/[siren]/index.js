// pages/api/companies/[siren]/index.js
import { prisma } from '../../../../lib/prisma';
import APIService from '../../../../lib/api-services';

export default async function handler(req, res) {
  const { siren } = req.query;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check local database first
    let company = await prisma.company.findUnique({
      where: { siren },
      include: {
        documents: {
          orderBy: { datePublication: 'desc' },
          take: 10
        },
        financialRatios: {
          orderBy: { year: 'desc' },
          take: 5
        }
      }
    });

    // If not found locally, fetch from SIRENE
    if (!company) {
      const sireneData = await APIService.getCompanyByIdSIREN(siren);
      
      if (!sireneData) {
        return res.status(404).json({ message: 'Entreprise non trouvée' });
      }

      // Create company in database
      company = await prisma.company.create({
        data: {
          siren: sireneData.siren,
          denomination: sireneData.denomination,
          dateCreation: sireneData.dateCreation ? new Date(sireneData.dateCreation) : null,
          active: sireneData.active,
          formeJuridique: sireneData.formeJuridique,
          codeAPE: sireneData.codeAPE,
          capitalSocial: sireneData.capitalSocial
        }
      });
    }

    // Fetch additional data from other APIs
    const additionalData = await fetchAdditionalData(siren);

    return res.status(200).json({
      ...formatCompanyForResponse(company),
      ...additionalData
    });

  } catch (error) {
    console.error('Company fetch error:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération des données',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function fetchAdditionalData(siren) {
  const additional = {};

  // Fetch BODACC publications
  try {
    const bodaccData = await APIService.getBODACCPublications(siren);
    additional.publications = bodaccData.results.slice(0, 5);
  } catch (error) {
    console.error('BODACC fetch failed:', error.message);
    additional.publications = [];
  }

  // Fetch financial ratios
  try {
    const ratiosData = await APIService.getFinancialRatios(siren);
    additional.financialRatios = ratiosData.results.slice(0, 3);
  } catch (error) {
    console.error('Financial ratios fetch failed:', error.message);
    additional.financialRatios = [];
  }

  return additional;
}

function formatCompanyForResponse(company) {
  return {
    id: company.id,
    siren: company.siren,
    denomination: company.denomination,
    formeJuridique: company.formeJuridique,
    adresseSiege: company.adresseSiege,
    libelleAPE: company.libelleAPE,
    codeAPE: company.codeAPE,
    dateCreation: company.dateCreation?.toISOString(),
    active: company.active,
    capitalSocial: company.capitalSocial,
    documents: company.documents?.map(doc => ({
      id: doc.id,
      datePublication: doc.datePublication,
      typeDocument: doc.typeDocument,
      source: doc.source,
      description: doc.description
    })) || [],
    financialRatios: company.financialRatios?.map(ratio => ({
      year: ratio.year,
      type: ratio.ratioType,
      value: ratio.value
    })) || []
  };
}
