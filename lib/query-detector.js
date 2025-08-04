/**
 * Query Detection System for MovieGenius
 *
 * Detects movies, TV series, and episodes in user queries for direct redirects
 * Uses TMDB API with intelligent caching for performance optimization
 *
 * Features:
 * - Fast pre-query movie detection for redirects
 * - TV series and episode detection
 * - Smart query classification (simple vs complex)
 * - Comprehensive caching (1-hour for searches, 7-day for results)
 * - False positive prevention
 */

import { getCache } from './cache.js';
import { getPerformanceMonitor } from './performance-monitor.js';

class QueryDetector {
  constructor() {
    this.cache = getCache();
    this.monitor = getPerformanceMonitor();

    // Detection patterns
    this.patterns = {
      // Simple movie query patterns
      simpleMovie: [
        /^"?([^"]+)"?$/, // "The Matrix" or The Matrix
        /^what is (.+) about\??$/i, // What is The Matrix about?
        /^tell me about (.+)$/i, // Tell me about The Matrix
        /^(.+) movie$/i, // The Matrix movie
        /^(.+) film$/i, // The Matrix film
        /^(.+) \((\d{4})\)$/, // The Matrix (1999)
      ],

      // TV series query patterns
      simpleSeries: [
        /^(.+) tv show$/i, // Breaking Bad tv show
        /^(.+) series$/i, // Breaking Bad series
        /^(.+) season (\d+)$/i, // Breaking Bad season 1
        /^(.+) s(\d+)e(\d+)$/i, // Breaking Bad s1e1
      ],

      // Genius series/episode patterns
      geniusSeries: [
        /^genius (.+)$/i, // genius film noir
        /^(.+) genius$/i, // film noir genius
        /^(.+) series$/i, // classic film noir series
        /^(.+) episode (\d+)$/i, // film noir episode 1
        /^episode (\d+) (.+)$/i, // episode 1 film noir
        /^(.+) theme$/i, // directors theme
        /^theme (.+)$/i, // theme directors
      ],

