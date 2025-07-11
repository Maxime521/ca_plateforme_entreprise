// hooks/useDownloadManager.js - Enhanced Download Management Hook
//==============================================================================

import { useState, useCallback } from 'react';
// Create a simple notification fallback if useNotifications is not available
const useNotificationsFallback = () => {
  return {
    showNotification: ({ type, title, message }) => {
      console.log(`${type.toUpperCase()}: ${title} - ${message}`);
      if (type === 'error') {
        alert(`Error: ${message}`);
      }
    }
  };
};

// Try to import useNotifications, fallback if not available
let useNotifications;
try {
  useNotifications = require('./useNotifications').useNotifications;
} catch (e) {
  useNotifications = useNotificationsFallback;
}

export function useDownloadManager() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({});
  
  // Safe notification with fallback
  let showNotification;
  try {
    const notifications = useNotifications();
    showNotification = notifications.showNotification;
  } catch (e) {
    // Fallback notification system
    showNotification = ({ type, title, message }) => {
      const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
      console.log(`${emoji} ${title}: ${message}`);
      
      // Simple browser notification for errors
      if (type === 'error') {
        setTimeout(() => alert(`${title}: ${message}`), 100);
      }
    };
  }

  /**
   * Download a single document with progress tracking
   * @param {Object} document - Document to download
   * @param {Object} options - Download options
   */
  const downloadDocument = useCallback(async (document, options = {}) => {
    const documentId = document.id;
    
    try {
      setIsDownloading(true);
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'starting', progress: 0 }
      }));

      // Show start notification
      showNotification({
        type: 'info',
        title: 'Téléchargement démarré',
        message: `Téléchargement de ${document.name}...`,
        duration: 3000
      });

      // Determine download URL based on document type
      let downloadUrl;
      const params = new URLSearchParams();
      
      if (document.siret) {
        params.append('siret', document.siret);
      }
      
      switch (document.type) {
        case 'insee':
          downloadUrl = `/api/documents/download/insee/${document.siren}?${params}`;
          break;
        case 'inpi':
          downloadUrl = `/api/documents/download/inpi/${document.siren}`;
          break;
        case 'bodacc':
          downloadUrl = `/api/documents/download/bodacc/${document.siren}?format=pdf`;
          break;
        default:
          throw new Error(`Type de document non supporté: ${document.type}`);
      }

      // Update progress
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'downloading', progress: 25 }
      }));

      // Start download
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf, application/json, */*'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
      }

      // Update progress
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'processing', progress: 50 }
      }));

      // Get file info from headers
      const contentDisposition = response.headers.get('content-disposition');
      const contentType = response.headers.get('content-type');
      
      let filename = document.name; // Use the document name as-is
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Update progress
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'saving', progress: 75 }
      }));

      // Download file
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Append to body and click
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Update progress to complete
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'completed', progress: 100 }
      }));

      // Show success notification
      showNotification({
        type: 'success',
        title: 'Téléchargement terminé',
        message: `${document.name} téléchargé avec succès`,
        duration: 5000
      });

      // Clear progress after delay
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[documentId];
          return newProgress;
        });
      }, 2000);

    } catch (error) {
      console.error('Download failed:', error);
      
      // Update progress to error
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'error', progress: 0, error: error.message }
      }));

      // Show error notification
      showNotification({
        type: 'error',
        title: 'Erreur de téléchargement',
        message: error.message || 'Le téléchargement a échoué',
        duration: 8000
      });

      // Clear progress after delay
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[documentId];
          return newProgress;
        });
      }, 3000);

      throw error;
    } finally {
      setIsDownloading(false);
    }
  }, [showNotification]);

  /**
   * Download multiple documents with batch processing
   * @param {Object[]} documents - Array of documents to download
   * @param {Object} options - Download options
   */
  const downloadBatch = useCallback(async (documents, options = {}) => {
    if (!documents || documents.length === 0) {
      throw new Error('Aucun document à télécharger');
    }

    try {
      setIsDownloading(true);

      // Show batch start notification
      showNotification({
        type: 'info',
        title: 'Téléchargement en lot',
        message: `Démarrage du téléchargement de ${documents.length} document(s)...`,
        duration: 3000
      });

      const results = {
        successful: [],
        failed: []
      };

      // Process documents sequentially to avoid overwhelming the server
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        
        try {
          await downloadDocument(document, options);
          results.successful.push(document);
          
          // Add delay between downloads
          if (i < documents.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          results.failed.push({ document, error: error.message });
        }
      }

      // Show batch completion notification
      showNotification({
        type: results.failed.length === 0 ? 'success' : 'warning',
        title: 'Téléchargement en lot terminé',
        message: `${results.successful.length} succès, ${results.failed.length} échec(s)`,
        duration: 8000
      });

      return results;

    } catch (error) {
      console.error('Batch download failed:', error);
      
      showNotification({
        type: 'error',
        title: 'Erreur de téléchargement en lot',
        message: error.message || 'Le téléchargement en lot a échoué',
        duration: 8000
      });

      throw error;
    } finally {
      setIsDownloading(false);
    }
  }, [downloadDocument, showNotification]);

  /**
   * Cancel all downloads
   */
  const cancelDownloads = useCallback(() => {
    setDownloadProgress({});
    setIsDownloading(false);
    
    showNotification({
      type: 'info',
      title: 'Téléchargements annulés',
      message: 'Tous les téléchargements ont été annulés',
      duration: 3000
    });
  }, [showNotification]);

  /**
   * Get download progress for a specific document
   * @param {string} documentId - Document ID
   * @returns {Object|null} Progress information
   */
  const getDownloadProgress = useCallback((documentId) => {
    return downloadProgress[documentId] || null;
  }, [downloadProgress]);

  return {
    isDownloading,
    downloadProgress,
    downloadDocument,
    downloadBatch,
    cancelDownloads,
    getDownloadProgress
  };
}