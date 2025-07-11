// components/DownloadProgressIndicator.js - Global Download Progress Indicator
//==============================================================================

import { useState, useEffect } from 'react';
import { useDownloadManager } from '../hooks/useDownloadManager-simple';

export default function DownloadProgressIndicator() {
  const { downloadProgress, isDownloading } = useDownloadManager();
  const [isVisible, setIsVisible] = useState(false);
  const [activeDownloads, setActiveDownloads] = useState([]);

  useEffect(() => {
    const downloads = Object.entries(downloadProgress).map(([id, progress]) => ({
      id,
      ...progress
    }));
    
    setActiveDownloads(downloads);
    setIsVisible(downloads.length > 0 || isDownloading);
  }, [downloadProgress, isDownloading]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-lg">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Téléchargements
            </span>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {activeDownloads.length} actif(s)
          </div>
        </div>

        {/* Download Items */}
        <div className="max-h-64 overflow-y-auto">
          {activeDownloads.map((download) => (
            <DownloadItem 
              key={download.id} 
              download={download} 
            />
          ))}
        </div>

        {/* Overall Progress */}
        {activeDownloads.length > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
              <span>Progression globale</span>
              <span>
                {Math.round(
                  activeDownloads.reduce((sum, d) => sum + (d.progress || 0), 0) / activeDownloads.length
                )}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 bg-primary-600 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.round(
                    activeDownloads.reduce((sum, d) => sum + (d.progress || 0), 0) / activeDownloads.length
                  )}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadItem({ download }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'downloading':
      case 'processing':
      case 'saving':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      case 'downloading':
        return '📥';
      case 'processing':
        return '⚙️';
      case 'saving':
        return '💾';
      default:
        return '⏳';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'error':
        return 'Erreur';
      case 'downloading':
        return 'Téléchargement';
      case 'processing':
        return 'Traitement';
      case 'saving':
        return 'Enregistrement';
      default:
        return 'En attente';
    }
  };

  return (
    <div className="p-4 border-b border-gray-100 dark:border-dark-border last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm">{getStatusIcon(download.status)}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            Document {download.id.slice(-6)}
          </span>
        </div>
        
        <span className={`text-xs font-medium ${getStatusColor(download.status)}`}>
          {getStatusText(download.status)}
        </span>
      </div>

      {/* Progress Bar */}
      {download.status !== 'completed' && download.status !== 'error' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Progression</span>
            <span>{download.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="h-1.5 bg-primary-600 rounded-full transition-all duration-300"
              style={{ width: `${download.progress || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {download.status === 'error' && download.error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
          {download.error}
        </div>
      )}

      {/* Success Message */}
      {download.status === 'completed' && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
          Téléchargement terminé avec succès
        </div>
      )}
    </div>
  );
}