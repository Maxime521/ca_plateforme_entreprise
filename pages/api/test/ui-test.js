export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren } = req.query;

  // Sample company data for UI testing
  const testCompany = {
    siren: siren || '552032534',
    denomination: 'DANONE',
    siret: '55203253400646',
    active: true,
    formeJuridique: 'SA (Société anonyme)',
    codeAPE: '70.10Z',
    effectif: '1000 à 1999 salariés'
  };

  // Sample AVIS DE SITUATION document
  const avisSituationDoc = {
    id: `avis-${testCompany.siren}`,
    available: true,
    type: 'avis-situation',
    fileName: 'AVIS_DE_SITUATION_552032534_2025-07-04.html',
    url: '/api/serve-file/uploads/AVIS_DE_SITUATION_552032534_2025-07-04T13-43-03-796Z.html',
    size: 14266,
    contentType: 'text/html',
    downloadedAt: new Date().toISOString(),
    description: 'Avis de situation au répertoire Sirene',
    officialName: 'Avis de situation au répertoire Sirene',
    displayName: 'AVIS DE SITUATION',
    category: 'INSEE_OFFICIAL',
    isValidated: true,
    source: 'INSEE'
  };

  return res.status(200).json({
    success: true,
    testData: {
      company: testCompany,
      avisSituationDoc: avisSituationDoc,
      message: 'Use this data to test your UI components',
      uiComponents: [
        'AvisSituationCard',
        'BatchINSEEDownload', 
        'CompanyPDFSection'
      ],
      usage: 'Import this data in your React components for testing'
    }
  });
}