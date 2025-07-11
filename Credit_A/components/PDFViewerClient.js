// components/PDFViewerClient.js - Client-side PDF viewer with PDF.js integration
import { useState, useEffect, useRef } from 'react';

export default function PDFViewerClient({ 
  src, 
  title = 'Document PDF', 
  className = '',
  showControls = true,
  initialZoom = 100,
  onError = () => {}
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(initialZoom);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (src) {
      loadPDF();
    }
  }, [src]); // loadPDF is stable within component lifecycle

  const loadPDF = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, we'll use a simple iframe with PDF.js viewer
      // In a full implementation, you'd integrate with PDF.js library directly
      const pdfUrl = `${src}#page=${currentPage}&zoom=${zoom}`;
      
      if (viewerRef.current) {
        viewerRef.current.src = pdfUrl;
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('PDF loading error:', err);
      setError(err.message);
      setIsLoading(false);
      onError(err);
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 25, 300);
    setZoom(newZoom);
    updateViewer();
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 25, 25);
    setZoom(newZoom);
    updateViewer();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      updateViewer();
    }
  };

  const updateViewer = () => {
    if (viewerRef.current && src) {
      const pdfUrl = `${src}#page=${currentPage}&zoom=${zoom}&toolbar=0&navpanes=0`;
      viewerRef.current.src = pdfUrl;
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        handlePageChange(currentPage - 1);
        break;
      case 'ArrowRight':
        handlePageChange(currentPage + 1);
        break;
      case '+':
      case '=':
        if (e.ctrlKey) {
          e.preventDefault();
          handleZoomIn();
        }
        break;
      case '-':
        if (e.ctrlKey) {
          e.preventDefault();
          handleZoomOut();
        }
        break;
      case 'F11':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'Escape':
        if (isFullscreen) {
          toggleFullscreen();
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
            Erreur de chargement PDF
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadPDF}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-gray-100 dark:bg-gray-800 ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Controls */}
      {showControls && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-600 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Précédent
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} {totalPages > 0 && `/ ${totalPages}`}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={totalPages > 0 && currentPage >= totalPages}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant →
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleZoomOut}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                -
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[4rem] text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                +
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
              >
                {isFullscreen ? '🗗' : '🗖'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 relative">
        <iframe
          ref={viewerRef}
          src={`${src}#page=${currentPage}&zoom=${zoom}&toolbar=0&navpanes=0`}
          className="w-full h-full border-0"
          title={title}
          onLoad={() => setIsLoading(false)}
          onError={() => setError('Impossible de charger le PDF')}
        />
      </div>

      {/* Keyboard shortcuts help */}
      {showControls && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded opacity-0 hover:opacity-100 transition-opacity">
          <div>↑↓ Navigation</div>
          <div>Ctrl +/- Zoom</div>
          <div>F11 Plein écran</div>
        </div>
      )}
    </div>
  );
}