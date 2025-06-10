export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { q } = req.query

  if (!q) {
    return res.status(400).json({ message: 'Query parameter is required' })
  }

  try {
    // Simulated search - in production, integrate with SIRENE API
    const mockCompanies = [
      {
        siren: '123456789',
        denomination: 'EXEMPLE ENTREPRISE SAS',
        apeCode: '6202A',
        apeLibelle: 'Conseil en systèmes et logiciels informatiques',
        adresse: '123 Rue de la Paix, 75001 Paris',
        dateCreation: '2020-01-15',
        active: true
      },
      {
        siren: '987654321',
        denomination: 'SOCIÉTÉ DEMO SARL',
        apeCode: '4791A',
        apeLibelle: 'Vente à distance sur catalogue général',
        adresse: '456 Avenue des Champs, 69000 Lyon',
        dateCreation: '2018-06-20',
        active: true
      }
    ]

    // Filter based on query
    const filteredCompanies = mockCompanies.filter(company =>
      company.denomination.toLowerCase().includes(q.toLowerCase()) ||
      company.siren.includes(q) ||
      company.adresse.toLowerCase().includes(q.toLowerCase())
    )

    res.status(200).json({ companies: filteredCompanies })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
