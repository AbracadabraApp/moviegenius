/**
 * Streaming Service
 * 
 * Manages streaming availability data from multiple configurable sources.
 * Handles data freshness, source priority, and fallback mechanisms.
 */

// Streaming data source configuration
const STREAMING_CONFIG = {
  ttl: 6 * 60 * 60 * 1000, // 6 hours (streaming changes frequently)
  apiEndpoint: '/api/get-streaming-info'
};

/**
 * Streaming availability data structure
 * @typedef {Object} StreamingAvailability
 * @property {string} movieId - Unique movie identifier
 * @property {Array} services - Available streaming services
 * @property {string} source - Data source (claude, justwatch, etc.)
 * @property {number} lastUpdated - Timestamp of last update
 * @property {number} expiresAt - Expiration timestamp
 * @property {Object} metadata - Additional source-specific data
 */

/**
 * Individual streaming service data
 * @typedef {Object} StreamingService
 * @property {string} name - Service name (Netflix, Hulu, etc.)
 * @property {string} type - Type (subscription, rent, buy, free)
 * @property {string} url - Direct link to movie (if available)
 * @property {string} price - Price for rent/buy (if applicable)
 * @property {string} quality - Video quality (HD, 4K, etc.)
 */

class StreamingService {
  constructor() {
    this.cache = new Map();
    this.config = STREAMING_CONFIG;
  }

  /**
   * Get streaming availability for a movie
   * Checks cache first, then fetches from Claude API
   */
  async getStreamingData(movieId, title, year) {
    const cacheKey = this.getCacheKey(movieId, title, year);
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return this.formatStreamingData(cached);
    }

    // Fetch from Claude API
    try {
      console.log('Fetching streaming data from Claude for:', title, year);
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, year })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.streamingText) {
          const data = {
            movieId,
            services: this.parseClaudeStreamingText(result.streamingText),
            source: 'claude-api',
            lastUpdated: Date.now(),
            expiresAt: Date.now() + this.config.ttl,
            metadata: {
              originalText: result.streamingText,
              confidence: 'medium'
            }
          };
          
          this.cacheData(cacheKey, data);
          return this.formatStreamingData(data);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch streaming data from Claude:', error);
    }

    // Return cached data even if expired, or empty state
    return cached ? this.formatStreamingData(cached) : this.getEmptyStreamingData();
  }

  /**
   * Extract streaming data from Claude response text
   * This parses the streaming info Claude already provides
   */
  extractClaudeStreamingData(movieTitle, year, claudeStreamingText) {
    if (!claudeStreamingText || claudeStreamingText === 'Check streaming services') {
      return this.getEmptyStreamingData();
    }

    const services = this.parseClaudeStreamingText(claudeStreamingText);
    const movieId = this.generateMovieId(movieTitle, year);
    
    const data = {
      movieId,
      services,
      source: 'claude-text',
      lastUpdated: Date.now(),
      expiresAt: Date.now() + this.config.ttl,
      metadata: {
        originalText: claudeStreamingText,
        confidence: 'medium'
      }
    };

    this.cacheData(this.getCacheKey(movieId, movieTitle, year), data);
    return this.formatStreamingData(data);
  }

  /**
   * Parse Claude's streaming text into structured data
   */
  parseClaudeStreamingText(streamingText) {
    const services = [];
    const text = streamingText.toLowerCase();

    // Common streaming service patterns
    const servicePatterns = {
      'netflix': { name: 'Netflix', type: 'subscription' },
      'hulu': { name: 'Hulu', type: 'subscription' },
      'amazon prime': { name: 'Amazon Prime Video', type: 'subscription' },
      'prime video': { name: 'Amazon Prime Video', type: 'subscription' },
      'disney+': { name: 'Disney+', type: 'subscription' },
      'disney plus': { name: 'Disney+', type: 'subscription' },
      'hbo max': { name: 'HBO Max', type: 'subscription' },
      'apple tv': { name: 'Apple TV+', type: 'subscription' },
      'peacock': { name: 'Peacock', type: 'subscription' },
      'paramount+': { name: 'Paramount+', type: 'subscription' },
      'tubi': { name: 'Tubi', type: 'free' },
      'crackle': { name: 'Crackle', type: 'free' },
      'pluto tv': { name: 'Pluto TV', type: 'free' },
      'youtube': { name: 'YouTube', type: 'free' },
      'kanopy': { name: 'Kanopy', type: 'free' },
      'internet archive': { name: 'Internet Archive', type: 'free' },
      'archive.org': { name: 'Internet Archive', type: 'free' },
    };

    for (const [pattern, service] of Object.entries(servicePatterns)) {
      if (text.includes(pattern)) {
        services.push({
          name: service.name,
          type: service.type,
          confidence: 'medium'
        });
      }
    }


    return services;
  }


  /**
   * Format streaming data for UI consumption
   */
  formatStreamingData(data) {
    if (!data || !data.services) {
      return this.getEmptyStreamingData();
    }

    const isExpired = this.isExpired(data);
    
    return {
      services: data.services,
      source: data.source,
      lastUpdated: data.lastUpdated,
      isExpired,
      metadata: data.metadata,
      // UI helpers
      hasStreaming: data.services.length > 0,
      primaryService: data.services[0]?.name || null,
      freeOptions: data.services.filter(s => s.type === 'free'),
      subscriptionOptions: data.services.filter(s => s.type === 'subscription'),
      rentalOptions: data.services.filter(s => s.type === 'rent' || s.type === 'buy')
    };
  }

  /**
   * Cache management
   */
  getCacheKey(movieId, title, year) {
    return `${movieId || this.generateMovieId(title, year)}`;
  }

  generateMovieId(title, year) {
    return `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  }

  getCachedData(cacheKey) {
    return this.cache.get(cacheKey);
  }

  cacheData(cacheKey, data) {
    this.cache.set(cacheKey, {
      ...data,
      expiresAt: Date.now() + this.config.ttl
    });
  }

  isExpired(data) {
    return Date.now() > data.expiresAt;
  }

  getEmptyStreamingData() {
    return {
      services: [],
      source: null,
      lastUpdated: null,
      isExpired: false,
      metadata: {},
      hasStreaming: false,
      primaryService: null,
      freeOptions: [],
      subscriptionOptions: [],
      rentalOptions: []
    };
  }


  /**
   * Clear expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, data] of this.cache.entries()) {
      if (this.isExpired(data)) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const streamingService = new StreamingService();
export default streamingService;