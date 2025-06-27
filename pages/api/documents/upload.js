// pages/api/documents/upload.js - WORKING UPLOAD ENDPOINT
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '../../../lib/prisma';

// Disable Next.js body parsing to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('📤 Processing file upload...');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      console.log('📁 Creating uploads directory...');
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Parse the form data
    const form = new IncomingForm({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
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

    if (!siren || !type) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: siren and type are required' 
      });
    }

    console.log(`📄 Processing file: ${file.originalFilename || file.newFilename}`);
    console.log(`🏢 SIREN: ${siren}, Type: ${type}`);

    // Generate a safe filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const originalName = file.originalFilename || file.newFilename || 'document';
    const extension = path.extname(originalName);
    const safeFileName = `${type}_${siren}_${timestamp}${extension}`;
    const finalPath = path.join(uploadsDir, safeFileName);

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
    let company;
    try {
      company = await prisma.company.findUnique({
        where: { siren }
      });

      if (!company) {
        console.log(`🏢 Creating new company record for SIREN: ${siren}`);
        company = await prisma.company.create({
          data: {
            siren,
            denomination: `Entreprise ${siren}`,
            active: true
          }
        });
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
      document = await prisma.document.create({
        data: {
          companyId: company.id,
          typeDocument: `PDF ${type.toUpperCase()}`,
          source: type.toUpperCase(),
          description: description || `Document ${type.toUpperCase()}`,
          lienDocument: `/uploads/${safeFileName}`,
          datePublication: new Date(),
          reference: `${type}_${siren}_${timestamp}`
        }
      });
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
    return res.status(500).json({ 
      success: false,
      message: 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
