import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  CloudArrowDownIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  ChartBarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

/**
 * Modern batch download manager with real-time progress tracking
 * Features Material Design 3.0 principles and accessibility compliance
 */
export default function BatchDownloadManager({ 
  documents = [], 
  onDownloadComplete, 
  onClose,
  className = '' 
}) {
  const { user } = useAuth();
  const [batchState, setBatchState] = useState({
    status: 'idle', // idle, starting, processing, completed, failed
    batchId: null,
    progress: {
      total: 0,
      completed: 0,
      failed: 0,
      inProgress: 0,
      percentage: 0,
      estimatedTimeRemaining: null
    },
    results: null,
    error: null
  });

  const [pollInterval, setPollInterval] = useState(null);
  const [downloadOptions, setDownloadOptions] = useState({
    delayMs: 500,
    format: 'zip',
    includeMetadata: true
  });

  // Start batch download
  const startBatchDownload = useCallback(async () => {
    if (!documents.length) return;

    setBatchState(prev => ({ ...prev, status: 'starting' }));

    try {
      const response = await fetch('/api/documents/batch-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          documents,
          options: downloadOptions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start batch download');
      }

      const result = await response.json();
      
      setBatchState(prev => ({
        ...prev,
        status: 'processing',
        batchId: result.batchId,
        progress: {
          total: documents.length,
          completed: 0,
          failed: 0,
          inProgress: 0,
          percentage: 0,
          estimatedTimeRemaining: null
        }
      }));

      // Start polling for progress
      startProgressPolling(result.batchId);

    } catch (error) {
      setBatchState(prev => ({
        ...prev,
        status: 'failed',
        error: error.message
      }));
    }
  }, [documents, downloadOptions, user]);

  // Start progress polling
  const startProgressPolling = useCallback((batchId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/batch-progress/${batchId}`, {
          headers: {
            'Authorization': `Bearer ${user.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to get progress');
        }

        const progressData = await response.json();
        
        setBatchState(prev => ({
          ...prev,
          status: progressData.status,
          progress: progressData.progress,
          results: progressData.results,
          error: progressData.error
        }));

        // Stop polling if completed or failed
        if (progressData.status === 'completed' || progressData.status === 'failed') {
          clearInterval(interval);
          setPollInterval(null);
          
          if (progressData.status === 'completed' && onDownloadComplete) {
            onDownloadComplete(progressData);
          }
        }

      } catch (error) {
        console.error('Progress polling error:', error);
        setBatchState(prev => ({
          ...prev,
          status: 'failed',
          error: error.message
        }));
        clearInterval(interval);
        setPollInterval(null);
      }
    }, 2000); // Poll every 2 seconds

    setPollInterval(interval);
  }, [user, onDownloadComplete]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Download batch results
  const downloadResults = useCallback(async () => {
    if (!batchState.batchId) return;

    try {
      const response = await fetch(`/api/documents/batch-results/${batchState.batchId}`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download results');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_download_${batchState.batchId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      setBatchState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }, [batchState.batchId, user]);

  // Format time remaining
  const formatTimeRemaining = (ms) => {
    if (!ms) return 'Calculating...';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s remaining`;
    } else {
      return `${seconds}s remaining`;
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (batchState.status) {
      case 'starting':
      case 'processing':
        return <ArrowPathIcon className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
      default:
        return <CloudArrowDownIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Téléchargement par lot
            </h3>
            <p className="text-sm text-gray-600">
              {documents.length} document(s) sélectionné(s)
            </p>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Idle State */}
        {batchState.status === 'idle' && (
          <div className="space-y-6">
            {/* Download Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Options de téléchargement</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Délai entre téléchargements</label>
                  <select
                    value={downloadOptions.delayMs}
                    onChange={(e) => setDownloadOptions(prev => ({ 
                      ...prev, 
                      delayMs: parseInt(e.target.value) 
                    }))}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1"
                  >
                    <option value={0}>Aucun délai</option>
                    <option value={500}>500ms</option>
                    <option value={1000}>1 seconde</option>
                    <option value={2000}>2 secondes</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Inclure les métadonnées</label>
                  <input
                    type="checkbox"
                    checked={downloadOptions.includeMetadata}
                    onChange={(e) => setDownloadOptions(prev => ({ 
                      ...prev, 
                      includeMetadata: e.target.checked 
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Document List Preview */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Documents à télécharger</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {documents.slice(0, 10).map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <DocumentArrowDownIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{doc.type.toUpperCase()}</span>
                      <span className="text-sm text-gray-600">{doc.siren}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.denomination && doc.denomination.length > 20 
                        ? `${doc.denomination.substring(0, 20)}...` 
                        : doc.denomination}
                    </div>
                  </div>
                ))}
                {documents.length > 10 && (
                  <div className="text-center py-2 text-sm text-gray-500">
                    et {documents.length - 10} autres documents...
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startBatchDownload}
              disabled={!documents.length}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Commencer le téléchargement
            </button>
          </div>
        )}

        {/* Processing State */}
        {(batchState.status === 'starting' || batchState.status === 'processing') && (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Progression</span>
                <span className="text-gray-900 font-medium">{batchState.progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${batchState.progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-900">Terminés</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {batchState.progress.completed}
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-900">En cours</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">
                  {batchState.progress.inProgress}
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-red-900">Échecs</span>
                </div>
                <div className="text-2xl font-bold text-red-900">
                  {batchState.progress.failed}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-blue-900">Total</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {batchState.progress.total}
                </div>
              </div>
            </div>

            {/* Time Remaining */}
            {batchState.progress.estimatedTimeRemaining && (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600">Temps restant estimé</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatTimeRemaining(batchState.progress.estimatedTimeRemaining)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completed State */}
        {batchState.status === 'completed' && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
                <div>
                  <h4 className="text-lg font-semibold text-green-900">
                    Téléchargement terminé !
                  </h4>
                  <p className="text-sm text-green-700">
                    {batchState.progress.completed} document(s) téléchargé(s) avec succès
                  </p>
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Résumé</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Documents traités</span>
                  <span className="font-medium">{batchState.progress.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Succès</span>
                  <span className="font-medium text-green-600">{batchState.progress.completed}</span>
                </div>
                {batchState.progress.failed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Échecs</span>
                    <span className="font-medium text-red-600">{batchState.progress.failed}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Taux de réussite</span>
                  <span className="font-medium">
                    {Math.round((batchState.progress.completed / batchState.progress.total) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadResults}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Télécharger l'archive ZIP
            </button>
          </div>
        )}

        {/* Failed State */}
        {batchState.status === 'failed' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                <div>
                  <h4 className="text-lg font-semibold text-red-900">
                    Échec du téléchargement
                  </h4>
                  <p className="text-sm text-red-700">
                    {batchState.error || 'Une erreur inattendue s\'est produite'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setBatchState({ status: 'idle', batchId: null, progress: { total: 0, completed: 0, failed: 0, inProgress: 0, percentage: 0 }, results: null, error: null })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}