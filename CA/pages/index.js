import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import SearchForm from '../components/SearchForm';
import CompanyCard from '../components/CompanyCard';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Search companies using the new combined API
  const { data: searchResults, isLoading: searchLoading, error } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 3) return null;
      
      try {
        const response = await axios.get('/api/companies/search-v2', {
          params: { q: searchQuery }
        });
        return response.data;
      } catch (error) {
        console.error('Search error:', error);
        throw error;
      }
    },
    enabled: !!searchQuery && searchQuery.length >= 3,
    staleTime: 60000, // Cache for 1 minute
    retry: 1
  });

  // Fetch company details using the new details API
  const { data: companyDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['company-details', selectedCompany?.siren],
    queryFn: async () => {
      if (!selectedCompany?.siren) return null;
      
      try {
        const response = await axios.get(`/api/companies/${selectedCompany.siren}/details`);
        return response.data.data;
      } catch (error) {
        console.error('Company details error:', error);
        throw error;
      }
    },
    enabled: !!selectedCompany?.siren,
    staleTime: 300000 // Cache for 5 minutes
  });

  const handleSearch = (query) => {
    setSearchQuery(query);
    setSelectedCompany(null);
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Plateforme Enterprise
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Recherchez et analysez les données d'entreprises françaises depuis les sources officielles
            </p>
            
            {/* API Status Indicators */}
            <div className="mt-4 flex justify-center space-x-4">
              <APIStatusIndicator 
                name="INSEE" 
                status={searchResults?.errors?.find(e => e.source === 'insee') ? 'error' : 'active'} 
              />
              <APIStatusIndicator 
                name="BODACC" 
                status={searchResults?.errors?.find(e => e.source === 'bodacc') ? 'error' : 'active'} 
              />
              <APIStatusIndicator 
                name="Base locale" 
                status={searchResults?.sources?.local > 0 ? 'active' : 'inactive'} 
              />
            </div>
          </div>

          {/* Search */}
          <div className="mb-8">
            <SearchForm onSearch={handleSearch} loading={searchLoading} />
            {searchQuery && searchQuery.length < 3 && (
              <p className="text-center text-sm text-orange-600 dark:text-orange-400 mt-2">
                Veuillez entrer au moins 3 caractères pour rechercher
              </p>
            )}
          </div>

          {/* Error Handling */}
          {error && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="text-red-800 dark:text-red-400 font-semibold mb-1">
                  Erreur de recherche
                </h3>
                <p className="text-red-700 dark:text-red-300 text-sm">
                  {error.response?.data?.message || 'Une erreur est survenue lors de la recherche. Veuillez réessayer.'}
                </p>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {searchResults && searchResults.success && (
            <div className="max-w-4xl mx-auto mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-blue-700 dark:text-blue-400 text-sm">
                  Sources consultées: {searchResults.sources.local} local, {searchResults.sources.insee} INSEE, {searchResults.sources.bodacc} BODACC
                  {searchResults.errors.length > 0 && (
                    <span className="text-orange-600 dark:text-orange-400 ml-2">
                      ({searchResults.errors.length} erreur{searchResults.errors.length > 1 ? 's' : ''})
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults && searchResults.results && searchResults.results.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {searchResults.results.length} résultat{searchResults.results.length > 1 ? 's' : ''} trouvé{searchResults.results.length > 1 ? 's' : ''}
              </h2>
              <div className="space-y-4">
                {searchResults.results.map((company) => (
                  <div key={company.id || company.siren} className="relative">
                    <CompanyCard
                      company={company}
                      onClick={handleCompanySelect}
                    />
                    {/* Source indicator */}
                    <div className="absolute top-2 right-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        company.source === 'local' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                        company.source === 'insee' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      }`}>
                        {company.source === 'local' ? 'Local' :
                         company.source === 'insee' ? 'INSEE' : 'BODACC'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchQuery && searchQuery.length >= 3 && searchResults?.results?.length === 0 && !searchLoading && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Aucun résultat trouvé pour "{searchQuery}"
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Vérifiez l'orthographe ou essayez un autre terme de recherche
              </p>
            </div>
          )}

          {/* Loading State */}
          {searchLoading && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Recherche en cours dans les bases INSEE et BODACC...
              </p>
            </div>
          )}

          {/* Selected Company Details */}
          {selectedCompany && (
            <CompanyDetails 
              company={selectedCompany} 
              details={companyDetails}
              loading={detailsLoading}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

// API Status Indicator Component
function APIStatusIndicator({ name, status }) {
  const statusColors = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
    inactive: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-800',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status]}`}>
      <span className={`h-2 w-2 rounded-full mr-2 ${
        status === 'active' ? 'bg-green-600 dark:bg-green-400' : 
        status === 'error' ? 'bg-red-600 dark:bg-red-400' : 
        'bg-gray-600 dark:bg-gray-400'
      }`} />
      {name}
    </div>
  );
}

// Enhanced Company Details Component
function CompanyDetails({ company, details, loading }) {
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-white dark:bg-[#1e293b] rounded-lg shadow-lg p-6 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const companyData = details?.company || company;

  return (
    <div className="max-w-6xl mx-auto mt-8 bg-white dark:bg-[#1e293b] rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-[#334155]">
      <div className="px-6 py-4 bg-green-50 dark:bg-green-900/30 border-b border-green-200 dark:border-green-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{companyData.denomination}</h2>
        <p className="text-green-700 dark:text-green-400">SIREN: {companyData.siren}</p>
      </div>
      
      <div className="p-6">
        {/* Company Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Informations générales</h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><span className="font-medium">Forme juridique:</span> {companyData.formeJuridique || 'N/A'}</p>
              <p><span className="font-medium">Code APE:</span> {companyData.codeAPE || 'N/A'}</p>
              <p><span className="font-medium">Effectif:</span> {companyData.effectif || 'N/A'}</p>
              <p><span className="font-medium">Employeur:</span> {companyData.caractereEmployeur === 'O' ? 'Oui' : 'Non'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Dates importantes</h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><span className="font-medium">Création:</span> {companyData.dateCreation ? new Date(companyData.dateCreation).toLocaleDateString('fr-FR') : 'N/A'}</p>
              <p><span className="font-medium">Statut:</span> <span className={companyData.active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{companyData.active ? 'Active' : 'Inactive'}</span></p>
              {companyData.dateCessation && (
                <p><span className="font-medium">Cessation:</span> {new Date(companyData.dateCessation).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Économie sociale</h3>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>{companyData.economiqueSolidaire ? '✅ Entreprise de l\'économie sociale et solidaire' : '❌ Entreprise classique'}</p>
            </div>
          </div>
        </div>

        {/* Establishments */}
        {details?.establishments && details.establishments.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Établissements ({details.establishments.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {details.establishments.slice(0, 4).map((establishment) => (
                <div key={establishment.siret} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    SIRET: {establishment.siret}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {establishment.adresse}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      establishment.active 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {establishment.active ? 'Actif' : 'Fermé'}
                    </span>
                    {establishment.siegeSocial && (
                      <span className="text-xs px-2 py-1 ml-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        Siège social
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BODACC Announcements */}
        {details?.announcements && details.announcements.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Annonces BODACC récentes
            </h3>
            <div className="space-y-3">
              {details.announcements.slice(0, 5).map((announcement, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {announcement.typeAnnonce}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(announcement.dateParution).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {announcement.details && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {announcement.details.substring(0, 200)}
                      {announcement.details.length > 200 && '...'}
                    </p>
                  )}
                  {announcement.tribunal && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Tribunal: {announcement.tribunal}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BODACC Statistics */}
        {details?.statistics && details.statistics.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Statistiques BODACC
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {details.statistics.map((stat, index) => (
                <div key={index} className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stat.count}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {stat.type}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Errors */}
        {details?.errors && details.errors.length > 0 && (
          <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-400 font-medium mb-2">
              Certaines données n'ont pas pu être récupérées:
            </p>
            <ul className="list-disc list-inside text-sm text-orange-600 dark:text-orange-300">
              {details.errors.map((error, index) => (
                <li key={index}>{error.source}: {error.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Login Page Component (unchanged)
function LoginPage() {
  const { login, register, resetPassword, error, loading, clearError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      alert('Veuillez entrer votre adresse email');
      return;
    }

    try {
      await resetPassword(email);
      alert('Email de réinitialisation envoyé!');
      setShowResetPassword(false);
    } catch (error) {
      // Error is handled by the auth hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {isLogin ? 'Connexion' : 'Inscription'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            Accédez à la plateforme de données d'entreprises
          </p>
          {!showResetPassword && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-400 text-xs text-center">
                🔥 Authentification Firebase activée
              </p>
            </div>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={showResetPassword ? handleResetPassword : handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500"
            />
            
            {!showResetPassword && (
              <>
                {!isLogin && (
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nom complet"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500"
                  />
                )}
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500"
                />
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : showResetPassword ? (
              'Envoyer le lien de réinitialisation'
            ) : isLogin ? (
              'Se connecter'
            ) : (
              "S'inscrire"
            )}
          </button>

          <div className="text-center space-y-2">
            {!showResetPassword ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-green-600 dark:text-green-400 hover:text-green-500 text-sm"
                >
                  {isLogin ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
                </button>
                {isLogin && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-500 text-sm"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-500 text-sm"
              >
                Retour à la connexion
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
