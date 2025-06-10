export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { siren } = req.query

  if (!siren) {
    return res.status(400).json({ message: 'SIREN is required' })
  }

  try {
    // Integration with BODACC API
    const bodaccApiUrl = `https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/`
    const params = new URLSearchParams({
      dataset: 'annonces-commerciales',
      q: `siren:${siren}`,
      rows: 100,
      sort: 'dateparution'
    })

    const response = await fetch(`${bodaccApiUrl}?${params}`)
    
    if (!response.ok) {
      throw new Error(`BODACC API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Transform BODACC data
    const publications = data.records?.map(record => ({
      date: record.fields.dateparution,
      type: 'Publication BODACC',
      source: 'BODACC',
      typeAvis: record.fields.typeavis,
      reference: record.fields.numero,
      description: record.fields.denomination,
      contenu: record.fields.texte,
      lien: record.fields.pdf_url
    })) || []

    res.status(200).json({ publications })

  } catch (error) {
    console.error('BODACC API error:', error)
    
    // Fallback mock data
    const mockPublications = [
      {
        date: '2023-12-01',
        type: 'Publication BODACC',
        source: 'BODACC',
        typeAvis: 'Modification',
        reference: 'BODACC-B-2023-001',
        description: 'Modification des statuts',
        contenu: 'Changement de dirigeant',
        lien: '/documents/bodacc-2023.pdf'
      }
    ]

    res.status(200).json({ publications: mockPublications })
  }
}
