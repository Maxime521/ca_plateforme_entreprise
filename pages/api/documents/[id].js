export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { id } = req.query

  try {
    // Mock document fetch - integrate with real document APIs
    const mockDocument = {
      id,
      title: 'Comptes annuels 2023',
      type: 'application/pdf',
      size: '2.5 MB',
      url: `/documents/${id}.pdf`,
      metadata: {
        source: 'RNE',
        date: '2024-03-15',
        reference: 'CA2023-001'
      }
    }

    res.status(200).json(mockDocument)
  } catch (error) {
    console.error('Document fetch error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
