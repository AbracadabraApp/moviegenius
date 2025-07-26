// pages/api/movie-details.js - Combined movie details from database and TMDB
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
      error: 'Database configuration missing',
      details: 'Supabase environment variables not configured'
    });
  }

  const TMDB_BEARER_TOKEN = (process.env.TMDB_BEARER_TOKEN || process.env.NEXT_PUBLIC_TMDB_API_KEY)?.replace(/\s+/g, '');

  if (!TMDB_BEARER_TOKEN) {
    return res.status(500).json({
      error: 'TMDB Bearer token not configured'
    });
  }

  try {
    console.log(`🔍 Fetching combined movie details for TMDB ID: ${id}`);

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First, try to get movie from database
    const { data: dbMovie, error: dbError } = await supabase
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .eq('tmdb_id', parseInt(id))
      .single();

    // Fetch from TMDB
    console.log(`🎬 Fetching TMDB data for movie ID: ${id}`);
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?language=en-US`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_BEARER_TOKEN}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!tmdbResponse.ok) {
      let errorText = 'Unknown error';
      try {
        const errorData = await tmdbResponse.json();
        errorText = errorData.status_message || errorData.error || `HTTP ${tmdbResponse.status}`;
      } catch (parseError) {
        errorText = `HTTP ${tmdbResponse.status}: ${tmdbResponse.statusText}`;
      }
      
      return res.status(tmdbResponse.status).json({
        error: `TMDB API Error: ${errorText}`,
        movie_id: id,
        status_code: tmdbResponse.status,
      });
    }

    const tmdbData = await tmdbResponse.json();

    // Combine data - TMDB as primary source, database for additional info
    const combinedData = {
      // TMDB data
      id: tmdbData.id,
      title: tmdbData.title,
      overview: tmdbData.overview,
      release_date: tmdbData.release_date,
      poster_path: tmdbData.poster_path,
      
      // Database data (if available)
      streaming_data: dbMovie?.streaming_data || null,
      database_id: dbMovie?.id || null,
      in_database: !dbError && !!dbMovie,
    };

    console.log(`✅ Combined movie data: ${combinedData.title} (${combinedData.release_date?.substring(0, 4)}) - Streaming: ${combinedData.streaming_data || 'Not tracked'}`);

    return res.status(200).json(combinedData);
  } catch (error) {
    console.error('❌ Movie details fetch failed:', error);

    return res.status(500).json({
      error: `Error fetching movie details: ${error.message}`,
      movie_id: id,
      timestamp: new Date().toISOString(),
    });
  }
}