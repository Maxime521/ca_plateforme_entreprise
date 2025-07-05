// pages/api/documents/secure-serve/[...path].js - Secure Document Serving API
//==============================================================================

import { promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import documentAuth from '../../../../lib/auth/document-auth';
import logger from '../../../../lib/logger';

/**
 * Enhanced secure document serving with access control, streaming, and audit logging
 * Replaces the basic file serving with enterprise-grade security
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const startTime = Date.now();
  const { path: requestPath } = req.query;
  
  if (!requestPath || !Array.isArray(requestPath)) {
    return res.status(400).json({ 
      error: 'Invalid path',
      message: 'File path is required' 
    });
  }

  const filePath = requestPath.join('/');
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  try {
    // 1. Parse and validate the file path
    const fileInfo = await parseAndValidateFilePath(filePath);
    if (!fileInfo.valid) {
      logger.warn('Invalid file path access attempt', {
        filePath,
        clientIP,
        userAgent: req.headers['user-agent'],
        reason: fileInfo.reason
      });
      
      return res.status(400).json({
        error: 'Invalid file path',
        message: fileInfo.reason
      });
    }

    // 2. Authorize document access
    const authResult = await documentAuth.authorizeDocumentAccess(req, 'download', {
      filePath,
      fileType: fileInfo.type,
      companyId: fileInfo.companyId,
      documentId: fileInfo.documentId
    });

    if (!authResult.success) {
      return res.status(authResult.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 403).json({
        error: authResult.code,
        message: authResult.message,
        retryAfter: authResult.retryAfter
      });
    }

    // 3. Check if file exists and is accessible
    const absolutePath = path.resolve(process.cwd(), filePath);
    const fileStats = await validateFileAccess(absolutePath);
    
    if (!fileStats.accessible) {
      logger.warn('File access denied', {
        filePath: absolutePath,
        clientIP,
        userId: authResult.user.id,
        reason: fileStats.reason
      });
      
      return res.status(404).json({
        error: 'File not found',
        message: 'Requested file does not exist or is not accessible'
      });
    }

    // 4. Set security headers
    setSecurityHeaders(res, fileInfo);

    // 5. Handle range requests for streaming
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      return await handleRangeRequest(req, res, absolutePath, fileStats, rangeHeader);
    }

    // 6. Stream the file with monitoring
    await streamFileWithMonitoring(req, res, absolutePath, fileStats, authResult.user);

    // 7. Log successful download
    await logDownloadSuccess(authResult.user.id, fileInfo, fileStats, Date.now() - startTime);

  } catch (error) {
    logger.error('Secure file serving error', {
      error,
      filePath,
      clientIP,
      userAgent: req.headers['user-agent'],
      duration: Date.now() - startTime
    });

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'File serving failed',
        message: 'Internal server error'
      });
    }
  }
}

/**
 * Parse and validate file path
 * @param {string} filePath - Requested file path
 * @returns {Object} Validation result
 */
async function parseAndValidateFilePath(filePath) {
  try {
    // Security checks
    if (filePath.includes('..') || filePath.includes('~')) {
      return {
        valid: false,
        reason: 'Path traversal attempt detected'
      };
    }

    // Only allow specific directories
    const allowedDirectories = ['uploads', 'documents', 'reports'];
    const pathParts = filePath.split('/');
    const rootDir = pathParts[0];

    if (!allowedDirectories.includes(rootDir)) {
      return {
        valid: false,
        reason: 'Access to directory not allowed'
      };
    }

    // Extract file information
    const fileName = pathParts[pathParts.length - 1];
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Only allow specific file types
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.json', '.xml'];
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        reason: 'File type not allowed'
      };
    }

    // Extract metadata from filename if available
    const companyId = extractCompanyIdFromPath(filePath);
    const documentId = extractDocumentIdFromPath(filePath);

    return {
      valid: true,
      type: fileExtension,
      fileName,
      companyId,
      documentId,
      rootDir
    };

  } catch (error) {
    return {
      valid: false,
      reason: 'Path validation failed'
    };
  }
}

/**
 * Validate file access
 * @param {string} absolutePath - Absolute file path
 * @returns {Object} Access validation result
 */
async function validateFileAccess(absolutePath) {
  try {
    // Check if file exists
    const stats = await fs.stat(absolutePath);
    
    if (!stats.isFile()) {
      return {
        accessible: false,
        reason: 'Path is not a file'
      };
    }

    // Check file size (prevent serving huge files without streaming)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (stats.size > maxSize) {
      return {
        accessible: false,
        reason: 'File too large for direct serving'
      };
    }

    // Check file permissions
    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch (error) {
      return {
        accessible: false,
        reason: 'File not readable'
      };
    }

    return {
      accessible: true,
      stats,
      size: stats.size,
      lastModified: stats.mtime
    };

  } catch (error) {
    return {
      accessible: false,
      reason: 'File access check failed'
    };
  }
}

