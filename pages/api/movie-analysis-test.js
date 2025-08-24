// MINIMAL TEST API - just database lookup and HTML return
import { MovieService } from './railway-db.js';

export default async function movieAnalysisTestHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId } = req.query;
  
  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }

  try {
    // 1. Basic database lookup - NO TMDB complexity
    const movie = await MovieService.getMovieByTMDBId(tmdbId);
    
    if (!movie) {
      return res.status(200).json({ 
        success: true,
        test: true,
        movie: {
          title: "Test Movie",
          year: 2023,
          tmdb_id: parseInt(tmdbId)
        },
        analysis: null,
        message: "Movie not in database - skipping TMDB lookup for simplicity"
      });
    }

    // 2. Test HTML return with simple hardcoded links
    const testAnalysis = {
      content: [
        {
          type: "plotAndCharacters",
          text: `${movie.title} is a film that connects to <a href="/movie/11" class="movie-title">Star Wars</a> and features <a href="/person/2963" class="person-name">Nicolas Cage</a> in a memorable role.`
        }
      ],
      featuredMovies: [],
      whyWatch: {
        text: "This movie showcases influences from <a href=\"/movie/238\" class=\"movie-title\">The Godfather</a> and <a href=\"/movie/389\" class=\"movie-title\">12 Monkeys</a>."
      },
      moreIdeas: [
        {
          text: "If you enjoyed this, watch <a href=\"/movie/550\" class=\"movie-title\">Fight Club</a> for similar themes."
        }
      ]
    };

    return res.status(200).json({
      success: true,
      test: true,
      movie: {
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id
      },
      analysis: testAnalysis,
      message: "TEST API - Contains hardcoded HTML links to verify rendering"
    });

  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database lookup failed',
      details: error.message
    });
  }
}