// pages/entreprise/[siren].js
import { useRouter } from 'next/router'
import { useQuery } from 'react-query'
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Activity, 
  FileText, 
  DollarSign,
  ArrowLeft,
  Download,
  Filter
} from 'lucide-react'
import { useState } from 'react'

export default function EntreprisePage() {
  const router = useRouter()
  const { siren } = router.query
  const [documentFilter, setDocumentFilter] = useState('all')

  const { data: company, isLoading, error } = useQuery(
    ['company', siren],
    () => fetch(`/api/entreprise/${siren}`).then(res => res.json()),
    {
      enabled: !!siren,
    }
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Erreur lors du chargement des données</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  const filteredDocuments = company.documents.filter(doc => {
    if (documentFilter === 'all') return true
    return doc.type.toLowerCase().includes(documentFilter.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-6"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour
            </button>
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">
              {company.denomination}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Info Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Informations générales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SIREN
              </label>
              <p className="text-gray-900">{company.siren}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SIRET
              </label>
              <p className="text-gray-900">{company.siret}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forme juridique
              </label>
              <p className="text-gray-900">{company.formeJuridique}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code APE/NAF
              </label>
              <p className="text-gray-900">{company.apeCode} - {company.apeLibelle}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capital social
              </label>
              <p className="text-gray-900">{company.capitalSocial?.toLocaleString()} €</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de création
              </label>
              <p className="text-gray-900">{company.dateCreation}</p>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse du siège
              </label>
              <p className="text-gray-900">{company.adresseSiege}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                company.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {company.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Ratios Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Ratios financiers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4 mb-2">
                <DollarSign className="h-8 w-8 text-blue-600 mx-auto" />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Rentabilité</h3>
              <p className="text-2xl font-bold text-gray-900">
                {company.ratiosFinanciers?.rentabilite}%
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4 mb-2">
                <Activity className="h-8 w-8 text-green-600 mx-auto" />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Liquidité</h3>
              <p className="text-2xl font-bold text-gray-900">
                {company.ratiosFinanciers?.liquidite}
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4 mb-2">
                <Building2 className="h-8 w-8 text-purple-600 mx-auto" />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Solvabilité</h3>
              <p className="text-2xl font-bold text-gray-900">
                {company.ratiosFinanciers?.solvabilite}%
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-50 rounded-lg p-4 mb-2">
                <Calendar className="h-8 w-8 text-orange-600 mx-auto" />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Autonomie</h3>
              <p className="text-2xl font-bold text-gray-900">
                {company.ratiosFinanciers?.autonomie}%
              </p>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Documents et publications
            </h2>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Filter className="h-4 w-4 text-gray-400 mr-2" />
                <select
                  value={documentFilter}
                  onChange={(e) => setDocumentFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">Tous les documents</option>
                  <option value="comptes">Comptes annuels</option>
                  <option value="bodacc">Publications BODACC</option>
                  <option value="actes">Actes et statuts</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type de document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type d'avis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        {doc.type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        doc.source === 'RNE' 
                          ? 'bg-blue-100 text-blue-800'
                          : doc.source === 'BODACC'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.typeAvis}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.reference}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {doc.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => window.open(doc.lien, '_blank')}
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Télécharger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun document trouvé pour les filtres sélectionnés</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
