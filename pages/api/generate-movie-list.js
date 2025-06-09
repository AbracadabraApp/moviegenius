// pages/api/generate-movie-list.js

import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'afi100.json');
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const movies = JSON.parse(fileContents);
    res.status(200).json({ movies });
  } catch (error) {
    console.error('❌ Failed to load afi100.json:', error);
    res.status(500).json({ error: 'Failed to load movie list.' });
  }
}
