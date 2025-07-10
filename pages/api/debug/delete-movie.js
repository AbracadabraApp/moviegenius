// pages/api/debug/delete-movie.js
// Temporary API endpoint to delete a movie and force regeneration

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdb_id } = req.body;

  if (!tmdb_id) {
    return res.status(400).json({ error: 'tmdb_id required' });
  }

  try {
    console.log(`🗑️ Deleting movie with TMDB ID: ${tmdb_id}`);

    // Delete movie analyses first (foreign key constraint)
    const { data: movie } = await supabase
      .from('movies')
      .select('id')
      .eq('tmdb_id', tmdb_id)
      .single();

    if (movie) {
      const { error: analysisError } = await supabase
        .from('movie_analyses')
        .delete()
        .eq('movie_id', movie.id);

      if (analysisError) {
        console.error('Error deleting analysis:', analysisError);
      } else {
        console.log(`✅ Deleted analysis for movie ID: ${movie.id}`);
      }

      // Delete the movie
      const { error: movieError } = await supabase
        .from('movies')
        .delete()
        .eq('tmdb_id', tmdb_id);

      if (movieError) {
        console.error('Error deleting movie:', movieError);
        return res.status(500).json({ error: movieError.message });
      }

      console.log(`✅ Deleted movie with TMDB ID: ${tmdb_id}`);
      return res.status(200).json({ 
        success: true, 
        message: `Movie ${tmdb_id} deleted successfully` 
      });
    } else {
      return res.status(404).json({ error: 'Movie not found' });
    }

  } catch (error) {
    console.error('Delete movie error:', error);
    return res.status(500).json({ error: error.message });
  }
}