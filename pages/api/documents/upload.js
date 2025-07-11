// pages/api/documents/upload.js - SECURE UPLOAD ENDPOINT - MIGRATED TO SUPABASE
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { createAdminClient } from '../../../lib/supabase';
import { validateSiren, securityHeaders } from '../../../lib/middleware/validation';
import { authLimiter } from '../../../lib/middleware/rateLimit';

// Disable Next.js body parsing to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Security middleware wrapper
const withSecurity = (handler) => {
  return async (req, res) => {
    // Apply security headers
    securityHeaders(req, res, () => {});
    
    // Apply rate limiting
    return new Promise((resolve, reject) => {
      authLimiter(req, res, (rateLimitResult) => {
        if (rateLimitResult instanceof Error) {
          reject(rateLimitResult);
          return;
        }
        handler(req, res).then(resolve).catch(reject);
      });
    });
  };
};

// Allowed file types and validation
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/html',
  'application/json'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit (reduced from 10MB)

async function validateFile(file) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  // Check file extension matches MIME type
  const ext = path.extname(file.originalFilename || '').toLowerCase();
  const validExtensions = {
    'application/pdf': ['.pdf'],
    'text/html': ['.html', '.htm'],
    'application/json': ['.json']
  };

  if (!validExtensions[file.mimetype]?.includes(ext)) {
    throw new Error('File extension does not match content type');
  }

  return true;
}

async function secureHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('📤 Processing secure file upload...');

    // Create uploads directory with secure permissions
    const uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      console.log('📁 Creating uploads directory with secure permissions...');
      await fs.mkdir(uploadsDir, { recursive: true, mode: 0o755 });
    }

    // Parse the form data with security restrictions
    const form = new IncomingForm({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 1, // Only allow single file upload
      allowEmptyFiles: false,
      // Security: Don't allow executable files
      filter: function ({ name, originalFilename, mimetype }) {
        const ext = path.extname(originalFilename || '').toLowerCase();
        const dangerousExts = ['.exe', '.sh', '.bat', '.cmd', '.php', '.jsp', '.asp'];
        return !dangerousExts.includes(ext);
      }
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          reject(err);
        } else {
          resolve([fields, files]);
        }
      });
    });

    console.log('📋 Form data parsed successfully');
    console.log('Fields:', Object.keys(fields));
    console.log('Files:', Object.keys(files));

    // Extract form data (handle arrays from formidable)
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const siren = Array.isArray(fields.siren) ? fields.siren[0] : fields.siren;
    const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;

    if (!file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    // Validate file security
    await validateFile(file);

    if (!siren || !type) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: siren and type are required' 
      });
    }

    // Validate SIREN format
    if (!/^\d{9}$/.test(siren)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SIREN format. Must be 9 digits.'
      });
    }

    // Validate type
    const allowedTypes = ['insee', 'bodacc', 'inpi'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    console.log(`📄 Processing file: ${file.originalFilename || file.newFilename}`);
    console.log(`🏢 SIREN: ${siren}, Type: ${type}`);

    // Generate a safe filename with UUID to prevent conflicts
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const originalName = file.originalFilename || file.newFilename || 'document';
    const extension = path.extname(originalName);
    const uuid = require('crypto').randomUUID();
    const safeFileName = `${type}_${siren}_${timestamp}_${uuid.slice(0, 8)}${extension}`;
    const finalPath = path.join(uploadsDir, safeFileName);

    // Security: Ensure filename doesn't contain path traversal
    if (safeFileName.includes('..') || safeFileName.includes('/') || safeFileName.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename detected'
      });
    }

    // Move file to final location
    try {
      await fs.rename(file.filepath, finalPath);
      console.log(`✅ File moved to: ${finalPath}`);
    } catch (error) {
      console.error('File move error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save file',
        error: error.message
      });
    }

    // Try to find or create company in database
    const supabase = createAdminClient();
    let company;
    try {
      const { data: existingCompany, error: findError } = await supabase
        .from('companies')
        .select('*')
        .eq('siren', siren)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (!existingCompany) {
        console.log(`🏢 Creating new company record for SIREN: ${siren}`);
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            siren,
            denomination: `Entreprise ${siren}`,
            active: true
          })
          .select()
          .single();

        if (createError) throw createError;
        company = newCompany;
      } else {
        company = existingCompany;
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue without database record - just save the file
      console.log('⚠️ Continuing without database record');
      
      return res.status(200).json({
        success: true,
        message: 'File uploaded successfully (no database)',
        document: {
          fileName: safeFileName,
          type: type,
          siren: siren,
          path: `/uploads/${safeFileName}`,
          size: file.size,
          uploadedAt: new Date().toISOString()
        },
        warning: 'Database not available - file saved locally only'
      });
    }

    // Create document record in database
    let document;
    try {
      const { data: newDocument, error: docError } = await supabase
        .from('documents')
        .insert({
          company_id: company.id,
          type_document: `PDF ${type.toUpperCase()}`,
          source: type.toUpperCase(),
          description: description || `Document ${type.toUpperCase()}`,
          lien_document: `/uploads/${safeFileName}`,
          date_publication: new Date().toISOString(),
          reference: `${type}_${siren}_${timestamp}`
        })
        .select()
        .single();

      if (docError) throw docError;
      document = newDocument;
      console.log(`📝 Document record created: ${document.id}`);
    } catch (dbError) {
      console.error('Database document creation error:', dbError);
      // File is saved, just return without DB record
    }

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      document: {
        id: document?.id || 'no-db-record',
        fileName: safeFileName,
        type: type,
        siren: siren,
        path: `/uploads/${safeFileName}`,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        description: description || `Document ${type.toUpperCase()}`
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up any uploaded files on error
    if (file?.filepath) {
      try {
        await fs.unlink(file.filepath);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

// Export with security middleware
export default withSecurity(secureHandler);
