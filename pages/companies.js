import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import CompanyCard from '../components/CompanyCard';
import { useAuth } from '../hooks/useAuth';

export default function Companies() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    forme: '',
    secteur: '',
    active: 'all',
    region: '',
    sortBy: 'name'
  });
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Fetch companies using React Query with real API
  const searchParams = {
    q: filters.search,
    forme: filters.forme,
    secteur: filters.secteur,
    active: filters.active,
    region: filters.region,
    sortBy: filters.sortBy,
    limit: 50 // Get more results for better user experience
  };

  const {
    data: companiesData,
    error: companiesError,
    isLoading: companiesLoading,
    refetch: refetchCompanies
  } = useQuery({
    queryKey: ['companies', searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`/api/companies/search-filtered?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      return response.json();
    },
    enabled: true, // Always fetch companies, even without search terms
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  const sortedCompanies = companiesData?.results || [];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      forme: '',
      secteur: '',
      active: 'all',
      region: '',
      sortBy: 'name'
    });
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
  };

  if (!user) {
    return <div>Accès non autorisé</div>;
  }

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Entreprises
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Gérez et explorez votre base de données d&apos;entreprises
            </p>
          </div>

          {/* Filters Section */}
          <div className="bg-white dark:bg-[#1e293b] rounded-lg shadow-sm border border-gray-200 dark:border-[#334155] p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 lg:mb-0">
                Filtres et recherche
              </h2>
              <button
                onClick={clearFilters}
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              >
                Effacer tous les filtres
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Search */}
              <div className="xl:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recherche
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Nom, SIREN, activité..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Form juridique */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Forme juridique
                </label>
                <select
                  value={filters.forme}
                  onChange={(e) => handleFilterChange('forme', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100"
                >
                  <option value="">Toutes</option>
                  <option value="SAS">SAS</option>
                  <option value="SARL">SARL</option>
                  <option value="SA">SA</option>
                  <option value="EURL">EURL</option>
                </select>
              </div>

              {/* Secteur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Secteur
                </label>
                <select
                  value={filters.secteur}
                  onChange={(e) => handleFilterChange('secteur', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100"
                >
                  <option value="">Tous</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Industrie alimentaire">Industrie alimentaire</option>
                  <option value="Automobile">Automobile</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Construction">Construction</option>
                  <option value="Conseil">Conseil</option>
                  <option value="Énergie">Énergie</option>
                  <option value="Finance">Finance</option>
                  <option value="Immobilier">Immobilier</option>
                  <option value="Informatique">Informatique</option>
                  <option value="Santé">Santé</option>
                  <option value="Services">Services</option>
                  <option value="Transport">Transport</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Statut
                </label>
                <select
                  value={filters.active}
                  onChange={(e) => handleFilterChange('active', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Toutes</option>
                  <option value="active">Actives</option>
                  <option value="inactive">Inactives</option>
                </select>
              </div>

              {/* Tri */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trier par
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100"
                >
                  <option value="name">Nom</option>
                  <option value="date">Date de création</option>
                  <option value="capital">Capital social</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <div className="mb-4 sm:mb-0">
              {companiesLoading ? (
                <p className="text-gray-600 dark:text-gray-300">Recherche en cours...</p>
              ) : companiesError ? (
                <p className="text-red-600 dark:text-red-400">Erreur lors de la recherche</p>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">{companiesData?.total || sortedCompanies.length}</span> entreprise{(companiesData?.total || sortedCompanies.length) > 1 ? 's' : ''} trouvée{(companiesData?.total || sortedCompanies.length) > 1 ? 's' : ''}
                  {companiesData?.total > sortedCompanies.length && (
                    <span className="text-sm text-gray-500 ml-2">
                      (affichage des {sortedCompanies.length} premiers)
                    </span>
                  )}
                  {companiesData?.hasExternalResults && (
                    <span className="text-sm text-blue-600 dark:text-blue-400 ml-2">
                      • Résultats enrichis par les APIs officielles
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Refresh button */}
              <button 
                onClick={() => refetchCompanies()}
                disabled={companiesLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-[#334155] disabled:opacity-50"
              >
                🔄 Actualiser
              </button>
              <button 
                disabled={sortedCompanies.length === 0}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-[#334155] disabled:opacity-50"
              >
                📊 Export CSV
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                ➕ Ajouter entreprise
              </button>
            </div>
          </div>

          {/* Company List */}
          <div className="space-y-4">
            {companiesLoading ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">⏳</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Recherche en cours...
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Veuillez patienter pendant que nous recherchons vos entreprises
                </p>
              </div>
            ) : companiesError ? (
              <div className="text-center py-12">
                <div className="text-red-400 dark:text-red-500 text-6xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Erreur lors de la recherche
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {companiesError?.message || 'Une erreur s\'est produite lors de la recherche'}
                </p>
                <button
                  onClick={() => refetchCompanies()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Réessayer
                </button>
              </div>
            ) : sortedCompanies.length > 0 ? (
              sortedCompanies.map((company) => (
                <CompanyCard
                  key={company.id || company.siren}
                  company={company}
                  onClick={handleCompanySelect}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Aucune entreprise trouvée
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {(filters.search || filters.forme || filters.secteur || filters.active !== 'all') 
                    ? 'Essayez de modifier vos critères de recherche'
                    : 'Utilisez les filtres ci-dessus pour rechercher des entreprises'
                  }
                </p>
                {(filters.search || filters.forme || filters.secteur || filters.active !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    Effacer les filtres
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Selected Company Modal */}
          {selectedCompany && (
            <CompanyModal
              company={selectedCompany}
              onClose={() => setSelectedCompany(null)}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

function CompanyModal({ company, onClose }) {
  // Format date safely
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Date inconnue';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-[#1e293b] rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-[#1e293b] px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">🏢</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {company.denomination || 'Entreprise sans nom'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    SIREN: {company.siren || 'N/A'}
                    {company.siret && ` • SIRET: ${company.siret}`}
                  </p>
                  {company.isExternal && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mt-1">
                      Données externes enrichies
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Informations générales
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">SIREN:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{company.siren || 'N/A'}</span>
                  </div>
                  {company.siret && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">SIRET:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{company.siret}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Forme juridique:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{company.formeJuridique || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Secteur:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{company.secteur || 'N/A'}</span>
                  </div>
                  {company.codeAPE && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Code APE:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{company.codeAPE}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Capital social:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {company.capitalSocial ? `${company.capitalSocial.toLocaleString()} €` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Date de création:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {company.dateCreation ? formatDate(company.dateCreation) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Statut:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      company.active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {company.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Localisation et activité
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-300 block mb-1">Adresse du siège:</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {company.adresseSiege || 'Non renseignée'}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Région:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{company.region || 'Non spécifiée'}</span>
                  </div>
                  {company.libelleAPE && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-300 block mb-1">Activité principale:</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{company.libelleAPE}</p>
                    </div>
                  )}
                  {company.natureEntreprise && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Nature:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{company.natureEntreprise}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-[#334155] rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#334155]"
              >
                Fermer
              </button>
              <button className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                Voir les détails complets
              </button>
              <button className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                Voir les documents
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
