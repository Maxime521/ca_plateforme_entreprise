// pages/index.js - Modern Financial Services Landing Page
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
    staleTime: 60000,
    retry: 1
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-bg dark:to-dark-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <div className="relative">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10" />
          
          {/* Content */}
          <div className="relative px-6 py-16 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              {/* Main heading */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
                  <span className="block">Données d'entreprises</span>
                  <span className="block bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                    officielles et fiables
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Accédez instantanément aux informations officielles des entreprises françaises. 
                  Recherchez, analysez et explorez les données SIRENE, RNE et BODACC en temps réel.
                </p>
              </div>

              {/* API Status Cards */}
              <div className="mb-12">
                <div className="flex justify-center space-x-4 flex-wrap gap-2">
                  <APIStatusCard 
                    name="INSEE SIRENE" 
                    status={searchResults?.errors?.find(e => e.source === 'insee') ? 'error' : 'active'} 
                    icon="🏛️"
                  />
                  <APIStatusCard 
                    name="BODACC" 
                    status={searchResults?.errors?.find(e => e.source === 'bodacc') ? 'error' : 'active'} 
                    icon="📰"
                  />
                  <APIStatusCard 
                    name="Base locale" 
                    status={searchResults?.sources?.local > 0 ? 'active' : 'ready'} 
                    icon="💾"
                  />
                </div>
              </div>

              {/* Search Form */}
              <div className="mb-16">
                <SearchForm onSearch={handleSearch} loading={searchLoading} />
                {searchQuery && searchQuery.length < 3 && (
                  <p className="text-center text-sm text-orange-600 dark:text-orange-400 mt-3">
                    Veuillez entrer au moins 3 caractères pour rechercher
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Results or Features */}
        <div className="px-6 pb-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Error Handling */}
            {error && (
              <div className="max-w-2xl mx-auto mb-8">
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-red-800 dark:text-red-400 font-semibold">
                        Erreur de recherche
                      </h3>
                      <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                        {error.response?.data?.message || 'Une erreur est survenue lors de la recherche. Veuillez réessayer.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Summary */}
            {searchResults && searchResults.success && (
              <div className="max-w-4xl mx-auto mb-8">
                <div className="bg-white/70 dark:bg-dark-surface/70 backdrop-blur-xl border border-gray-200/50 dark:border-dark-border/50 rounded-2xl p-6 shadow-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Résultats de recherche
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Sources: {searchResults.sources.local} local • {searchResults.sources.insee} INSEE • {searchResults.sources.bodacc} BODACC
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {searchResults.results.length}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">résultats</p>
                    </div>
                  </div>
                  
                  {searchResults.errors.length > 0 && (
                    <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl">
                      <p className="text-sm text-orange-700 dark:text-orange-400">
                        <span className="font-medium">Attention:</span> {searchResults.errors.length} source(s) non disponible(s)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults && searchResults.results && searchResults.results.length > 0 ? (
              <div className="max-w-4xl mx-auto">
                <div className="space-y-4">
                  {searchResults.results.map((company) => (
                    <div key={company.id || company.siren} className="relative group">
                      <CompanyCard
                        company={company}
                        onClick={handleCompanySelect}
                      />
                      {/* Source indicator */}
                      <div className="absolute top-4 right-4 z-10">
                        <SourceBadge source={company.source} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : searchQuery && searchQuery.length >= 3 && searchResults?.results?.length === 0 && !searchLoading ? (
              <NoResults query={searchQuery} />
            ) : !searchQuery ? (
              <FeatureShowcase />
            ) : null}

            {/* Loading State */}
            {searchLoading && (
              <div className="max-w-2xl mx-auto text-center">
                <div className="bg-white/70 dark:bg-dark-surface/70 backdrop-blur-xl border border-gray-200/50 dark:border-dark-border/50 rounded-2xl p-12 shadow-card">
                  <div className="animate-pulse-slow">
                    <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🔍</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Recherche en cours...
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Consultation des bases INSEE, BODACC et locale
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Company Details */}
        {selectedCompany && (
          <CompanyDetails 
            company={selectedCompany} 
            onClose={() => setSelectedCompany(null)}
          />
        )}
      </div>
    </Layout>
  );
}

// API Status Card Component
function APIStatusCard({ name, status, icon }) {
  const statusStyles = {
    active: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800',
    ready: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
    error: 'bg-error-50 text-error-700 border-error-200 dark:bg-error-900/30 dark:text-error-400 dark:border-error-800'
  };

  const statusIcons = {
    active: '●',
    ready: '○',
    error: '●'
  };

  return (
    <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 hover:scale-105 ${statusStyles[status]}`}>
      <span className="text-base mr-2">{icon}</span>
      <span className="mr-2">{name}</span>
      <span className={`text-xs ${status === 'active' ? 'text-success-500' : status === 'error' ? 'text-error-500' : 'text-gray-400'}`}>
        {statusIcons[status]}
      </span>
    </div>
  );
}

// Source Badge Component
function SourceBadge({ source }) {
  const sourceStyles = {
    local: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    insee: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    bodacc: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
  };

  const sourceLabels = {
    local: 'Local',
    insee: 'INSEE',
    bodacc: 'BODACC'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${sourceStyles[source]} backdrop-blur-sm`}>
      {sourceLabels[source]}
    </span>
  );
}

// No Results Component
function NoResults({ query }) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-white/70 dark:bg-dark-surface/70 backdrop-blur-xl border border-gray-200/50 dark:border-dark-border/50 rounded-2xl p-12 shadow-card">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🔍</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Aucun résultat trouvé
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Aucune entreprise trouvée pour "<span className="font-medium">{query}</span>"
        </p>
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <p>• Vérifiez l'orthographe</p>
          <p>• Essayez un SIREN (9 chiffres)</p>
          <p>• Utilisez des termes plus généraux</p>
        </div>
      </div>
    </div>
  );
}

// Feature Showcase Component
function FeatureShowcase() {
  const features = [
    {
      icon: '🏛️',
      title: 'Données officielles',
      description: 'Accès direct aux bases SIRENE, RNE et BODACC',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: '⚡',
      title: 'Recherche instantanée',
      description: 'Résultats en temps réel depuis plusieurs sources',
      color: 'from-primary-500 to-primary-600'
    },
    {
      icon: '📊',
      title: 'Analyses avancées',
      description: 'Tableaux de bord et visualisations interactives',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: '🔒',
      title: 'Sécurisé',
      description: 'Authentification Firebase et données chiffrées',
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Plateforme complète de données d'entreprises
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Accédez aux informations officielles de plus de 10 millions d'entreprises françaises
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        {features.map((feature, index) => (
          <div key={index} className="group">
            <div className="bg-white/70 dark:bg-dark-surface/70 backdrop-blur-xl border border-gray-200/50 dark:border-dark-border/50 rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
              <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-3xl p-8 lg:p-12 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl lg:text-5xl font-bold mb-2">10M+</div>
            <div className="text-primary-100">Entreprises référencées</div>
          </div>
          <div>
            <div className="text-4xl lg:text-5xl font-bold mb-2">3</div>
            <div className="text-primary-100">Sources officielles</div>
          </div>
          <div>
            <div className="text-4xl lg:text-5xl font-bold mb-2">24/7</div>
            <div className="text-primary-100">Disponibilité</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Company Details Modal (simplified for now)
function CompanyDetails({ company, onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-dark-surface rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-dark-surface px-6 pt-6 pb-4 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {company.denomination}
                </h2>
                <p className="text-primary-600 dark:text-primary-400 font-medium">
                  SIREN: {company.siren}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Informations générales
                </h3>
                <div className="space-y-3">
                  {company.formeJuridique && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Forme juridique:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{company.formeJuridique}</span>
                    </div>
                  )}
                  {company.codeAPE && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Code APE:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{company.codeAPE}</span>
                    </div>
                  )}
                  {company.dateCreation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Date de création:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(company.dateCreation).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Statut:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      company.active 
                        ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                        : 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400'
                    }`}>
                      {company.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Localisation
                </h3>
                {company.adresseSiege && (
                  <p className="text-gray-600 dark:text-gray-300">
                    {company.adresseSiege}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 dark:border-dark-border rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
              >
                Fermer
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl text-sm font-medium text-white hover:from-primary-600 hover:to-primary-700 transition-all duration-200 hover:scale-105 shadow-lg">
                Voir les détails complets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Login Page Component (keeping existing functionality with new design)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-white font-bold text-xl">DC</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isLogin ? 'Connexion' : 'Inscription'}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Accédez à la plateforme de données d'entreprises
          </p>
        </div>
        
        <div className="bg-white/70 dark:bg-dark-surface/70 backdrop-blur-xl border border-gray-200/50 dark:border-dark-border/50 rounded-2xl p-8 shadow-card">
          <form className="space-y-6" onSubmit={showResetPassword ? handleResetPassword : handleSubmit}>
            {error && (
              <div className="bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-xl p-4">
                <p className="text-error-700 dark:text-error-400 text-sm">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="votre@email.com"
                />
              </div>
              
              {!showResetPassword && (
                <>
                  {!isLogin && (
                    <div>
                      <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nom complet
                      </label>
                      <input
                        id="displayName"
                        name="displayName"
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                        placeholder="Votre nom complet"
                      />
                    </div>
                  )}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mot de passe
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
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

            <div className="text-center space-y-3">
              {!showResetPassword ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-500 text-sm font-medium transition-colors"
                  >
                    {isLogin ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
                  </button>
                  {isLogin && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(true)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-500 text-sm transition-colors"
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
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-500 text-sm transition-colors"
                >
                  Retour à la connexion
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
