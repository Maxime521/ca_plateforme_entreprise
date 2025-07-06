import { useState } from 'react';
import { useDocumentCart } from '../hooks/useDocumentCart';
import { useAuth } from '../hooks/useAuth';
import BatchDownloadManager from './download/BatchDownloadManager';

export default function DocumentCartSidebar() {
  const { 
    cartItems, 
    isOpen, 
    setIsOpen, 
    clearCart, 
    removeFromCart,
    uploadProgress,
    updateUploadProgress 
  } = useDocumentCart();
  
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [showBatchDownload, setShowBatchDownload] = useState(false);

  const handleUploadAll = async () => {
    if (!user || cartItems.length === 0) return;

    setIsUploading(true);
    
    try {
      for (let i = 0; i < cartItems.length; i++) {
        const document = cartItems[i];
        
        // Update progress
        updateUploadProgress(document.id, { 
          status: 'downloading', 
          progress: 0 
        });

        try {
          // Use server-side download endpoints to avoid CORS issues
          let downloadUrl;
          
          switch (document.type.toLowerCase()) {
            case 'inpi':
              downloadUrl = `/api/documents/download/inpi/${document.siren}`;
              break;
            case 'insee':
              downloadUrl = `/api/documents/download/insee/${document.siren}${document.siret ? `?siret=${document.siret}` : ''}`;
              break;
            case 'bodacc':
              downloadUrl = `/api/documents/download/bodacc/${document.siren}`;
              break;
            default:
              throw new Error(`Unsupported document type: ${document.type}`);
          }

          const response = await fetch(downloadUrl, {
            headers: {
              'Authorization': `Bearer ${await user.getIdToken()}`
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Download failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const blob = await response.blob();
          
          // Update progress
          updateUploadProgress(document.id, { 
            status: 'uploading', 
            progress: 50 
          });

          // Create FormData for upload
          const formData = new FormData();
          formData.append('file', blob, document.name);
          formData.append('siren', document.siren);
          formData.append('type', document.type);
          formData.append('description', document.description);

          // Upload to your server
          const uploadResponse = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${await user.getIdToken()}`
            }
          });

          if (uploadResponse.ok) {
            updateUploadProgress(document.id, { 
              status: 'completed', 
              progress: 100 
            });
          } else {
            const uploadError = await uploadResponse.text().catch(() => 'Upload failed');
            throw new Error(`Upload failed: ${uploadResponse.status} - ${uploadError}`);
          }

        } catch (error) {
          console.error(`Error uploading ${document.name}:`, error);
          updateUploadProgress(document.id, { 
            status: 'error', 
            progress: 0,
            error: error.message 
          });
        }
      }

      // Show success message
      alert('Téléchargement terminé !');
      
      // Clear cart after successful upload
      setTimeout(() => {
        clearCart();
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBatchDownloadComplete = (progressData) => {
    setShowBatchDownload(false);
    // Clear cart after successful batch download
    clearCart();
    // Show success notification
    console.log('Batch download completed:', progressData);
  };

  const handleStartBatchDownload = () => {
    setShowBatchDownload(true);
  };

  const getTotalSize = () => {
    return cartItems.reduce((total, item) => {
      if (item.size && item.size.includes('KB')) {
        return total + parseInt(item.size);
      }
      return total;
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Enhanced Overlay with blur effect */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Enhanced Sidebar with animations */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-dark-surface shadow-2xl z-50 transform transition-all duration-300 flex flex-col border-l border-gray-200 dark:border-dark-border">
        
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="mr-2">📄</span>
              Panier Documents
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {cartItems.length} document{cartItems.length > 1 ? 's' : ''}
              {getTotalSize() > 0 && ` • ${getTotalSize()} KB`}
            </p>
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-all duration-200 hover:scale-110"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Enhanced Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📄</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Panier vide
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Ajoutez des documents pour les télécharger en lot
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2">💡</span>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Comment utiliser le panier ?
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                      <li>• Recherchez une entreprise</li>
                      <li>• Cliquez sur &quot;Documents PDF&quot;</li>
                      <li>• Ajoutez les documents au panier</li>
                      <li>• Téléchargez tout en une fois</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((document, index) => (
                <CartDocumentItem 
                  key={`${document.id}-${index}`} 
                  document={document}
                  progress={uploadProgress[document.id]}
                  onRemove={() => removeFromCart(document.id)}
                />
              ))}
              
              {/* Cart Summary */}
              <div className="bg-gray-50 dark:bg-dark-card rounded-lg p-4 mt-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Résumé du panier
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total documents:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{cartItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Taille estimée:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getTotalSize() || '~'} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sources:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {[...new Set(cartItems.map(item => item.type?.toUpperCase()))].join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 dark:border-dark-border p-6 space-y-3 bg-gray-50 dark:bg-dark-card">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total documents:</span>
              <span className="font-medium text-gray-900 dark:text-white">{cartItems.length}</span>
            </div>
            
            <button
              onClick={clearCart}
              disabled={isUploading}
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors disabled:opacity-50"
            >
              🗑️ Vider le panier
            </button>
            
            <div className="space-y-2">
              <button
                onClick={handleStartBatchDownload}
                disabled={isUploading || cartItems.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 shadow-lg"
              >
                🚀 Téléchargement par lot (${cartItems.length})
              </button>
              
              <button
                onClick={handleUploadAll}
                disabled={isUploading || cartItems.length === 0}
                className="w-full px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 shadow-lg text-sm"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Téléchargement...
                  </div>
                ) : (
                  `⬆️ Téléchargement simple`
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch Download Modal */}
      {showBatchDownload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <BatchDownloadManager 
              documents={cartItems}
              onDownloadComplete={handleBatchDownloadComplete}
              onClose={() => setShowBatchDownload(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Enhanced Cart Document Item Component
function CartDocumentItem({ document, progress, onRemove }) {
  const getDocumentIcon = (type) => {
    const icons = { 
      insee: '🏛️', 
      inpi: '📋', 
      bodacc: '📰',
      rne: '📋',
      default: '📄'
    };
    return icons[type] || icons.default;
  };

  const getProgressColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'uploading': return 'bg-blue-500';
      case 'downloading': return 'bg-orange-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'error': return 'Erreur';
      case 'uploading': return 'Upload...';
      case 'downloading': return 'Téléchargement...';
      default: return 'En attente';
    }
  };

  return (
    <div className="flex items-start space-x-3 p-4 bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border hover:shadow-md transition-shadow">
      <div className="text-2xl flex-shrink-0">{getDocumentIcon(document.type)}</div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white truncate">
          {document.name}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {document.description}
        </p>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            SIREN: {document.siren}
          </span>
          {document.size && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              • {document.size}
            </span>
          )}
        </div>
        
        {/* Enhanced Progress Bar */}
        {progress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className={`font-medium ${
                progress.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                progress.status === 'error' ? 'text-red-600 dark:text-red-400' :
                'text-blue-600 dark:text-blue-400'
              }`}>
                {getStatusText(progress.status)}
              </span>
              <span className="text-gray-600 dark:text-gray-400">{progress.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.status)}`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            {progress.error && (
              <p className="text-xs text-red-500 mt-1 truncate" title={progress.error}>
                {progress.error}
              </p>
            )}
          </div>
        )}
      </div>
      
      <button
        onClick={onRemove}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
        title="Retirer du panier"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
