// ===== pages/companies.js - COMPLETE FILE =====
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

  // Mock companies data (expanded for better filtering demo)
  const mockCompanies = [
    {
      id: '1',
      siren: '123456789',
      denomination: 'TechCorp Innovation SAS',
      formeJuridique: 'SAS',
      adresseSiege: '123 Rue de la Technologie, 75001 Paris',
      libelleAPE: 'Développement informatique',
      dateCreation: '2020-01-15',
      active: true,
      codeAPE: '6201Z',
      secteur: 'Technologie',
      region: 'Île-de-France',
      capitalSocial: 100000
    },
    {
      id: '2',
      siren: '987654321',
      denomination: 'Green Energy Solutions SARL',
      formeJuridique: 'SARL',
      adresseSiege: '456 Avenue de l\'Écologie, 69001 Lyon',
      libelleAPE: 'Production d\'énergie renouvelable',
      dateCreation: '2019-06-10',
      active: true,
      codeAPE: '3511Z',
      secteur: 'Énergie',
      region: 'Auvergne-Rhône-Alpes',
      capitalSocial: 250000
    },
    {
      id: '3',
      siren: '456789123',
      denomination: 'Consulting Pro SA',
      formeJuridique: 'SA',
      adresseSiege: '789 Boulevard du Commerce, 33000 Bordeaux',
      libelleAPE: 'Conseil en stratégie d\'entreprise',
      dateCreation: '2018-03-20',
      active: false,
      codeAPE: '7022Z',
      secteur: 'Conseil',
      region: 'Nouvelle-Aquitaine',
      capitalSocial: 500000
    },
    {
      id: '4',
      siren: '789123456',
      denomination: 'HealthTech Innovations SAS',
      formeJuridique: 'SAS',
      adresseSiege: '321 Rue de la Santé, 06000 Nice',
      libelleAPE: 'Recherche-développement en biotechnologie',
      dateCreation: '2021-09-05',
      active: true,
      codeAPE: '7211Z',
      secteur: 'Santé',
      region: 'Provence-Alpes-Côte d\'Azur',
      capitalSocial: 75000
    },
    {
      id: '5',
      siren: '654321987',
      denomination: 'Fashion Forward EURL',
      formeJuridique: 'EURL',
      adresseSiege: '159 Rue de la Mode, 13000 Marseille',
      libelleAPE: 'Commerce de détail d\'habillement',
      dateCreation: '2022-01-12',
      active: true,
      codeAPE: '4771Z',
      secteur: 'Commerce',
      region: 'Provence-Alpes-Côte d\'Azur',
      capitalSocial: 30000
    }
  ];

  // Filter companies based on current filters
  const filteredCompanies = mockCompanies.filter(company => {
    return (
      // Search filter
      (filters.search === '' || 
       company.denomination.toLowerCase().includes(filters.search.toLowerCase()) ||
       company.siren.includes(filters.search) ||
       company.libelleAPE.toLowerCase().includes(filters.search.toLowerCase())) &&
      
      // Form filter
      (filters.forme === '' || company.formeJuridique === filters.forme) &&
      
      // Sector filter
      (filters.secteur === '' || company.secteur === filters.secteur) &&
      
      // Active filter
      (filters.active === 'all' || 
       (filters.active === 'active' && company.active) ||
       (filters.active === 'inactive' && !company.active)) &&
      
      // Region filter
      (filters.region === '' || company.region === filters.region)
    );
  });

  // Sort companies
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    switch (filters.sortBy) {
      case 'name':
        return a.denomination.localeCompare(b.denomination);
      case 'date':
        return new Date(b.dateCreation) - new Date(a.dateCreation);
      case 'capital':
        return (b.capitalSocial || 0) - (a.capitalSocial || 0);
      default:
        return 0;
    }
  });

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
              Gérez et explorez votre base de données d'entreprises
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
                  <option value="Technologie">Technologie</option>
                  <option value="Énergie">Énergie</option>
                  <option value="Conseil">Conseil</option>
                  <option value="Santé">Santé</option>
                  <option value="Commerce">Commerce</option>
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
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{sortedCompanies.length}</span> entreprise{sortedCompanies.length > 1 ? 's' : ''} trouvée{sortedCompanies.length > 1 ? 's' : ''}
                {filteredCompanies.length !== mockCompanies.length && (
                  <span className="text-sm ml-2">
                    (sur {mockCompanies.length} au total)
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-[#334155]">
                📊 Export CSV
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                ➕ Ajouter entreprise
              </button>
            </div>
          </div>

          {/* Company List */}
          <div className="space-y-4">
            {sortedCompanies.length > 0 ? (
              sortedCompanies.map((company) => (
                <CompanyCard
                  key={company.id}
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
                  Essayez de modifier vos critères de recherche
                </p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Effacer les filtres
                </button>
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
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-[#1e293b] rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-[#1e293b] px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {company.denomination}
              </h2>
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
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">SIREN:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{company.siren}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Forme juridique:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{company.formeJuridique}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Secteur:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{company.secteur}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Capital social:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {company.capitalSocial?.toLocaleString()} €
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Localisation
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Adresse:</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">{company.adresseSiege}</p>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Région:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{company.region}</span>
                  </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
