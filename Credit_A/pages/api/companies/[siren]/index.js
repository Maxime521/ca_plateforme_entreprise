// pages/api/companies/[siren]/index.js - MIGRATED TO SUPABASE
import { createAdminClient } from '../../../../lib/supabase';
import APIService from '../../../../lib/api-services';
import { validateSiren, securityHeaders } from '../../../../lib/middleware/validation';
import { apiLimiter } from '../../../../lib/middleware/rateLimit';

// Apply middleware
const withMiddleware = (handler) => {
  return async (req, res) => {
    // Apply security headers
    securityHeaders(req, res, () => {});
    
    // Apply rate limiting
    return new Promise((resolve, reject) => {
      apiLimiter(req, res, (rateLimitResult) => {
        if (rateLimitResult instanceof Error) {
          reject(rateLimitResult);
          return;
        }
        
        // Validate SIREN parameter
        validateSiren(req, res, () => {
          handler(req, res).then(resolve).catch(reject);
        });
      });
    });
  };
};

async function handler(req, res) {
  const { siren } = req.query;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();
    
    // Check local database first with related data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        *,
        documents!inner(
          id,
          date_publication,
          type_document,
          source,
          description
        ),
        financial_ratios!inner(
          year,
          ratio_type,
          value
        )
      `)
      .eq('siren', siren)
      .order('documents(date_publication)', { ascending: false })
      .order('financial_ratios(year)', { ascending: false })
      .limit(10, { foreignTable: 'documents' })
      .limit(5, { foreignTable: 'financial_ratios' })
      .single();

    let finalCompany = company;

    // If not found locally, fetch from SIRENE
    if (companyError && companyError.code === 'PGRST116') {
      const sireneData = await APIService.getCompanyByIdSIREN(siren);
      
      if (!sireneData) {
        return res.status(404).json({ message: 'Entreprise non trouvée' });
      }

      // Create company in database
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          siren: sireneData.siren,
          denomination: sireneData.denomination,
          date_creation: sireneData.dateCreation ? new Date(sireneData.dateCreation).toISOString() : null,
          active: sireneData.active,
          forme_juridique: sireneData.formeJuridique,
          code_ape: sireneData.codeAPE,
          capital_social: sireneData.capitalSocial
        })
        .select()
        .single();

      if (createError) throw createError;
      finalCompany = newCompany;
    } else if (companyError) {
      throw companyError;
    }

    // Fetch additional data from other APIs
    const additionalData = await fetchAdditionalData(siren);

    return res.status(200).json({
      ...formatCompanyForResponse(finalCompany),
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
    formeJuridique: company.forme_juridique,
    adresseSiege: company.adresse_siege,
    libelleAPE: company.libelle_ape,
    codeAPE: company.code_ape,
    dateCreation: company.date_creation,
    active: company.active,
    capitalSocial: company.capital_social,
    documents: company.documents?.map(doc => ({
      id: doc.id,
      datePublication: doc.date_publication,
      typeDocument: doc.type_document,
      source: doc.source,
      description: doc.description
    })) || [],
    financialRatios: company.financial_ratios?.map(ratio => ({
      year: ratio.year,
      type: ratio.ratio_type,
      value: ratio.value
    })) || []
  };
}

// Export with middleware applied
export default withMiddleware(handler);
