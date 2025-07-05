// pages/api/documents/batch-download.js - Enhanced Batch Download System
//==============================================================================

import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import documentAuth from '../../../lib/auth/document-auth';
import logger from '../../../lib/logger';
import { cacheService } from '../../../lib/cache/redis-client';

/**
 * Enhanced batch download system with parallel processing, progress tracking, and resumable downloads
 * Supports multiple document types and provides real-time progress updates
 */
class BatchDownloadManager extends EventEmitter {
  constructor() {
    super();
    this.activeBatches = new Map();
    this.progressCache = new Map();
    this.maxConcurrentDownloads = 5;
    this.maxBatchSize = 100;
  }

  /**
   * Start a new batch download operation
   * @param {string} batchId - Unique batch identifier
   * @param {Object[]} documents - Array of documents to download
   * @param {Object} user - User information
   * @param {Object} options - Download options
   * @returns {Object} Batch operation result
   */
  async startBatchDownload(batchId, documents, user, options = {}) {
    try {
      // Validate batch size
      if (documents.length > this.maxBatchSize) {
        throw new Error(`Batch size exceeds maximum limit of ${this.maxBatchSize}`);
      }

      // Initialize batch state
      const batchState = {
        id: batchId,
        userId: user.id,
        status: 'initializing',
        documents,
        options,
        startTime: Date.now(),
        progress: {
          total: documents.length,
          completed: 0,
          failed: 0,
          inProgress: 0,
          percentage: 0
        },
        results: [],
        errors: [],
        estimatedTimeRemaining: null
      };

      this.activeBatches.set(batchId, batchState);
      this.progressCache.set(batchId, batchState.progress);

      // Start processing
      await this.processBatchDownload(batchState);

      return {
        success: true,
        batchId,
        message: 'Batch download started',
        totalDocuments: documents.length
      };

    } catch (error) {
      logger.error('Batch download start failed', { error, batchId, userId: user.id });
      throw error;
    }
  }

  /**
   * Process batch download with parallel workers
   * @param {Object} batchState - Batch state object
   */
  async processBatchDownload(batchState) {
    const { id: batchId, documents, userId, options } = batchState;
    
    try {
      batchState.status = 'processing';
      
      // Create document chunks for parallel processing
      const chunks = this.createDocumentChunks(documents, this.maxConcurrentDownloads);
      
      // Process chunks in parallel
      const chunkPromises = chunks.map((chunk, index) => 
        this.processDocumentChunk(batchId, chunk, index, userId, options)
      );

      // Wait for all chunks to complete
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      // Consolidate results
      const finalResults = this.consolidateResults(chunkResults, batchState);
      
      // Update final state
      batchState.status = 'completed';
      batchState.endTime = Date.now();
      batchState.duration = batchState.endTime - batchState.startTime;
      batchState.results = finalResults.successful;
      batchState.errors = finalResults.failed;
      
      // Update progress to 100%
      batchState.progress.completed = finalResults.successful.length;
      batchState.progress.failed = finalResults.failed.length;
      batchState.progress.inProgress = 0;
      batchState.progress.percentage = 100;
      
      // Cache final results
      await cacheService.set(`batch:${batchId}:results`, batchState, 3600); // Cache for 1 hour
      
      // Log batch completion
      await this.logBatchCompletion(batchState);
      
      // Emit completion event
      this.emit('batchCompleted', batchState);
      
    } catch (error) {
      batchState.status = 'failed';
      batchState.error = error.message;
      
      logger.error('Batch download processing failed', { 
        error, 
        batchId, 
        userId,
        documentsCount: documents.length 
      });
      
      this.emit('batchFailed', batchState);
    }
  }

  /**
   * Process a chunk of documents
   * @param {string} batchId - Batch ID
   * @param {Object[]} chunk - Document chunk
   * @param {number} chunkIndex - Chunk index
   * @param {string} userId - User ID
   * @param {Object} options - Options
   * @returns {Promise<Object[]>} Chunk results
   */
  async processDocumentChunk(batchId, chunk, chunkIndex, userId, options) {
    const chunkResults = [];
    
    for (const document of chunk) {
      try {
        // Update progress
        this.updateProgressForDocument(batchId, document.id, 'started');
        
        // Download document
        const result = await this.downloadSingleDocument(document, userId, options);
        
        // Update progress
        this.updateProgressForDocument(batchId, document.id, 'completed');
        
        chunkResults.push({
          success: true,
          document,
          result,
          chunkIndex
        });
        
      } catch (error) {
        // Update progress
        this.updateProgressForDocument(batchId, document.id, 'failed');
        
        chunkResults.push({
          success: false,
          document,
          error: error.message,
          chunkIndex
        });
        
        logger.error('Document download failed in batch', {
          error,
          batchId,
          documentId: document.id,
          chunkIndex
        });
      }
      
      // Add delay between downloads to respect rate limits
      if (options.delayMs) {
        await new Promise(resolve => setTimeout(resolve, options.delayMs));
      }
    }
    
    return chunkResults;
  }

