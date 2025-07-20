// Cache Middleware and Utilities for MovieGenius
// Provides standardized caching patterns for all API endpoints

// Only import Redis on server-side to avoid Node.js module issues in browser
let getRedis = null;
if (typeof window === 'undefined') {
  try {
    getRedis = require('./redis.js').default;
  } catch (error) {
    console.warn('Redis not available, using memory-only cache');
  }
}

class CacheService {
  constructor() {
    // Only use Redis on server-side
    this.redis = typeof window === 'undefined' && getRedis ? getRedis() : null;
    this.enabled = typeof process !== 'undefined' ? process.env.CACHE_ENABLED !== 'false' : false;

    // Performance tracking
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
    };
  }

  // Check if Redis is available and cache is enabled
  isRedisAvailable() {
    return this.enabled && this.redis;
  }

  // Simple get method for direct cache access
  async get(key) {
    if (!this.isRedisAvailable()) {
      return null;
    }

    try {
      const cached = await this.redis.get(key);
      return cached ? cached.data : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Simple set method for direct cache access
  async set(key, value, ttlSeconds = 3600) {
    if (!this.isRedisAvailable()) {
      return false;
    }

    try {
      const cacheData = {
        data: value,
        cachedAt: new Date().toISOString(),
        ttl: ttlSeconds,
      };

      await this.redis.setex(key, ttlSeconds, cacheData);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Generic cache-aside pattern wrapper
  async cacheAside(cacheKey, fetchFunction, ttlSeconds = null) {
    this.stats.totalRequests++;

    if (!this.isRedisAvailable()) {
      // Cache disabled or unavailable, executing function directly
      return await fetchFunction();
    }

    try {
      // Try to get from cache first
      const cached = await this.redis.get(cacheKey);
      if (cached && cached.data) {
        this.stats.hits++;
        return cached.data;
      }

      // Cache miss - execute function
      this.stats.misses++;
      // Cache miss, executing function

      const result = await fetchFunction();

      // Cache the result if successful
      if (result !== null && result !== undefined) {
        await this.redis.set(cacheKey, result, ttlSeconds);
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      console.error(`🔴 Cache error for ${cacheKey}:`, error.message);

      // Fallback to direct execution on cache errors
      return await fetchFunction();
    }
  }

  // Cache Claude API responses with query-based keys
  async cacheClaudeResponse(query, modelName, fetchFunction) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const queryHash = this.redis.hashObject({ query, model: modelName });
    const cacheKey = this.redis.generateKey('claude', queryHash);

    return await this.cacheAside(cacheKey, fetchFunction, this.redis.TTL.CLAUDE_ANALYSIS);
  }

  // Cache movie analysis with movie ID
  async cacheMovieAnalysis(movieId, analysisType, fetchFunction) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const cacheKey = this.redis.generateKey('movie_analysis', `${movieId}_${analysisType}`);

    return await this.cacheAside(cacheKey, fetchFunction, this.redis.TTL.CLAUDE_ANALYSIS);
  }

  // Cache TMDB API responses
  async cacheTMDBResponse(endpoint, params, fetchFunction) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const paramHash = this.redis.hashObject(params);
    const cacheKey = this.redis.generateKey('tmdb', `${endpoint}_${paramHash}`);

    return await this.cacheAside(cacheKey, fetchFunction, this.redis.TTL.TMDB_DATA);
  }

  // Cache person data
  async cachePersonData(personId, dataType, fetchFunction) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const cacheKey = this.redis.generateKey('person', `${personId}_${dataType}`);

    return await this.cacheAside(cacheKey, fetchFunction, this.redis.TTL.PERSON_DATA);
  }

  // Cache database queries
  async cacheDatabaseQuery(tableName, queryParams, fetchFunction) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const paramHash = this.redis.hashObject(queryParams);
    const cacheKey = this.redis.generateKey('db_query', `${tableName}_${paramHash}`);

    return await this.cacheAside(cacheKey, fetchFunction, this.redis.TTL.DATABASE_QUERIES);
  }

  // Cache search results
  async cacheSearchResults(searchQuery, page, filters, fetchFunction) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const searchHash = this.redis.hashObject({ query: searchQuery, page, filters });
    const cacheKey = this.redis.generateKey('search', searchHash);

    return await this.cacheAside(cacheKey, fetchFunction, this.redis.TTL.SEARCH_RESULTS);
  }

  // Cache streaming data
  async cacheStreamingData(movieId, fetchFunction, customTtl = null) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const cacheKey = this.redis.generateKey('streaming', movieId);

    return await this.cacheAside(
      cacheKey,
      fetchFunction,
      customTtl || this.redis.TTL.STREAMING_DATA
    );
  }

  // Cache episode content
  async cacheEpisodeContent(themeId, seriesId, episodeId, fetchFunction) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const cacheKey = this.redis.generateKey('episode', `${themeId}_${seriesId}_${episodeId}`);

    return await this.cacheAside(
      cacheKey,
      fetchFunction,
      this.redis.TTL.CLAUDE_ANALYSIS // 24 hours like other content
    );
  }

  // Cache series episodes list
  async cacheSeriesEpisodes(themeId, seriesId, fetchFunction) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const cacheKey = this.redis.generateKey('series_episodes', `${themeId}_${seriesId}`);

    return await this.cacheAside(
      cacheKey,
      fetchFunction,
      this.redis.TTL.DATABASE_QUERIES // 1 hour for episode lists
    );
  }

  // Cache theme episodes list
  async cacheThemeEpisodes(themeId, fetchFunction) {
    if (!this.isRedisAvailable()) {
      return await fetchFunction();
    }

    const cacheKey = this.redis.generateKey('theme_episodes', themeId);

    return await this.cacheAside(
      cacheKey,
      fetchFunction,
      this.redis.TTL.DATABASE_QUERIES // 1 hour for episode lists
    );
  }

  // Invalidate related caches when data changes
  async invalidateMovieCache(movieId) {
    if (!this.isRedisAvailable()) {
      return; // Skip cache invalidation if Redis not available
    }

    const patterns = [
      `moviegenius:*:movie_analysis:*${movieId}*`,
      `moviegenius:*:streaming:${movieId}`,
      `moviegenius:*:db_query:movies_*${movieId}*`,
    ];

    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }

    // Invalidated caches for movie
  }

  // Invalidate person-related caches
  async invalidatePersonCache(personId) {
    if (!this.isRedisAvailable()) {
      return; // Skip cache invalidation if Redis not available
    }

    const patterns = [
      `moviegenius:*:person:${personId}*`,
      `moviegenius:*:db_query:people_*${personId}*`,
    ];

    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }

    // Invalidated caches for person
  }

  // Invalidate episode-related caches
  async invalidateEpisodeCache(themeId, seriesId, episodeId) {
    if (!this.isRedisAvailable()) {
      return; // Skip cache invalidation if Redis not available
    }

    const patterns = [
      `moviegenius:*:episode:${themeId}_${seriesId}_${episodeId}`,
      `moviegenius:*:series_episodes:${themeId}_${seriesId}`,
      `moviegenius:*:theme_episodes:${themeId}`,
      `moviegenius:*:db_query:episodes_*${themeId}*`,
    ];

    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }

    // Invalidated caches for episode
  }

  // Invalidate all episode caches for a series
  async invalidateSeriesCache(themeId, seriesId) {
    if (!this.isRedisAvailable()) {
      return; // Skip cache invalidation if Redis not available
    }

    const patterns = [
      `moviegenius:*:episode:${themeId}_${seriesId}_*`,
      `moviegenius:*:series_episodes:${themeId}_${seriesId}`,
      `moviegenius:*:theme_episodes:${themeId}`,
    ];

    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }

    // Invalidated caches for series
  }

  // Invalidate all episode caches for a theme
  async invalidateThemeCache(themeId) {
    if (!this.isRedisAvailable()) {
      return; // Skip cache invalidation if Redis not available
    }

    const patterns = [
      `moviegenius:*:episode:${themeId}_*`,
      `moviegenius:*:series_episodes:${themeId}_*`,
      `moviegenius:*:theme_episodes:${themeId}`,
    ];

    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }

    // Invalidated caches for theme
  }

  // Cache warming for popular content
  async warmCache(contentType, identifiers, fetchFunction) {
    // Warming cache for content type

    const promises = identifiers.map(async id => {
      try {
        const cacheKey = this.redis.generateKey(contentType, id);
        const cached = await this.redis.get(cacheKey);

        if (!cached) {
          const data = await fetchFunction(id);
          await this.redis.set(cacheKey, data, this.redis.TTL.CLAUDE_ANALYSIS);
          // Warmed cache for content
        }
      } catch (error) {
        console.error(`🔴 Cache warming error for ${contentType}:${id}:`, error.message);
      }
    });

    await Promise.allSettled(promises);
    // Cache warming completed
  }

  // Get cache performance statistics
  getStats() {
    const hitRate =
      this.stats.totalRequests > 0
        ? ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(2)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      enabled: this.enabled,
      redis: this.redis.isConnected,
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
    };
  }

  // Health check
  async isHealthy() {
    try {
      return await this.redis.isHealthy();
    } catch {
      return false;
    }
  }
}

// Singleton instance
let cacheInstance = null;

export function getCache() {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

// Helper function for API middleware
export function withCache(handler) {
  return async (req, res) => {
    // Add cache instance to request for easy access
    req.cache = getCache();

    // Add cache headers for better client-side caching
    if (req.method === 'GET') {
      res.setHeader('Vary', 'Accept-Encoding');
    }

    return handler(req, res);
  };
}

// Performance monitoring wrapper
export function measureCachePerformance(operation, cacheKey) {
  const startTime = Date.now();

  return {
    end: (success = true) => {
      const duration = Date.now() - startTime;
      // Cache operation completed
      return duration;
    },
  };
}

export default getCache;
