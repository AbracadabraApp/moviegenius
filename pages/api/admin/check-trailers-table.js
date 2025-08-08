// pages/api/admin/check-trailers-table.js - Check if trailers table exists

import { createClient, supabase } from '../../../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../../lib/railway-db.js';

const pool = getPool();

export default async function handler(req, res) {
  try {
    console.log('🔍 Checking for trailers table...');

    // Try to query trailers table
    const { data: trailersData, error: trailersError } = await supabase
      .from('trailers')
      .select('*')
      .limit(5);

    if (trailersError) {
      if (trailersError.message.includes('does not exist')) {
        return res.status(200).json({
          trailersTableExists: false,
          error: 'trailers table does not exist',
          note: 'Trailers are stored in movies.trailer_url column instead',
        });
      }

      return res.status(500).json({ error: 'Database error', details: trailersError });
    }

    // Count trailers if table exists
    const { count: trailersCount, error: countError } = await supabase
      .from('trailers')
      .select('*', { count: 'exact', head: true });

    const result = {
      trailersTableExists: true,
      totalTrailers: trailersCount || 0,
      sampleData: trailersData,
      countError: countError?.message || null,
    };

    console.log('📊 Trailers table check:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Table check failed:', error);
    return res.status(500).json({ error: 'Table check failed', details: error.message });
  }
}
