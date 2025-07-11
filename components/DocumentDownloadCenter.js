// components/DocumentDownloadCenter.js - Centralized Document Download Hub
//==============================================================================

import { useState, useEffect } from 'react';
import { useDownloadManager } from '../hooks/useDownloadManager-simple';
import { useDocumentCart } from '../hooks/useDocumentCart';
import PDFDocumentCard from './PDFDocumentCard';

export default function DocumentDownloadCenter({ siren, documents = [], onClose }) {
  const { downloadBatch, isDownloading, downloadProgress } = useDownloadManager();
  const { cartItems, addToCart, clearCart } = useDocumentCart();
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

  // Filter documents based on availability
  const filteredDocuments = showOnlyAvailable 
    ? documents.filter(doc => doc.available !== false)
    : documents;

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    }
  };

  const handleDocumentSelect = (documentId) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleBulkDownload = async () => {
    const docsToDownload = documents.filter(doc => selectedDocuments.includes(doc.id));
    if (docsToDownload.length === 0) return;

    try {
      await downloadBatch(docsToDownload);
      setSelectedDocuments([]);
    } catch (error) {
      console.error('Bulk download failed:', error);
    }
  };

  const handleAddSelectedToCart = () => {
    const docsToAdd = documents.filter(doc => selectedDocuments.includes(doc.id));
    docsToAdd.forEach(doc => addToCart(doc));
    setSelectedDocuments([]);
  };

  const allSelected = selectedDocuments.length === filteredDocuments.length;
  const someSelected = selectedDocuments.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="mr-3">📥</span>
              Centre de Téléchargement
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              SIREN: {siren} • {filteredDocuments.length} document(s) disponible(s)
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {/* Select All Checkbox */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  {someSelected && ` (${selectedDocuments.length})`}
                </span>
              </label>

              {/* Filter Toggle */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyAvailable}
                  onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Afficher uniquement les documents disponibles
                </span>
              </label>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredDocuments.length} / {documents.length} documents
            </div>
          </div>

          {/* Action Buttons */}
          {someSelected && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBulkDownload}
                disabled={isDownloading}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <span className="mr-2">📥</span>
                    Télécharger sélectionnés ({selectedDocuments.length})
                  </>
                )}
              </button>

              <button
                onClick={handleAddSelectedToCart}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors flex items-center"
              >
                <span className="mr-2">🛒</span>
                Ajouter au panier ({selectedDocuments.length})
              </button>

              <button
                onClick={() => setSelectedDocuments([])}
                className="px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
              >
                Annuler sélection
              </button>
            </div>
          )}
        </div>

        {/* Document Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📄</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucun document disponible
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {showOnlyAvailable 
                  ? 'Essayez de désactiver le filtre pour voir tous les documents'
                  : 'Aucun document trouvé pour ce SIREN'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="relative">
                  {/* Selection Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(document.id)}
                      onChange={() => handleDocumentSelect(document.id)}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 bg-white dark:bg-dark-surface shadow-sm"
                    />
                  </div>

                  {/* Document Card */}
                  <div className={`transition-all duration-200 ${
                    selectedDocuments.includes(document.id) 
                      ? 'ring-2 ring-primary-500 ring-opacity-50' 
                      : ''
                  }`}>
                    <PDFDocumentCard 
                      document={document} 
                      showPreview={true}
                    />
                  </div>

                  {/* Download Progress Overlay */}
                  {downloadProgress[document.id] && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
                      <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-lg">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {downloadProgress[document.id].status === 'downloading' ? 'Téléchargement...' : 
                               downloadProgress[document.id].status === 'processing' ? 'Traitement...' : 
                               'Préparation...'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {downloadProgress[document.id].progress}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {cartItems.length > 0 && (
                <span>
                  🛒 {cartItems.length} document(s) dans le panier
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  Vider le panier
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}