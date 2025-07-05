// components/BatchINSEEDownload.js - Batch download component for INSEE AVIS DE SITUATION documents
import { useState } from 'react';

export default function BatchINSEEDownload({ companies = [], onBatchComplete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentCompany: null });
  const [results, setResults] = useState(null);
  const [selectedCompanies, setSelectedCompanies] = useState([]);

  const handleSelectAll = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map(c => c.siren));
    }
  };

  const handleSelectCompany = (siren) => {
    setSelectedCompanies(prev => 
      prev.includes(siren) 
        ? prev.filter(s => s !== siren)
        : [...prev, siren]
    );
  };

  const startBatchDownload = async () => {
    if (selectedCompanies.length === 0) {
      alert('Veuillez sélectionner au moins une entreprise');
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setProgress({ current: 0, total: selectedCompanies.length, currentCompany: null });

    try {
      const selectedCompanyData = companies.filter(c => selectedCompanies.includes(c.siren));
      
      const response = await fetch('/api/documents/insee-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companies: selectedCompanyData,
          options: {
            delayMs: 500 // Delay between requests to respect rate limits
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setResults(result);
        if (onBatchComplete) {
          onBatchComplete(result);
        }
      } else {
        throw new Error(result.message || 'Batch processing failed');
      }
      
    } catch (error) {
      console.error('Batch download error:', error);
      alert(`Erreur lors du téléchargement en lot: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0, currentCompany: null });
    }
  };

  const downloadAllResults = () => {
    if (!results || !results.results) return;
    
    results.results.forEach((result, index) => {
      if (result.success && result.document) {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = result.document.url;
          link.download = result.document.fileName;
          link.click();
        }, index * 200); // Stagger downloads
      }
    });
  };

  if (companies.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune entreprise disponible
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Ajoutez des entreprises pour utiliser le téléchargement en lot
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <span className="mr-2">📦</span>
            Téléchargement en lot - AVIS DE SITUATION
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Téléchargez les documents INSEE pour plusieurs entreprises simultanément
          </p>
        </div>
        
        {!isProcessing && (
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedCompanies.length} / {companies.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              entreprises sélectionnées
            </div>
          </div>
        )}
      </div>

      {/* Company Selection */}
      {!isProcessing && !results && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Sélection des entreprises
            </h4>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {selectedCompanies.length === companies.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {companies.map((company) => (
              <label
                key={company.siren}
                className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCompanies.includes(company.siren)}
                  onChange={() => handleSelectCompany(company.siren)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                      {company.siren}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {company.denomination || `Entreprise ${company.siren}`}
                    </span>
                  </div>
                  {company.siret && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      SIRET: {company.siret}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Traitement en cours...
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {progress.current} / {progress.total}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          
          {progress.currentCompany && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Traitement: {progress.currentCompany}
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      {results && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Résultats du traitement
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {results.summary.successful}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Téléchargements réussis
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {results.summary.failed}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                Échecs
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {results.summary.successRate}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Taux de réussite
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {results.results?.map((result, index) => (
              <div
                key={result.siren}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">
                    {result.success ? '✅' : '❌'}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {result.denomination || `Entreprise ${result.siren}`}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      SIREN: {result.siren}
                    </div>
                  </div>
                </div>
                
                {result.success && result.document && (
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = result.document.url;
                      link.download = result.document.fileName;
                      link.click();
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                  >
                    📥 Télécharger
                  </button>
                )}
              </div>
            ))}
            
            {results.errors?.map((error, index) => (
              <div
                key={error.siren}
                className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">❌</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {error.denomination || `Entreprise ${error.siren}`}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {error.error}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {!isProcessing && !results && (
          <button
            onClick={startBatchDownload}
            disabled={selectedCompanies.length === 0}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
              selectedCompanies.length === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
            }`}
          >
            <span>📦</span>
            <span>Lancer le téléchargement ({selectedCompanies.length})</span>
          </button>
        )}

        {isProcessing && (
          <div className="flex-1 px-6 py-3 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Traitement en cours...</span>
          </div>
        )}

        {results && results.summary.successful > 0 && (
          <button
            onClick={downloadAllResults}
            className="flex-1 px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <span>💾</span>
            <span>Télécharger tous les documents ({results.summary.successful})</span>
          </button>
        )}

        {results && (
          <button
            onClick={() => {
              setResults(null);
              setSelectedCompanies([]);
              setProgress({ current: 0, total: 0, currentCompany: null });
            }}
            className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium transition-colors"
          >
            Nouveau lot
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 dark:text-blue-400 mt-1">💡</span>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Conseils pour le téléchargement en lot :</p>
            <ul className="space-y-1 text-xs">
              <li>• Maximum 50 entreprises par lot pour optimiser les performances</li>
              <li>• Un délai de 500ms est appliqué entre chaque requête pour respecter les limites INSEE</li>
              <li>• Les documents sont automatiquement sauvegardés dans la base de données</li>
              <li>• En cas d&apos;échec, vous pouvez retenter individuellement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}