/**
 * Set security headers for file serving
 * @param {Object} res - Response object
 * @param {Object} fileInfo - File information
 */
function setSecurityHeaders(res, fileInfo) {
  // Content type based on file extension
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml'
  };

  const contentType = contentTypes[fileInfo.type] || 'application/octet-stream';
  
  // Security headers
  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Content disposition for downloads
  res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
}

/**
 * Handle range requests for streaming
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} absolutePath - File path
 * @param {Object} fileStats - File statistics
 * @param {string} rangeHeader - Range header value
 */
async function handleRangeRequest(req, res, absolutePath, fileStats, rangeHeader) {
  const fileSize = fileStats.size;
  const range = parseRangeHeader(rangeHeader, fileSize);
  
  if (!range) {
    res.setHeader('Content-Range', `bytes */${fileSize}`);
    return res.status(416).json({ error: 'Range not satisfiable' });
  }

  const { start, end } = range;
  const contentLength = end - start + 1;
  
  // Set range headers
  res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Length', contentLength);
  res.status(206);

  // Stream the requested range
  const stream = createReadStream(absolutePath, { start, end });
  await pipeline(stream, res);
}

/**
 * Stream file with monitoring
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} absolutePath - File path
 * @param {Object} fileStats - File statistics
 * @param {Object} user - User object
 */
async function streamFileWithMonitoring(req, res, absolutePath, fileStats, user) {
  const fileSize = fileStats.size;
  let bytesTransferred = 0;
  const startTime = Date.now();

  // Set content length
  res.setHeader('Content-Length', fileSize);

  // Create read stream with monitoring
  const stream = createReadStream(absolutePath);
  
  // Monitor transfer progress
  stream.on('data', (chunk) => {
    bytesTransferred += chunk.length;
    
    // Log progress for large files
    if (fileSize > 10 * 1024 * 1024) { // Files > 10MB
      const progress = (bytesTransferred / fileSize) * 100;
      if (progress % 25 === 0) { // Log every 25%
        logger.info('File transfer progress', {
          userId: user.id,
          filePath: absolutePath,
          progress: `${Math.round(progress)}%`,
          bytesTransferred,
          fileSize
        });
      }
    }
  });

  // Handle stream errors
  stream.on('error', (error) => {
    logger.error('File stream error', {
      error,
      userId: user.id,
      filePath: absolutePath,
      bytesTransferred,
      fileSize
    });
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'File streaming failed' });
    }
  });

  // Stream the file
  await pipeline(stream, res);
  
  // Log completion
  const duration = Date.now() - startTime;
  logger.info('File transfer completed', {
    userId: user.id,
    filePath: absolutePath,
    bytesTransferred,
    fileSize,
    duration: `${duration}ms`,
    transferRate: `${Math.round(bytesTransferred / (duration / 1000))} bytes/sec`
  });
}

/**
 * Parse range header
 * @param {string} rangeHeader - Range header value
 * @param {number} fileSize - File size
 * @returns {Object|null} Range object or null
 */
function parseRangeHeader(rangeHeader, fileSize) {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) return null;

  const start = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : fileSize - 1;

  if (start >= fileSize || end >= fileSize || start > end) {
    return null;
  }

  return { start, end };
}

/**
 * Extract company ID from file path
 * @param {string} filePath - File path
 * @returns {string|null} Company ID or null
 */
function extractCompanyIdFromPath(filePath) {
  const match = filePath.match(/company[_-](\d+)/i);
  return match ? match[1] : null;
}

/**
 * Extract document ID from file path
 * @param {string} filePath - File path
 * @returns {string|null} Document ID or null
 */
function extractDocumentIdFromPath(filePath) {
  const match = filePath.match(/doc[_-](\d+)/i);
  return match ? match[1] : null;
}

/**
 * Log successful download
 * @param {string} userId - User ID
 * @param {Object} fileInfo - File information
 * @param {Object} fileStats - File statistics
 * @param {number} duration - Download duration
 */
async function logDownloadSuccess(userId, fileInfo, fileStats, duration) {
  try {
    await documentAuth.logAuditEvent('DOCUMENT_DOWNLOADED', {
      userId,
      fileName: fileInfo.fileName,
      fileType: fileInfo.type,
      fileSize: fileStats.size,
      companyId: fileInfo.companyId,
      documentId: fileInfo.documentId,
      duration,
      downloadedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Download logging failed', { error, userId, fileInfo });
  }
}

// Configure Next.js API route options
export const config = {
  api: {
    responseLimit: false, // Disable response size limit for file streaming
    bodyParser: false,    // Disable body parsing for streaming
  },
};