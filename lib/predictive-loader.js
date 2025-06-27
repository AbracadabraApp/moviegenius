/**
 * Predictive Content Loading System
 * 
 * Intelligently preloads content based on user behavior patterns
 * and demo scenarios. Uses circuit breakers and resource limits
 * to prevent system overload while maximizing demo performance.
 */

import { getDemoConfig, getDemoSafetyMonitor } from './demo-config.js';
import { getMediaCardCache } from './mediacard-cache.js';
import { getPerformanceMonitor } from './performance-monitor.js';

/**
 * Predictive Content Loader
 * 
 * Analyzes user behavior and preloads likely next content to ensure
 * instant demo experiences while respecting system resource limits.
 */
class PredictiveLoader {
  constructor() {
    this.demoConfig = getDemoConfig();
    this.safetyMonitor = getDemoSafetyMonitor();
    this.mediaCardCache = getMediaCardCache();
    this.monitor = getPerformanceMonitor();
    
    // Circuit breaker state
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0,
      threshold: 5, // Failures before opening
      timeout: 30000, // 30 seconds before retry
      halfOpenMaxCalls: 3
    };
    
    // Resource monitoring
    this.resourceUsage = {
      activeLoads: 0,
      maxConcurrent: this.demoConfig.PREDICTIVE.enabled ? 
        Math.floor(this.demoConfig.PREDICTIVE.backgroundProcessLimit * 10) : 2,
      memoryUsage: 0,
      maxMemory: this.demoConfig.PREDICTIVE.maxPrefetchMemory || 100 // MB
    };
    
    // User behavior tracking
    this.behaviorPattern = {
      visitedMovies: new Set(),
      visitedGenres: new Set(),
      sessionStartTime: Date.now(),
      pageViews: [],
      predictions: new Map()
    };
    
    // Demo path patterns
    this.demoPatterns = this.initializeDemoPatterns();
    
