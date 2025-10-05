/**
 * Movie Page Data Types
 *
 * SINGLE SOURCE OF TRUTH for movie page data structure.
 * All data loaders (static, database, API) MUST return this exact shape.
 * All components receive ONLY this shape.
 *
 * @fileoverview This eliminates the 5 different data shapes that currently exist
 */

/**
 * Complete movie page data
 * @typedef {Object} MoviePageData
 * @property {MovieHeader} header - Basic movie info for header component
 * @property {AnalysisContent} analysis - Structured analysis content
 * @property {Contributor[]} contributors - Cast & crew
 * @property {StreamingInfo|null} streaming - Where to watch
 * @property {DataSource} source - Metadata about data origin
 */

/**
 * Movie header information
 * @typedef {Object} MovieHeader
 * @property {number} tmdbId - TMDB ID
 * @property {string} title - Movie title
 * @property {number} year - Release year
 * @property {string} tagline - One-line description
 * @property {string} posterUrl - Validated poster URL with fallback
 * @property {string|null} trailerVideoId - YouTube video ID
 * @property {string} overview - Full movie description
 */

/**
 * Analysis content structure
 * @typedef {Object} AnalysisContent
 * @property {Section[]} sections - Analysis paragraphs with links
 * @property {Movie[]} featuredMovies - Related films mentioned in analysis
 * @property {WhyWatch|null} whyWatch - YES/NO recommendation with reasons
 * @property {Movie[]} moreIdeas - Additional movie suggestions
 * @property {Topic[]} exploreTopics - Educational topics to explore
 */

/**
 * Text section with optional heading
 * @typedef {Object} Section
 * @property {string} text - HTML text with embedded movie/person links
 * @property {string|null} subhead - Optional section heading
 */

/**
 * Movie reference (for featured movies and more ideas)
 * @typedef {Object} Movie
 * @property {string} title - Movie title
 * @property {number} year - Release year
 * @property {number} tmdbId - TMDB ID
 * @property {string} posterUrl - Poster image URL
 * @property {string} slug - URL path (/movie/{tmdbId})
 * @property {string} [description] - Optional description
 * @property {string} [connection] - Optional connection explanation
 */

/**
 * Why Watch recommendation
 * @typedef {Object} WhyWatch
 * @property {'YES'|'NO'} recommendation - Binary recommendation
 * @property {string[]} reasons - Exactly 3 reasons, 5-8 words each
 */

/**
 * Explore topic
 * @typedef {Object} Topic
 * @property {string} topic - Topic name
 * @property {string} category - Category (e.g., "Genre Studies")
 * @property {string} difficulty - Difficulty level
 */

/**
 * Contributor (cast/crew)
 * @typedef {Object} Contributor
 * @property {string} name - Person name
 * @property {string} role - Role type: 'director'|'writer'|'star'|'cinematographer'|'composer'
 * @property {number|null} personId - Person ID for linking
 */

/**
 * Streaming information
 * @typedef {Object} StreamingInfo
 * @property {string} provider - Provider name (e.g., 'Netflix', 'Disney+')
 * @property {string} type - Access type: 'subscription'|'rent'|'buy'
 */

/**
 * Data source metadata
 * @typedef {Object} DataSource
 * @property {'static'|'database'|'api'} type - Where data came from
 * @property {number} loadTimeMs - Time to load in milliseconds
 * @property {boolean} cached - Whether data was cached
 */

/**
 * Validate movie page data structure
 * Throws if data is invalid
 * @param {*} data - Data to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateMoviePageData(data) {
  const errors = [];

  // Required header fields
  if (!data?.header) {
    errors.push('Missing header object');
  } else {
    if (!data.header.tmdbId) errors.push('Missing header.tmdbId');
    if (!data.header.title) errors.push('Missing header.title');
    if (data.header.year === null || data.header.year === undefined) {
      errors.push('Missing header.year');
    }
    if (!data.header.posterUrl) errors.push('Missing header.posterUrl');
    if (!data.header.tagline && !data.header.overview) {
      errors.push('Missing both header.tagline and header.overview');
    }
  }

  // Required analysis structure
  if (!data?.analysis) {
    errors.push('Missing analysis object');
  } else {
    if (!Array.isArray(data.analysis.sections)) {
      errors.push('analysis.sections must be an array');
    }
    if (!Array.isArray(data.analysis.featuredMovies)) {
      errors.push('analysis.featuredMovies must be an array');
    }
    if (!Array.isArray(data.analysis.moreIdeas)) {
      errors.push('analysis.moreIdeas must be an array');
    }
  }

  // Required metadata
  if (!data?.source) {
    errors.push('Missing source metadata');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid movie page data:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  return true;
}

/**
 * Create empty/loading state for movie page
 * @param {number} tmdbId - TMDB ID
 * @returns {MoviePageData} Empty data structure
 */
export function emptyMoviePageData(tmdbId) {
  return {
    header: {
      tmdbId,
      title: 'Loading...',
      year: 0, // Use 0 instead of null for loading state
      tagline: 'Loading movie data...',
      posterUrl: '/images/placeholder-poster.jpg',
      trailerVideoId: null,
      overview: 'Loading movie data...'
    },
    analysis: {
      sections: [],
      featuredMovies: [],
      whyWatch: null,
      moreIdeas: [],
      exploreTopics: []
    },
    contributors: [],
    streaming: null,
    source: {
      type: 'api',
      loadTimeMs: 0,
      cached: false
    }
  };
}

/**
 * Create error state for movie page
 * @param {number} tmdbId - TMDB ID
 * @param {string} errorMessage - Error message
 * @returns {MoviePageData} Error data structure
 */
export function errorMoviePageData(tmdbId, errorMessage) {
  return {
    header: {
      tmdbId,
      title: 'Error Loading Movie',
      year: null,
      tagline: errorMessage,
      posterUrl: '/images/placeholder-poster.jpg',
      trailerVideoId: null,
      overview: errorMessage
    },
    analysis: {
      sections: [],
      featuredMovies: [],
      whyWatch: null,
      moreIdeas: [],
      exploreTopics: []
    },
    contributors: [],
    streaming: null,
    source: {
      type: 'api',
      loadTimeMs: 0,
      cached: false
    }
  };
}

/**
 * Safe string extraction from various formats
 * @param {*} value - Value to extract string from
 * @param {string} fallback - Fallback value
 * @returns {string}
 */
export function safeString(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (value?.toString) return value.toString();
  return fallback;
}

/**
 * Safe number extraction
 * @param {*} value - Value to extract number from
 * @param {number|null} fallback - Fallback value
 * @returns {number|null}
 */
export function safeNumber(value, fallback = null) {
  const num = parseInt(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Safe array extraction
 * @param {*} value - Value to extract array from
 * @returns {Array}
 */
export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
