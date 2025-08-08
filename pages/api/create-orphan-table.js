// Simple API to create orphan_movies table structure using Supabase client
import { createClient, supabase } from '../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    const pool = getPool();

    // Try to insert a test record to create the table structure
    const testOrphan = {
      title: 'Test Movie',
      year: 2023,
      reason: 'test',
      source: 'api_test',
      tmdb_search_attempted: false,
      mention_count: 1,
    };

    const { data, error } = await supabase
      .from('orphan_movies')
      .insert(testOrphan)
      .select()
      .single();

    if (error) {
      console.log('Table creation error:', error);
      return res.status(500).json({
        error: 'Could not create orphan_movies table',
        details: error.message,
        note: 'Please create the table manually in Supabase dashboard using the SQL in scripts/create-orphan-movies-table.sql',
      });
    }

    // Clean up test record
    await supabase.from('orphan_movies').delete().eq('id', data.id);

    res.status(200).json({
      success: true,
      message: 'orphan_movies table is ready',
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to setup orphan table',
      details: error.message,
    });
  }
}
