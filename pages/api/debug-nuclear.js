/**
 * Debug Nuclear Status API
 * 
 * Helps debug why movies aren't being identified as nuclear
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { tmdbId } = req.query;
  
  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId query parameter required' });
  }

  try {
    // Get the specific movie
    const { data: movie } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, created_at')
      .eq('tmdb_id', parseInt(tmdbId))
      .single();

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Get top 1000 nuclear candidates
    const { data: nuclearCandidates } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, created_at')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    // Find the movie's rank
    const movieRank = nuclearCandidates.findIndex(m => m.tmdb_id === movie.tmdb_id) + 1;
    const isNuclearCandidate = movieRank > 0 && movieRank <= 1000;

    // Check if analysis exists
    const { data: analysis } = await supabase
      .from('movie_analyses')
      .select('claude_response, created_at')
      .eq('movie_id', movie.id)
      .eq('analysis_type', 'page_analysis')
      .single();

    res.status(200).json({
      movie: {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        tmdbId: movie.tmdb_id,
        createdAt: movie.created_at
      },
      nuclear: {
        isCandidate: isNuclearCandidate,
        rank: movieRank || 'Not in top 1000',
        hasAnalysis: !!analysis,
        analysisCreated: analysis?.created_at || null
      },
      debug: {
        totalNuclearCandidates: nuclearCandidates.length,
        firstCandidate: nuclearCandidates[0],
        lastCandidate: nuclearCandidates[nuclearCandidates.length - 1]
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
}