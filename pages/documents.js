//==============================================================================
// pages/documents.js - FIXED VERSION with Banner & Icon Removal
//==============================================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import RoleGuard from '../components/RoleGuard';
import { useAuth } from '../hooks/useAuth';
import { FEATURES } from '../utils/rolePermissions';

export default function Documents() {
  const { user, userRole, isAdmin } = useAuth();
  
  if (!user) {
    return <div>Accès non autorisé</div>;
  }

  return (
    <RoleGuard requiredFeature={FEATURES.DOCUMENTS}>
      <Layout>
        <DocumentsContent userRole={userRole} isAdmin={isAdmin()} />
      </Layout>
    </RoleGuard>
  );
}

function DocumentsContent({ userRole, isAdmin }) {
  const [filters, setFilters] = useState({
    search: '',
    typeDocument: '',
    source: '',
    dateFrom: '',
    dateTo: '',
    company: ''
  });
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // Mock documents data
  const mockDocuments = [
    {
      id: '1',
      companyName: 'TechCorp Innovation SAS',
      siren: '123456789',
      datePublication: '2024-01-15',
      typeDocument: 'Statuts constitutifs',
      source: 'RNE',
      description: 'Dépôt des statuts constitutifs de la société',
      lienDocument: '#',
      fileSize: '2.3 MB',
      status: 'Traité',
      tags: ['Création', 'Statuts']
    },
    {
      id: '2',
      companyName: 'Green Energy Solutions SARL',
      siren: '987654321',
      datePublication: '2023-12-10',
      typeDocument: 'Comptes annuels',
      source: 'RNE',
      description: 'Comptes annuels 2023 - Exercice clos le 31/12/2023',
      lienDocument: '#',
      fileSize: '5.7 MB',
      status: 'Traité',
      tags: ['Comptabilité', '2023']
    },
    // Add more mock documents...
  ];

  const filteredDocuments = mockDocuments.filter(doc => {
    return (
      (filters.search === '' || 
       doc.companyName.toLowerCase().includes(filters.search.toLowerCase()) ||
       doc.siren.includes(filters.search) ||
       doc.description.toLowerCase().includes(filters.search.toLowerCase())) &&
      (filters.typeDocument === '' || doc.typeDocument === filters.typeDocument) &&
      (filters.source === '' || doc.source === filters.source) &&
      (filters.company === '' || doc.companyName.toLowerCase().includes(filters.company.toLowerCase()))
    );
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      typeDocument: '',
      source: '',
      dateFrom: '',
      dateTo: '',
      company: ''
    });
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header - CLEANED UP */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Documents
            </h1>
            {/* REMOVED: Role badge from header */}
            <p className="text-gray-600 dark:text-gray-200">
              Consultez et gérez les documents officiels des entreprises
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'grid'
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                🔳 Grille
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  viewMode === 'list'
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                📋 Liste
              </button>
            </div>
            
            {/* Admin-only import button */}
            {isAdmin && (
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                📤 Importer documents
              </button>
            )}
          </div>
        </div>

        {/* COMPLETELY REMOVED: "Accès en consultation" banner */}

        {/* Filters - Available for all users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 lg:mb-0">
              Filtres et recherche
            </h2>
            <button
              onClick={clearFilters}
              className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            >
              Effacer tous les filtres
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recherche globale
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Entreprise, SIREN, description..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type de document
              </label>
              <select
                value={filters.typeDocument}
                onChange={(e) => handleFilterChange('typeDocument', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Tous</option>
                <option value="Statuts constitutifs">Statuts constitutifs</option>
                <option value="Comptes annuels">Comptes annuels</option>
                <option value="Publication BODACC">Publication BODACC</option>
                <option value="Rapport d'activité">Rapport d'activité</option>
                <option value="Bilan comptable">Bilan comptable</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Toutes</option>
                <option value="RNE">RNE</option>
                <option value="BODACC">BODACC</option>
                <option value="INSEE">INSEE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entreprise
              </label>
              <input
                type="text"
                value={filters.company}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                placeholder="Nom d'entreprise..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <p className="text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{filteredDocuments.length}</span> document{filteredDocuments.length > 1 ? 's' : ''} trouvé{filteredDocuments.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Download selection - available for all users */}
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              📥 Télécharger sélection
            </button>
          </div>
        </div>

        {/* Documents Display */}
        <div className="space-y-4">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onClick={setSelectedDocument}
                userRole={userRole}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucun document trouvé
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
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

        {/* Document Modal */}
        {selectedDocument && (
          <DocumentModal
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            userRole={userRole}
          />
        )}
      </div>
    </div>
  );
}

// Enhanced Document Card - CLEANED UP
function DocumentCard({ document, onClick, userRole }) {
  const isAdmin = userRole === 'admin';
  
  return (
    <div
      onClick={() => onClick(document)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Document content... */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">📄</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {document.typeDocument}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {document.companyName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            {document.status}
          </span>
          {/* REMOVED: Admin-only edit indicator */}
        </div>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {document.description}
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>📅 {new Date(document.datePublication).toLocaleDateString('fr-FR')}</span>
          <span>📊 {document.source}</span>
        </div>
        <span>💾 {document.fileSize}</span>
      </div>
    </div>
  );
}

function DocumentModal({ document, onClose, userRole }) {
  const isAdmin = userRole === 'admin';
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">📄</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {document.typeDocument}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">{document.companyName}</p>
                </div>
                {/* REMOVED: Role indicator from modal */}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            {/* Document details... */}
            <div className="space-y-4">
              <p><strong>Description:</strong> {document.description}</p>
              <p><strong>Source:</strong> {document.source}</p>
              <p><strong>Date:</strong> {new Date(document.datePublication).toLocaleDateString('fr-FR')}</p>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Fermer
              </button>
              <button className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                📥 Télécharger
              </button>
              {/* Admin-only actions */}
              {isAdmin && (
                <button className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                  ✏️ Modifier
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
