// Cache Middleware and Utilities for MovieGenius
// Provides standardized caching patterns for all API endpoints

import getRedis from './redis.js';

class CacheService {
  constructor() {
    this.redis = getRedis();
    this.enabled = process.env.CACHE_ENABLED !== 'false';
    
    // Performance tracking
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0
    };
  }

  // Generic cache-aside pattern wrapper
  async cacheAside(cacheKey, fetchFunction, ttlSeconds = null) {
    this.stats.totalRequests++;
    
    if (!this.enabled) {
      console.log('🔇 Cache disabled, executing function directly');
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
      console.log(`🔄 Cache miss for ${cacheKey}, executing function...`);
      
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
    const queryHash = this.redis.hashObject({ query, model: modelName });
    const cacheKey = this.redis.generateKey('claude', queryHash);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.CLAUDE_ANALYSIS
    );
  }

  // Cache movie analysis with movie ID
  async cacheMovieAnalysis(movieId, analysisType, fetchFunction) {
    const cacheKey = this.redis.generateKey('movie_analysis', `${movieId}_${analysisType}`);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.CLAUDE_ANALYSIS
    );
  }

  // Cache TMDB API responses
  async cacheTMDBResponse(endpoint, params, fetchFunction) {
    const paramHash = this.redis.hashObject(params);
    const cacheKey = this.redis.generateKey('tmdb', `${endpoint}_${paramHash}`);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.TMDB_DATA
    );
  }

  // Cache person data
  async cachePersonData(personId, dataType, fetchFunction) {
    const cacheKey = this.redis.generateKey('person', `${personId}_${dataType}`);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.PERSON_DATA
    );
  }

  // Cache database queries
  async cacheDatabaseQuery(tableName, queryParams, fetchFunction) {
    const paramHash = this.redis.hashObject(queryParams);
    const cacheKey = this.redis.generateKey('db_query', `${tableName}_${paramHash}`);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.DATABASE_QUERIES
    );
  }

  // Cache search results
  async cacheSearchResults(searchQuery, page, filters, fetchFunction) {
    const searchHash = this.redis.hashObject({ query: searchQuery, page, filters });
    const cacheKey = this.redis.generateKey('search', searchHash);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.SEARCH_RESULTS
    );
  }

  // Cache streaming data
  async cacheStreamingData(movieId, fetchFunction) {
    const cacheKey = this.redis.generateKey('streaming', movieId);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.STREAMING_DATA
    );
  }

  // Cache episode content
  async cacheEpisodeContent(themeId, seriesId, episodeId, fetchFunction) {
    const cacheKey = this.redis.generateKey('episode', `${themeId}_${seriesId}_${episodeId}`);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.CLAUDE_ANALYSIS // 24 hours like other content
    );
  }

  // Cache series episodes list
  async cacheSeriesEpisodes(themeId, seriesId, fetchFunction) {
    const cacheKey = this.redis.generateKey('series_episodes', `${themeId}_${seriesId}`);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.DATABASE_QUERIES // 1 hour for episode lists
    );
  }

  // Cache theme episodes list
  async cacheThemeEpisodes(themeId, fetchFunction) {
    const cacheKey = this.redis.generateKey('theme_episodes', themeId);
    
    return await this.cacheAside(
      cacheKey, 
      fetchFunction, 
      this.redis.TTL.DATABASE_QUERIES // 1 hour for episode lists
    );
  }

  // Invalidate related caches when data changes
  async invalidateMovieCache(movieId) {
    const patterns = [
      `moviegenius:*:movie_analysis:*${movieId}*`,
      `moviegenius:*:streaming:${movieId}`,
      `moviegenius:*:db_query:movies_*${movieId}*`
    ];
    
    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }
    
    console.log(`🗑️  Invalidated caches for movie ${movieId}`);
  }

  // Invalidate person-related caches
  async invalidatePersonCache(personId) {
    const patterns = [
      `moviegenius:*:person:${personId}*`,
      `moviegenius:*:db_query:people_*${personId}*`
    ];
    
    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }
    
    console.log(`🗑️  Invalidated caches for person ${personId}`);
  }

  // Invalidate episode-related caches
  async invalidateEpisodeCache(themeId, seriesId, episodeId) {
    const patterns = [
      `moviegenius:*:episode:${themeId}_${seriesId}_${episodeId}`,
      `moviegenius:*:series_episodes:${themeId}_${seriesId}`,
      `moviegenius:*:theme_episodes:${themeId}`,
      `moviegenius:*:db_query:episodes_*${themeId}*`
    ];
    
    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }
    
    console.log(`🗑️  Invalidated caches for episode ${themeId}-${seriesId}-${episodeId}`);
  }

  // Invalidate all episode caches for a series
  async invalidateSeriesCache(themeId, seriesId) {
    const patterns = [
      `moviegenius:*:episode:${themeId}_${seriesId}_*`,
      `moviegenius:*:series_episodes:${themeId}_${seriesId}`,
      `moviegenius:*:theme_episodes:${themeId}`
    ];
    
    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }
    
    console.log(`🗑️  Invalidated caches for series ${themeId}-${seriesId}`);
  }

  // Invalidate all episode caches for a theme
  async invalidateThemeCache(themeId) {
    const patterns = [
      `moviegenius:*:episode:${themeId}_*`,
      `moviegenius:*:series_episodes:${themeId}_*`,
      `moviegenius:*:theme_episodes:${themeId}`
    ];
    
    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }
    
    console.log(`🗑️  Invalidated caches for theme ${themeId}`);
  }

  // Cache warming for popular content
  async warmCache(contentType, identifiers, fetchFunction) {
    console.log(`🔥 Warming cache for ${contentType}: ${identifiers.length} items`);
    
    const promises = identifiers.map(async (id) => {
      try {
        const cacheKey = this.redis.generateKey(contentType, id);
        const cached = await this.redis.get(cacheKey);
        
        if (!cached) {
          const data = await fetchFunction(id);
          await this.redis.set(cacheKey, data, this.redis.TTL.CLAUDE_ANALYSIS);
          console.log(`🔥 Warmed cache for ${contentType}:${id}`);
        }
      } catch (error) {
        console.error(`🔴 Cache warming error for ${contentType}:${id}:`, error.message);
      }
    });
    
    await Promise.allSettled(promises);
    console.log(`✅ Cache warming completed for ${contentType}`);
  }

  // Get cache performance statistics
  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      enabled: this.enabled,
      redis: this.redis.isConnected
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0
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
      console.log(`⏱️  Cache operation ${operation} for ${cacheKey}: ${duration}ms (${success ? 'success' : 'failed'})`);
      return duration;
    }
  };
}

export default getCache;