// components/SearchForm.js - FIXED VERSION with Better Button Alignment
import { useState } from 'react';

export default function SearchForm({ onSearch, loading }) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const quickSearches = [
    { label: 'CARREFOUR', type: 'name' },
    { label: 'DANONE', type: 'name' },
    { label: '652014051', type: 'siren' },
    { label: 'TOTAL', type: 'name' }
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        {/* FIXED: Better Search Input with Properly Aligned Button */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom d'entreprise, SIREN ou activité..."
            className="block w-full pl-12 pr-36 py-4 border-2 border-gray-200 dark:border-dark-border rounded-2xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-lg bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 shadow-card hover:shadow-card-hover"
            disabled={loading}
          />
          
          {/* FIXED: Better Button Positioning and Styling */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="text-sm">Recherche...</span>
                </div>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm font-medium">Rechercher</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Type Selector */}
        <div className="mt-6 flex items-center justify-center space-x-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">Type de recherche:</span>
          <div className="flex rounded-xl bg-gray-100 dark:bg-dark-card p-1">
            {[
              { value: 'all', label: 'Tout', icon: '🔍' },
              { value: 'name', label: 'Nom', icon: '🏢' },
              { value: 'siren', label: 'SIREN', icon: '🔢' }
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setSearchType(type.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  searchType === type.value
                    ? 'bg-white dark:bg-dark-surface text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="mr-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Quick Search Suggestions */}
      {!query && (
        <div className="mt-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            Recherches populaires
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {quickSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(search.label);
                  onSearch(search.label);
                }}
                className="inline-flex items-center px-4 py-2 bg-white/60 dark:bg-dark-surface/60 backdrop-blur-sm border border-gray-200 dark:border-dark-border rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 hover:scale-105"
              >
                <span className="mr-2">
                  {search.type === 'siren' ? '🔢' : '🏢'}
                </span>
                {search.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Tips */}
      {query && query.length > 0 && query.length < 3 && (
        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl">
          <div className="flex items-center">
            <span className="text-orange-500 mr-2">💡</span>
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Veuillez entrer au moins 3 caractères pour lancer la recherche
            </p>
          </div>
        </div>
      )}

      {/* Search Help */}
      <div className="mt-6 text-center">
        <details className="group">
          <summary className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors">
            <span>Aide à la recherche</span>
            <svg className="ml-1 h-4 w-4 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          
          <div className="mt-4 p-6 bg-white/60 dark:bg-dark-surface/60 backdrop-blur-sm border border-gray-200 dark:border-dark-border rounded-xl text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Types de recherche</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                    <strong>Nom:</strong> "CARREFOUR", "TOTAL"
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                    <strong>SIREN:</strong> 9 chiffres (ex: 652014051)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                    <strong>Activité:</strong> "restaurant", "informatique"
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Sources de données</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">🏛️</span>
                    <strong>INSEE SIRENE:</strong> Données officielles
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">📰</span>
                    <strong>BODACC:</strong> Annonces légales
                  </li>
                  <li className="flex items-center">
                    <span className="text-gray-500 mr-2">💾</span>
                    <strong>Base locale:</strong> Données mises en cache
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
