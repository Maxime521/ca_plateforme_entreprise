// pages/api/companies/[siren]/sync.js
import { prisma } from '../../../../lib/prisma';
import APIService from '../../../../lib/api-services';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren } = req.query;

  try {
    let company = await prisma.company.findUnique({
      where: { siren }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Sync with SIRENE API
    try {
      const sireneData = await APIService.getCompanyByIdSIREN(siren);
      if (sireneData.uniteLegale) {
        const uniteLegale = sireneData.uniteLegale;
        company = await prisma.company.update({
          where: { siren },
          data: {
            denomination: uniteLegale.denominationUniteLegale || company.denomination,
            dateCreation: uniteLegale.dateCreationUniteLegale ? new Date(uniteLegale.dateCreationUniteLegale) : company.dateCreation,
            active: uniteLegale.etatAdministratifUniteLegale === 'A',
            formeJuridique: uniteLegale.categorieJuridiqueUniteLegale || company.formeJuridique,
            updatedAt: new Date()
          }
        });
      }
    } catch (sireneError) {
      console.error('SIRENE sync error:', sireneError);
    }

    // Sync with RNE API
    try {
      const rneData = await APIService.getRNEData(siren);
      // Update company with RNE data
      // This would depend on the actual RNE API response structure
    } catch (rneError) {
      console.error('RNE sync error:', rneError);
    }

    // Sync financial ratios
    try {
      const ratiosData = await APIService.getFinancialRatios(siren);
      if (ratiosData.results && ratiosData.results.length > 0) {
        // Delete existing ratios and create new ones
        await prisma.financialRatio.deleteMany({
          where: { companyId: company.id }
        });

        const ratiosToCreate = ratiosData.results.map(ratio => ({
          companyId: company.id,
          year: parseInt(ratio.annee),
          ratioType: ratio.ratio_name,
          value: parseFloat(ratio.ratio_value)
        }));

        await prisma.financialRatio.createMany({
          data: ratiosToCreate,
          skipDuplicates: true
        });
      }
    } catch (ratiosError) {
      console.error('Financial ratios sync error:', ratiosError);
    }

    return res.status(200).json({ 
      message: 'Synchronization completed',
      company: company
    });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