    console.log(`🔮 Predictive Loader initialized: ${this.demoConfig.PREDICTIVE.enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Initialize demo-specific behavior patterns
   */
  initializeDemoPatterns() {
    return {
      // Common demo user journeys
      movieExploration: [
        { from: 550, to: [603, 155, 238] }, // Fight Club → Matrix, Dark Knight, Godfather
        { from: 603, to: [550, 13, 78] },   // Matrix → Fight Club, Forrest Gump, Blade Runner
        { from: 155, to: [49026, 16869] },  // Dark Knight → Dark Knight Rises, Begins
        { from: 238, to: [240, 680] }       // Godfather → Godfather II, Pulp Fiction
      ],
      
      // Genre-based patterns
      genreProgression: {
        'action': ['sci-fi', 'thriller', 'crime'],
        'sci-fi': ['action', 'thriller', 'drama'],
        'crime': ['thriller', 'drama', 'mystery'],
        'drama': ['crime', 'biography', 'history']
      },
      
      // Popular demo sequences
      demoSequences: [
        // Classic cinema tour
        [238, 550, 603, 680, 155], // Godfather → Fight Club → Matrix → Pulp Fiction → Dark Knight
        
        // Modern blockbusters
        [155, 49026, 16869, 603, 13], // Dark Knight trilogy + Matrix + Forrest Gump
        
        // Director showcases  
        [550, 27205, 63056], // Fincher: Fight Club → Social Network → Zodiac
        [155, 16869, 49026]   // Nolan: Dark Knight trilogy
      ]
    };
  }

  /**
   * Track user page view and trigger predictive loading
   */
  trackPageView(pageType, movieId, metadata = {}) {
    if (!this.demoConfig.PREDICTIVE.enabled) return;

    const pageView = {
      type: pageType,
      movieId: parseInt(movieId),
      timestamp: Date.now(),
      metadata
    };

    this.behaviorPattern.pageViews.push(pageView);
    this.behaviorPattern.visitedMovies.add(pageView.movieId);

    // Keep only last 20 page views
    if (this.behaviorPattern.pageViews.length > 20) {
      this.behaviorPattern.pageViews.shift();
    }

    console.log(`🔮 Tracked page view: ${pageType} ${movieId}`);

    // Trigger predictive loading based on current view
    this.predictAndLoad(pageView);
  }

  /**
   * Analyze current page view and predict next likely content
   */
  async predictAndLoad(currentView) {
    if (this.circuitBreaker.state === 'OPEN') {
      console.log('🔮 Predictive loading circuit breaker OPEN - skipping');
      return;
    }

    try {
      const predictions = this.generatePredictions(currentView);
      await this.loadPredictions(predictions);
      
      this.circuitBreakerSuccess();
      
    } catch (error) {
      console.error('🔮 Predictive loading failed:', error);
      this.circuitBreakerFailure();
    }
  }

  /**
   * Generate content predictions based on current view and patterns
   */
  generatePredictions(currentView) {
    const predictions = [];
    const { movieId } = currentView;

    // Demo pattern predictions
    const demoPattern = this.demoPatterns.movieExploration.find(p => p.from === movieId);
    if (demoPattern) {
      demoPattern.to.forEach(targetId => {
        predictions.push({
          type: 'demo_pattern',
          movieId: targetId,
          confidence: 0.9,
          reason: `Demo pattern from ${movieId}`
        });
      });
    }

    // Sequential demo path predictions
    this.demoPatterns.demoSequences.forEach(sequence => {
      const currentIndex = sequence.indexOf(movieId);
      if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
        const nextMovie = sequence[currentIndex + 1];
        predictions.push({
          type: 'demo_sequence',
          movieId: nextMovie,
          confidence: 0.8,
          reason: `Demo sequence continuation`
        });
      }
    });

    // Popular movies that haven't been visited
    this.demoConfig.DEMO_PATHS.popularMovies.forEach(popularId => {
      if (!this.behaviorPattern.visitedMovies.has(popularId)) {
        predictions.push({
          type: 'popular_unvisited',
          movieId: popularId,
          confidence: 0.6,
          reason: 'Popular demo movie not yet visited'
        });
      }
    });

    // Sort by confidence and limit
    const limitedPredictions = predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.demoConfig.PREDICTIVE.prefetchCount);

    console.log(`🔮 Generated ${limitedPredictions.length} predictions from ${currentView.type} ${movieId}`);
    
    return limitedPredictions;
  }

  /**
   * Load predicted content with resource management
   */
  async loadPredictions(predictions) {
    if (predictions.length === 0) return;

    // Check resource constraints
    if (!this.checkResourceConstraints()) {
      console.log('🔮 Resource constraints prevent predictive loading');
      return;
    }

    const loadPromises = predictions.map(prediction => 
      this.loadPredictedContent(prediction)
    );

    // Process with concurrency control
    const results = await Promise.allSettled(loadPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`🔮 Predictive loading complete: ${successful} successful, ${failed} failed`);
    
    // Track performance
    this.safetyMonitor.recordMetric('predictive_loading_success_count', successful);
    if (failed > 0) {
      this.safetyMonitor.recordMetric('predictive_loading_error_count', failed);
    }
  }

  /**
   * Load specific predicted content
   */
  async loadPredictedContent(prediction) {
    const startTime = Date.now();
    
    try {
      this.resourceUsage.activeLoads++;
      
      // Get movie basic info for cache key generation
      const movieInfo = this.getMovieInfoFromId(prediction.movieId);
      if (!movieInfo) {
        throw new Error(`Movie info not found for ID: ${prediction.movieId}`);
      }

      // Check if already cached
      const cached = await this.mediaCardCache.getMovieData(movieInfo.title, movieInfo.year);
      if (cached) {
        console.log(`🔮 Already cached: ${movieInfo.title} (${movieInfo.year})`);
        return { alreadyCached: true };
      }

      // Prefetch basic movie data (lightweight)
      const movieData = await this.prefetchMovieData(movieInfo);
      
      // Cache the prefetched data
      if (movieData) {
        await this.mediaCardCache.cacheMovieData(movieInfo.title, movieInfo.year, movieData);
        console.log(`🔮 Prefetched: ${movieInfo.title} (${movieInfo.year}) - confidence: ${prediction.confidence}`);
      }

      const duration = Date.now() - startTime;
      this.safetyMonitor.recordMetric('predictive_load_duration', duration);
      
      return { success: true, movieId: prediction.movieId, duration };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.warn(`🔮 Failed to prefetch movie ${prediction.movieId}:`, error.message);
      
      this.safetyMonitor.recordMetric('predictive_load_error', 1);
      throw error;
      
    } finally {
      this.resourceUsage.activeLoads--;
    }
  }

  /**
   * Lightweight movie data prefetching
   */
  async prefetchMovieData(movieInfo) {
    // For demo mode, prefetch basic placeholder data
    // Real implementation would fetch from database/APIs
    return {
      slug: `Exploring ${movieInfo.title}...`,
      poster: '/images/placeholder-poster.jpg',
      streamingText: 'Checking availability...',
      tmdb_id: movieInfo.tmdbId,
      prefetched: true,
      prefetch_time: Date.now()
    };
  }

  /**
   * Get movie info from TMDB ID (for demo purposes)
   */
  getMovieInfoFromId(tmdbId) {
    const movieMap = {
      550: { title: 'Fight Club', year: 1999, tmdbId: 550 },
      603: { title: 'The Matrix', year: 1999, tmdbId: 603 },
      155: { title: 'The Dark Knight', year: 2008, tmdbId: 155 },
      238: { title: 'The Godfather', year: 1972, tmdbId: 238 },
      680: { title: 'Pulp Fiction', year: 1994, tmdbId: 680 },
      13: { title: 'Forrest Gump', year: 1994, tmdbId: 13 },
      78: { title: 'Blade Runner', year: 1982, tmdbId: 78 },
      49026: { title: 'The Dark Knight Rises', year: 2012, tmdbId: 49026 },
      16869: { title: 'Batman Begins', year: 2005, tmdbId: 16869 },
      240: { title: 'The Godfather: Part II', year: 1974, tmdbId: 240 }
    };

    return movieMap[tmdbId] || null;
  }

  /**
   * Check if resource constraints allow predictive loading
   */
  checkResourceConstraints() {
    // Check concurrent load limit
    if (this.resourceUsage.activeLoads >= this.resourceUsage.maxConcurrent) {
      console.log(`🔮 Max concurrent loads reached: ${this.resourceUsage.activeLoads}/${this.resourceUsage.maxConcurrent}`);
      return false;
    }

    // Check memory usage
    const estimatedMemory = this.resourceUsage.activeLoads * 5; // ~5MB per load
    if (estimatedMemory > this.resourceUsage.maxMemory) {
      console.log(`🔮 Memory limit would be exceeded: ${estimatedMemory}MB > ${this.resourceUsage.maxMemory}MB`);
      return false;
    }

    // Check system performance
    const recentErrors = this.safetyMonitor.metrics.get('predictive_load_error') || [];
    const errorRate = recentErrors.length / Math.max(1, this.behaviorPattern.pageViews.length);
    
    if (errorRate > 0.2) { // 20% error rate threshold
      console.log(`🔮 High error rate prevents predictive loading: ${(errorRate * 100).toFixed(1)}%`);
      return false;
    }

    return true;
  }

  /**
   * Circuit breaker success handler
   */
  circuitBreakerSuccess() {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.successCount++;
      
      if (this.circuitBreaker.successCount >= 3) {
        console.log('🔮 Circuit breaker CLOSED (recovered)');
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.successCount = 0;
      }
    } else if (this.circuitBreaker.state === 'CLOSED') {
      this.circuitBreaker.failureCount = Math.max(0, this.circuitBreaker.failureCount - 1);
    }
  }

  /**
   * Circuit breaker failure handler
   */
  circuitBreakerFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.state === 'CLOSED' && 
        this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
      
      console.log('🔮 Circuit breaker OPEN (too many failures)');
      this.circuitBreaker.state = 'OPEN';
      
      // Schedule half-open attempt
      setTimeout(() => {
        if (this.circuitBreaker.state === 'OPEN') {
          console.log('🔮 Circuit breaker HALF_OPEN (testing recovery)');
          this.circuitBreaker.state = 'HALF_OPEN';
          this.circuitBreaker.successCount = 0;
        }
      }, this.circuitBreaker.timeout);
    }
  }

  /**
   * Get predictive loading status and performance
   */
  getStatus() {
    const sessionDuration = Date.now() - this.behaviorPattern.sessionStartTime;
    
    return {
      enabled: this.demoConfig.PREDICTIVE.enabled,
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failureCount: this.circuitBreaker.failureCount,
        successCount: this.circuitBreaker.successCount
      },
      resourceUsage: {
        activeLoads: this.resourceUsage.activeLoads,
        maxConcurrent: this.resourceUsage.maxConcurrent,
        utilizationPercent: (this.resourceUsage.activeLoads / this.resourceUsage.maxConcurrent * 100).toFixed(1)
      },
      session: {
        duration: Math.round(sessionDuration / 1000),
        pageViews: this.behaviorPattern.pageViews.length,
        uniqueMovies: this.behaviorPattern.visitedMovies.size,
        predictionsGenerated: this.behaviorPattern.predictions.size
      },
      performance: {
        totalPredictions: this.behaviorPattern.predictions.size,
        averageLoadTime: this.calculateAverageLoadTime(),
        successRate: this.calculateSuccessRate()
      }
    };
  }

  /**
   * Calculate average load time for predictions
   */
  calculateAverageLoadTime() {
    const loadTimes = Array.from(this.safetyMonitor.metrics.get('predictive_load_duration') || []);
    if (loadTimes.length === 0) return 0;
    
    return Math.round(loadTimes.reduce((sum, time) => sum + time.value, 0) / loadTimes.length);
  }

  /**
   * Calculate success rate for predictive loading
   */
  calculateSuccessRate() {
    const successes = this.safetyMonitor.metrics.get('predictive_loading_success_count') || [];
    const errors = this.safetyMonitor.metrics.get('predictive_loading_error_count') || [];
    
    const totalSuccesses = successes.reduce((sum, s) => sum + s.value, 0);
    const totalErrors = errors.reduce((sum, e) => sum + e.value, 0);
    const total = totalSuccesses + totalErrors;
    
    return total > 0 ? (totalSuccesses / total * 100).toFixed(1) : 100;
  }

  /**
   * Emergency disable predictive loading
   */
  emergencyDisable() {
    console.log('🚨 EMERGENCY: Disabling predictive loading');
    
    this.demoConfig.PREDICTIVE.enabled = false;
    this.circuitBreaker.state = 'OPEN';
    
    // Clear any active loading
    this.resourceUsage.activeLoads = 0;
    
    this.safetyMonitor.recordMetric('predictive_loading_emergency_disable', 1);
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    console.log('🔮 Predictive loader shutting down');
    this.demoConfig.PREDICTIVE.enabled = false;
    
    // Clear behavior data
    this.behaviorPattern.visitedMovies.clear();
    this.behaviorPattern.predictions.clear();
    this.behaviorPattern.pageViews = [];
  }
}

// Singleton instance
let predictiveLoader = null;

export function getPredictiveLoader() {
  if (!predictiveLoader) {
    predictiveLoader = new PredictiveLoader();
  }
  return predictiveLoader;
}

export default getPredictiveLoader;