// Simplified Railway version of movie-analysis API endpoint
// This replaces the Supabase database calls with Railway PostgreSQL

import { Client } from 'pg';

// Railway PostgreSQL connection helper
const getRailwayClient = () => {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE CONNECTION ERROR: No database URL found');
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Client({ connectionString: dbUrl });
};

export default async function movieAnalysisHandler(req, res) {
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

      const analysis = analysisResult.rows[0];
      console.log(`✅ RAILWAY API: Found analysis for ${movie.title}`);

      // Extract analysis content (handle both string and object formats)
      let analysisContent = '';
      const claudeResponse = analysis.claude_response;
      
      if (typeof claudeResponse === 'string') {
        analysisContent = claudeResponse;
      } else if (claudeResponse && claudeResponse.raw_content) {
        analysisContent = claudeResponse.raw_content;
      } else if (claudeResponse && claudeResponse.content) {
        // Handle the JSON format we saw in testing
        analysisContent = JSON.stringify(claudeResponse, null, 2);
      }

      // Return successful response - match the format expected by MovieAnalysisWithEntities
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
      
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('❌ RAILWAY API ERROR:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      source: 'railway-postgresql'
    });
  }
}