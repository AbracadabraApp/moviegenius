// TEST ENDPOINT: Railway PostgreSQL movie-analysis API with new content serving logic
// This tests the 3-tier content serving approach before applying to production

import { Client } from 'pg';
import { logger, dbLogger, apiLogger, railwayLogger } from '../../lib/observability/logger.js';

// Helper function to clean ** patterns for readable text
function cleanMovieTitlePatterns(content) {
  if (!content || typeof content !== 'string') return content;
  
  // Pattern 1: **Movie Title** (Year) → Movie Title (Year)
  content = content.replace(/\*\*([^*]+)\*\*\s*\((\d{4})\)/g, '$1 ($2)');
  
  // Pattern 2: **Movie Title** → Movie Title  
  content = content.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  return content;
}

// Railway PostgreSQL connection helper
const getRailwayClient = () => {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    if (process.env.NODE_ENV === 'production') {
      railwayLogger.error('Database connection failed - no URL configured');
      throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set in environment variables');
    } else {
      railwayLogger.warn('Database URL not found during build');
      return null;
    }
  }
  
  return new Client({ connectionString: dbUrl });
};

export default async function movieAnalysisTestHandler(req, res) {
  const startTime = Date.now();
  
  apiLogger.apiRequest('GET', '/api/movie-analysis-test', req.query);
  
  if (req.method !== 'GET') {
    apiLogger.apiResponse('GET', '/api/movie-analysis-test', 405, Date.now() - startTime);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId } = req.query;
  
  if (!tmdbId) {
    apiLogger.apiResponse('GET', '/api/movie-analysis-test', 400, Date.now() - startTime);
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }

  let client = null;
  try {
    client = getRailwayClient();
    
    if (!client) {
      apiLogger.apiResponse('GET', '/api/movie-analysis-test', 500, Date.now() - startTime);
      return res.status(500).json({
        error: 'Database connection not available',
        message: 'DATABASE_URL not configured'
      });
    }
    
    await client.connect();
    
    // Look up movie by TMDB ID
    const movieQuery = 'SELECT * FROM movies WHERE tmdb_id = $1';
    const movieResult = await client.query(movieQuery, [parseInt(tmdbId)]);
    
    if (movieResult.rows.length === 0) {
      apiLogger.apiResponse('GET', '/api/movie-analysis-test', 404, Date.now() - startTime);
      return res.status(404).json({ 
        error: 'Movie not found',
        tmdbId: parseInt(tmdbId)
      });
    }

    const movie = movieResult.rows[0];

    // Get existing analysis
    const analysisQuery = 'SELECT * FROM movie_analyses WHERE movie_id = $1 ORDER BY created_at DESC LIMIT 1';
    const analysisResult = await client.query(analysisQuery, [movie.id]);
    
    if (analysisResult.rows.length === 0) {
      apiLogger.apiResponse('GET', '/api/movie-analysis-test', 404, Date.now() - startTime);
      return res.status(404).json({
        error: 'No analysis found for this movie',
        movie: {
          title: movie.title,
          year: movie.year,
          tmdb_id: movie.tmdb_id
        }
      });
    }

    const analysis = analysisResult.rows[0];
    
    // NEW 3-TIER CONTENT SERVING LOGIC
    let analysisContent = '';
    let contentTier = 'unknown';
    let contentInfo = {};
    const claudeResponse = analysis.claude_response;
    
    if (typeof claudeResponse === 'string') {
      // Tier 2: String format - clean ** patterns
      analysisContent = cleanMovieTitlePatterns(claudeResponse);
      contentTier = 'string_cleaned';
      contentInfo = {
        originalLength: claudeResponse.length,
        cleanedLength: analysisContent.length,
        hadBoldPatterns: claudeResponse.includes('**')
      };
    } else if (claudeResponse && claudeResponse.processed_content && claudeResponse.processed_content.trim()) {
      // Tier 1: Processed content (HTML movie links) - BEST
      analysisContent = claudeResponse.processed_content;
      contentTier = 'processed_html';
      contentInfo = {
        contentLength: analysisContent.length,
        hasMovieLinks: analysisContent.includes('<a href="/movie/'),
        movieLinkCount: (analysisContent.match(/<a href="\/movie\//g) || []).length,
        hasMovieTitleClass: analysisContent.includes('class="movie-title"')
      };
    } else if (claudeResponse && claudeResponse.raw_content) {
      // Tier 2: Raw content - clean ** patterns  
      analysisContent = cleanMovieTitlePatterns(claudeResponse.raw_content);
      contentTier = 'raw_cleaned';
      contentInfo = {
        originalLength: claudeResponse.raw_content.length,
        cleanedLength: analysisContent.length,
        hadBoldPatterns: claudeResponse.raw_content.includes('**'),
        boldPatternsRemoved: (claudeResponse.raw_content.match(/\*\*[^*]+\*\*/g) || []).length
      };
    } else {
      // Tier 3: Fallback message
      analysisContent = 'Analysis content unavailable for this movie.';
      contentTier = 'fallback_message';
      contentInfo = {
        claudeResponseKeys: claudeResponse ? Object.keys(claudeResponse) : [],
        claudeResponseType: typeof claudeResponse
      };
    }

    // Return test response with detailed information
    const response = {
      success: true,
      // Main content (what user sees)
      analysis: analysisContent,
      rawAnalysis: analysisContent,
      movie: {
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id
      },
      // Test information
      test_info: {
        contentTier,
        contentInfo,
        databaseFlags: {
          has_links: analysis.has_links,
          link_count: analysis.link_count
        },
        claudeResponseStructure: {
          type: typeof claudeResponse,
          keys: claudeResponse && typeof claudeResponse === 'object' ? Object.keys(claudeResponse) : null,
          hasProcessedContent: !!(claudeResponse?.processed_content),
          hasRawContent: !!(claudeResponse?.raw_content),
          processedContentLength: claudeResponse?.processed_content?.length || 0,
          rawContentLength: claudeResponse?.raw_content?.length || 0
        }
      },
      cached: true,
      source: 'railway-postgresql-test',
      endpoint: 'movie-analysis-test'
    };
    
    apiLogger.apiResponse('GET', '/api/movie-analysis-test', 200, Date.now() - startTime);
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Test API Error:', error);
    
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Failed to close database connection:', closeError);
      }
    }
    
    apiLogger.apiResponse('GET', '/api/movie-analysis-test', 500, Date.now() - startTime);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      source: 'railway-postgresql-test',
      tmdbId: tmdbId
    });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Failed to close database connection:', closeError);
      }
    }
  }
}