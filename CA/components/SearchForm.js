import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

export default function SearchForm({ onSearch, loading }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par SIREN, dénomination sociale, ou activité..."
            className="block w-full px-4 pr-32 py-4 border border-gray-300 dark:border-[#334155] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500"
            disabled={loading}
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="mr-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Rechercher'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
