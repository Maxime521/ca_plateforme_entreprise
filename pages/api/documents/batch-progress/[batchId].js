// pages/api/documents/batch-progress/[batchId].js - Batch Download Progress API
//==============================================================================

import { batchDownloadManager } from '../batch-download';
import documentAuth from '../../../../lib/auth/document-auth';
import logger from '../../../../lib/logger';

/**
 * Real-time batch download progress tracking API
 * Provides detailed progress information and status updates
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
    // Authorize progress access
    const authResult = await documentAuth.authorizeDocumentAccess(req, 'preview', {
      batchId,
      operation: 'progress_check'
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

    // Prepare progress response
    const progressResponse = {
      batchId: batchState.id,
      status: batchState.status,
      progress: batchState.progress,
      startTime: batchState.startTime,
      endTime: batchState.endTime,
      duration: batchState.duration,
      estimatedTimeRemaining: batchState.progress.estimatedTimeRemaining,
      summary: {
        totalDocuments: batchState.progress.total,
        completed: batchState.progress.completed,
        failed: batchState.progress.failed,
        inProgress: batchState.progress.inProgress,
        successRate: batchState.progress.total > 0 ? 
          `${Math.round((batchState.progress.completed / batchState.progress.total) * 100)}%` : '0%'
      }
    };

    // Add results if batch is completed
    if (batchState.status === 'completed') {
      progressResponse.results = {
        successful: batchState.results?.length || 0,
        failed: batchState.errors?.length || 0,
        downloadUrl: batchState.results?.length > 0 ? 
          `/api/documents/batch-results/${batchId}` : null
      };
    }

    // Add error details if batch failed
    if (batchState.status === 'failed') {
      progressResponse.error = {
        message: batchState.error,
        timestamp: batchState.endTime || Date.now()
      };
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).json(progressResponse);

  } catch (error) {
    logger.error('Batch progress API error', { 
      error, 
      batchId,
      userId: req.user?.id 
    });

    return res.status(500).json({
      error: 'Progress check failed',
      message: 'Unable to retrieve batch progress'
    });
  }
}