import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { createAdminClient } from '../../../lib/supabase';

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
    return res.status(500).json({ 
      success: false,
      message: 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
