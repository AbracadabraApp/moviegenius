// API route to serve nuclear static files
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  const { id } = req.query;
  
  try {
    // Validate movie ID format (should be numeric)
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid movie ID format' });
    }
    
    // Construct path to nuclear static file
    const nuclearPath = path.join(process.cwd(), 'nuclear-static', `${id}.json`);
    
    // Check if file exists and is readable
    try {
      await fs.access(nuclearPath, fs.constants.R_OK);
    } catch (accessError) {
      return res.status(404).json({ error: `Nuclear static file not found for movie ${id}` });
    }
    
    // Read and parse the nuclear static file
    const nuclearContent = await fs.readFile(nuclearPath, 'utf8');
    const nuclearData = JSON.parse(nuclearContent);
    
    // Set appropriate caching headers for static content
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800'); // 24h cache, 7d stale
    res.setHeader('Content-Type', 'application/json');
    
    // Return the nuclear static data
    return res.status(200).json(nuclearData);
    
  } catch (error) {
    console.error(`Error serving nuclear static file for ID ${id}:`, error.message);
    return res.status(500).json({ 
      error: 'Internal server error serving nuclear static file',
      movieId: id 
    });
  }
}