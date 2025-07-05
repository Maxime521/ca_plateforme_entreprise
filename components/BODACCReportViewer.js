// components/BODACCReportViewer.js - Enhanced View with Scaling Controls
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import ScalablePDFViewer from './ScalablePDFViewer';

export default function BODACCReportViewer({ siren, onClose }) {
  const [reportUrl, setReportUrl] = useState(null);
  const [reportType, setReportType] = useState('html');
  const [isGenerating, setIsGenerating] = useState(false);
  const [useScalableViewer, setUseScalableViewer] = useState(true);
  const [error, setError] = useState(null);
  const [noRecords, setNoRecords] = useState(false);

  // Generate BODACC report
  const generateReport = useCallback(async (type = 'html') => {
    setIsGenerating(true);
    setError(null);
    setNoRecords(false);
    
    try {
      const endpoint = type === 'pdf' 
        ? `/api/test/generate-bodacc-pdf?siren=${siren}`
        : `/api/test/generate-bodacc-html?siren=${siren}`;
        
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success) {
        setReportUrl(data.file.path);
        setReportType(type);
        setError(null);
        setNoRecords(false);
        return data;
      } else {
        // Handle specific error cases gracefully
        const errorMessage = data.message || 'Report generation failed';
        console.warn(`BODACC report generation failed: ${errorMessage}`);
        
        // Set appropriate state based on error type
        setReportUrl(null);
        setReportType(type);
        setError(errorMessage);
        setNoRecords(response.status === 404);
        
        return { success: false, message: errorMessage, noRecords: response.status === 404 };
      }
    } catch (error) {
      console.error('Report generation error:', error);
      setReportUrl(null);
      setError(error.message || 'Network error occurred');
      setNoRecords(false);
      return { success: false, message: error.message || 'Network error occurred' };
    } finally {
      setIsGenerating(false);
    }
  }, [siren]);

  // Auto-generate HTML report on mount
  useEffect(() => {
    if (siren) {
      generateReport('html').catch(error => {
        console.warn('Initial report generation failed:', error);
        // Error is already handled in generateReport function
      });
    }
  }, [siren, generateReport]);

  // Fetch existing reports
  const { data: existingReports, isLoading } = useQuery({
    queryKey: ['bodacc-reports', siren],
    queryFn: async () => {
      const response = await fetch(`/api/reports/list?siren=${siren}&type=bodacc`);
      return response.json();
    },
    enabled: !!siren
  });


  // If we have a report URL and scalable viewer is enabled, use ScalablePDFViewer
  if (reportUrl && useScalableViewer) {
    return (
      <ScalablePDFViewer
        url={reportUrl}
        title={`Rapport BODACC - SIREN ${siren}`}
        type={reportType}
        siren={siren}
        onClose={onClose}
        onViewerToggle={() => setUseScalableViewer(false)}
        onTypeChange={generateReport} // Pass the generateReport function
        currentType={reportType}
        isGenerating={isGenerating}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">📰</span>
                Rapport BODACC - SIREN {siren}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Visualisation des annonces légales officielles
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Report Type Toggle */}
              <div className="flex rounded-lg bg-gray-100 dark:bg-dark-card p-1">
                <button
                  onClick={() => generateReport('html')}
                  disabled={isGenerating}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    reportType === 'html'
                      ? 'bg-white dark:bg-dark-surface text-primary-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  📄 HTML
                </button>
                <button
                  onClick={() => generateReport('pdf')}
                  disabled={isGenerating}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    reportType === 'pdf'
                      ? 'bg-white dark:bg-dark-surface text-primary-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  📋 PDF
                </button>
              </div>

              {/* Viewer Mode Toggle */}
              {reportUrl && (
                <button
                  onClick={() => setUseScalableViewer(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  title="Activer le visualiseur avancé avec zoom"
                >
                  🔍 Zoom
                </button>
              )}
              
              {/* Actions */}
              {reportUrl && (
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  📥 Télécharger
                </a>
              )}
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Génération du rapport en cours...
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Récupération des données BODACC et formatage
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">{noRecords ? '📭' : '⚠️'}</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {noRecords ? 'Aucune annonce trouvée' : 'Erreur de génération'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {noRecords 
                      ? `Aucune annonce BODACC n'a été trouvée pour le SIREN ${siren}. Cette entreprise n'a peut-être pas d'annonces légales publiées.`
                      : error
                    }
                  </p>
                  <div className="flex space-x-3 justify-center">
                    <button
                      onClick={() => generateReport('html')}
                      disabled={isGenerating}
                      className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                    >
                      🔄 Réessayer HTML
                    </button>
                    <button
                      onClick={() => generateReport('pdf')}
                      disabled={isGenerating}
                      className="px-6 py-3 border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 font-medium rounded-lg transition-colors"
                    >
                      🔄 Réessayer PDF
                    </button>
                  </div>
                </div>
              </div>
            ) : reportUrl ? (
              <div className="h-full relative">
                <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 border">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Astuce: Cliquez sur &quot;🔍 Zoom&quot; pour un meilleur contrôle
                  </div>
                </div>
                
                {reportType === 'html' ? (
                  <iframe
                    src={reportUrl}
                    className="w-full h-full border-0"
                    title={`Rapport BODACC ${siren}`}
                  />
                ) : (
                  <iframe
                    src={`${reportUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
                    className="w-full h-full border-0"
                    title={`Rapport BODACC PDF ${siren}`}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">📰</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Aucun rapport généré
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Cliquez sur HTML ou PDF pour générer un rapport
                  </p>
                  <div className="flex space-x-3 justify-center">
                    <button
                      onClick={() => generateReport('html')}
                      className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                    >
                      📄 Générer HTML
                    </button>
                    <button
                      onClick={() => generateReport('pdf')}
                      className="px-6 py-3 border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 font-medium rounded-lg transition-colors"
                    >
                      📋 Générer PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Report Info */}
          {reportUrl && (
            <div className="border-t border-gray-200 dark:border-dark-border p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
                  <span>📋 Type: {reportType.toUpperCase()}</span>
                  <span>🏢 SIREN: {siren}</span>
                  <span>📅 Généré: {new Date().toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
                  >
                    🖨️ Imprimer
                  </button>
                  <button
                    onClick={() => navigator.share && navigator.share({ 
                      title: `Rapport BODACC ${siren}`,
                      url: reportUrl 
                    })}
                    className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
                  >
                    📤 Partager
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for BODACC Report Management
export function useBODACCReports() {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentSiren, setCurrentSiren] = useState(null);

  const openReportViewer = (siren) => {
    setCurrentSiren(siren);
    setIsViewerOpen(true);
  };

  const closeReportViewer = () => {
    setIsViewerOpen(false);
    setCurrentSiren(null);
  };

  const generateAndView = async (siren, type = 'html') => {
    try {
      const endpoint = type === 'pdf' 
        ? `/api/test/generate-bodacc-pdf?siren=${siren}`
        : `/api/test/generate-bodacc-html?siren=${siren}`;
        
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success) {
        // Open in new tab for immediate viewing
        window.open(data.file.path, '_blank');
        return data;
      } else {
        // Handle errors gracefully without throwing
        const errorMessage = data.message || 'Report generation failed';
        console.warn(`BODACC report generation failed: ${errorMessage}`);
        
        // Show user-friendly notification
        if (response.status === 404) {
          alert(`Aucune annonce BODACC trouvée pour le SIREN ${siren}.\n\nCette entreprise n'a peut-être pas d'annonces légales publiées.`);
        } else {
          alert(`Erreur lors de la génération du rapport: ${errorMessage}`);
        }
        
        return { success: false, message: errorMessage, noRecords: response.status === 404 };
      }
    } catch (error) {
      console.error('Report generation error:', error);
      alert(`Erreur réseau: ${error.message}\n\nVeuillez vérifier votre connexion et réessayer.`);
      return { success: false, message: error.message || 'Network error occurred' };
    }
  };

  return {
    isViewerOpen,
    currentSiren,
    openReportViewer,
    closeReportViewer,
    generateAndView,
    ReportViewerModal: () => isViewerOpen && currentSiren ? (
      <BODACCReportViewer 
        siren={currentSiren} 
        onClose={closeReportViewer} 
      />
    ) : null
  };
}
