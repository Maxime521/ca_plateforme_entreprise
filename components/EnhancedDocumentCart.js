// components/EnhancedDocumentCart.js - Document Cart with Real File Integration
import { useState, useEffect } from 'react';
import { useDocumentCart } from '../hooks/useDocumentCart';
import { useBODACCReports } from './BODACCReportViewer';

export default function EnhancedDocumentCart() {
  const { 
    cartItems, 
    isOpen, 
    setIsOpen, 
    clearCart, 
    removeFromCart,
    updateUploadProgress 
  } = useDocumentCart();
  
  const { generateAndView: generateBODACCReport } = useBODACCReports();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({});

  // Process all documents in cart
  const processAllDocuments = async () => {
    if (cartItems.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus({});

    try {
      console.log(`📋 Processing ${cartItems.length} documents...`);

      for (let i = 0; i < cartItems.length; i++) {
        const document = cartItems[i];
        
        try {
          // Update status to processing
          updateUploadProgress(document.id, { 
            status: 'processing', 
            progress: 0,
            message: 'Démarrage du traitement...'
          });

          setProcessingStatus(prev => ({
            ...prev,
            [document.id]: { status: 'processing', step: 'starting' }
          }));

          let result;

          // Route to appropriate processor based on document type
          switch (document.type) {
            case 'insee':
              result = await processINSEEDocument(document);
              break;
            case 'bodacc':
              result = await processBODACCDocument(document);
              break;
            case 'inpi':
              result = await processINPIDocument(document);
              break;
            default:
              throw new Error(`Unsupported document type: ${document.type}`);
          }

          if (result.success) {
            updateUploadProgress(document.id, { 
              status: 'completed', 
              progress: 100,
              result: result,
              downloadUrl: result.downloadUrl
            });

            setProcessingStatus(prev => ({
              ...prev,
              [document.id]: { status: 'completed', result }
            }));

            console.log(`✅ ${document.type} document processed successfully`);
          } else {
            throw new Error(result.error || 'Processing failed');
          }

        } catch (error) {
          console.error(`❌ Error processing ${document.name}:`, error);
          
          updateUploadProgress(document.id, { 
            status: 'error', 
            progress: 0,
            error: error.message 
          });

          setProcessingStatus(prev => ({
            ...prev,
            [document.id]: { status: 'error', error: error.message }
          }));
        }
      }

      // Show completion summary
      const successful = Object.values(processingStatus).filter(s => s.status === 'completed').length;
      const failed = Object.values(processingStatus).filter(s => s.status === 'error').length;
      
      showProcessingSummary(successful, failed);

    } catch (error) {
      console.error('❌ Batch processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process INSEE documents
  const processINSEEDocument = async (document) => {
    updateUploadProgress(document.id, { 
      status: 'processing', 
      progress: 25,
      message: 'Génération du rapport INSEE...'
    });

    const response = await fetch(`/api/test/generate-insee-html?siren=${document.siren}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'INSEE processing failed');
    }

    return {
      success: true,
      downloadUrl: data.file.path,
      filename: data.file.filename,
      size: data.file.size,
      type: 'html'
    };
  };

  // Process BODACC documents
  const processBODACCDocument = async (document) => {
    updateUploadProgress(document.id, { 
      status: 'processing', 
      progress: 25,
      message: 'Génération du rapport BODACC...'
    });

    const response = await fetch(`/api/test/generate-bodacc-pdf?siren=${document.siren}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'BODACC processing failed');
    }

    return {
      success: true,
      downloadUrl: data.file.path,
      filename: data.file.filename,
      recordCount: data.file.recordCount,
      type: 'html'
    };
  };

  // Process INPI documents
  const processINPIDocument = async (document) => {
    updateUploadProgress(document.id, { 
      status: 'processing', 
      progress: 25,
      message: 'Téléchargement INPI en cours...'
    });

    const response = await fetch(`/api/test/inpi-download?siren=${document.siren}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'INPI processing failed');
    }

    return {
      success: true,
      downloadUrl: data.file.url,
      filename: `INPI_${document.siren}.pdf`,
      size: data.file.size,
      type: 'pdf'
    };
  };

  // Show processing summary
  const showProcessingSummary = (successful, failed) => {
    const summary = document.createElement('div');
    summary.innerHTML = `
      <div style="position:fixed;top:20px;right:20px;background:white;border:1px solid #ddd;border-radius:10px;padding:20px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:10000;max-width:300px;">
        <h3 style="margin:0 0 10px 0;color:#333;">📋 Traitement terminé</h3>
        <p style="margin:5px 0;color:#28a745;">✅ ${successful} document(s) traité(s)</p>
        ${failed > 0 ? `<p style="margin:5px 0;color:#dc3545;">❌ ${failed} erreur(s)</p>` : ''}
        <button onclick="this.parentElement.remove()" style="margin-top:10px;padding:5px 10px;border:none;background:#007bff;color:white;border-radius:5px;cursor:pointer;">Fermer</button>
      </div>
    `;
    document.body.appendChild(summary);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (summary.parentElement) {
        summary.remove();
      }
    }, 10000);
  };

  // Quick action: Generate and view BODACC report
  const quickViewBODACCReport = async (siren) => {
    try {
      await generateBODACCReport(siren, 'html');
    } catch (error) {
      console.error('Quick BODACC generation failed:', error);
    }
  };

  // Download all processed files
  const downloadAllProcessed = () => {
    const processedItems = cartItems.filter(item => 
      processingStatus[item.id]?.status === 'completed'
    );

    processedItems.forEach(item => {
      const result = processingStatus[item.id].result;
      if (result.downloadUrl) {
        // Create temporary link for download
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Enhanced Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Enhanced Cart Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-dark-surface shadow-2xl z-50 transform transition-all duration-300 flex flex-col border-l border-gray-200 dark:border-dark-border">
        
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="mr-2">🎯</span>
              Panier Documents
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {cartItems.length} document{cartItems.length > 1 ? 's' : ''} • Mode Production
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <EmptyCartView />
          ) : (
            <div className="space-y-4">
              {cartItems.map((document) => (
                <EnhancedDocumentItem 
                  key={document.id} 
                  document={document}
                  status={processingStatus[document.id]}
                  onRemove={() => removeFromCart(document.id)}
                  onQuickView={quickViewBODACCReport}
                />
              ))}
              
              {/* Processing Summary */}
              {Object.keys(processingStatus).length > 0 && (
                <ProcessingSummaryCard 
                  processingStatus={processingStatus}
                  onDownloadAll={downloadAllProcessed}
                />
              )}
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 dark:border-dark-border p-6 space-y-4 bg-gray-50 dark:bg-dark-card">
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={clearCart}
                disabled={isProcessing}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors disabled:opacity-50"
              >
                🗑️ Vider
              </button>
              
              <button
                onClick={() => {
                  // Quick preview of first BODACC document
                  const bodaccDoc = cartItems.find(item => item.type === 'bodacc');
                  if (bodaccDoc) {
                    quickViewBODACCReport(bodaccDoc.siren);
                  }
                }}
                disabled={isProcessing || !cartItems.some(item => item.type === 'bodacc')}
                className="px-4 py-2 text-sm border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                👁️ Aperçu
              </button>
            </div>
            
            {/* Main Process Button */}
            <button
              onClick={processAllDocuments}
              disabled={isProcessing || cartItems.length === 0}
              className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 shadow-lg"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Traitement en cours...
                </div>
              ) : (
                `⚡ Traiter tout (${cartItems.length})`
              )}
            </button>

            {/* Progress indicator */}
            {isProcessing && (
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Mode production • Génération de vrais documents
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Enhanced Document Item Component
function EnhancedDocumentItem({ document, status, onRemove, onQuickView }) {
  const getDocumentIcon = (type) => {
    const icons = { 
      insee: '🏛️', 
      inpi: '📋', 
      bodacc: '📰',
      default: '📄'
    };
    return icons[type] || icons.default;
  };

  const getStatusColor = (status) => {
    switch (status?.status) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'processing': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status?.status) {
      case 'completed': return '✅ Traité';
      case 'error': return '❌ Erreur';
      case 'processing': return '🔄 Traitement...';
      default: return '⏳ En attente';
    }
  };

  return (
    <div className="flex items-start space-x-3 p-4 bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border hover:shadow-md transition-all duration-200">
      <div className="text-2xl flex-shrink-0">{getDocumentIcon(document.type)}</div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {document.name}
          </h4>
          <span className={`text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusText(status)}
          </span>
        </div>
        
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
          {document.description}
        </p>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            SIREN: {document.siren}
          </span>
          {status?.result?.downloadUrl && (
            <a
              href={status.result.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              📥 Télécharger
            </a>
          )}
        </div>

        {/* Enhanced Progress Bar */}
        {status?.status === 'processing' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {status.message || 'Traitement...'}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {status.progress || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${status.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {status?.error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs">
            <span className="text-red-600 dark:text-red-400">
              {status.error}
            </span>
          </div>
        )}

        {/* Success Details */}
        {status?.status === 'completed' && status.result && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded text-xs">
            <div className="text-green-600 dark:text-green-400">
              ✅ {status.result.filename}
              {status.result.size && ` • ${status.result.size}`}
              {status.result.recordCount && ` • ${status.result.recordCount} annonces`}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-col space-y-2">
        {/* Quick View Button for BODACC */}
        {document.type === 'bodacc' && (
          <button
            onClick={() => onQuickView(document.siren)}
            className="p-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
            title="Aperçu rapide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
        
        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Retirer du panier"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Empty Cart View
function EmptyCartView() {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-4xl">📄</span>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Panier vide
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Ajoutez des documents pour les traiter en lot
      </p>
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-blue-500 mr-2">🚀</span>
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Nouvelles fonctionnalités production
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
              <li>• 📰 Rapports BODACC avec 100+ annonces réelles</li>
              <li>• 🏛️ Données INSEE en temps réel</li>
              <li>• 📋 PDFs INPI téléchargeables</li>
              <li>• ⚡ Traitement par lot optimisé</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Processing Summary Card
function ProcessingSummaryCard({ processingStatus, onDownloadAll }) {
  const statuses = Object.values(processingStatus);
  const completed = statuses.filter(s => s.status === 'completed').length;
  const errors = statuses.filter(s => s.status === 'error').length;
  const processing = statuses.filter(s => s.status === 'processing').length;

  return (
    <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
      <h4 className="font-medium text-primary-900 dark:text-primary-300 mb-3 flex items-center">
        <span className="mr-2">📊</span>
        Résumé du traitement
      </h4>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{completed}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Complétés</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{processing}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">En cours</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{errors}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Erreurs</div>
        </div>
      </div>

      {completed > 0 && (
        <button
          onClick={onDownloadAll}
          className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          📥 Télécharger tous les fichiers traités ({completed})
        </button>
      )}
    </div>
  );
}
