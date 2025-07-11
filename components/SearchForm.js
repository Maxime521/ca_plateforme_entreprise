import { useState } from 'react'
import { Search, Loader2, Filter, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SearchForm({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [suggestions] = useState([
    'Total Energies',
    'BNP Paribas',
    'LVMH',
    'Airbus',
    'Danone'
  ])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion)
    onSearch(suggestion)
  }

  const clearSearch = () => {
    setQuery('')
  }

  return (
    <div className="space-y-6">
      {/* Main Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <Search className="h-5 w-5 text-neutral-400 group-focus-within:text-primary-500 transition-colors duration-200" />
          </div>
          
          {/* Search Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par SIREN, nom d'entreprise, ou adresse..."
            className="w-full pl-12 pr-16 py-4 text-lg border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-primary-500 focus:ring-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-500 transition-all duration-200 shadow-sm focus:shadow-md"
            disabled={loading}
          />
          
          {/* Clear Button */}
          {query && !loading && (
            <motion.button
              type="button"
              onClick={clearSearch}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-y-0 right-12 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="h-5 w-5" />
            </motion.button>
          )}
          
          {/* Loading Spinner */}
          {loading && (
            <div className="absolute inset-y-0 right-4 flex items-center">
              <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
            </div>
          )}
        </div>
        
        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors duration-200"
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtres</span>
            </button>
            
            <AnimatePresence>
              {showFilters && (
                <motion.select
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                >
                  <option value="all">Tous les types</option>
                  <option value="siren">SIREN uniquement</option>
                  <option value="name">Nom d'entreprise</option>
                  <option value="address">Adresse</option>
                  <option value="activity">Secteur d'activité</option>
                </motion.select>
              )}
            </AnimatePresence>
          </div>
          
          <motion.button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center group"
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                Rechercher
              </>
            )}
          </motion.button>
        </div>
      </form>
      
      {/* Search Suggestions */}
      {!query && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Recherches populaires :
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-primary-100 hover:text-primary-700 dark:hover:bg-primary-900/30 dark:hover:text-primary-300 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
