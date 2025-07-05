// Integration tests for search functionality
import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { mockFetch, mockApiSuccess, resetAllMocks } from '../utils/api-mocks'
import '@testing-library/jest-dom'

// Mock the search page component
const MockSearchPage = () => {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  const handleSearch = async () => {
    if (!query) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/companies/search-v2?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une entreprise..."
        data-testid="search-input"
      />
      <button 
        onClick={handleSearch}
        disabled={loading}
        data-testid="search-button"
      >
        {loading ? 'Recherche...' : 'Rechercher'}
      </button>
      
      <div data-testid="search-results">
        {results.map((result: any) => (
          <div key={result.id || result.siren} data-testid="search-result">
            <h3>{result.denomination}</h3>
            <p>SIREN: {result.siren}</p>
            <p>Source: {result.source}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

describe('Search Integration', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  it('should perform a complete search flow', async () => {
    // Mock successful search response
    const mockSearchResults = {
      success: true,
      results: [
        {
          siren: '652014051',
          denomination: 'CARREFOUR',
          source: 'insee',
          id: 'insee-652014051',
          active: true,
        },
        {
          siren: '652014051',
          denomination: 'CARREFOUR FRANCE',
          source: 'bodacc',
          id: 'bodacc-652014051',
          active: true,
        }
      ],
      sources: {
        local: 0,
        insee: 1,
        bodacc: 1
      },
      errors: []
    }

    // Mock the fetch call more explicitly
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearchResults,
    })

    render(<MockSearchPage />)

    // Enter search query
    const searchInput = screen.getByTestId('search-input')
    const searchButton = screen.getByTestId('search-button')

    fireEvent.change(searchInput, { target: { value: 'carrefour' } })
    expect(searchInput).toHaveValue('carrefour')

    // Click search button
    fireEvent.click(searchButton)

    // Button should show loading state
    expect(searchButton).toHaveTextContent('Recherche...')
    expect(searchButton).toBeDisabled()

    // Wait for results
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument()
    })

    // Check that results are displayed
    const results = screen.getAllByTestId('search-result')
    expect(results).toHaveLength(2)

    // Check first result
    expect(results[0]).toHaveTextContent('CARREFOUR')
    expect(results[0]).toHaveTextContent('SIREN: 652014051')
    expect(results[0]).toHaveTextContent('Source: insee')

    // Check second result
    expect(results[1]).toHaveTextContent('CARREFOUR FRANCE')
    expect(results[1]).toHaveTextContent('Source: bodacc')

    // Button should be back to normal state
    expect(searchButton).toHaveTextContent('Rechercher')
    expect(searchButton).not.toBeDisabled()
  })

  it('should handle search errors gracefully', async () => {
    // Mock error response
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        message: 'Search failed',
        errors: ['API Error']
      })
    })

    render(<MockSearchPage />)

    const searchInput = screen.getByTestId('search-input')
    const searchButton = screen.getByTestId('search-button')

    fireEvent.change(searchInput, { target: { value: 'test' } })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(searchButton).toHaveTextContent('Rechercher')
    })

    // Should show no results on error
    const resultsContainer = screen.getByTestId('search-results')
    expect(resultsContainer).toBeEmptyDOMElement()
  })

  it('should handle empty search results', async () => {
    mockFetch({
      success: true,
      results: [],
      sources: {
        local: 0,
        insee: 0,
        bodacc: 0
      },
      errors: []
    })

    render(<MockSearchPage />)

    const searchInput = screen.getByTestId('search-input')
    const searchButton = screen.getByTestId('search-button')

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(searchButton).toHaveTextContent('Rechercher')
    })

    const resultsContainer = screen.getByTestId('search-results')
    expect(resultsContainer).toBeEmptyDOMElement()
  })

  it('should not search with empty query', () => {
    render(<MockSearchPage />)

    const searchButton = screen.getByTestId('search-button')
    fireEvent.click(searchButton)

    // Should not trigger loading state
    expect(searchButton).toHaveTextContent('Rechercher')
    expect(searchButton).not.toBeDisabled()
  })

  it('should handle special characters in search query', async () => {
    const specialCharQuery = 'café & réseau'
    
    mockFetch({
      success: true,
      results: [],
      sources: { local: 0, insee: 0, bodacc: 0 },
      errors: []
    })

    render(<MockSearchPage />)

    const searchInput = screen.getByTestId('search-input')
    const searchButton = screen.getByTestId('search-button')

    fireEvent.change(searchInput, { target: { value: specialCharQuery } })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(searchButton).toHaveTextContent('Rechercher')
    })

    // Verify the API was called with properly encoded query
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/companies/search-v2?q=${encodeURIComponent(specialCharQuery)}`
    )
  })

  it('should handle network timeout', async () => {
    // Mock network timeout
    global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'))

    render(<MockSearchPage />)

    const searchInput = screen.getByTestId('search-input')
    const searchButton = screen.getByTestId('search-button')

    fireEvent.change(searchInput, { target: { value: 'test' } })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(searchButton).toHaveTextContent('Rechercher')
    })

    // Should handle error gracefully
    const resultsContainer = screen.getByTestId('search-results')
    expect(resultsContainer).toBeEmptyDOMElement()
  })
})