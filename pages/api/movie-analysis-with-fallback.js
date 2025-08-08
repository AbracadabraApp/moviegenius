// Railway PostgreSQL movie-analysis API endpoint
// Simplified to use only Railway PostgreSQL (no fallback needed)

import { MovieService } from '../../lib/railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId } = req.query;
  
  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }

  try {
    // Use Railway MovieService to get movie and analysis
    const movie = await MovieService.getMovieByTMDBId(parseInt(tmdbId));
    
    if (!movie) {
      return res.status(404).json({ 
        error: 'Movie not found',
        tmdbId: tmdbId,
        source: 'railway-postgresql'
      });
    }

    // Get analysis for the movie
    const analysis = await MovieService.getLatestAnalysis(movie.id);

    if (!analysis) {
      return res.status(200).json({
        success: true,
        movie: {
          title: movie.title,
          year: movie.year,
          tmdb_id: movie.tmdb_id
        },
        analysis: null,
        message: 'Movie found but no analysis available',
        source: 'railway-postgresql'
      });
    }

    // Extract analysis content
    let analysisContent = '';
    const claudeResponse = analysis.claude_response;
    
    if (typeof claudeResponse === 'string') {
      analysisContent = claudeResponse;
    } else if (claudeResponse && claudeResponse.raw_content) {
      analysisContent = claudeResponse.raw_content;
    } else if (claudeResponse && claudeResponse.content) {
      analysisContent = JSON.stringify(claudeResponse, null, 2);
    }

    return res.status(200).json({
      success: true,
      analysis: analysisContent,
      rawAnalysis: analysisContent,
      movie: {
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id
      },
      cached: true,
      source: 'railway-postgresql'
    });

  } catch (error) {
    console.error('Movie analysis error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      source: 'railway-postgresql',
      tmdbId: tmdbId
    });
  }
}