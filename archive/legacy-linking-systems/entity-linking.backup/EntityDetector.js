// lib/entity-linking/EntityDetector.js
import { PersonRegistry } from './PersonRegistry.js';
import { MovieRegistry } from './MovieRegistry.js';
import { EntityConfig } from './EntityConfig.js';

/**
 * Unified entity detection system for people and movies
 *
 * ARCHITECTURE:
 * - PersonRegistry: Detects people using names, variations, and context
 * - MovieRegistry: Detects movies from discovered-movies.json data
 * - EntityConfig: Configurable thresholds, exclusions, and feature toggles
 *
 * DETECTION STRATEGIES:
 * - Exact name/title matches (high confidence)
 * - Name variations ("Nolan" → "Christopher Nolan")
 * - Quoted text ("Inception", "Martin Scorsese")
 * - Title+year patterns ("Inception (2010)")
 * - Context-aware matching (film discussions vs general text)
 *
 * PERFORMANCE:
 * - 5-minute response cache for repeated text processing
 * - Parallel entity detection (people + movies simultaneously)
 * - Configurable timeouts and limits
 *
 * INTEGRATION:
 * - Replaces underlineProperNames with enhanced functionality
 * - Falls back gracefully if detection fails
 * - Supports React components via EntityLinkedText
 *
 * @example
 * const result = await entityDetector.processText(
 *   "Christopher Nolan's Inception (2010) features complex themes",
 *   { linkPeople: true, linkMovies: true, context: 'movie-discussion' }
 * );
 * // Returns: { linkedText: "...", entities: {...}, stats: {...} }
 */
