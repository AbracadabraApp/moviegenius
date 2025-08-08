// API endpoint for aggressive cache warming of all movie content
// Designed for 8k movie collection - pre-populates all caches for instant UX

import getCache from '../../lib/cache.js';
import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

const pool = getPool();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security check - only allow in development or with admin token
  const adminToken = req.headers.authorization?.replace('Bearer ', '');
  const isAuthorized =
    process.env.NODE_ENV === 'development' || adminToken === process.env.CACHE_WARMING_TOKEN;

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type, batchSize = 10, offset = 0 } = req.body;
  const cache = getCache();

  try {
    switch (type) {
      case 'all-movies':
        return await warmAllMovies(res, cache, batchSize, offset);
      case 'posters':
        return await warmAllPosters(res, cache, batchSize, offset);
      case 'analyses':
        return await warmAllAnalyses(res, cache, batchSize, offset);
      case 'popular':
        return await warmPopularContent(res, cache);
      case 'series':
        return await warmSeriesContent(res, cache);
      case 'status':
        return await getCacheStatus(res, cache);
      default:
        return res.status(400).json({ error: 'Invalid warming type' });
    }
  } catch (error) {
    console.error('Cache warming error:', error);
    return res.status(500).json({
      error: 'Cache warming failed',
      details: error.message,
    });
  }
}

// Warm basic movie data for all 8k movies
async function warmAllMovies(res, cache, batchSize, offset) {
  const startTime = Date.now();

  // Get movies from database in batches
  const { data: movies, error } = await supabase
    .from('movies')
    .select('tmdb_id, title, year, poster_url, slug')
    .range(offset, offset + batchSize - 1)
    .order('tmdb_id');

  if (error) throw error;

  const warmedMovies = [];

  for (const movie of movies) {
    try {
      // Warm basic movie lookup cache
      const movieCacheKey = cache.redis.generateKey('movie_lookup', movie.tmdb_id);
      const exists = await cache.redis.get(movieCacheKey);

      if (!exists) {
        await cache.redis.set(movieCacheKey, movie, cache.redis.TTL.TMDB_DATA);
        warmedMovies.push(movie.tmdb_id);
      }
    } catch (error) {
      console.error(`Failed to warm movie ${movie.tmdb_id}:`, error);
    }
  }

  const duration = Date.now() - startTime;

  return res.json({
    success: true,
    type: 'all-movies',
    batch: {
      offset,
      size: batchSize,
      processed: movies.length,
      warmed: warmedMovies.length,
    },
    duration: `${duration}ms`,
    warmedIds: warmedMovies,
  });
}

