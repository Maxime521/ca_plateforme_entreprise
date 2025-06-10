export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { siren } = req.query

  if (!siren) {
    return res.status(400).json({ message: 'SIREN is required' })
  }

  try {
    // Mock company data - integrate with real APIs
    const mockCompanyData = {
      siren,
      denomination: 'EXEMPLE ENTREPRISE SAS',
      siret: `${siren}00012`,
      apeCode: '6202A',
      apeLibelle: 'Conseil en systèmes et logiciels informatiques',
      formeJuridique: 'Société par actions simplifiée',
      adresseSiege: '123 Rue de la Paix, 75001 Paris',
      dateCreation: '2020-01-15',
      dateImmatriculation: '2020-01-20',
      capitalSocial: 50000,
      active: true,
      natureEntreprise: 'Commerciale',
      documents: [
        {
          date: '2024-03-15',
          type: 'Comptes annuels',
          source: 'RNE',
          typeAvis: 'Dépôt',
          reference: 'CA2023-001',
          description: 'Comptes annuels 2023',
          contenu: 'Bilan et compte de résultat',
          lien: '/documents/ca-2023.pdf'
        },
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
      ],
      ratiosFinanciers: {
        rentabilite: 12.5,
        liquidite: 2.1,
        solvabilite: 65.3,
        autonomie: 45.8
      }
    }

    res.status(200).json(mockCompanyData)
  } catch (error) {
    console.error('Company fetch error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