      // Complex queries that shouldn't redirect
      complex: [
        /movies like/i,
        /similar to/i,
        /recommend/i,
        /best/i,
        /top \d+/i,
        /list of/i,
        /compare/i,
        /vs\s/i,
        /versus/i,
        /and/i,
        /or\s/i,
      ],
    };
  }

  /**
   * Main detection method - determines if query should redirect
   */
  async detectAndRedirect(query) {
    const startTime = performance.now();
    const cleanQuery = query.trim();

    try {
      // Skip complex queries early
      if (this.isComplexQuery(cleanQuery)) {
        return { shouldRedirect: false, reason: 'complex_query' };
      }

      // Try movie detection first (most common)
      const movieResult = await this.detectMovie(cleanQuery);
      if (movieResult.found) {
        this.monitor.trackMetric('query_detection_success', performance.now() - startTime, {
          type: 'movie',
          query: cleanQuery.substring(0, 50),
          tmdb_id: movieResult.tmdb_id,
        });

        return {
          shouldRedirect: true,
          type: 'movie',
          url: `/movie/${movieResult.tmdb_id}`,
          title: movieResult.title,
          year: movieResult.year,
          confidence: movieResult.confidence,
        };
      }

      // Try genius series/episode detection
      const geniusResult = await this.detectSeries(cleanQuery);
      if (geniusResult.found) {
        this.monitor.trackMetric('query_detection_success', performance.now() - startTime, {
          type: 'genius_' + geniusResult.type,
          query: cleanQuery.substring(0, 50),
        });

        return {
          shouldRedirect: true,
          type: 'genius_' + geniusResult.type,
          url: geniusResult.url,
          title: geniusResult.title,
          subtitle: geniusResult.subtitle,
          confidence: geniusResult.confidence,
          matchedKeywords: geniusResult.matchedKeywords,
        };
      }

      // No match found
      return { shouldRedirect: false, reason: 'no_match' };
    } catch (error) {
      console.error('Query detection error:', error);
      return { shouldRedirect: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Detect movies in query using TMDB search
   */
  async detectMovie(query) {
    // Extract potential movie title from query patterns
    const extractedTitle = this.extractMovieTitle(query);
    if (!extractedTitle) {
      return { found: false, reason: 'no_title_extracted' };
    }

    // Search TMDB with caching
    const cacheKey = `movie_search_${extractedTitle.title.toLowerCase().replace(/\s+/g, '_')}`;

    const searchResult = await this.cache.cacheAside(
      cacheKey,
      async () => {
        return await this.searchTMDBMovies(extractedTitle.title, extractedTitle.year);
      },
      60 * 60 // 1 hour cache for searches
    );

    if (!searchResult || searchResult.length === 0) {
      return { found: false, reason: 'no_tmdb_results' };
    }

    // Find best match
    const bestMatch = this.findBestMovieMatch(extractedTitle, searchResult);
    if (!bestMatch) {
      return { found: false, reason: 'no_good_match' };
    }

    return {
      found: true,
      tmdb_id: bestMatch.id,
      title: bestMatch.title,
      year: new Date(bestMatch.release_date).getFullYear(),
      confidence: bestMatch.confidence,
    };
  }

  /**
   * Detect Genius series/episodes relevance
   */
  async detectSeries(query) {
    // Load genius configuration to match topics
    const geniusTopics = await this.loadGeniusTopics();
    if (!geniusTopics || geniusTopics.length === 0) {
      return { found: false, reason: 'genius_config_not_loaded' };
    }

    // Extract topic keywords from query
    const queryKeywords = this.extractTopicKeywords(query);
    if (queryKeywords.length === 0) {
      return { found: false, reason: 'no_topic_keywords' };
    }

    // Find best matching genius series/episode
    const bestMatch = this.findBestGeniusMatch(queryKeywords, geniusTopics);
    if (!bestMatch || bestMatch.confidence < 70) {
      return { found: false, reason: 'no_good_topic_match' };
    }

    return {
      found: true,
      type: bestMatch.type, // 'theme', 'series', or 'episode'
      url: bestMatch.url,
      title: bestMatch.title,
      subtitle: bestMatch.subtitle,
      confidence: bestMatch.confidence,
      matchedKeywords: bestMatch.matchedKeywords,
    };
  }

  /**
   * Load genius topics for matching (cached)
   */
  async loadGeniusTopics() {
    const cacheKey = 'genius_topics_for_detection';

    return await this.cache.cacheAside(
      cacheKey,
      async () => {
        try {
          // Load from genius config or API
          // Use proper base URL detection for server-side vs client-side
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL ||
            (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
          const response = await fetch(`${baseUrl}/api/genius-topics`);
          if (!response.ok) {
            throw new Error('Failed to load genius topics');
          }
          return await response.json();
        } catch (error) {
          console.warn('Could not load genius topics for detection:', error);
          return [];
        }
      },
      6 * 60 * 60 // 6 hour cache for topics
    );
  }

  /**
   * Extract topic-relevant keywords from query
   */
  extractTopicKeywords(query) {
    const cleanQuery = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove common stop words
    const stopWords = [
      'what',
      'is',
      'are',
      'the',
      'about',
      'tell',
      'me',
      'how',
      'why',
      'when',
      'where',
    ];
    const words = cleanQuery
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word));

    return words;
  }

  /**
   * Find best matching genius content
   */
  findBestGeniusMatch(queryKeywords, geniusTopics) {
    let bestMatch = null;
    let highestScore = 0;

    for (const item of geniusTopics) {
      const score = this.calculateGeniusTopicScore(queryKeywords, item);

      if (score > highestScore && score >= 50) {
        // Minimum confidence threshold
        highestScore = score;
        bestMatch = {
          ...item,
          confidence: score,
          matchedKeywords: this.getMatchedKeywords(queryKeywords, item),
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate relevance score for genius topic
   */
  calculateGeniusTopicScore(queryKeywords, geniusItem) {
    let score = 0;
    const itemText =
      `${geniusItem.title} ${geniusItem.subtitle || ''} ${geniusItem.description || ''}`.toLowerCase();

    for (const keyword of queryKeywords) {
      if (itemText.includes(keyword)) {
        // Exact match in title gets highest score
        if (geniusItem.title.toLowerCase().includes(keyword)) {
          score += 40;
        }
        // Match in subtitle gets medium score
        else if (geniusItem.subtitle && geniusItem.subtitle.toLowerCase().includes(keyword)) {
          score += 25;
        }
        // Match in description gets lower score
        else if (geniusItem.description && geniusItem.description.toLowerCase().includes(keyword)) {
          score += 15;
        }
      }
    }

    // Bonus for exact phrase matches
    const queryPhrase = queryKeywords.join(' ');
    if (itemText.includes(queryPhrase)) {
      score += 30;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Get which keywords matched for debugging
   */
  getMatchedKeywords(queryKeywords, geniusItem) {
    const itemText =
      `${geniusItem.title} ${geniusItem.subtitle || ''} ${geniusItem.description || ''}`.toLowerCase();
    return queryKeywords.filter(keyword => itemText.includes(keyword));
  }

  /**
   * Extract movie title from various query patterns
   */
  extractMovieTitle(query) {
    // Try each pattern
    for (const pattern of this.patterns.simpleMovie) {
      const match = query.match(pattern);
      if (match) {
        const title = match[1].trim();
        const year = match[2] ? parseInt(match[2]) : null;

        // Validate title (not too short, not just numbers)
        if (title.length > 1 && !/^\d+$/.test(title)) {
          return { title, year, pattern: pattern.source };
        }
      }
    }

    return null;
  }

  /**
   * Search TMDB for movies
   */
  async searchTMDBMovies(title, year = null) {
    if (!process.env.TMDB_API_KEY) {
      console.warn('TMDB API key not configured for movie detection');
      return [];
    }

    try {
      const encodedTitle = encodeURIComponent(title);
      const yearParam = year ? `&year=${year}` : '';
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodedTitle}${yearParam}&include_adult=false&page=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TMDB search failed: ${response.status}`);
      }

      const data = await response.json();

      // Track API usage
      this.monitor.trackMetric('tmdb_search_api_calls', 1, {
        query: title,
        results_count: data.results?.length || 0,
      });

      return data.results || [];
    } catch (error) {
      console.error('TMDB movie search error:', error);
      return [];
    }
  }

  /**
   * Find best movie match from TMDB results
   */
  findBestMovieMatch(extracted, results) {
    const { title, year } = extracted;
    const titleLower = title.toLowerCase();

    let bestMatch = null;
    let highestScore = 0;

    for (const movie of results) {
      let score = 0;
      const movieTitleLower = movie.title.toLowerCase();
      const movieYear = new Date(movie.release_date).getFullYear();

      // Exact title match (high score)
      if (movieTitleLower === titleLower) {
        score += 100;
      } else if (movieTitleLower.includes(titleLower) || titleLower.includes(movieTitleLower)) {
        score += 70;
      } else {
        // Fuzzy matching for common variations
        score += this.calculateTitleSimilarity(titleLower, movieTitleLower);
      }

      // Year matching bonus
      if (year && movieYear === year) {
        score += 30;
      }

      // Popularity boost for well-known movies
      if (movie.popularity > 20) {
        score += 10;
      }

      // Prefer movies with posters (more likely to be real)
      if (movie.poster_path) {
        score += 5;
      }

      if (score > highestScore && score >= 70) {
        // Minimum confidence threshold
        highestScore = score;
        bestMatch = { ...movie, confidence: score };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate title similarity for fuzzy matching
   */
  calculateTitleSimilarity(title1, title2) {
    // Simple word overlap scoring
    const words1 = title1.split(/\s+/);
    const words2 = title2.split(/\s+/);

    let overlap = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        overlap++;
      }
    }

    return Math.round((overlap / Math.max(words1.length, words2.length)) * 50);
  }

  /**
   * Check if query is too complex for simple redirect
   */
  isComplexQuery(query) {
    // Check for complex query patterns
    for (const pattern of this.patterns.complex) {
      if (pattern.test(query)) {
        return true;
      }
    }

    // Check query length (very long queries are likely complex)
    if (query.length > 100) {
      return true;
    }

    // Check for multiple sentences
    if (query.split(/[.!?]+/).length > 2) {
      return true;
    }

    return false;
  }

  /**
   * Get detection statistics
   */
  getStats() {
    return {
      cache_enabled: this.cache.enabled,
      patterns_count: {
        simple_movie: this.patterns.simpleMovie.length,
        simple_series: this.patterns.simpleSeries.length,
        complex: this.patterns.complex.length,
      },
    };
  }
}

// Singleton instance
let detectorInstance = null;

export function getQueryDetector() {
  if (!detectorInstance) {
    detectorInstance = new QueryDetector();
  }
  return detectorInstance;
}

export default getQueryDetector;
