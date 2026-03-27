/**
 * Nuclear System Configuration - Centralized settings
 *
 * Single source of truth for all nuclear-related configuration
 */

export const NUCLEAR_CONFIG = {
  // Core nuclear settings
  TOP_MOVIE_COUNT: parseInt(process.env.NUCLEAR_TOP_COUNT) || 5000,
  ISR_REVALIDATE_SECONDS: parseInt(process.env.ISR_REVALIDATE) || 86400,

  // Development testing
  TEST_MOVIES: process.env.NODE_ENV === 'development' ? [550, 603, 680] : [],
  SHOW_TEST_BANNERS: false,

  // Claude API settings
  CLAUDE: {
    MODEL: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
    BATCH_SIZE: parseInt(process.env.CLAUDE_BATCH_SIZE) || 25,
    MAX_TOKENS: parseInt(process.env.CLAUDE_MAX_TOKENS) || 4000,
    TIMEOUT_MS: parseInt(process.env.CLAUDE_TIMEOUT) || 30000,
  },

  // Autonomous system
  AUTONOMOUS: {
    BATCH_SIZE: parseInt(process.env.AUTO_BATCH_SIZE) || 10,
    INTERVAL_MINUTES: parseInt(process.env.AUTO_INTERVAL) || 5,
    MAX_COST_PER_HOUR: parseFloat(process.env.AUTO_MAX_COST) || 2.0,
    MAX_RETRIES: parseInt(process.env.AUTO_MAX_RETRIES) || 3,
  },

  // Database
  DATABASE: {
    ANALYSIS_TYPE: 'page_analysis',
    REQUIRED_MOVIE_FIELDS: ['id', 'title', 'year', 'tmdb_id'],
    REQUIRED_ANALYSIS_FIELDS: ['movie_id', 'claude_response', 'analysis_type'],
  },
};

// Validation
export function validateNuclearConfig() {
  const errors = [];

  if (NUCLEAR_CONFIG.TOP_MOVIE_COUNT < 1 || NUCLEAR_CONFIG.TOP_MOVIE_COUNT > 10000) {
    errors.push('TOP_MOVIE_COUNT must be between 1 and 10000');
  }

  if (NUCLEAR_CONFIG.CLAUDE.BATCH_SIZE < 1 || NUCLEAR_CONFIG.CLAUDE.BATCH_SIZE > 100) {
    errors.push('CLAUDE.BATCH_SIZE must be between 1 and 100');
  }

  if (errors.length > 0) {
    throw new Error(`Nuclear config validation failed: ${errors.join(', ')}`);
  }
}
