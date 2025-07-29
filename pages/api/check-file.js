// Check if a file exists in the production build
import { existsSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const { path } = req.query;
  
  if (!path) {
    return res.status(400).json({ error: 'path parameter required' });
  }

  try {
    const fullPath = join(process.cwd(), path);
    const exists = existsSync(fullPath);
    
    res.status(200).json({
      path: path,
      fullPath: fullPath,
      exists: exists,
      cwd: process.cwd()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      path: path
    });
  }
}