  /**
   * Download a single document
   * @param {Object} document - Document information
   * @param {string} userId - User ID
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Download result
   */
  async downloadSingleDocument(document, userId, options) {
    const { type, siren, siret, denominationn } = document;
    
    switch (type.toLowerCase()) {
      case 'inpi':
        return await this.downloadINPIDocument(siren, options);
      case 'insee':
        return await this.downloadINSEEDocument(siren, siret, options);
      case 'bodacc':
        return await this.downloadBODACCDocument(siren, options);
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }
  }

  /**
   * Download INPI document
   * @param {string} siren - SIREN number
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Download result
   */
  async downloadINPIDocument(siren, options) {
    const inpiToken = process.env.INPI_API_TOKEN;
    
    if (!inpiToken) {
      throw new Error('INPI API token not configured');
    }

    const inpiUrl = `https://data.inpi.fr/export/companies?format=pdf&ids=[%22${siren}%22]&est=all`;
    
    const response = await fetch(inpiUrl, {
      headers: {
        'Authorization': `Bearer ${inpiToken}`,
        'User-Agent': 'DataCorp-Platform/1.0 (Batch Download Service)'
      }
    });

    if (!response.ok) {
      throw new Error(`INPI API error: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const fileName = `INPI_RNE_${siren}_${Date.now()}.pdf`;
    
    return {
      type: 'inpi',
      siren,
      fileName,
      buffer: Buffer.from(buffer),
      size: buffer.byteLength,
      contentType: 'application/pdf'
    };
  }

  /**
   * Download INSEE document
   * @param {string} siren - SIREN number
   * @param {string} siret - SIRET number
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Download result
   */
  async downloadINSEEDocument(siren, siret, options) {
    const targetSIRET = siret || `${siren}00001`;
    const cleanSIRET = targetSIRET.replace(/\s/g, '');
    
    const inseeUrl = `https://api-avis-situation-sirene.insee.fr/identification/pdf/${cleanSIRET}`;
    
    const response = await fetch(inseeUrl, {
      headers: {
        'Accept': 'application/pdf',
        'User-Agent': 'DataCorp-Platform/1.0 (Batch Download Service)'
      }
    });

    if (!response.ok) {
      throw new Error(`INSEE API error: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const fileName = `INSEE_Avis_Situation_${siren}_${Date.now()}.pdf`;
    
    return {
      type: 'insee',
      siren,
      siret: cleanSIRET,
      fileName,
      buffer: Buffer.from(buffer),
      size: buffer.byteLength,
      contentType: 'application/pdf'
    };
  }

  /**
   * Download BODACC document
   * @param {string} siren - SIREN number
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Download result
   */
  async downloadBODACCDocument(siren, options) {
    const apiUrl = `https://bodacc-datadila.opendatasoft.com/api/v2/catalog/datasets/annonces-commerciales/records?where=registre+like+%22${siren}%25%22&limit=100`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`BODACC API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const jsonContent = JSON.stringify(data, null, 2);
    const fileName = `BODACC_Annonces_${siren}_${Date.now()}.json`;
    
    return {
      type: 'bodacc',
      siren,
      fileName,
      buffer: Buffer.from(jsonContent, 'utf8'),
      size: jsonContent.length,
      contentType: 'application/json'
    };
  }

  /**
   * Create document chunks for parallel processing
   * @param {Object[]} documents - Documents array
   * @param {number} chunkSize - Size of each chunk
   * @returns {Object[][]} Array of document chunks
   */
  createDocumentChunks(documents, chunkSize) {
    const chunks = [];
    for (let i = 0; i < documents.length; i += chunkSize) {
      chunks.push(documents.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Update progress for a document
   * @param {string} batchId - Batch ID
   * @param {string} documentId - Document ID
   * @param {string} status - Status (started, completed, failed)
   */
  updateProgressForDocument(batchId, documentId, status) {
    const batchState = this.activeBatches.get(batchId);
    if (!batchState) return;

    const progress = batchState.progress;
    
    switch (status) {
      case 'started':
        progress.inProgress++;
        break;
      case 'completed':
        progress.completed++;
        progress.inProgress = Math.max(0, progress.inProgress - 1);
        break;
      case 'failed':
        progress.failed++;
        progress.inProgress = Math.max(0, progress.inProgress - 1);
        break;
    }
    
    // Calculate percentage
    const totalProcessed = progress.completed + progress.failed;
    progress.percentage = Math.round((totalProcessed / progress.total) * 100);
    
    // Estimate time remaining
    if (totalProcessed > 0) {
      const elapsedTime = Date.now() - batchState.startTime;
      const avgTimePerDocument = elapsedTime / totalProcessed;
      const remainingDocuments = progress.total - totalProcessed;
      progress.estimatedTimeRemaining = Math.round(avgTimePerDocument * remainingDocuments);
    }
    
    // Update cache
    this.progressCache.set(batchId, progress);
    
    // Emit progress event
    this.emit('progressUpdate', {
      batchId,
      progress,
      documentId,
      status
    });
  }

  /**
   * Consolidate results from chunk processing
   * @param {Object[]} chunkResults - Results from chunk processing
   * @param {Object} batchState - Batch state
   * @returns {Object} Consolidated results
   */
  consolidateResults(chunkResults, batchState) {
    const successful = [];
    const failed = [];
    
    chunkResults.forEach(chunkResult => {
      if (chunkResult.status === 'fulfilled') {
        chunkResult.value.forEach(item => {
          if (item.success) {
            successful.push(item);
          } else {
            failed.push(item);
          }
        });
      } else {
        // Handle chunk-level failures
        failed.push({
          success: false,
          error: chunkResult.reason?.message || 'Chunk processing failed',
          chunkIndex: chunkResult.chunkIndex
        });
      }
    });
    
    return { successful, failed };
  }

  /**
   * Log batch completion
   * @param {Object} batchState - Batch state
   */
  async logBatchCompletion(batchState) {
    const summary = {
      batchId: batchState.id,
      userId: batchState.userId,
      totalDocuments: batchState.progress.total,
      successful: batchState.progress.completed,
      failed: batchState.progress.failed,
      duration: batchState.duration,
      successRate: `${Math.round((batchState.progress.completed / batchState.progress.total) * 100)}%`
    };
    
    logger.info('Batch download completed', summary);
    
    // Log to audit system
    await documentAuth.logAuditEvent('BATCH_DOWNLOAD_COMPLETED', summary);
  }

  /**
   * Get batch progress
   * @param {string} batchId - Batch ID
   * @returns {Object|null} Progress information
   */
  getBatchProgress(batchId) {
    return this.progressCache.get(batchId) || null;
  }

  /**
   * Get batch state
   * @param {string} batchId - Batch ID
   * @returns {Object|null} Batch state
   */
  getBatchState(batchId) {
    return this.activeBatches.get(batchId) || null;
  }

  /**
   * Cancel batch download
   * @param {string} batchId - Batch ID
   * @returns {boolean} Success status
   */
  cancelBatchDownload(batchId) {
    const batchState = this.activeBatches.get(batchId);
    if (!batchState) return false;

    batchState.status = 'cancelled';
    this.activeBatches.delete(batchId);
    this.progressCache.delete(batchId);
    
    this.emit('batchCancelled', batchState);
    return true;
  }

  /**
   * Clean up old batches
   */
  cleanupOldBatches() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    
    for (const [batchId, batchState] of this.activeBatches.entries()) {
      if (now - batchState.startTime > maxAge) {
        this.activeBatches.delete(batchId);
        this.progressCache.delete(batchId);
      }
    }
  }
}

// Create singleton instance
const batchDownloadManager = new BatchDownloadManager();

// Cleanup old batches every hour
setInterval(() => {
  batchDownloadManager.cleanupOldBatches();
}, 60 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { documents, options = {} } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Documents array is required and must not be empty'
      });
    }

    // Authorize batch download
    const authResult = await documentAuth.authorizeDocumentAccess(req, 'batch', {
      documentCount: documents.length,
      documentTypes: [...new Set(documents.map(doc => doc.type))]
    });

    if (!authResult.success) {
      return res.status(authResult.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 403).json({
        error: authResult.code,
        message: authResult.message,
        retryAfter: authResult.retryAfter
      });
    }

    // Generate batch ID
    const batchId = uuidv4();

    // Start batch download
    const result = await batchDownloadManager.startBatchDownload(
      batchId,
      documents,
      authResult.user,
      options
    );

    return res.status(202).json({
      ...result,
      message: 'Batch download started successfully',
      progressUrl: `/api/documents/batch-progress/${batchId}`
    });

  } catch (error) {
    logger.error('Batch download API error', { error, body: req.body });
    
    return res.status(500).json({
      error: 'Batch download failed',
      message: error.message
    });
  }
}

// Export manager for use in other modules
export { batchDownloadManager };