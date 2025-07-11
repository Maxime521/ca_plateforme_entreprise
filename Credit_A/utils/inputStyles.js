//utils/inputStyles.js

export const inputBaseStyles = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400";

export const selectBaseStyles = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";

// Example usage in your components:
// import { inputBaseStyles, selectBaseStyles } from '../utils/inputStyles';

// Example JSX usage (wrap in a parent element to avoid errors):
<>
  {/* For all input fields: */}
  <input
    type="text"
    className={inputBaseStyles}
    // ... other props
  />

  {/* For all select fields: */}
  <select
    className={selectBaseStyles}
    // ... other props
  >
    <option value="">Select option</option>
  </select>

  {/* For the main search input in SearchForm, use this enhanced version: */}
  <input
    type="text"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Rechercher par SIREN, dénomination sociale, ou activité..."
    className="block w-full pl-10 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
    disabled={loading}
  />
</>
