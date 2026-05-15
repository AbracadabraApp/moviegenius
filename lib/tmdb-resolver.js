/**
 * TMDB Resolver - Authoritative String-to-TMDB-ID Converter
 *
 * Single source of truth for converting movie title strings to TMDB IDs.
 * Designed for offline batch processing, debugging, and analysis.
 *
 * Usage:
 *   const resolver = new TMDBResolver();
 *   const results = await resolver.resolve("Alice in Wonderland");
 *   // Returns ALL matches, sorted by year DESC
 *   console.log(results); // [{ tmdbId: 12345, year: 2010 }, { tmdbId: 678, year: 1951 }, ...]
 *
 * @author MovieGenius Engineering
 * @version 2.0.0
 * @date 2026-05-14
 */

import { Pool } from 'pg';
import fetch from 'node-fetch';

/**
 * Resolution strategies in priority order
 */
const STRATEGY = {
  NORMALIZED_MATCH: 'normalized_match', // title_normalized lookup
  TMDB_SEARCH: 'tmdb_search',           // TMDB API with alternate titles
  YEAR_FUZZY_WIDE: 'year_fuzzy_wide',   // ±5 year on TMDB result
  NOT_FOUND: 'not_found'                // No match found
};

class TMDBResolver {
  constructor(options = {}) {
    this.dbUrl = options.dbUrl || process.env.DATABASE_URL;
    this.tmdbApiKey = options.tmdbApiKey || process.env.TMDB_API_KEY;
    this.pool = null;
    this.stats = {
      total: 0,
      byStrategy: {},
      byConfidence: {},
      notFound: 0,
      errors: 0
    };
  }

