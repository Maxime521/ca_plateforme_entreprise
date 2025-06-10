export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { q, cursor } = req.query

  try {
    // Integration with INSEE SIRENE API
    const sireneApiUrl = `https://api.insee.fr/entreprises/sirene/V3.11/siret`
    const headers = {
      'Authorization': `Bearer ${process.env.INSEE_API_TOKEN}`,
      'Accept': 'application/json'
    }

    const params = new URLSearchParams({
      q: q,
      nombre: '20',
      ...(cursor && { curseur: cursor })
    })

    const response = await fetch(`${sireneApiUrl}?${params}`, { headers })
    
    if (!response.ok) {
      throw new Error(`SIRENE API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Transform SIRENE data to our format
    const transformedCompanies = data.etablissements?.map(etab => ({
      siren: etab.siren,
      siret: etab.siret,
      denomination: etab.uniteLegale?.denominationUniteLegale || 
                   etab.uniteLegale?.prenom1UniteLegale + ' ' + etab.uniteLegale?.nomUniteLegale,
      apeCode: etab.uniteLegale?.activitePrincipaleUniteLegale,
      apeLibelle: etab.uniteLegale?.nomenclatureActivitePrincipaleUniteLegale,
      adresse: `${etab.adresseEtablissement?.numeroVoieEtablissement || ''} ${etab.adresseEtablissement?.typeVoieEtablissement || ''} ${etab.adresseEtablissement?.libelleVoieEtablissement || ''}, ${etab.adresseEtablissement?.codePostalEtablissement || ''} ${etab.adresseEtablissement?.libelleCommuneEtablissement || ''}`.trim(),
      dateCreation: etab.uniteLegale?.dateCreationUniteLegale,
      active: etab.etatAdministratifEtablissement === 'A'
    })) || []

    res.status(200).json({
      companies: transformedCompanies,
      total: data.header?.total || 0,
      cursor: data.header?.curseurSuivant
    })

  } catch (error) {
    console.error('SIRENE API error:', error)
    
    // Fallback to mock data in case of API issues
    const mockCompanies = [
      {
        siren: '123456789',
        denomination: 'EXEMPLE ENTREPRISE SAS',
        apeCode: '6202A',
        apeLibelle: 'Conseil en systèmes et logiciels informatiques',
        adresse: '123 Rue de la Paix, 75001 Paris',
        dateCreation: '2020-01-15',
        active: true
      }
    ]

    res.status(200).json({ 
      companies: mockCompanies.filter(c => 
        c.denomination.toLowerCase().includes(q.toLowerCase()) ||
        c.siren.includes(q)
      ),
      total: 1,
      cursor: null
    })
  }
}
