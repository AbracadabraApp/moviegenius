// Debug endpoint to check specific movie slug
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { tmdb_id } = req.query;

  if (!tmdb_id) {
    return res.status(400).json({ error: 'tmdb_id query parameter required' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: movie, error } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdb_id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Movie not found', details: error.message });
    }

    res.status(200).json({
      movie,
      slugLength: movie.slug ? movie.slug.length : 0,
      slugAnalysis: {
        tooLong: movie.slug && movie.slug.length > 75,
        tooShort: movie.slug && movie.slug.length <= 5,
        hasPlot: movie.slug && movie.slug.includes('Plot:'),
        hasOverview: movie.slug && movie.slug.includes('Overview:'),
        hasSynopsis: movie.slug && movie.slug.includes('Synopsis:'),
        isGoodSlug: movie.slug && 
          movie.slug.length <= 75 && 
          movie.slug.length > 5 && 
          !movie.slug.includes('Plot:') && 
          !movie.slug.includes('Overview:') && 
          !movie.slug.includes('Synopsis:')
      }
    });

  } catch (error) {
    console.error('Error checking movie slug:', error);
    res.status(500).json({ error: 'Failed to check movie slug' });
  }
}