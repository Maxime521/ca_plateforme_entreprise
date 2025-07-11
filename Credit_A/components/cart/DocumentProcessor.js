// components/cart/DocumentProcessor.js - Extracted processing logic
import { useState } from 'react';

export function useDocumentProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({});

  const processAllDocuments = async (cartItems, updateUploadProgress) => {
    if (cartItems.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus({});

    try {
      // Process documents in batches of 3 for better performance
      const batchSize = 3;
      const batches = [];
      
      for (let i = 0; i < cartItems.length; i += batchSize) {
        batches.push(cartItems.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (document) => {
          try {
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
            switch (document.type) {
              case 'insee':
                result = await processINSEEDocument(document, updateUploadProgress);
                break;
              case 'bodacc':
                result = await processBODACCDocument(document, updateUploadProgress);
                break;
              case 'inpi':
                result = await processINPIDocument(document, updateUploadProgress);
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
        });

        // Wait for current batch to complete before starting next batch
        await Promise.allSettled(batchPromises);
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

  const processINSEEDocument = async (document, updateUploadProgress) => {
    updateUploadProgress(document.id, { 
      status: 'processing', 
      progress: 30,
      message: 'Téléchargement du certificat INSEE...'
    });

    const response = await fetch('/api/documents/insee-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siren: document.siren,
        siret: document.siret || null
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Échec du téléchargement INSEE');
    }

    updateUploadProgress(document.id, { 
      status: 'processing', 
      progress: 90,
      message: 'Finalisation du document...'
    });

    return {
      success: true,
      downloadUrl: data.document.url,
      filename: data.document.fileName,
      size: data.document.size,
      type: 'pdf',
      description: data.document.description
    };
  };

  const processBODACCDocument = async (document, updateUploadProgress) => {
    updateUploadProgress(document.id, { 
      status: 'processing', 
      progress: 25,
      message: 'Génération du rapport BODACC...'
    });

    const response = await fetch(`/api/documents/download/bodacc/${document.siren}?format=pdf`);
    
    if (!response.ok) {
      throw new Error(`BODACC processing failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    return {
      success: true,
      downloadUrl: url,
      filename: `BODACC_${document.siren}.pdf`,
      recordCount: 'N/A',
      type: 'pdf'
    };
  };

  const processINPIDocument = async (document, updateUploadProgress) => {
    updateUploadProgress(document.id, { 
      status: 'processing', 
      progress: 25,
      message: 'Téléchargement INPI en cours...'
    });

    const response = await fetch(`/api/documents/download/inpi/${document.siren}`);
    
    if (!response.ok) {
      throw new Error(`INPI processing failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    return {
      success: true,
      downloadUrl: url,
      filename: `INPI_${document.siren}.pdf`,
      size: blob.size,
      type: 'pdf'
    };
  };

  const showProcessingSummary = (successful, failed) => {
    if (typeof window !== 'undefined' && window.document) {
      const summary = window.document.createElement('div');
      summary.innerHTML = `
        <div style="position:fixed;top:20px;right:20px;background:white;border:1px solid #ddd;border-radius:10px;padding:20px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:10000;max-width:300px;">
          <h3 style="margin:0 0 10px 0;color:#333;">📋 Traitement terminé</h3>
          <p style="margin:5px 0;color:#28a745;">✅ ${successful} document(s) traité(s)</p>
          ${failed > 0 ? `<p style="margin:5px 0;color:#dc3545;">❌ ${failed} erreur(s)</p>` : ''}
          <button onclick="this.parentElement.remove()" style="margin-top:10px;padding:5px 10px;border:none;background:#007bff;color:white;border-radius:5px;cursor:pointer;">Fermer</button>
        </div>
      `;
      window.document.body.appendChild(summary);

      setTimeout(() => {
        if (summary.parentElement) {
          summary.remove();
        }
      }, 10000);
    }
  };

  return {
    processAllDocuments,
    isProcessing,
    processingStatus,
    setProcessingStatus
  };
}