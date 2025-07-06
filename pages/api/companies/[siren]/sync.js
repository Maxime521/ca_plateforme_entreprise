import { createAdminClient } from '../../../../lib/supabase';
import APIService from '../../../../lib/api-services';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren } = req.query;

  try {
    const supabase = createAdminClient();
    
    let { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('siren', siren)
      .single();

    if (error || !company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Sync with SIRENE API
    try {
      const sireneData = await APIService.getCompanyByIdSIREN(siren);
      if (sireneData.uniteLegale) {
        const uniteLegale = sireneData.uniteLegale;
        const { data: updatedCompany, error: updateError } = await supabase
          .from('companies')
          .update({
            denomination: uniteLegale.denominationUniteLegale || company.denomination,
            date_creation: uniteLegale.dateCreationUniteLegale ? new Date(uniteLegale.dateCreationUniteLegale).toISOString() : company.date_creation,
            active: uniteLegale.etatAdministratifUniteLegale === 'A',
            forme_juridique: uniteLegale.categorieJuridiqueUniteLegale || company.forme_juridique,
            updated_at: new Date().toISOString()
          })
          .eq('siren', siren)
          .select()
          .single();
        
        if (!updateError && updatedCompany) {
          company = updatedCompany;
        }
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
        await supabase
          .from('financial_ratios')
          .delete()
          .eq('company_id', company.id);

        const ratiosToCreate = ratiosData.results.map(ratio => ({
          company_id: company.id,
          year: parseInt(ratio.annee),
          ratio_type: ratio.ratio_name,
          value: parseFloat(ratio.ratio_value)
        }));

        if (ratiosToCreate.length > 0) {
          await supabase
            .from('financial_ratios')
            .insert(ratiosToCreate);
        }
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
