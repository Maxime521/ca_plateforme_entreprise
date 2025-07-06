export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { siren, type } = req.query;

  try {
    const reports = await getAvailableReports(siren, type);
    
    return res.status(200).json({
      success: true,
      reports,
      capabilities: {
        bodaccViewer: true,
        inseeAlternative: true,
        documentCart: true,
        pdfConversion: true
      },
      nextSteps: {
        implemented: [
          'Auto-redirect on logout ✅',
          'BODACC report viewer ✅', 
          'INSEE alternative solution ✅',
          'Enhanced document cart ✅',
          'PDF conversion capabilities ✅'
        ],
        ready: [
          'View generated BODACC reports in browser',
          'Test alternative INSEE HTML solution',
          'Integrate with enhanced document cart UI',
          'Add PDF conversion capabilities'
        ]
      }
    });
    
  } catch (error) {
    console.error('Reports list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving reports',
      error: error.message
    });
  }
}

async function getAvailableReports(siren, type) {
  const { promises: fs } = require('fs');
  const path = require('path');
  
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadsDir);
    
    const reports = files
      .filter(file => {
        if (siren && !file.includes(siren)) return false;
        if (type && !file.toLowerCase().includes(type.toLowerCase())) return false;
        return file.match(/\.(html|pdf)$/i);
      })
      .map(file => ({
        filename: file,
        path: `/uploads/${file}`,
        type: file.includes('BODACC') ? 'bodacc' : 
              file.includes('INSEE') ? 'insee' : 
              file.includes('INPI') ? 'inpi' : 'unknown',
        format: file.endsWith('.pdf') ? 'pdf' : 'html',
        siren: extractSirenFromFilename(file),
        created: getFileCreationDate(file)
      }));
    
    return reports;
  } catch (error) {
    console.error('Error reading reports directory:', error);
    return [];
  }
}

function extractSirenFromFilename(filename) {
  const match = filename.match(/(\d{9})/);
  return match ? match[1] : null;
}

function getFileCreationDate(filename) {
  const match = filename.match(/(\d{13})/); // timestamp
  return match ? new Date(parseInt(match[1])).toISOString() : new Date().toISOString();
}
