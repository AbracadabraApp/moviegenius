/**
 * TMDB Movie Trailer API
 * 
 * Fetches movie trailers from TMDB videos endpoint
 * Returns the best single trailer (official trailer preferred)
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { tmdbId } = req.query;

  if (!tmdbId) {
    return res.status(400).json({ error: 'TMDB ID is required' });
  }

  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  
  if (!TMDB_API_KEY) {
    console.log('TMDB API key not configured');
    return res.status(200).json({ videoId: null, error: 'TMDB API not configured' });
  }

  try {
    // TMDB videos endpoint
    const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`;

    console.log(`🎬 Fetching trailers for TMDB ID: ${tmdbId}`);

    const response = await fetch(tmdbUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error('TMDB API error:', data);
      return res.status(200).json({ videoId: null, error: 'TMDB API error' });
    }

    if (!data.results || data.results.length === 0) {
      console.log(`No videos found for TMDB ID: ${tmdbId}`);
      return res.status(200).json({ videoId: null, error: 'No trailers found' });
    }

    // Find the best single trailer from results
    const trailer = findBestTrailer(data.results);
    
    if (!trailer) {
      return res.status(200).json({ videoId: null, error: 'No suitable trailer found' });
    }

    console.log(`✅ Found trailer: ${trailer.name} (${trailer.site})`);

    return res.status(200).json({
      videoId: trailer.key,
      title: trailer.name,
      site: trailer.site,
      type: trailer.type,
      official: trailer.official,
      publishedAt: trailer.published_at
    });

  } catch (error) {
    console.error('Error fetching trailer:', error);
    return res.status(500).json({ 
      videoId: null, 
      error: 'Failed to fetch trailer' 
    });
  }
}

/**
 * Find the best single trailer from TMDB videos results
 * Prioritizes official trailers and YouTube over other platforms
 */
function findBestTrailer(videos) {
  if (!videos || videos.length === 0) return null;

  // Filter to only YouTube trailers
  const youtubeTrailers = videos.filter(video => 
    video.site === 'YouTube' && video.type === 'Trailer'
  );

  if (youtubeTrailers.length === 0) {
    // No YouTube trailers, check for other video types
    const youtubeVideos = videos.filter(video => video.site === 'YouTube');
    if (youtubeVideos.length === 0) return null;
    
    // Return first YouTube video if no trailers
    return youtubeVideos[0];
  }

  // Scoring function for TMDB trailer data
  const scoreTrailer = (video) => {
    let score = 0;
    const name = video.name.toLowerCase();

    // Highest priority: Official status
    if (video.official === true) score += 20;
    
    // High priority: Trailer type and specific keywords
    if (video.type === 'Trailer') score += 15;
    if (name.includes('official')) score += 10;
    if (name.includes('main') || name.includes('theatrical')) score += 8;
    
    // Medium priority: Trailer variants
    if (name.includes('final')) score += 5;
    if (name.includes('new')) score += 3;
    
    // Lower priority: Other types
    if (name.includes('teaser')) score += 2;
    
    // Avoid clips and behind-the-scenes
    if (name.includes('clip') || name.includes('scene')) score -= 5;
    if (name.includes('behind') || name.includes('making')) score -= 3;

    return score;
  };

  // Score all YouTube trailers and return the best one
  const scored = youtubeTrailers.map(video => ({
    ...video,
    score: scoreTrailer(video)
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  return scored[0];
}