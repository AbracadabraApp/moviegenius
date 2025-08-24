// TEMPORARY SIMPLE VERSION - Copy the working test approach to main API
import { MovieService } from './railway-db.js';

export default async function movieAnalysisHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId } = req.query;
  
  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }

  try {
    // 1. Simple database lookup - no TMDB complexity
    const movie = await MovieService.getMovieByTMDBId(tmdbId);
    
    if (!movie) {
      return res.status(200).json({ 
        success: false,
        error: 'Movie not found' 
      });
    }

    // 2. Try to get actual analysis from database
    const analysisQuery = await MovieService.getMovieAnalysis(movie.id);
    
    console.log(`🔍 Analysis query for ${movie.title}:`, {
      found: !!analysisQuery,
      hasClaudeResponse: !!analysisQuery?.claude_response,
      hasProcessedContent: !!analysisQuery?.claude_response?.processed_content,
      processedContentType: typeof analysisQuery?.claude_response?.processed_content,
      processedContentPreview: analysisQuery?.claude_response?.processed_content?.substring(0, 100)
    });
    
    if (analysisQuery && analysisQuery.claude_response?.processed_content) {
      try {
        // Parse the actual processed content with links
        const processedAnalysis = JSON.parse(analysisQuery.claude_response.processed_content);
        console.log(`✅ Successfully parsed processed content for ${movie.title}`);
        
        return res.status(200).json({
          success: true,
          movie: {
            title: movie.title,
            year: movie.year,
            tmdb_id: movie.tmdb_id
          },
          analysis: processedAnalysis,
          cached: true,
          source: 'database_processed_content'
        });
      } catch (parseError) {
        console.log('Parse error:', parseError.message);
      }
    }

    // 3. Fallback to test content if no processed content
    const testAnalysis = {
      content: [
        {
          type: "plotAndCharacters",
          text: `${movie.title} is a film worth exploring. This simplified API eliminates complexity to test the core data flow.`
        }
      ],
      featuredMovies: [],
      whyWatch: {
        text: "Test content - no processed analysis available."
      },
      moreIdeas: []
    };

    return res.status(200).json({
      success: true,
      movie: {
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id
      },
      analysis: testAnalysis,
      cached: false,
      source: 'fallback_simple'
    });

  } catch (error) {
    console.error('Simple API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database lookup failed',
      details: error.message
    });
  }
}