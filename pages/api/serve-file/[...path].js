// pages/api/serve-file/[...path].js - File Serving API
import { promises as fs } from 'fs';
import path from 'path';
import { lookup } from 'mime-types';

export default async function handler(req, res) {
  const { path: filePath } = req.query;
  
  if (!filePath || !Array.isArray(filePath)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  try {
    // Construct the full file path
    const fullPath = path.join(process.cwd(), 'uploads', ...filePath);
    
    // Security: Ensure the path is within uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stats = await fs.stat(resolvedPath);
    const fileName = path.basename(resolvedPath);
    
    // Determine MIME type
    const mimeType = lookup(fileName) || 'application/octet-stream';
    
    // Set headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // For HTML files, set proper charset
    if (mimeType === 'text/html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    
    // Read and send file
    const fileBuffer = await fs.readFile(resolvedPath);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Alternative: Static file serving via public directory
// public/uploads/.gitkeep - Create this structure if needed

// QUICK FIX: Simple file viewer API
// pages/api/view-file.js - Direct file viewer
export async function viewFileHandler(req, res) {
  const { file } = req.query;
  
  try {
    const filePath = path.join(process.cwd(), 'uploads', file);
    const content = await fs.readFile(filePath, 'utf8');
    
    // Return HTML content directly
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
    
  } catch (error) {
    res.status(404).send(`
      <html>
        <body>
          <h1>File Not Found</h1>
          <p>The requested file "${file}" could not be found.</p>
          <p>Error: ${error.message}</p>
        </body>
      </html>
    `);
  }
}
