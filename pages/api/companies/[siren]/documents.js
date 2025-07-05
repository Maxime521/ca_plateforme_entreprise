// pages/api/companies/[siren]/documents.js - MIGRATED TO SUPABASE
import { createAdminClient } from '../../../../lib/supabase';
import APIService from '../../../../lib/api-services';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren } = req.query;

  try {
    const supabase = createAdminClient();
    
    // First check local database
    let { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        *,
        companies!inner(siren)
      `)
      .eq('companies.siren', siren)
      .order('date_publication', { ascending: false });

    if (docsError) {
      console.error('Documents query error:', docsError);
      documents = [];
    }

    // If no local documents, fetch from APIs
    if (!documents || documents.length === 0) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('siren', siren)
        .single();

      if (companyError || !company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      try {
        // Fetch BODACC publications
        const bodaccData = await APIService.getBODACCPublications(siren);
        
        if (bodaccData.results && bodaccData.results.length > 0) {
          const documentsToCreate = bodaccData.results.map(record => ({
            company_id: company.id,
            date_publication: new Date(record.dateparution).toISOString(),
            type_document: 'Publication BODACC',
            source: 'BODACC',
            type_avis: record.typeavis,
            reference: record.numerodannonce,
            description: record.publicationavis || 'Publication BODACC',
            contenu: record.texte,
            lien_document: record.pdf || null
          }));

          if (documentsToCreate.length > 0) {
            await supabase
              .from('documents')
              .insert(documentsToCreate);
          }

          const { data: refreshedDocs } = await supabase
            .from('documents')
            .select(`
              *,
              companies!inner(siren)
            `)
            .eq('companies.siren', siren)
            .order('date_publication', { ascending: false });
          
          documents = refreshedDocs || [];
        }

        // Try to fetch RNE documents
        try {
          const rneData = await APIService.getRNEData(siren);
          // Process RNE data and create documents
          // This would depend on the actual RNE API response structure
        } catch (rneError) {
          console.log('RNE API not available:', rneError.message);
        }

      } catch (apiError) {
        console.error('Error fetching documents from APIs:', apiError);
      }
    }

    return res.status(200).json(documents || []);
  } catch (error) {
    console.error('Documents fetch error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