  /**
   * Initialize database connection pool
   */
  async init() {
    if (!this.pool) {
      this.pool = new Pool({ connectionString: this.dbUrl });
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Normalize title for matching
   * Removes articles, punctuation, diacritics, whitespace
   */
  normalizeTitle(title) {
    if (!title) return '';

    return title
      .toLowerCase()
      .trim()
      // Remove diacritics first
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remove leading articles
      .replace(/^(the|a|an)\s+/i, '')
      // Remove punctuation and special chars
      .replace(/[:\-–—,\.!?'"""''&]/g, ' ')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract year from title string if present
   * "Inception (2010)" -> { title: "Inception", year: 2010 }
   */
  extractYear(titleString) {
    const yearMatch = titleString.match(/\((\d{4})\)/);
    if (yearMatch) {
      return {
        title: titleString.replace(/\s*\(\d{4}\)\s*$/, '').trim(),
        year: parseInt(yearMatch[1])
      };
    }
    return { title: titleString, year: null };
  }

  /**
   * Resolve a movie title to TMDB ID using simplified 3-stage strategy
   *
   * @param {string} title - Movie title
   * @param {object} options - Resolution options
   * @returns {Promise<Array>} Array of all matching movies, sorted by year DESC
   */
  async resolve(title, options = {}) {
    await this.init();

    const {
      skipTMDB = false,       // Don't query TMDB API
      debug = false           // Enable debug logging
    } = options;

    this.stats.total++;

    // Extract year from title if embedded (for logging only)
    const { title: cleanTitle, year: extractedYear } = this.extractYear(title);
    const normalized = this.normalizeTitle(cleanTitle);

    if (debug) {
      console.log(`[TMDBResolver] Resolving: "${cleanTitle}"${extractedYear ? ` (${extractedYear})` : ''}`);
      console.log(`[TMDBResolver] Normalized: "${normalized}"`);
    }

    // Stage 1: Normalized match (returns ALL matches)
    const normalizedResults = await this._normalizedMatchAll(normalized);
    if (normalizedResults.length > 0) {
      if (debug) {
        console.log(`[TMDBResolver] ✅ Found ${normalizedResults.length} match(es) via normalized_match`);
        normalizedResults.forEach(r => {
          console.log(`[TMDBResolver]    → ${r.title} (${r.year}) [TMDB: ${r.tmdb_id}]`);
        });
      }
      this.stats.byStrategy[STRATEGY.NORMALIZED_MATCH] = (this.stats.byStrategy[STRATEGY.NORMALIZED_MATCH] || 0) + 1;
      return normalizedResults.map(r => this._formatSingleResult(r, STRATEGY.NORMALIZED_MATCH));
    }

    // Stage 2: TMDB API search (get official title + year)
    if (!skipTMDB && this.tmdbApiKey) {
      if (debug) console.log(`[TMDBResolver] Trying TMDB API search...`);

      const tmdbResult = await this._tmdbSearch(cleanTitle);
      if (tmdbResult) {
        // Stage 3: Try matching with TMDB's title ±5 years
        const tmdbNormalized = this.normalizeTitle(tmdbResult.title);
        const tmdbYear = tmdbResult.year;

        if (debug) {
          console.log(`[TMDBResolver] TMDB says: "${tmdbResult.title}" (${tmdbYear})`);
          console.log(`[TMDBResolver] Trying year range ${tmdbYear - 5} to ${tmdbYear + 5}...`);
        }

        const yearFuzzyResults = await this._yearFuzzyMatchAll(tmdbNormalized, tmdbYear, 5);
        if (yearFuzzyResults.length > 0) {
          if (debug) {
            console.log(`[TMDBResolver] ✅ Found ${yearFuzzyResults.length} match(es) via year_fuzzy_wide`);
            yearFuzzyResults.forEach(r => {
              console.log(`[TMDBResolver]    → ${r.title} (${r.year}) [TMDB: ${r.tmdb_id}]`);
            });
          }
          this.stats.byStrategy[STRATEGY.YEAR_FUZZY_WIDE] = (this.stats.byStrategy[STRATEGY.YEAR_FUZZY_WIDE] || 0) + 1;
          return yearFuzzyResults.map(r => this._formatSingleResult(r, STRATEGY.YEAR_FUZZY_WIDE));
        }
      }
    }

    // Not found
    if (debug) console.log(`[TMDBResolver] ❌ Not found`);
    this.stats.notFound++;
    this.stats.byStrategy[STRATEGY.NOT_FOUND] = (this.stats.byStrategy[STRATEGY.NOT_FOUND] || 0) + 1;
    return [];
  }

  /**
   * Batch resolve multiple titles
   *
   * @param {Array} titles - Array of strings
   * @param {object} options - Resolution options
   * @returns {Promise<Array>} Array of { query, matches } objects
   */
  async resolveBatch(titles, options = {}) {
    const results = [];

    for (const title of titles) {
      try {
        const matches = await this.resolve(title, options);
        results.push({
          query: title,
          matches,
          found: matches.length > 0
        });
      } catch (error) {
        console.error(`[TMDBResolver] Error resolving "${title}":`, error.message);
        this.stats.errors++;
        results.push({
          query: title,
          matches: [],
          found: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get resolution statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.total > 0
        ? ((this.stats.total - this.stats.notFound - this.stats.errors) / this.stats.total * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      total: 0,
      byStrategy: {},
      byConfidence: {},
      notFound: 0,
      errors: 0
    };
  }

  // ===== Private Methods =====

  /**
   * Get ALL movies matching normalized title (no year filter)
   */
  async _normalizedMatchAll(normalized) {
    const query = `
      SELECT id, tmdb_id, title, year, poster_url
      FROM movies
      WHERE title_normalized = $1
      ORDER BY year DESC
    `;

    const result = await this.pool.query(query, [normalized]);
    return result.rows;
  }

  /**
   * Get ALL movies matching normalized title within year range
   */
  async _yearFuzzyMatchAll(normalized, year, range) {
    const query = `
      SELECT id, tmdb_id, title, year, poster_url
      FROM movies
      WHERE title_normalized = $1
      AND year BETWEEN $2 AND $3
      ORDER BY ABS(year - $4), year DESC
    `;

    const result = await this.pool.query(query, [
      normalized,
      year - range,
      year + range,
      year
    ]);

    return result.rows;
  }

  async _tmdbSearch(title) {
    try {
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(title)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const firstResult = data.results[0];
        this.stats.byStrategy[STRATEGY.TMDB_SEARCH] = (this.stats.byStrategy[STRATEGY.TMDB_SEARCH] || 0) + 1;

        return {
          title: firstResult.title,
          year: firstResult.release_date ? parseInt(firstResult.release_date.substring(0, 4)) : null
        };
      }
    } catch (error) {
      console.error('[TMDBResolver] TMDB API error:', error.message);
    }

    return null;
  }

  _formatSingleResult(dbRow, strategy) {
    return {
      tmdbId: dbRow.tmdb_id,
      title: dbRow.title,
      year: dbRow.year,
      posterUrl: dbRow.poster_url,
      strategy
    };
  }
}

/**
 * Convenience function for one-off resolutions
 */
export async function resolveTMDBId(title, options) {
  const resolver = new TMDBResolver();
  try {
    return await resolver.resolve(title, options);
  } finally {
    await resolver.close();
  }
}

export { TMDBResolver, STRATEGY };
export default TMDBResolver;
