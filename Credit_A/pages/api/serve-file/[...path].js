// pages/api/serve-file/[...path].js - SECURE File Serving API
import { promises as fs } from 'fs';
import path from 'path';
import { lookup } from 'mime-types';
import { securityHeaders } from '../../../lib/middleware/validation';
import { apiLimiter } from '../../../lib/middleware/rateLimit';

// Security middleware wrapper
const withSecurity = (handler) => {
  return async (req, res) => {
    // Apply security headers
    securityHeaders(req, res, () => {});
    
    // Apply rate limiting
    return new Promise((resolve, reject) => {
      apiLimiter(req, res, (rateLimitResult) => {
        if (rateLimitResult instanceof Error) {
          reject(rateLimitResult);
          return;
        }
        handler(req, res).then(resolve).catch(reject);
      });
    });
  };
};

// Secure path validation function
function validateAndSanitizePath(filePath) {
  if (!filePath || !Array.isArray(filePath)) {
    throw new Error('Invalid file path format');
  }

  // Sanitize each path segment
  const sanitizedSegments = filePath.map(segment => {
    // Remove any potentially dangerous characters
    const cleaned = segment.replace(/[^a-zA-Z0-9._-]/g, '');
    
    // Check for path traversal attempts
    if (segment.includes('..') || segment.includes('/') || segment.includes('\\')) {
      throw new Error('Path traversal attempt detected');
    }
    
    // Check for hidden files
    if (segment.startsWith('.')) {
      throw new Error('Access to hidden files denied');
    }
    
    return cleaned;
  });

  // Additional validation: no empty segments
  if (sanitizedSegments.some(segment => !segment)) {
    throw new Error('Invalid path segments');
  }

  return sanitizedSegments;
}

async function secureHandler(req, res) {
  const { path: filePath } = req.query;
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate and sanitize the file path
    const sanitizedPath = validateAndSanitizePath(filePath);
    
    // Construct the full file path
    const fullPath = path.join(process.cwd(), 'uploads', ...sanitizedPath);
    
    // Security: Triple-check path is within uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedPath.startsWith(resolvedUploadsDir + path.sep)) {
      console.warn(`Path traversal attempt: ${filePath.join('/')}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats and validate file size
    const stats = await fs.stat(resolvedPath);
    const fileName = path.basename(resolvedPath);
    
    // Security: Prevent serving of very large files (DoS protection)
    const maxFileSize = 50 * 1024 * 1024; // 50MB limit
    if (stats.size > maxFileSize) {
      return res.status(413).json({ error: 'File too large' });
    }
    
    // Determine MIME type
    const mimeType = lookup(fileName) || 'application/octet-stream';
    
    // Security: Only serve allowed file types
    const allowedMimeTypes = [
      'application/pdf',
      'text/html',
      'application/json',
      'text/plain'
    ];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(403).json({ error: 'File type not allowed' });
    }
    
    // Set secure headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Reduced cache time
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline'); // Force inline display
    
    // Allow iframe embedding for document previews (only from same origin)
    if (mimeType === 'application/pdf') {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Allow same-origin framing for PDF previews
    } else {
      res.setHeader('X-Frame-Options', 'DENY'); // Prevent framing for other file types
    }
    
    // For HTML files, set CSP to prevent XSS
    if (mimeType === 'text/html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    }
    
    // Read and send file
    const fileBuffer = await fs.readFile(resolvedPath);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('File serving error:', error.message);
    
    // Don't leak internal error details
    if (error.message.includes('Path traversal') || error.message.includes('Access denied')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with security middleware
export default withSecurity(secureHandler);
