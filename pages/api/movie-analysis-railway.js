// Railway PostgreSQL version of movie-analysis API endpoint
// This is a focused version to test the Railway connection fix

import { Client } from 'pg';

// Railway PostgreSQL connection helper
const getRailwayClient = () => {
  return new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL
  });
};

export default async function movieAnalysisRailwayHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId } = req.query;
  
  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }

  try {
    console.log(`🔍 RAILWAY API: Looking up movie with tmdbId=${tmdbId}`);
    
    const client = getRailwayClient();
    await client.connect();
    
    try {
      // Look up movie by TMDB ID
      const movieQuery = 'SELECT * FROM movies WHERE tmdb_id = $1';
      const movieResult = await client.query(movieQuery, [parseInt(tmdbId)]);
      
      if (movieResult.rows.length === 0) {
        console.log(`❌ RAILWAY API: Movie not found for tmdbId=${tmdbId}`);
        return res.status(404).json({ 
          error: 'Movie not found',
          tmdbId: tmdbId,
          source: 'railway-postgresql'
        });
      }

      const movie = movieResult.rows[0];
      console.log(`✅ RAILWAY API: Found movie - ${movie.title} (${movie.year})`);

      // Get existing analysis
      const analysisQuery = 'SELECT * FROM movie_analyses WHERE movie_id = $1 ORDER BY created_at DESC LIMIT 1';
      const analysisResult = await client.query(analysisQuery, [movie.id]);
      
      if (analysisResult.rows.length === 0) {
        console.log(`⚠️  RAILWAY API: No analysis found for ${movie.title}`);
        return res.status(200).json({
          success: true,
          movie: {
            title: movie.title,
            year: movie.year,
            tmdb_id: movie.tmdb_id,
            id: movie.id
          },
          analysis: null,
          message: 'Movie found but no analysis available',
          source: 'railway-postgresql'
        });
      }

      const analysis = analysisResult.rows[0];
      console.log(`✅ RAILWAY API: Found analysis for ${movie.title} - type: ${analysis.analysis_type}`);

      // Return successful response with analysis
      return res.status(200).json({
        success: true,
        movie: {
          title: movie.title,
          year: movie.year,
          tmdb_id: movie.tmdb_id,
          id: movie.id
        },
        analysis: {
          type: analysis.analysis_type,
          content: analysis.claude_response,
          query: analysis.query_text,
          created_at: analysis.created_at,
          people_extracted: analysis.people_extracted,
          has_links: analysis.has_links
        },
        source: 'railway-postgresql',
        timestamp: new Date().toISOString()
      });
      
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('❌ RAILWAY API ERROR:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      source: 'railway-postgresql',
      tmdbId: tmdbId
    });
  }
}