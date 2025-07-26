// pages/api/movie-streaming.js - Database-only streaming info
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Movie ID is required' });
  }

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'Database configuration missing'
    });
  }

  try {
    console.log(`📺 Fetching streaming data for TMDB ID: ${id}`);

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get movie from database - only what we need for streaming display
    const { data: movie, error } = await supabase
      .from('movies')
      .select('tmdb_id, title, year, streaming_data')
      .eq('tmdb_id', parseInt(id))
      .single();

    if (error || !movie) {
      console.log(`❌ Movie not found in database for TMDB ID: ${id}`);
      return res.status(404).json({
        error: 'Movie not found in database',
        tmdb_id: id,
        streaming_data: null
      });
    }

    const result = {
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      streaming_data: movie.streaming_data
    };

    console.log(`✅ Streaming data: ${movie.title} (${movie.year}) - ${movie.streaming_data || 'Not tracked'}`);

    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Streaming data fetch failed:', error);

    return res.status(500).json({
      error: `Database error: ${error.message}`,
      tmdb_id: id,
      timestamp: new Date().toISOString(),
    });
  }
}