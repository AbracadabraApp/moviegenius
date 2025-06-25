/**
 * YouTube Trailer Search API
 * 
 * Searches YouTube for movie trailers using the YouTube Data API v3
 * Returns the first high-quality official trailer video ID
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { title, year } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Movie title is required' });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!YOUTUBE_API_KEY) {
    console.log('YouTube API key not configured');
    return res.status(200).json({ videoId: null, error: 'YouTube API not configured' });
  }

  try {
    // Construct search query for movie trailer
    const searchQuery = `${title}${year ? ` ${year}` : ''} official trailer`;
    
    // YouTube Data API v3 search endpoint
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoDuration', 'short'); // Prefer shorter videos (trailers)
    searchUrl.searchParams.set('videoDefinition', 'high'); // High quality only
    searchUrl.searchParams.set('maxResults', '5'); // Get top 5 results
    searchUrl.searchParams.set('order', 'relevance'); // Most relevant first
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

    console.log(`🎬 Searching YouTube for: "${searchQuery}"`);

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    if (!response.ok) {
      console.error('YouTube API error:', data);
      return res.status(200).json({ videoId: null, error: 'YouTube API error' });
    }

    if (!data.items || data.items.length === 0) {
      console.log(`No trailers found for: ${searchQuery}`);
      return res.status(200).json({ videoId: null, error: 'No trailers found' });
    }

    // Find the best trailer from results
    const trailer = findBestTrailer(data.items, title);
    
    if (!trailer) {
      return res.status(200).json({ videoId: null, error: 'No suitable trailer found' });
    }

    console.log(`✅ Found trailer: ${trailer.snippet.title}`);

    return res.status(200).json({
      videoId: trailer.id.videoId,
      title: trailer.snippet.title,
      channelTitle: trailer.snippet.channelTitle,
      publishedAt: trailer.snippet.publishedAt
    });

  } catch (error) {
    console.error('Error searching for trailer:', error);
    return res.status(500).json({ 
      videoId: null, 
      error: 'Failed to search for trailer' 
    });
  }
}

/**
 * Find the best trailer from YouTube search results
 * Prioritizes official channels and trailer-specific content
 */
function findBestTrailer(items, movieTitle) {
  if (!items || items.length === 0) return null;

  // Scoring function to rank trailers
  const scoreTrailer = (item) => {
    let score = 0;
    const title = item.snippet.title.toLowerCase();
    const channel = item.snippet.channelTitle.toLowerCase();
    const movieTitleLower = movieTitle.toLowerCase();

    // High priority: Contains "official" or "trailer"
    if (title.includes('official')) score += 10;
    if (title.includes('trailer')) score += 8;
    
    // Medium priority: Channel indicators
    if (channel.includes('official')) score += 5;
    if (channel.includes('studios') || channel.includes('pictures') || channel.includes('entertainment')) score += 3;
    
    // Low priority: Title matching
    if (title.includes(movieTitleLower)) score += 2;
    
    // Negative scoring: Avoid fan content
    if (title.includes('reaction') || title.includes('review') || title.includes('analysis')) score -= 5;
    if (title.includes('fan made') || title.includes('fanmade')) score -= 8;

    return score;
  };

  // Score all trailers and return the best one
  const scored = items.map(item => ({
    ...item,
    score: scoreTrailer(item)
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  return scored[0];
}