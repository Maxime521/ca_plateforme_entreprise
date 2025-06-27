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
      {showPreview && document.available !== false && (
        <div className="mb-4">
          <div className="w-full h-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center relative overflow-hidden">
            {!imageError ? (
              <iframe
                src={`${document.url}#toolbar=0&navpanes=0&scrollbar=0`}
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
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>SIREN: {document.siren}</span>
          {document.size && <span>{document.size}</span>}
        </div>

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

      {/* Action Button */}
      <button
        onClick={handleToggleCart}
        disabled={isLoading || document.available === false}
        className={`w-full mt-4 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
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

      {/* In Cart Badge */}
      {inCart && (
        <div className="absolute -top-2 -left-2 bg-primary-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          ✓
        </div>
      )}
    </div>
  );
}
