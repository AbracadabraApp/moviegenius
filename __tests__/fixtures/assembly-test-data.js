/**
 * Test Fixtures for Enhanced Assembly Function
 *
 * Known movies with complete data across all constituent parts:
 * - enhanced_sections (analysis content)
 * - enhanced_why_watch (binary recommendations)
 * - more_ideas (movie suggestions)
 * - movie_contributors (cast/crew data)
 */

export const TEST_MOVIES = {
  // Fight Club - for consistency with existing enhanced static file
  FIGHT_CLUB: {
    tmdbId: 550,
    title: 'Fight Club',
    year: 1999,
    expectedSections: 4, // Expected number of analysis sections
    expectedLinks: 5, // Expected number of **Movie Title** patterns to convert
    hasWhyWatch: true,
    hasMoreIdeas: true,
    hasContributors: false // No contributors in database
  },

  // Charlie's Angels - confirmed to have enhanced_sections data
  CHARLIES_ANGELS: {
    tmdbId: 1463597,
    title: 'Charlie\'s Angels',
    year: 1976,
    expectedSections: 4, // From database query: Array with 4 items
    expectedLinks: 3, // Estimated based on typical analysis
    hasWhyWatch: true,
    hasMoreIdeas: true,
    hasContributors: false // No contributors in database
  },

  // The Rocketeer - sample from database queries
  THE_ROCKETEER: {
    tmdbId: 10249,
    title: 'The Rocketeer',
    year: 1991,
    expectedSections: 3, // Estimated
    expectedLinks: 4, // Estimated
    hasWhyWatch: true,
    hasMoreIdeas: true,
    hasContributors: true // Has 9 contributors
  }
};

/**
 * Expected Enhanced Static File Structure
 * This is what the assembly function should produce
 */
export const EXPECTED_ENHANCED_FORMAT = {
  // Core movie identification
  tmdbId: 'number',
  title: 'string',
  year: 'number',

  // Movie header data (for MovieHeaderLarge component)
  movieHeader: {
    title: 'string',
    year: 'number',
    posterUrl: 'string', // Pre-resolved TMDB poster URL
    trailerVideoId: 'string|null', // YouTube video ID
    streaming: 'string|null', // Streaming availability
    overview: 'string' // Movie overview/description
  },

  // Analysis content (main content)
  analysis: {
    keyElements: 'object', // From enhanced_key_elements field
    sections: 'array', // From enhanced_sections field, processed for links
    whyWatch: {
      recommendation: 'string', // YES/NO
      reasons: 'array' // Array of 3 reasons
    },
    featuredMovies: 'array', // Related movies with metadata
    moreIdeas: 'array', // From more_ideas table
    exploreTopics: 'array' // Educational topics
  },

  // Contributors data (for MovieCreativeFooter)
  keyElements: {
    director: 'object|null',
    stars: 'array',
    cinematographer: 'object|null',
    composer: 'object|null'
  },

  // Metadata
  enhancedFormat: true,
  staticGenerated: true,
  lastUpdated: 'string', // ISO date
  buildData: {
    posterValidated: 'boolean',
    streamingCurrent: 'boolean',
    trailerResolved: 'boolean',
    linksProcessed: 'boolean'
  }
};

/**
 * Sample Movie Title Patterns for Link Testing
 * These should be converted from **Movie Title** (Year) to HTML links
 */
export const MOVIE_TITLE_PATTERNS = [
  {
    input: 'This film shares DNA with **The Matrix** (1999) in its reality-questioning themes.',
    expected: 'This film shares DNA with <a href="/movie/603" class="movie-title" data-tmdb-id="603">The Matrix</a> (1999) in its reality-questioning themes.'
  },
  {
    input: 'Like **Citizen Kane** (1941), it explores the corruption of power.',
    expected: 'Like <a href="/movie/15" class="movie-title" data-tmdb-id="15">Citizen Kane</a> (1941), it explores the corruption of power.'
  },
  {
    input: 'Similar to **Blade Runner** (1982) and **Minority Report** (2002).',
    expected: 'Similar to <a href="/movie/78" class="movie-title" data-tmdb-id="78">Blade Runner</a> (1982) and <a href="/movie/180" class="movie-title" data-tmdb-id="180">Minority Report</a> (2002).'
  }
];

/**
 * Database Field Mapping
 * Maps the correct database sources for assembly function
 */
export const DATA_SOURCE_MAPPING = {
  analysis: {
    table: 'movie_analyses',
    contentField: 'enhanced_sections', // NOT claude_response.raw_content
    keyElementsField: 'enhanced_key_elements',
    condition: 'analysis_type = \'general\' AND enhanced_format = true'
  },
  whyWatch: {
    table: 'enhanced_why_watch',
    fields: ['recommendation', 'reasons'],
    joinOn: 'tmdb_id'
  },
  moreIdeas: {
    table: 'more_ideas',
    fields: ['ideas'],
    joinOn: 'tmdb_id'
  },
  contributors: {
    table: 'movie_contributors',
    fields: ['person_name', 'role', 'person_id'],
    joinOn: 'movie_tmdb_id'
  }
};

/**
 * Test Database Queries
 * SQL queries to validate data availability for test movies
 */
export const TEST_QUERIES = {
  checkEnhancedAnalysis: `
    SELECT
      m.tmdb_id,
      m.title,
      ma.enhanced_sections IS NOT NULL as has_sections,
      ma.enhanced_key_elements IS NOT NULL as has_key_elements,
      ma.enhanced_format
    FROM movies m
    JOIN movie_analyses ma ON m.id = ma.movie_id
    WHERE m.tmdb_id IN ($1, $2, $3)
    AND ma.analysis_type = 'general'
    AND ma.enhanced_format = true
  `,

  checkWhyWatch: `
    SELECT tmdb_id, recommendation, reasons
    FROM enhanced_why_watch
    WHERE tmdb_id IN ($1, $2, $3)
  `,

  checkMoreIdeas: `
    SELECT tmdb_id, ideas
    FROM more_ideas
    WHERE tmdb_id IN ($1, $2, $3)
  `,

  checkContributors: `
    SELECT movie_tmdb_id, COUNT(*) as contributor_count
    FROM movie_contributors
    WHERE movie_tmdb_id IN ($1, $2, $3)
    GROUP BY movie_tmdb_id
  `
};