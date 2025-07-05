// components/DynamicPDFViewer.js - Dynamic PDF Viewer Wrapper
import dynamic from 'next/dynamic';

// Loading component for PDF viewer
function PDFViewerSkeleton() {
  return (
    <div className="fixed inset-0 z-[60] bg-black bg-opacity-90 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* Header skeleton */}
        <div className="bg-white dark:bg-gray-900 shadow-lg rounded-t-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
            </div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 rounded-b-2xl overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Loading Document Viewer
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Preparing advanced document viewer...
              </p>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dynamic import with enhanced loading state
const ScalablePDFViewer = dynamic(
  () => import('./ScalablePDFViewer'),
  {
    loading: () => <PDFViewerSkeleton />,
    ssr: false // PDF viewer doesn't need server-side rendering
  }
);

export default ScalablePDFViewer;

// Enhanced hook for document viewing with performance optimization
export function useDynamicPDFViewer() {
  const { useState, useCallback } = require('react');
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [viewerLoaded, setViewerLoaded] = useState(false);

  const openDocument = useCallback((documentData) => {
    setCurrentDocument(documentData);
    setIsViewerOpen(true);
    
    // Preload the component when first opened
    if (!viewerLoaded) {
      import('./ScalablePDFViewer').then(() => {
        setViewerLoaded(true);
      });
    }
  }, [viewerLoaded]);

  const closeViewer = useCallback(() => {
    setIsViewerOpen(false);
    setCurrentDocument(null);
  }, []);

  const openBODACCReport = useCallback((siren, url, type = 'html') => {
    openDocument({
      url,
      title: `Rapport BODACC - SIREN ${siren}`,
      type,
      siren
    });
  }, [openDocument]);

  const openINSEEReport = useCallback((siren, url, type = 'html') => {
    openDocument({
      url,
      title: `Rapport INSEE - SIREN ${siren}`,
      type,
      siren
    });
  }, [openDocument]);

  const PDFViewer = useCallback(() => {
    if (!isViewerOpen || !currentDocument) return null;
    
    return (
      <ScalablePDFViewer 
        {...currentDocument}
        onClose={closeViewer} 
      />
    );
  }, [isViewerOpen, currentDocument, closeViewer]);

  return {
    isViewerOpen,
    currentDocument,
    viewerLoaded,
    openDocument,
    openBODACCReport,
    openINSEEReport,
    closeViewer,
    PDFViewer
  };
}