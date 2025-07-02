/**
 * TMDB Movie Trailer API - Enhanced with Database Caching
 * 
 * 1. Check database cache first for instant response
 * 2. Fall back to TMDB API with enhanced trailer search
 * 3. Cache results in database for future requests
 * 
 * Returns the best single trailer (official trailer preferred)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { tmdbId } = req.query;

  if (!tmdbId) {
    return res.status(400).json({ error: 'TMDB ID is required' });
  }

  try {
    // Step 1: Check database cache first
    const { data: cachedMovie } = await supabase
      .from('movies')
      .select('trailer_url, title, year')
      .eq('tmdb_id', parseInt(tmdbId))
      .single();

    if (cachedMovie?.trailer_url) {
      console.log(`🚀 Cache hit: Found trailer for TMDB ${tmdbId}`);
      return res.status(200).json({
        videoId: cachedMovie.trailer_url,
        title: `${cachedMovie.title} Trailer`,
        site: 'YouTube',
        type: 'Trailer',
        official: true,
        source: 'database_cache'
      });
    }

    // Step 2: No cache hit - fetch from TMDB with enhanced search
    const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    
    if (!TMDB_API_KEY) {
      console.log('TMDB API key not configured');
      return res.status(200).json({ videoId: null, error: 'TMDB API not configured' });
    }

    console.log(`🎬 Cache miss: Fetching trailers from TMDB for ID: ${tmdbId}`);

    const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error('TMDB API error:', data);
      return res.status(200).json({ videoId: null, error: 'TMDB API error' });
    }

    if (!data.results || data.results.length === 0) {
      console.log(`No videos found for TMDB ID: ${tmdbId}`);
      // Cache the "no trailer" result to avoid repeated API calls
      if (cachedMovie) {
        await supabase
          .from('movies')
          .update({ trailer_url: '' }) // Empty string = "no trailer found"
          .eq('tmdb_id', parseInt(tmdbId));
      }
      return res.status(200).json({ videoId: null, error: 'No trailers found' });
    }

    // Step 3: Find the best trailer using enhanced logic
    const trailer = findBestTrailerEnhanced(data.results);
    
    if (!trailer) {
      // Cache the "no suitable trailer" result
      if (cachedMovie) {
        await supabase
          .from('movies')
          .update({ trailer_url: '' })
          .eq('tmdb_id', parseInt(tmdbId));
      }
      return res.status(200).json({ videoId: null, error: 'No suitable trailer found' });
    }

    console.log(`✅ Found trailer: ${trailer.name} (${trailer.site})`);

    // Step 4: Cache the result in database
    if (cachedMovie) {
      await supabase
        .from('movies')
        .update({ trailer_url: trailer.key })
        .eq('tmdb_id', parseInt(tmdbId));
      console.log(`💾 Cached trailer ${trailer.key} for TMDB ${tmdbId}`);
    }

    return res.status(200).json({
      videoId: trailer.key,
      title: trailer.name,
      site: trailer.site,
      type: trailer.type,
      official: trailer.official,
      publishedAt: trailer.published_at,
      source: 'tmdb_fresh'
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
 * Enhanced trailer finder with expanded video type support
 * Maximizes trailer coverage by using multiple fallback strategies
 */
function findBestTrailerEnhanced(videos) {
  if (!videos || videos.length === 0) return null;

  // Filter to YouTube videos only (most reliable platform)
  const youtubeVideos = videos.filter(video => video.site === 'YouTube');
  if (youtubeVideos.length === 0) return null;

  // Strategy 1: Look for official trailers first
  const officialTrailer = findOfficialTrailer(youtubeVideos);
  if (officialTrailer) return officialTrailer;

  // Strategy 2: Look for any trailer type
  const anyTrailer = findAnyTrailer(youtubeVideos);
  if (anyTrailer) return anyTrailer;

  // Strategy 3: Expand to alternative video types
  const alternativeVideo = findAlternativeVideo(youtubeVideos);
  if (alternativeVideo) return alternativeVideo;

  return null;
}

/**
 * Find official trailers with enhanced scoring
 */
function findOfficialTrailer(videos) {
  const trailers = videos.filter(video => video.type === 'Trailer');
  if (trailers.length === 0) return null;

  const scoreTrailer = (video) => {
    let score = 0;
    const name = video.name.toLowerCase();

    // Highest priority: Official status
    if (video.official === true) score += 20;
    
    // High priority keywords
    if (name.includes('official')) score += 15;
    if (name.includes('main') || name.includes('theatrical')) score += 10;
    if (name.includes('final')) score += 8;
    
    // Medium priority
    if (name.includes('new')) score += 5;
    if (name.includes('extended')) score += 3;
    
    // Avoid unwanted content
    if (name.includes('clip') || name.includes('scene')) score -= 10;
    if (name.includes('behind') || name.includes('making')) score -= 8;
    if (name.includes('deleted') || name.includes('blooper')) score -= 15;
    if (name.includes('reaction') || name.includes('review')) score -= 20;

    return score;
  };

  const scored = trailers.map(video => ({
    ...video,
    score: scoreTrailer(video)
  }));

  scored.sort((a, b) => b.score - a.score);
  
  // Return best trailer with positive score
  return scored[0]?.score > 0 ? scored[0] : null;
}

/**
 * Find any trailer when no official ones exist
 */
function findAnyTrailer(videos) {
  const trailers = videos.filter(video => 
    video.type === 'Trailer' || 
    video.name.toLowerCase().includes('trailer')
  );
  
  if (trailers.length === 0) return null;
  
  // Prefer official ones, then by recency
  const official = trailers.find(t => t.official === true);
  if (official) return official;
  
  return trailers[0];
}

/**
 * Find alternative video types when no trailers exist
 * Expands coverage to teasers, TV spots, etc.
 */
function findAlternativeVideo(videos) {
  // Priority order for alternative content
  const typePreference = [
    'Teaser',
    'TV Spot', 
    'Featurette',
    'Clip'
  ];
  
  for (const preferredType of typePreference) {
    const matching = videos.filter(v => v.type === preferredType);
    if (matching.length > 0) {
      // Prefer official content
      const official = matching.find(v => v.official === true);
      if (official) return official;
      
      // Or return the first one
      return matching[0];
    }
  }

  // Last resort: any YouTube video
  return videos[0];
}