export class EntityDetector {
  constructor() {
    this.personRegistry = new PersonRegistry();
    this.movieRegistry = new MovieRegistry();
    this.config = new EntityConfig();
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Main entry point - process text with entity linking
   * Replaces underlineProperNames with enhanced functionality
   */
  async processText(text, options = {}) {
    const {
      linkPeople = true,
      linkMovies = true,
      context = 'general',
      currentEntity = null,
      useCache = true,
    } = options;

    if (!text || typeof text !== 'string') {
      return {
        originalText: text,
        linkedText: text,
        entities: { people: [], movies: [] },
        stats: { processingTime: 0, entitiesFound: 0, linksCreated: 0 },
      };
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(text, options);
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const startTime = Date.now();

      // Detect all entities in parallel
      const detectionPromises = [];

      if (linkPeople && this.config.isEnabled('people')) {
        detectionPromises.push(
          this.personRegistry
            .detectPeople(text, context)
            .then(people => ({ type: 'people', entities: people }))
        );
      }

      if (linkMovies && this.config.isEnabled('movies')) {
        detectionPromises.push(
          this.movieRegistry
            .detectMovies(text, context)
            .then(movies => ({ type: 'movies', entities: movies }))
        );
      }

      const detectionResults = await Promise.all(detectionPromises);

      // Merge and filter entities
      const allEntities = this.mergeDetectionResults(detectionResults);
      const filteredEntities = this.filterEntities(allEntities, context, currentEntity);

      // Create linked text
      const linkedText = await this.createLinkedText(text, filteredEntities);

      const processingTime = Date.now() - startTime;

      const result = {
        originalText: text,
        linkedText: linkedText,
        entities: filteredEntities,
        stats: {
          processingTime,
          entitiesFound: this.countEntities(filteredEntities),
          linksCreated: this.countLinks(linkedText),
        },
      };

      // Cache the result
      if (useCache) {
        this.cache.set(cacheKey, {
          result,
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (error) {
      console.error('Entity processing failed:', error);
      return {
        originalText: text,
        linkedText: text,
        entities: { people: [], movies: [] },
        stats: { processingTime: 0, entitiesFound: 0, linksCreated: 0 },
        error: error.message,
      };
    }
  }

  /**
   * Simple text processing that returns HTML-like string (for backward compatibility)
   */
  async processTextSimple(text, options = {}) {
    const result = await this.processText(text, options);
    return result.linkedText || text;
  }

  /**
   * React-friendly processing that returns React elements
   */
  async processTextForReact(text, options = {}) {
    const result = await this.processText(text, options);

    if (!result.linkedText || result.linkedText === text) {
      return [text];
    }

    // Parse HTML-like string into React elements
    return this.parseLinkedTextToReact(result.linkedText);
  }

  /**
   * Merge detection results from different registries
   */
  mergeDetectionResults(detectionResults) {
    const merged = {
      people: [],
      movies: [],
    };

    detectionResults.forEach(result => {
      if (result.type === 'people') {
        merged.people = result.entities;
      } else if (result.type === 'movies') {
        merged.movies = result.entities;
      }
    });

    return merged;
  }

  /**
   * Filter entities based on configuration and context
   *
   * FILTERING RULES:
   * 1. Self-reference prevention (don't link to current page)
   * 2. Confidence thresholds (configurable per entity type)
   * 3. Category exclusions (historical figures, fictional characters)
   * 4. Link limits (max 15 people, 10 movies per text)
   *
   * PERFORMANCE: This is called after detection, so we optimize for
   * accuracy over speed. Better to filter out false positives here
   * than create bad user experiences with incorrect links.
   *
   * @param {Object} entities - Raw detection results from registries
   * @param {string} context - Page context (movie-page, conversation, etc)
   * @param {Object} currentEntity - Current page entity to avoid self-links
   * @returns {Object} Filtered entities ready for link creation
   */
  filterEntities(entities, context, currentEntity) {
    const filtered = {
      people: [],
      movies: [],
    };

    // Filter people
    if (entities.people) {
      filtered.people = entities.people.filter(match => {
        // Don't link to current person on their own page
        if (currentEntity?.type === 'person' && currentEntity?.slug === match.person?.slug) {
          return false;
        }

        // Apply confidence threshold
        const config = this.config.getTypeConfig('people');
        if (match.confidence < config.confidenceThreshold) {
          return false;
        }

        // Apply category exclusions
        const configData = this.config.getAll();
        if (configData.exclusions.categories.includes(match.person.category)) {
          return false;
        }

        return true;
      });

      // Limit number of people links
      const peopleConfig = this.config.getTypeConfig('people');
      filtered.people = filtered.people.slice(0, peopleConfig.maxLinks);
    }

    // Filter movies
    if (entities.movies) {
      filtered.movies = entities.movies.filter(match => {
        // Don't link to current movie on its own page
        if (currentEntity?.type === 'movie' && currentEntity?.slug === match.movie?.slug) {
          return false;
        }

        // Apply confidence threshold
        const config = this.config.getTypeConfig('movies');
        if (match.confidence < config.confidenceThreshold) {
          return false;
        }

        return true;
      });

      // Limit number of movie links
      const moviesConfig = this.config.getTypeConfig('movies');
      filtered.movies = filtered.movies.slice(0, moviesConfig.maxLinks);
    }

    return filtered;
  }

  /**
   * Create linked text with HTML anchor tags
   */
  async createLinkedText(text, entities) {
    let linkedText = text;
    const allMatches = [];

    // Collect all matches with their positions
    entities.people.forEach(match => {
      allMatches.push({
        ...match,
        entityType: 'people',
        url: `/person/${match.person.slug}`,
        className: 'person-link',
        dataId: match.person.slug,
      });
    });

    entities.movies.forEach(match => {
      allMatches.push({
        ...match,
        entityType: 'movies',
        url: `/movie/${match.movie.slug}`,
        className: 'movie-link',
        dataId: match.movie.id || match.movie.slug,
      });
    });

    // Sort by position (reverse order to maintain positions during replacement)
    allMatches.sort((a, b) => b.start - a.start);

    // Apply links
    for (const match of allMatches) {
      const linkHtml = this.createLinkHtml(match);
      linkedText = linkedText.slice(0, match.start) + linkHtml + linkedText.slice(match.end);
    }

    return linkedText;
  }

  /**
   * Create HTML link for an entity match
   */
  createLinkHtml(match) {
    const dataAttributes = [
      `data-entity-type="${match.entityType}"`,
      `data-entity-id="${match.dataId}"`,
      `data-confidence="${match.confidence}"`,
    ].join(' ');

    return `<a href="${match.url}" class="${match.className}" ${dataAttributes}>${match.text}</a>`;
  }

  /**
   * Parse linked text into React elements (for React components)
   */
  parseLinkedTextToReact(linkedText) {
    // This would be implemented when integrating with React components
    // For now, return as-is
    return [linkedText];
  }

  /**
   * Generate cache key for memoization
   */
  generateCacheKey(text, options) {
    const keyData = {
      text: text.slice(0, 100), // First 100 chars
      linkPeople: options.linkPeople,
      linkMovies: options.linkMovies,
      context: options.context,
      currentEntity: options.currentEntity?.slug,
    };
    return JSON.stringify(keyData);
  }

  /**
   * Count total entities found
   */
  countEntities(entities) {
    return (entities.people?.length || 0) + (entities.movies?.length || 0);
  }

  /**
   * Count links created in text
   */
  countLinks(text) {
    const linkMatches = text.match(/<a\s+[^>]*>/g);
    return linkMatches ? linkMatches.length : 0;
  }

  /**
   * Configuration methods
   */
  configure(options) {
    this.config.update(options);
    this.clearCache(); // Clear cache when config changes
  }

  getConfiguration() {
    return this.config.getAll();
  }

  /**
   * Cache management
   */
  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
    };
  }

  /**
   * Registry access methods
   */
  async getPersonRegistry() {
    await this.personRegistry.load();
    return this.personRegistry;
  }

  async getMovieRegistry() {
    await this.movieRegistry.load();
    return this.movieRegistry;
  }

  /**
   * Statistics and debugging
   */
  async getStats() {
    const [personStats, movieStats] = await Promise.all([
      this.personRegistry.getStats(),
      this.movieRegistry.getStats(),
    ]);

    return {
      people: personStats,
      movies: movieStats,
      cache: this.getCacheStats(),
      config: {
        enabled: this.config.isEnabled(),
        peopleEnabled: this.config.isEnabled('people'),
        moviesEnabled: this.config.isEnabled('movies'),
      },
    };
  }

  /**
   * Backward compatibility method (replaces underlineProperNames)
   */
  async underlineProperNames(text, options = {}) {
    console.warn('underlineProperNames is deprecated. Use processText instead.');
    return this.processTextSimple(text, options);
  }
}

// Singleton instance for app-wide use
export const entityDetector = new EntityDetector();
