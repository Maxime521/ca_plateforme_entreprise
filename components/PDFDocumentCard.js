// components/PDFDocumentCard.js (Enhanced version)
//==============================================================================

import { useState } from 'react';
import { useDocumentCart } from '../hooks/useDocumentCart';

export default function PDFDocumentCard({ document, showPreview = true }) {
  const { addToCart, removeFromCart, isInCart } = useDocumentCart();
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const inCart = isInCart(document.id);

  const handleToggleCart = async () => {
    setIsLoading(true);
    try {
      if (inCart) {
        removeFromCart(document.id);
      } else {
        addToCart(document);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    if (document.type === 'insee') {
      // For INSEE documents, use the preview proxy for consistent experience
      const previewUrl = `/api/documents/preview/insee/${document.siren}/${document.siret || ''}`;
      window.open(previewUrl, '_blank');
    } else if (document.type === 'bodacc') {
      // For BODACC, use the direct preview endpoint for formatted HTML preview
      const previewUrl = `/api/documents/preview-bodacc?siren=${document.siren}`;
      window.open(previewUrl, '_blank');
    } else if (document.type === 'inpi') {
      // For INPI, use the preview proxy to enable in-browser preview
      const previewUrl = `/api/documents/preview/inpi/${document.siren}`;
      window.open(previewUrl, '_blank');
    }
  };

  const getDocumentIcon = (type) => {
    const icons = {
      insee: '🏛️',
      inpi: '📋',
      bodacc: '📰'
    };
    return icons[type] || '📄';
  };

  const getDocumentColor = (type) => {
    const colors = {
      insee: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
      inpi: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
      bodacc: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
    };
    return colors[type] || 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20';
  };

  const getPreviewUrl = (document) => {
    switch (document.type) {
      case 'insee':
        return `/api/documents/preview/insee/${document.siren}/${document.siret || ''}#toolbar=0&navpanes=0&scrollbar=0`;
      case 'inpi':
        return `/api/documents/preview/inpi/${document.siren}#toolbar=0&navpanes=0&scrollbar=0`;
      case 'bodacc':
        // For BODACC, use original URL if not external
        if (document.url && !document.url.includes('opendatasoft.com')) {
          return `${document.url}#toolbar=0&navpanes=0&scrollbar=0`;
        }
        return null;
      default:
        if (document.url && !document.url.includes('opendatasoft.com')) {
          return `${document.url}#toolbar=0&navpanes=0&scrollbar=0`;
        }
        return null;
    }
  };

  const getServiceStatus = () => {
    if (document.available === false) {
      if (document.error?.includes('Token')) {
        return {
          icon: '🔑',
          text: 'Configuration requise',
          class: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30'
        };
      }
      return {
        icon: '❌',
        text: 'Service indisponible',
        class: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
      };
    }
    return {
      icon: '✅',
      text: 'Disponible',
      class: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
    };
  };

  const status = getServiceStatus();

  return (
    <div className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
      inCart ? 'ring-2 ring-primary-500 ring-opacity-50' : ''
    } ${getDocumentColor(document.type)} ${
      document.available === false ? 'opacity-75' : ''
    }`}>
      
      {/* Service Status Badge */}
      <div className="absolute top-2 right-2 z-10">
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>
          <span className="mr-1">{status.icon}</span>
          {status.text}
        </div>
      </div>

      {/* Document Preview */}
      {showPreview && document.available !== false && getPreviewUrl(document) && (
        <div className="mb-4">
          <div className="w-full h-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center relative overflow-hidden">
            {!imageError ? (
              <iframe
                src={getPreviewUrl(document)}
                className="w-full h-full pointer-events-none"
                onError={() => setImageError(true)}
                title={`Aperçu ${document.name}`}
              />
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-2">{getDocumentIcon(document.type)}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aperçu non disponible</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* External site preview fallback (BODACC, etc.) */}
      {showPreview && document.url && document.url.includes('opendatasoft.com') && (
        <div className="mb-4">
          <div className="w-full h-32 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-700 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📰</div>
              <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Document BODACC</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Cliquez pour voir en ligne</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Special preview for API endpoints */}
      {showPreview && document.url && document.url.includes('/api/documents/insee-pdf') && (
        <div className="mb-4">
          <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🏛️</div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Document INSEE</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Cliquez pour télécharger</p>
            </div>
          </div>
        </div>
      )}

      {/* No Preview for Unavailable Services */}
      {(document.available === false || !showPreview) && (
        <div className="mb-4">
          <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2 opacity-50">{getDocumentIcon(document.type)}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {document.available === false ? 'Service non configuré' : 'Document officiel'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-12">
            <h3 className="font-medium text-gray-900 dark:text-white truncate flex items-center">
              <span className="mr-2">{getDocumentIcon(document.type)}</span>
              {document.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {document.description}
            </p>
          </div>
        </div>

        {/* Document Details */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>SIREN: {document.siren}</span>
            {document.format && <span>{document.format}</span>}
          </div>
          {document.siret && (
            <div className="flex items-center justify-between">
              <span>SIRET: {document.siret}</span>
              {document.size && <span>{document.size}</span>}
            </div>
          )}
        </div>

        {/* INSEE Specific Features */}
        {document.type === 'insee' && document.features && document.available && (
          <div className="text-xs space-y-1">
            {document.features.map((feature, index) => (
              <div key={index} className="text-blue-600 dark:text-blue-400 flex items-center">
                <span className="mr-1">✓</span>
                {feature}
              </div>
            ))}
            {document.siret && (
              <div className="text-green-600 dark:text-green-400 flex items-center mt-1">
                <span className="mr-1">🎯</span>
                Utilise SIRET principal: {document.siret}
              </div>
            )}
          </div>
        )}

        {/* Error/Info Messages */}
        {document.error && (
          <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
            💡 {document.error}
          </div>
        )}

        {/* BODACC Announcement Info */}
        {document.type === 'bodacc' && document.announcement && document.available !== false && (
          <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
            {document.announcement.type} - {new Date(document.announcement.date).toLocaleDateString('fr-FR')}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        {/* Preview Button */}
        {document.available && (
          <button
            onClick={handlePreview}
            className="w-full px-4 py-2 border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center"
          >
            <span className="mr-2">👁️</span>
            Prévisualiser
          </button>
        )}
        
        {/* Add to Cart Button */}
        <button
          onClick={handleToggleCart}
          disabled={isLoading || document.available === false}
          className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            document.available === false
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : inCart
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-primary-500 hover:bg-primary-600 text-white'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Chargement...
            </div>
          ) : document.available === false ? (
            document.error?.includes('Token') ? '🔑 Configuration requise' : '❌ Indisponible'
          ) : inCart ? (
            '🗑️ Retirer du panier'
          ) : (
            '➕ Ajouter au panier'
          )}
        </button>
      </div>

      {/* In Cart Badge */}
      {inCart && (
        <div className="absolute -top-2 -left-2 bg-primary-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          ✓
        </div>
      )}
    </div>
  );
}
