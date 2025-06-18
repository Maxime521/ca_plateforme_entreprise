// pages/api/companies/[siren]/documents.js
import { prisma } from '../../../../lib/prisma';
import APIService from '../../../../lib/api-services';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren } = req.query;

  try {
    // First check local database
    let documents = await prisma.document.findMany({
      where: { company: { siren } },
      orderBy: { datePublication: 'desc' }
    });

    // If no local documents, fetch from APIs
    if (documents.length === 0) {
      const company = await prisma.company.findUnique({
        where: { siren }
      });

      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      try {
        // Fetch BODACC publications
        const bodaccData = await APIService.getBODACCPublications(siren);
        
        if (bodaccData.results && bodaccData.results.length > 0) {
          const documentsToCreate = bodaccData.results.map(record => ({
            companyId: company.id,
            datePublication: new Date(record.dateparution),
            typeDocument: 'Publication BODACC',
            source: 'BODACC',
            typeAvis: record.typeavis,
            reference: record.numerodannonce,
            description: record.publicationavis || 'Publication BODACC',
            contenu: record.texte,
            lienDocument: record.pdf || null
          }));

          await prisma.document.createMany({
            data: documentsToCreate,
            skipDuplicates: true
          });

          documents = await prisma.document.findMany({
            where: { company: { siren } },
            orderBy: { datePublication: 'desc' }
          });
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

    return res.status(200).json(documents);
  } catch (error) {
    console.error('Documents fetch error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
