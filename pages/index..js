import { useState } from 'react'
import { useRouter } from 'next/router'
import { Search, Building2, FileText, BarChart3 } from 'lucide-react'
import SearchForm from '../components/SearchForm'
import CompanyList from '../components/CompanyList'

export default function Home() {
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleSearch = async (query) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Erreur de recherche')
      
      const data = await response.json()
      setSearchResults(data.companies || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompanySelect = (siren) => {
    router.push(`/entreprise/${siren}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-10 w-10 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">
                Plateforme Entreprise
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Rechercher une entreprise
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Collectez des données et documents justificatifs en open data
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Search className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Recherche Avancée
              </h3>
              <p className="text-gray-600">
                Recherchez par SIREN, dénomination sociale ou adresse
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Documents Officiels
              </h3>
              <p className="text-gray-600">
                Accédez aux bilans, statuts et publications BODACC
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Analyse Financière
              </h3>
              <p className="text-gray-600">
                Ratios financiers et indicateurs sectoriels
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <SearchForm onSearch={handleSearch} loading={loading} />
          
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <CompanyList 
              companies={searchResults} 
              onCompanySelect={handleCompanySelect}
            />
          )}
        </div>
      </main>
    </div>
  )
}
