/**
 * Movie Data Loader - 3-Tier Serving
 *
 * Provides enhanced static → nuclear static → dynamic API fallback
 * while preserving existing API interface for compatibility.
 */

/**
 * Load movie data using 3-tier serving strategy
 * Returns data in the same format as existing API calls
 */
export async function loadMovieData(movieId) {
  // Tier 1: Try enhanced static file
  try {
    const enhancedResponse = await fetch(`/data/enhanced-movies/movie-${movieId}.json`);
    if (enhancedResponse.ok) {
      const enhancedData = await enhancedResponse.json();

      // Convert enhanced format to legacy API format
      return {
        movie: {
          tmdb_id: enhancedData.tmdbId,
          title: enhancedData.title,
          year: enhancedData.year,
          poster_url: enhancedData.movieHeader.posterUrl,
          trailer_url: enhancedData.movieHeader.trailerVideoId
        },
        streaming: enhancedData.movieHeader.streaming,
        analysis: {
          sections: enhancedData.analysis.sections,
          whyWatch: enhancedData.analysis.whyWatch,
          moreIdeas: enhancedData.analysis.moreIdeas,
          featuredMovies: enhancedData.analysis.featuredMovies || []
        },
        contributors: enhancedData.keyElements,
        source: 'enhanced-static',
        loadTime: 'fast'
      };
    }
  } catch (error) {
    console.log('Enhanced static not available, trying nuclear static...');
  }

  // Tier 2: Try nuclear static file (if it exists)
  try {
    const nuclearResponse = await fetch(`/data/movies/movie-${movieId}.json`);
    if (nuclearResponse.ok) {
      const nuclearData = await nuclearResponse.json();
      return {
        ...nuclearData,
        source: 'nuclear-static',
        loadTime: 'medium'
      };
    }
  } catch (error) {
    console.log('Nuclear static not available, falling back to dynamic API...');
  }

  // Tier 3: Fallback to existing dynamic API calls
  const [movieRes, streamingRes, analysisRes] = await Promise.all([
    fetch(`/api/movie-details?tmdbId=${movieId}`),
    fetch(`/api/tmdb-streaming?tmdbId=${movieId}`),
    fetch(`/api/movie-analysis?tmdbId=${movieId}`)
  ]);

  const movie = movieRes.ok ? await movieRes.json() : null;
  const streaming = streamingRes.ok ? await streamingRes.json() : null;
  const analysis = analysisRes.ok ? await analysisRes.json() : null;

  return {
    movie,
    streaming: streaming?.streaming || null,
    analysis,
    source: 'dynamic-api',
    loadTime: 'slow'
  };
}

/**
 * Check if enhanced static file exists (for preflighting)
 */
export async function hasEnhancedStatic(movieId) {
  try {
    const response = await fetch(`/data/enhanced-movies/movie-${movieId}.json`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}