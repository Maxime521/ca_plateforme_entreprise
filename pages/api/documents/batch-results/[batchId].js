import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { batchDownloadManager } from '../batch-download';
import documentAuth from '../../../../lib/auth/document-auth';
import logger from '../../../../lib/logger';

/**
 * Batch results download API - Creates and serves ZIP archives of batch downloads
 * Provides secure access to completed batch download results
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { batchId } = req.query;
  
  if (!batchId) {
    return res.status(400).json({
      error: 'Missing batch ID',
      message: 'Batch ID is required'
    });
  }

  try {
    // Authorize batch results access
    const authResult = await documentAuth.authorizeDocumentAccess(req, 'download', {
      batchId,
      operation: 'batch_results'
    });

    if (!authResult.success) {
      return res.status(authResult.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 403).json({
        error: authResult.code,
        message: authResult.message,
        retryAfter: authResult.retryAfter
      });
    }

    // Get batch state
    const batchState = batchDownloadManager.getBatchState(batchId);
    
    if (!batchState) {
      return res.status(404).json({
        error: 'Batch not found',
        message: 'Batch ID not found or expired'
      });
    }

    // Verify user owns this batch
    if (batchState.userId !== authResult.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this batch'
      });
    }

    // Check if batch is completed
    if (batchState.status !== 'completed') {
      return res.status(400).json({
        error: 'Batch not completed',
        message: 'Batch download is not yet completed',
        status: batchState.status,
        progress: batchState.progress
      });
    }

    // Check if there are any successful results
    if (!batchState.results || batchState.results.length === 0) {
      return res.status(404).json({
        error: 'No results',
        message: 'No successful downloads found in this batch'
      });
    }

    // Create ZIP archive of results
    const zipBuffer = await createBatchZipArchive(batchState);
    
    // Set headers for ZIP download
    const zipFileName = `batch_download_${batchId}_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Send ZIP file
    res.status(200).send(zipBuffer);

    // Log successful batch download
    await documentAuth.logAuditEvent('BATCH_RESULTS_DOWNLOADED', {
      userId: authResult.user.id,
      batchId,
      resultCount: batchState.results.length,
      zipSize: zipBuffer.length,
      downloadedAt: new Date().toISOString()
    });

    logger.info('Batch results downloaded', {
      userId: authResult.user.id,
      batchId,
      resultCount: batchState.results.length,
      zipSize: zipBuffer.length
    });

  } catch (error) {
    logger.error('Batch results download error', { 
      error, 
      batchId,
      userId: req.user?.id 
    });

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Download failed',
        message: 'Unable to create batch results archive'
      });
    }
  }
}

/**
 * Create ZIP archive of batch results
 * @param {Object} batchState - Batch state containing results
 * @returns {Promise<Buffer>} ZIP archive buffer
 */
async function createBatchZipArchive(batchState) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const chunks = [];
    
    // Collect archive data
    archive.on('data', (chunk) => {
      chunks.push(chunk);
    });

    // Handle archive completion
    archive.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });

    // Handle archive errors
    archive.on('error', (error) => {
      reject(error);
    });

    // Add successful results to archive
    batchState.results.forEach((result, index) => {
      if (result.success && result.result?.buffer) {
        const fileName = result.result.fileName || `document_${index + 1}.pdf`;
        archive.append(result.result.buffer, { name: fileName });
      }
    });

    // Add batch summary as JSON
    const summary = {
      batchId: batchState.id,
      completedAt: new Date(batchState.endTime).toISOString(),
      duration: batchState.duration,
      totalDocuments: batchState.progress.total,
      successful: batchState.progress.completed,
      failed: batchState.progress.failed,
      successRate: `${Math.round((batchState.progress.completed / batchState.progress.total) * 100)}%`,
      documents: batchState.results.map(result => ({
        fileName: result.result?.fileName,
        type: result.result?.type,
        siren: result.result?.siren,
        siret: result.result?.siret,
        size: result.result?.size,
        contentType: result.result?.contentType
      }))
    };

    // Add errors summary if any
    if (batchState.errors && batchState.errors.length > 0) {
      summary.errors = batchState.errors.map(error => ({
        documentId: error.document?.id,
        siren: error.document?.siren,
        type: error.document?.type,
        error: error.error
      }));
    }

    archive.append(JSON.stringify(summary, null, 2), { name: 'batch_summary.json' });

    // Create a simple text report
    const reportLines = [
      `Batch Download Report`,
      `===================`,
      ``,
      `Batch ID: ${batchState.id}`,
      `Completed: ${new Date(batchState.endTime).toLocaleString()}`,
      `Duration: ${Math.round(batchState.duration / 1000)} seconds`,
      ``,
      `Results:`,
      `- Total documents: ${batchState.progress.total}`,
      `- Successfully downloaded: ${batchState.progress.completed}`,
      `- Failed: ${batchState.progress.failed}`,
      `- Success rate: ${Math.round((batchState.progress.completed / batchState.progress.total) * 100)}%`,
      ``,
      `Downloaded Files:`,
      `----------------`
    ];

    batchState.results.forEach((result, index) => {
      if (result.success && result.result) {
        reportLines.push(`${index + 1}. ${result.result.fileName} (${result.result.type.toUpperCase()}) - ${result.result.siren}`);
      }
    });

    if (batchState.errors && batchState.errors.length > 0) {
      reportLines.push(``, `Failed Downloads:`, `---------------`);
      batchState.errors.forEach((error, index) => {
        reportLines.push(`${index + 1}. ${error.document?.siren} (${error.document?.type}) - ${error.error}`);
      });
    }

    archive.append(reportLines.join('\n'), { name: 'batch_report.txt' });

    // Finalize the archive
    archive.finalize();
  });
}

// Configure Next.js API route
export const config = {
  api: {
    responseLimit: false, // Disable response limit for large ZIP files
    bodyParser: false,
  },
};