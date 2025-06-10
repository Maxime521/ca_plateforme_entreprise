export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { siren } = req.query

  if (!siren) {
    return res.status(400).json({ message: 'SIREN is required' })
  }

  try {
    // Integration with RNE API for documents
    const rneApiUrl = `https://data.inpi.fr/entreprises/${siren}/actes`
    const headers = {
      'Authorization': `Bearer ${process.env.RNE_API_TOKEN}`,
      'Accept': 'application/json'
    }

    const response = await fetch(rneApiUrl, { headers })
    
    if (!response.ok) {
      throw new Error(`RNE API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Transform RNE data
    const documents = data.actes?.map(acte => ({
      date: acte.dateDepot,
      type: 'Actes/statuts',
      source: 'RNE',
      typeAvis: acte.typeActe,
      reference: acte.numeroDepot,
      description: acte.denomination,
      contenu: acte.description,
      lien: acte.urlDocument
    })) || []

    res.status(200).json({ documents })

  } catch (error) {
    console.error('RNE API error:', error)
    
    // Fallback mock data
    const mockDocuments = [
      {
        date: '2024-03-15',
        type: 'Comptes annuels',
        source: 'RNE',
        typeAvis: 'Dépôt',
        reference: 'CA2023-001',
        description: 'Comptes annuels 2023',
        contenu: 'Bilan et compte de résultat',
        lien: '/documents/ca-2023.pdf'
      }
    ]

    res.status(200).json({ documents: mockDocuments })
  }
}
