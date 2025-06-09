// lib/entity-linking/EntityConfig.js

/**
 * Unified configuration system for entity linking
 * 
 * CONFIGURATION HIERARCHY (in priority order):
 * 1. Environment variables (DISABLE_ENTITY_LINKING, etc.)
 * 2. Runtime configuration updates via .update() method
 * 3. Default configuration defined in getDefaultConfig()
 * 
 * REVERSIBILITY DESIGN:
 * - All features can be toggled on/off without data loss
 * - Confidence thresholds adjustable per content type
 * - Link limits prevent performance issues
 * - Context-specific overrides for different page types
 * 
 * CONTENT TYPE SYSTEM:
 * - people: Directors, actors, crew (enabled by default)
 * - movies: Films from discovered-movies.json (enabled by default)  
 * - tvShows: Future expansion (disabled by default)
 * - books: Future expansion (disabled by default)
 * 
 * PERFORMANCE CONTROLS:
 * - maxLinksPerText: Prevents UI overwhelm 
 * - confidenceThreshold: Quality vs quantity tradeoff
 * - cacheTimeoutMs: Memory vs processing speed balance
 * - maxProcessingTimeMs: UX responsiveness guarantee
 * 
 * @example
 * // Disable all movie linking temporarily
 * entityDetector.configure({ 
 *   contentTypes: { movies: { enabled: false } } 
 * });
 * 
 * // Increase person detection sensitivity
 * entityDetector.configure({
 *   contentTypes: { people: { confidenceThreshold: 0.6 } }
 * });
 */
export class EntityConfig {
  constructor() {
    this.config = this.getDefaultConfig();
    this.loadEnvironmentOverrides();
  }

  getDefaultConfig() {
    return {
      // Global settings
      enabled: true,
      maxLinksPerText: 25,
      
      // Content type toggles
      contentTypes: {
        people: {
          enabled: true,
          maxLinks: 15,
          confidenceThreshold: 0.8,
          linkClass: 'person-link',
          urlPattern: '/person/{slug}',
          detectSingleNames: false, // "Nolan" vs "Christopher Nolan"
          requireContext: ['politician', 'historical-figure']
        },
        movies: {
          enabled: true,
          maxLinks: 10,
          confidenceThreshold: 0.75,
          linkClass: 'movie-link',
          urlPattern: '/movie/{slug}',
          requireYear: false,
          allowPartialTitles: true
        },
        tvShows: {
          enabled: false, // Future expansion
          maxLinks: 8,
          confidenceThreshold: 0.8,
          linkClass: 'tv-link',
          urlPattern: '/tv/{slug}'
        },
        books: {
          enabled: false, // Future expansion
          maxLinks: 5,
          confidenceThreshold: 0.85,
          linkClass: 'book-link',
          urlPattern: '/book/{slug}'
        }
      },

      // Detection settings
      detection: {
        caseSensitive: false,
        allowPartialMatches: true,
        requireExactMatches: false,
        minMatchLength: 3,
        maxProcessingTimeMs: 5000
      },

      // Exclusion rules
      exclusions: {
        categories: ['historical-figure', 'fictional-character'],
        contexts: [], // Context-specific exclusions
        patterns: [] // Regex patterns to exclude
      },

      // Performance settings
      performance: {
        enableCaching: true,
        cacheTimeoutMs: 300000, // 5 minutes
        maxCacheSize: 1000
      },

      // Styling
      linkStyles: {
        color: '#374151',
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
        fontWeight: 'inherit'
      }
    };
  }

  loadEnvironmentOverrides() {
    // Environment-based configuration
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.DISABLE_ENTITY_LINKING === 'true') {
        this.config.enabled = false;
      }
      
      if (process.env.DISABLE_MOVIE_LINKING === 'true') {
        this.config.contentTypes.movies.enabled = false;
      }
      
      if (process.env.DISABLE_PEOPLE_LINKING === 'true') {
        this.config.contentTypes.people.enabled = false;
      }

      const mode = process.env.ENTITY_LINKING_MODE;
      if (mode === 'movies-only') {
        this.config.contentTypes.people.enabled = false;
      } else if (mode === 'people-only') {
        this.config.contentTypes.movies.enabled = false;
      } else if (mode === 'disabled') {
        this.config.enabled = false;
      }
    }
  }

  isEnabled(contentType = null) {
    if (!this.config.enabled) return false;
    
    if (contentType) {
      return this.config.contentTypes[contentType]?.enabled || false;
    }
    
    return true;
  }

  getTypeConfig(contentType) {
    return this.config.contentTypes[contentType] || null;
  }

  update(newConfig) {
    this.config = this.deepMerge(this.config, newConfig);
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  // Easy toggle methods
  enableContentType(contentType) {
    if (this.config.contentTypes[contentType]) {
      this.config.contentTypes[contentType].enabled = true;
    }
  }

  disableContentType(contentType) {
    if (this.config.contentTypes[contentType]) {
      this.config.contentTypes[contentType].enabled = false;
    }
  }

  // Reversibility controls
  disableAllLinking() {
    this.config.enabled = false;
  }

  enableAllLinking() {
    this.config.enabled = true;
  }

  resetToDefaults() {
    this.config = this.getDefaultConfig();
    this.loadEnvironmentOverrides();
  }

  getAll() {
    return JSON.parse(JSON.stringify(this.config)); // Deep clone
  }

  // Context-specific configuration
  getConfigForContext(context) {
    const baseConfig = this.getAll();
    
    // Apply context-specific overrides
    if (context === 'person-page') {
      // Don't link to current person on their own page
      baseConfig.contextAware = true;
    } else if (context === 'movie-page') {
      // Don't link to current movie on its own page
      baseConfig.contextAware = true;
    }
    
    return baseConfig;
  }

  // Export configuration for persistence
  exportConfig() {
    return {
      config: this.getAll(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  // Import configuration
  importConfig(exportedConfig) {
    if (exportedConfig.config && exportedConfig.version === '1.0.0') {
      this.config = exportedConfig.config;
      return true;
    }
    return false;
  }
}

// Singleton instance for app-wide use
export const entityConfig = new EntityConfig();