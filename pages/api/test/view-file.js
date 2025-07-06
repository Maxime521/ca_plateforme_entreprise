import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { file } = req.query;
  
  try {
    const filePath = path.join(process.cwd(), 'uploads', file);
    const content = await fs.readFile(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
    
  } catch (error) {
    res.status(404).send(`
      <html><body>
        <h1>File Not Found</h1>
        <p>Error: ${error.message}</p>
      </body></html>
    `);
  }
}
