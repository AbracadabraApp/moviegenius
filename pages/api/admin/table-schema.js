// pages/api/admin/table-schema.js - Show table columns

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

const pool = getPool();

export default async function handler(req, res) {
  try {
    // Get a sample movie to see all columns
    const { data: sampleMovies, error } = await supabase.from('movies').select('*').limit(3);

    if (error) {
      console.error('❌ Error fetching sample movies:', error);
      return res.status(500).json({ error: 'Failed to fetch sample movies', details: error });
    }

    if (!sampleMovies || sampleMovies.length === 0) {
      return res.status(404).json({ error: 'No movies found' });
    }

    const columns = Object.keys(sampleMovies[0]);
    const sampleData = sampleMovies.map(movie => {
      const sample = {};
      columns.forEach(col => {
        const value = movie[col];
        if (typeof value === 'string' && value.length > 100) {
          sample[col] = value.substring(0, 100) + '...';
        } else {
          sample[col] = value;
        }
      });
      return sample;
    });

    const result = {
      totalColumns: columns.length,
      columns,
      sampleData,
    };

    console.log(`📊 Table schema:`, { columns });
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    return res.status(500).json({ error: 'Schema check failed', details: error.message });
  }
}
