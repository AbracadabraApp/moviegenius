/**
 * TV Show Filter Utility
 *
 * Filters TV shows from MoreIdeas recommendations at runtime
 * Used by API endpoints to prevent TV shows from being returned to clients
 */

// TV show detection patterns
const TV_SHOW_KEYWORDS = [
  /season \d+/i,
  /s\d{2}e\d{2}/i,  // S01E01 format
  /: the series/i,
  /: season/i,
  /- season/i,
  /tv special/i,
  /television special/i,
  /tv movie/i,
  /series finale/i,
  /pilot episode/i,
  /the complete series/i,
  /collection:/i
];

/**
 * Check if a title matches TV show patterns
 * @param {string} title - Movie/show title
 * @returns {boolean} - True if likely a TV show
 */
function isTVShow(title) {
  if (!title) return false;

  for (const pattern of TV_SHOW_KEYWORDS) {
    if (pattern.test(title)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter TV shows from an array of MoreIdeas
 * @param {Array} ideas - Array of recommendation objects
 * @param {Object} options - Filtering options
 * @param {boolean} options.requireTmdbId - Only keep entries with tmdbId (default: true)
 * @param {boolean} options.logRemoved - Log removed entries (default: false)
 * @returns {Array} - Filtered array
 */
function filterTVShows(ideas, options = {}) {
  const {
    requireTmdbId = true,
    logRemoved = false
  } = options;

  if (!Array.isArray(ideas)) {
    return [];
  }

  return ideas.filter(idea => {
    // Filter by title keywords
    if (isTVShow(idea.title)) {
      if (logRemoved) {
        console.log(`Filtered TV show: "${idea.title}" (${idea.year})`);
      }
      return false;
    }

    // Filter entries with null tmdbId (likely TV shows or invalid)
    if (requireTmdbId && !idea.tmdbId) {
      if (logRemoved) {
        console.log(`Filtered null tmdbId: "${idea.title}" (${idea.year})`);
      }
      return false;
    }

    return true;
  });
}

/**
 * Get filter statistics
 * @param {Array} ideas - Original ideas array
 * @param {Array} filtered - Filtered ideas array
 * @returns {Object} - Statistics
 */
function getFilterStats(ideas, filtered) {
  return {
    original: ideas.length,
    filtered: filtered.length,
    removed: ideas.length - filtered.length,
    removalRate: ((ideas.length - filtered.length) / ideas.length * 100).toFixed(1) + '%'
  };
}

module.exports = {
  isTVShow,
  filterTVShows,
  getFilterStats,
  TV_SHOW_KEYWORDS
};
