// components/UnifiedDocumentPreview.js - Unified Document Preview Component
import { useState, useEffect, useRef } from 'react';
import { ScalablePDFViewer } from './ScalablePDFViewer';

export default function UnifiedDocumentPreview({ 
  document, 
  mode = 'modal', // 'modal', 'inline', 'popup'
  onClose = () => {},
  className = ''
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const modalRef = useRef(null);

  useEffect(() => {
    if (document) {
      loadDocumentPreview();
    }
  }, [document]); // loadDocumentPreview is stable within component lifecycle

  useEffect(() => {
    if (mode === 'modal' && modalRef.current) {
      modalRef.current.focus();
    }
  }, [mode]);

  const loadDocumentPreview = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = getPreviewUrl(document);
      
      if (!url) {
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      // Test if the URL is accessible
      const response = await fetch(url, { method: 'HEAD' });
      
      if (!response.ok) {
        throw new Error(`Document not accessible: ${response.status}`);
      }

      setPreviewUrl(url);
      setDocumentData({
        name: document.name,
        type: document.type,
        siren: document.siren,
        siret: document.siret,
        contentType: response.headers.get('content-type') || 'application/pdf',
        size: response.headers.get('content-length')
      });
      
    } catch (err) {
      console.error('Preview loading error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPreviewUrl = (document) => {
    switch (document.type) {
      case 'insee':
        return `/api/documents/preview/insee/${document.siren}/${document.siret || ''}`;
      case 'inpi':
        return `/api/documents/preview/inpi/${document.siren}`;
      case 'bodacc':
        if (document.url && !document.url.includes('opendatasoft.com')) {
          return document.url;
        }
        return null;
      default:
        if (document.url && !document.url.includes('opendatasoft.com')) {
          return document.url;
        }
        return null;
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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && mode === 'modal') {
      onClose();
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement du document...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
              Erreur de prévisualisation
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadDocumentPreview}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    if (!isSupported) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">{getDocumentIcon(document.type)}</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Prévisualisation non supportée
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ce type de document doit être consulté directement.
            </p>
            {document.url && (
              <button
                onClick={() => window.open(document.url, '_blank')}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Ouvrir le document
              </button>
            )}
          </div>
        </div>
      );
    }

    if (previewUrl) {
      return (
        <div className="flex-1 flex flex-col">
          {/* Document Info Bar */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getDocumentIcon(document.type)}</span>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {document.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    SIREN: {document.siren} {document.siret && `• SIRET: ${document.siret}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                >
                  Ouvrir
                </button>
                {mode === 'modal' && (
                  <button
                    onClick={onClose}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Fermer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Document Preview */}
          <div className="flex-1 bg-white dark:bg-gray-900">
            {documentData?.contentType === 'application/pdf' ? (
              <ScalablePDFViewer
                src={previewUrl}
                title={document.name}
                className="w-full h-full"
                showControls={mode === 'modal'}
                initialZoom={mode === 'inline' ? 75 : 100}
              />
            ) : (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={document.name}
                sandbox="allow-same-origin allow-scripts allow-popups"
              />
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  if (mode === 'inline') {
    return (
      <div className={`border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
        {renderContent()}
      </div>
    );
  }

  if (mode === 'popup') {
    // For popup mode, we'd typically use a separate window
    // This is a simplified version
    return (
      <div className={`fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col ${className}`}>
        {renderContent()}
      </div>
    );
  }

  // Modal mode (default)
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col ${className}`}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {renderContent()}
      </div>
    </div>
  );
}

// Hook for managing document preview state
export function useDocumentPreview() {
  const [activeDocument, setActiveDocument] = useState(null);
  const [previewMode, setPreviewMode] = useState('modal');

  const openPreview = (document, mode = 'modal') => {
    setActiveDocument(document);
    setPreviewMode(mode);
  };

  const closePreview = () => {
    setActiveDocument(null);
  };

  return {
    activeDocument,
    previewMode,
    openPreview,
    closePreview,
    isOpen: !!activeDocument
  };
}