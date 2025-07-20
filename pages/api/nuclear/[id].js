// pages/api/nuclear/[id].js - Nuclear static data API
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Path to nuclear static file
    const nuclearPath = path.join(process.cwd(), 'nuclear-static', `${id}.json`);

    // Check if nuclear static file exists
    if (!fs.existsSync(nuclearPath)) {
      return res.status(404).json({ error: 'Nuclear static data not found' });
    }

    // Read and serve nuclear static data
    const staticData = fs.readFileSync(nuclearPath, 'utf8');
    const data = JSON.parse(staticData);

    // Set aggressive caching headers for nuclear data
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache
    res.setHeader('X-Nuclear-Cache', 'HIT');

    return res.status(200).json(data.props);
  } catch (error) {
    console.error('Nuclear API error:', error);
    return res.status(500).json({ error: 'Failed to load nuclear data' });
  }
}
