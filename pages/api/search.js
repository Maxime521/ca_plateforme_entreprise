// pages/api/search.js
import { NextApiRequest, NextApiResponse } from 'next'

// Mock data for demonstration - in production, this would connect to your database
const mockCompanies = [
  {
    siren: '123456789',
    denomination: 'TechCorp Solutions SAS',
    adresse: '123 Avenue des Champs-Élysées, 75008 Paris',
    apeCode: '6201Z',
    apeLibelle: 'Programmation informatique',
    dateCreation: '2015-03-15',
    active: true,
    employees: 150,
    turnover: 5200000
  },
  {
    siren: '987654321',
    denomination: 'Innovate Digital SARL',
    adresse: '45 Rue de la République, 69001 Lyon',
    apeCode: '7311Z',
    apeLibelle: 'Activités des agences de publicité',
    dateCreation: '2018-07-22',
    active: true,
    employees: 75,
    turnover: 2800000
  },
  {
    siren: '456789123',
    denomination: 'Green Energy France SA',
    adresse: '78 Boulevard Saint-Germain, 75005 Paris',
    apeCode: '3511Z',
    apeLibelle: 'Production d\'électricité',
    dateCreation: '2012-11-08',
    active: true,
    employees: 320,
    turnover: 15600000
  },
  {
    siren: '789123456',
    denomination: 'Artisan Boulangerie Martin',
    adresse: '12 Rue du Commerce, 13001 Marseille',
    apeCode: '1071C',
    apeLibelle: 'Boulangerie et boulangerie-pâtisserie',
    dateCreation: '2008-05-14',
    active: true,
    employees: 8,
    turnover: 420000
  },
  {
    siren: '321654987',
    denomination: 'Consulting Pro Services',
    adresse: '67 Avenue de la Liberté, 59000 Lille',
    apeCode: '7022Z',
    apeLibelle: 'Conseil pour les affaires et autres conseils de gestion',
    dateCreation: '2020-01-20',
    active: true,
    employees: 25,
    turnover: 1200000
  },
  {
    siren: '654987321',
    denomination: 'Fashion Boutique Élégance',
    adresse: '34 Rue de Rivoli, 75001 Paris',
    apeCode: '4771Z',
    apeLibelle: 'Commerce de détail d\'habillement en magasin spécialisé',
    dateCreation: '2019-09-10',
    active: false,
    employees: 12,
    turnover: 680000
  }
]

function searchCompanies(query, filters = {}) {
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)
  
  return mockCompanies.filter(company => {
    const searchableText = [
      company.siren,
      company.denomination,
      company.adresse,
      company.apeCode,
      company.apeLibelle
    ].join(' ').toLowerCase()

    // Check if all search terms are found
    const matchesQuery = searchTerms.every(term => 
      searchableText.includes(term)
    )

    // Apply filters
    let matchesFilters = true
    
    if (filters.status && filters.status !== 'all') {
      matchesFilters = matchesFilters && (
        (filters.status === 'active' && company.active) ||
        (filters.status === 'inactive' && !company.active)
      )
    }

    if (filters.type && filters.type !== 'all') {
      const companyType = company.denomination.toLowerCase()
      matchesFilters = matchesFilters && companyType.includes(filters.type.toLowerCase())
    }

    return matchesQuery && matchesFilters
  })
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { q: query, ...filters } = req.query

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Query parameter is required',
        companies: []
      })
    }

    // Simulate API delay for realistic experience
    setTimeout(() => {
      const results = searchCompanies(query, filters)
      
      // Sort by relevance (simplified scoring)
      const sortedResults = results.sort((a, b) => {
        const aScore = a.denomination.toLowerCase().includes(query.toLowerCase()) ? 2 : 1
        const bScore = b.denomination.toLowerCase().includes(query.toLowerCase()) ? 2 : 1
        return bScore - aScore
      })

      res.status(200).json({
        query,
        total: sortedResults.length,
        companies: sortedResults.slice(0, 10), // Limit to 10 results
        filters: filters
      })
    }, Math.random() * 800 + 200) // Random delay between 200-1000ms

  } catch (error) {
    console.error('Search API error:', error)
    res.status(500).json({ 
      message: 'Internal server error',
      companies: []
    })
  }
}