// ZERO-WASTE: Warm posters only for movies WITHOUT good posters
async function warmAllPosters(res, cache, batchSize, offset) {
  const startTime = Date.now();

  // CRITICAL FIX: Only fetch movies that actually need poster warming
  // Old logic: .not('poster_url', 'is', null) was fetching movies WITH posters!
  const { data: movies, error } = await supabase
    .from('movies')
    .select('tmdb_id, poster_url')
    .or('poster_url.is.null,poster_url.eq./images/placeholder-poster.jpg')
    .range(offset, offset + batchSize - 1);

  if (error) throw error;

  const warmedPosters = [];

  // Trigger poster cache warming at edge
  const posterPromises = movies.map(async movie => {
    try {
      // This will trigger Cloudflare worker to cache the poster
      const posterResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/tmdb-poster?tmdb_id=${movie.tmdb_id}`,
        { method: 'HEAD' } // Just trigger cache, don't download
      );

      if (posterResponse.ok) {
        warmedPosters.push(movie.tmdb_id);
      }
    } catch (error) {
      console.error(`Failed to warm poster for ${movie.tmdb_id}:`, error);
    }
  });

  await Promise.allSettled(posterPromises);

  const duration = Date.now() - startTime;

  return res.json({
    success: true,
    type: 'posters',
    batch: {
      offset,
      size: batchSize,
      processed: movies.length,
      warmed: warmedPosters.length,
    },
    duration: `${duration}ms`,
  });
}

// ZERO-WASTE: Only warm analysis for movies without existing linked content  
async function warmAllAnalyses(res, cache, batchSize, offset) {
  const startTime = Date.now();

  // CRITICAL: Check for existing analysis with links to avoid waste
  const { data: movies, error } = await supabase
    .from('movies')
    .select(`
      tmdb_id, 
      title, 
      year,
      movie_analyses!inner(claude_response)
    `)
    .range(offset, offset + batchSize - 1);

  if (error) throw error;

  const warmedAnalyses = [];
  const skippedComplete = [];

  // Process one at a time to avoid Claude rate limits
  for (const movie of movies) {
    try {
      // ZERO-WASTE: Skip movies that already have linked content
      const hasExistingAnalysis = movie.movie_analyses && movie.movie_analyses.length > 0;
      if (hasExistingAnalysis) {
        const analysis = movie.movie_analyses[0];
        const hasLinks = analysis.claude_response?.raw_content?.includes('<a href="/movie/') && 
                        analysis.claude_response?.raw_content?.includes('class="movie-title"');
        
        if (hasLinks) {
          skippedComplete.push(movie.tmdb_id);
          console.log(`⚡ Skipping ${movie.title} - already has linked analysis`);
          continue;
        }
      }

      const analysisCacheKey = cache.redis.generateKey('movie_analysis', movie.tmdb_id);
      const exists = await cache.redis.get(analysisCacheKey);

      if (!exists) {
        // Trigger analysis generation
        const analysisResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/movie-analysis`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tmdb_id: movie.tmdb_id,
              title: movie.title,
              year: movie.year,
            }),
          }
        );

        if (analysisResponse.ok) {
          warmedAnalyses.push(movie.tmdb_id);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to warm analysis for ${movie.tmdb_id}:`, error);
    }
  }

  const duration = Date.now() - startTime;

  return res.json({
    success: true,
    type: 'analyses',
    batch: {
      offset,
      size: batchSize,
      processed: movies.length,
      warmed: warmedAnalyses.length,
      skippedComplete: skippedComplete.length,
    },
    duration: `${duration}ms`,
    estimatedCost: `$${(warmedAnalyses.length * 0.1).toFixed(2)}`,
    costSaved: `$${(skippedComplete.length * 0.1).toFixed(2)}`,
    message: `ZERO-WASTE: Skipped ${skippedComplete.length} movies with existing linked content`,
  });
}

// Warm high-priority content first
async function warmPopularContent(res, cache) {
  const startTime = Date.now();
  const warmed = {
    afi: [],
    recent: [],
    trending: [],
  };

  try {
    // AFI Top 100 movies
    const { data: afiMovies } = await supabase
      .from('movies')
      .select('tmdb_id, title')
      .in('tmdb_id', [238, 278, 240, 424, 389, 129, 346, 19404, 13, 769]) // Top 10 AFI
      .limit(100);

    // Recent releases (last 2 years)
    const currentYear = new Date().getFullYear();
    const { data: recentMovies } = await supabase
      .from('movies')
      .select('tmdb_id, title')
      .gte('year', currentYear - 2)
      .limit(50);

    // Warm these priority movies
    const priorityMovies = [...(afiMovies || []), ...(recentMovies || [])];

    for (const movie of priorityMovies) {
      try {
        // Warm both lookup and analysis
        await Promise.all([warmMovieLookup(cache, movie), warmMovieAnalysis(cache, movie)]);

        warmed.afi.push(movie.tmdb_id);
      } catch (error) {
        console.error(`Failed to warm priority movie ${movie.tmdb_id}:`, error);
      }
    }
  } catch (error) {
    console.error('Popular content warming error:', error);
  }

  const duration = Date.now() - startTime;

  return res.json({
    success: true,
    type: 'popular',
    warmed,
    duration: `${duration}ms`,
    totalWarmed: Object.values(warmed).flat().length,
  });
}

// Warm all movies in Cinema Through Time series
async function warmSeriesContent(res, cache) {
  const seriesConfig = require('../../data/series-config.json');
  const startTime = Date.now();
  const warmedSeries = {};

  for (const [seriesId, series] of Object.entries(seriesConfig)) {
    warmedSeries[seriesId] = [];

    for (const episode of series.episodes) {
      for (const movie of episode.movies) {
        try {
          if (movie.tmdb_id) {
            await warmMovieLookup(cache, movie);
            warmedSeries[seriesId].push(movie.tmdb_id);
          }
        } catch (error) {
          console.error(`Failed to warm series movie ${movie.tmdb_id}:`, error);
        }
      }
    }
  }

  const duration = Date.now() - startTime;
  const totalWarmed = Object.values(warmedSeries).flat().length;

  return res.json({
    success: true,
    type: 'series',
    warmedSeries,
    duration: `${duration}ms`,
    totalWarmed,
  });
}

// Get current cache status and statistics
async function getCacheStatus(res, cache) {
  const stats = cache.getStats();
  const redisStats = await cache.redis.getStats();

  // Count cached movies
  const { count: totalMovies } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });

  return res.json({
    success: true,
    cache: {
      ...stats,
      redis: redisStats,
      totalMovies,
      warmingProgress: {
        estimated: `${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`,
        recommendation: stats.hits < totalMovies * 0.8 ? 'Continue warming' : 'Well cached',
      },
    },
  });
}

// Helper functions
async function warmMovieLookup(cache, movie) {
  const cacheKey = cache.redis.generateKey('movie_lookup', movie.tmdb_id);
  return cache.redis.set(cacheKey, movie, cache.redis.TTL.TMDB_DATA);
}

async function warmMovieAnalysis(cache, movie) {
  // Only warm if not already cached
  const analysisCacheKey = cache.redis.generateKey('movie_analysis', movie.tmdb_id);
  const exists = await cache.redis.get(analysisCacheKey);

  if (!exists) {
    // This would trigger actual analysis generation - expensive!
    console.log(`Would warm analysis for ${movie.title} (${movie.tmdb_id})`);
    return Promise.resolve(); // Skip for now unless explicitly requested
  }
}
