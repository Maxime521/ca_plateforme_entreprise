// components/AvisSituationCard.js - Specialized component for INSEE AVIS DE SITUATION documents
import { useState } from 'react';
import { useDocumentCart } from '../hooks/useDocumentCart';

export default function AvisSituationCard({ document, company, onDownload, onPreview }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { addToCart, isInCart } = useDocumentCart();

  const handleDownload = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      if (document.available && document.url) {
        // Download existing document
        const link = document.createElement('a');
        link.href = document.url;
        link.download = document.fileName || `AVIS_DE_SITUATION_${company.siren}.pdf`;
        link.click();
        setDownloadProgress(100);
      } else {
        // Download from INSEE API
        setDownloadProgress(25);
        
        const response = await fetch('/api/documents/insee-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            siren: company.siren,
            siret: company.siret
          })
        });
        
        setDownloadProgress(75);
        
        if (!response.ok) {
          throw new Error('Failed to download document');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setDownloadProgress(90);
          
          // Trigger download
          const link = document.createElement('a');
          link.href = result.document.url;
          link.download = result.document.fileName;
          link.click();
          
          setDownloadProgress(100);
          
          // Notify parent component
          if (onDownload) {
            onDownload(result.document);
          }
        } else {
          throw new Error(result.message || 'Download failed');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(`Erreur de téléchargement: ${error.message}`);
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    }
  };

  const handleAddToCart = () => {
    const cartDocument = {
      id: document.id || `avis-${company.siren}`,
      type: 'avis-situation',
      siren: company.siren,
      siret: company.siret,
      denomination: company.denomination,
      displayName: 'AVIS DE SITUATION',
      description: 'Avis de situation au répertoire Sirene',
      url: document.url,
      fileName: document.fileName || `AVIS_DE_SITUATION_${company.siren}.pdf`,
      available: document.available || false,
      source: 'INSEE',
      category: 'INSEE_OFFICIAL'
    };
    
    addToCart(cartDocument);
  };

  const inCart = isInCart(document.id || `avis-${company.siren}`);

  return (
    <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6 hover:shadow-lg transition-shadow">
      
      {/* Header with INSEE Official Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🏛️</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              AVIS DE SITUATION
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
                INSEE OFFICIEL
              </span>
              {document.isValidated && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  ✓ Vérifié
                </span>
              )}
            </div>
          </div>
        </div>
        
        {document.available && (
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Téléchargé</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(document.downloadedAt).toLocaleDateString('fr-FR')}
            </div>
          </div>
        )}
      </div>

      {/* Company Information */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">SIREN:</span>
            <span className="ml-2 font-mono text-gray-900 dark:text-white">{company.siren}</span>
          </div>
          {company.siret && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">SIRET:</span>
              <span className="ml-2 font-mono text-gray-900 dark:text-white">{company.siret}</span>
            </div>
          )}
          <div className="md:col-span-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Entreprise:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{company.denomination}</span>
          </div>
        </div>
      </div>

      {/* Document Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <span className="mr-2">📋</span>
          <span>Document officiel de situation au répertoire SIRENE</span>
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <span className="mr-2">🔗</span>
          <span className="font-mono text-xs">api-avis-situation-sirene.insee.fr</span>
        </div>
        {document.size && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span className="mr-2">📄</span>
            <span>PDF • {Math.round(document.size / 1024)} KB</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isDownloading && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Téléchargement en cours...</span>
            <span>{downloadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            isDownloading
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : document.available
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30'
          }`}
        >
          {isDownloading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Téléchargement...</span>
            </>
          ) : document.available ? (
            <>
              <span>💾</span>
              <span>Télécharger</span>
            </>
          ) : (
            <>
              <span>⬇️</span>
              <span>Obtenir depuis INSEE</span>
            </>
          )}
        </button>

        <button
          onClick={handleAddToCart}
          disabled={inCart}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            inCart
              ? 'border-green-300 bg-green-50 text-green-600 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800/50'
          }`}
        >
          {inCart ? '✓ Dans le panier' : '🛒 Ajouter'}
        </button>

        {document.available && onPreview && (
          <button
            onClick={() => onPreview(document)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800/50 transition-colors"
          >
            👁️ Aperçu
          </button>
        )}
      </div>
    </div>
  );
}