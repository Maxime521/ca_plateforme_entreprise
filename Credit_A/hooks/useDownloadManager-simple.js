// hooks/useDownloadManager-simple.js - Simplified Download Manager
//==============================================================================

import { useState, useCallback } from 'react';

export function useDownloadManager() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({});

  // Simple notification function
  const showNotification = useCallback(({ type, title, message }) => {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    console.log(`${emoji} ${title}: ${message}`);
    
    // Show browser notification for important messages
    if (type === 'error') {
      alert(`${title}: ${message}`);
    } else if (type === 'success') {
      // You can replace this with a toast notification later
      console.log(`✅ ${title}: ${message}`);
    }
  }, []);

  /**
   * Download a single document
   */
  const downloadDocument = useCallback(async (document) => {
    console.log('📥 downloadDocument called with:', document);
    const documentId = document.id;
    
    try {
      setIsDownloading(true);
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'starting', progress: 0 }
      }));

      console.log('📝 Starting download for:', document.name);
      showNotification({
        type: 'info',
        title: 'Téléchargement démarré',
        message: `Téléchargement de ${document.name}...`
      });

      // Determine download URL
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
        [documentId]: { status: 'downloading', progress: 50 }
      }));

      // Fetch the file
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Erreur HTTP: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Use default error message
        }
        
        throw new Error(errorMessage);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = document.name; // Use the document name as-is
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      // Note: No need to add extension since document.name already includes it

      // Update progress
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'saving', progress: 90 }
      }));

      // Download the file
      const blob = await response.blob();
      
      // Create download link (only in browser environment)
      if (typeof window !== 'undefined' && window.document) {
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Trigger download
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        
        // Cleanup
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Download not available in server-side environment');
      }

      // Complete
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'completed', progress: 100 }
      }));

      showNotification({
        type: 'success',
        title: 'Téléchargement terminé',
        message: `${document.name} téléchargé avec succès`
      });

      // Clear progress after delay
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[documentId];
          return newProgress;
        });
      }, 3000);

    } catch (error) {
      console.error('Download failed:', error);
      
      setDownloadProgress(prev => ({
        ...prev,
        [documentId]: { status: 'error', progress: 0, error: error.message }
      }));

      showNotification({
        type: 'error',
        title: 'Erreur de téléchargement',
        message: error.message || 'Le téléchargement a échoué'
      });

      // Clear progress after delay
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[documentId];
          return newProgress;
        });
      }, 5000);

      throw error;
    } finally {
      setIsDownloading(false);
    }
  }, [showNotification]);

  /**
   * Download multiple documents in sequence
   */
  const downloadBatch = useCallback(async (documents) => {
    console.log('🚀 downloadBatch called with:', documents);
    
    if (!documents || documents.length === 0) {
      console.warn('❌ No documents provided for batch download');
      throw new Error('Aucun document à télécharger');
    }

    try {
      console.log('📥 Starting batch download for', documents.length, 'documents');
      setIsDownloading(true);

      // First, validate with the simple batch API
      const batchResponse = await fetch('/api/documents/simple-batch-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documents })
      });

      if (!batchResponse.ok) {
        const errorData = await batchResponse.json();
        throw new Error(errorData.message || 'Batch validation failed');
      }

      showNotification({
        type: 'info',
        title: 'Téléchargement en lot',
        message: `Démarrage du téléchargement de ${documents.length} document(s)...`
      });

      const results = {
        successful: [],
        failed: []
      };

      // Download documents one by one to avoid overwhelming the server
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        console.log(`📄 Downloading document ${i + 1}/${documents.length}:`, document.name);
        
        try {
          // Temporarily reset isDownloading for individual downloads
          setIsDownloading(false);
          await downloadDocument(document);
          setIsDownloading(true);
          
          results.successful.push(document);
          console.log(`✅ Successfully downloaded: ${document.name}`);
          
          // Add small delay between downloads
          if (i < documents.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          console.error(`❌ Failed to download: ${document.name}`, error);
          results.failed.push({ document, error: error.message });
          setIsDownloading(true); // Ensure flag is reset
        }
      }

      // Show completion notification
      const message = `${results.successful.length} succès, ${results.failed.length} échec(s)`;
      console.log('📊 Batch download completed:', message);
      
      showNotification({
        type: results.failed.length === 0 ? 'success' : 'info',
        title: 'Téléchargement en lot terminé',
        message
      });

      return results;

    } catch (error) {
      console.error('❌ Batch download failed:', error);
      
      showNotification({
        type: 'error',
        title: 'Erreur de téléchargement en lot',
        message: error.message || 'Le téléchargement en lot a échoué'
      });

      throw error;
    } finally {
      console.log('🏁 Batch download process finished');
      setIsDownloading(false);
    }
  }, [downloadDocument, showNotification]);

  /**
   * Get download progress for a specific document
   */
  const getDownloadProgress = useCallback((documentId) => {
    return downloadProgress[documentId] || null;
  }, [downloadProgress]);

  /**
   * Cancel all downloads
   */
  const cancelDownloads = useCallback(() => {
    setDownloadProgress({});
    setIsDownloading(false);
    
    showNotification({
      type: 'info',
      title: 'Téléchargements annulés',
      message: 'Tous les téléchargements ont été annulés'
    });
  }, [showNotification]);

  return {
    isDownloading,
    downloadProgress,
    downloadDocument,
    downloadBatch,
    cancelDownloads,
    getDownloadProgress
  };
}