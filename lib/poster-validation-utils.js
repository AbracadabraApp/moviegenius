/**
 * Poster URL Validation Utilities
 * Reusable validation functions for preventing poster URL corruption
 */

// Known corrupted poster IDs to block
const CORRUPTED_POSTER_IDS = new Set([
  'h7Lcio0c9ohxPhSZg42eTlKIVVY', // Previous corruption
  '7kNcpmP1Pe9fWLKEbEOX5GEWueC', // Current corruption (Persona poster)
]);

// Known corrupted full URLs
const CORRUPTED_POSTER_URLS = new Set([
  'https://image.tmdb.org/t/p/w500/h7Lcio0c9ohxPhSZg42eTlKIVVY.jpg',
  'https://image.tmdb.org/t/p/w500/7kNcpmP1Pe9fWLKEbEOX5GEWueC.jpg',
]);

/**
 * Extract poster ID from TMDB poster URL
 * @param {string} posterUrl - Full poster URL
 * @returns {string|null} - Poster ID or null if not found
 */
function extractPosterId(posterUrl) {
  if (!posterUrl || typeof posterUrl !== 'string') return null;
  
  const match = posterUrl.match(/\/([^\/]+)\.jpg$/);
  return match ? match[1] : null;
}

/**
 * Check if a poster URL is known to be corrupted
 * @param {string} posterUrl - Poster URL to validate
 * @returns {boolean} - true if corrupted, false if clean
 */
function isCorruptedPosterUrl(posterUrl) {
  if (!posterUrl) return false;
  
  // Check full URL
  if (CORRUPTED_POSTER_URLS.has(posterUrl)) {
    return true;
  }
  
  // Check poster ID
  const posterId = extractPosterId(posterUrl);
  if (posterId && CORRUPTED_POSTER_IDS.has(posterId)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a poster URL is a placeholder
 * @param {string} posterUrl - Poster URL to validate
 * @returns {boolean} - true if placeholder, false if real poster
 */
function isPlaceholderPosterUrl(posterUrl) {
  if (!posterUrl) return false;
  
  const placeholderPatterns = [
    '/images/placeholder-poster.jpg',
    'placeholder',
    'default-poster',
    'no-image',
    'missing-poster'
  ];
  
  const lowerUrl = posterUrl.toLowerCase();
  return placeholderPatterns.some(pattern => lowerUrl.includes(pattern));
}

/**
 * Validate a poster URL for database insertion/update
 * @param {string} posterUrl - Poster URL to validate
 * @param {string} context - Context for logging (optional)
 * @returns {boolean} - true if valid, false if should be rejected
 */
function isValidPosterUrl(posterUrl, context = '') {
  if (!posterUrl) {
    if (context) console.log(`🚫 Poster validation: NULL URL ${context ? 'for ' + context : ''}`);
    return false;
  }
  
  // Check for corrupted posters
  if (isCorruptedPosterUrl(posterUrl)) {
    console.log(`🚨 Poster validation: BLOCKED corrupted poster ${extractPosterId(posterUrl)} ${context ? 'for ' + context : ''}`);
    return false;
  }
  
  // Check for placeholders
  if (isPlaceholderPosterUrl(posterUrl)) {
    console.log(`🚫 Poster validation: BLOCKED placeholder poster ${context ? 'for ' + context : ''}`);
    return false;
  }
  
  console.log(`✅ Poster validation: APPROVED ${extractPosterId(posterUrl)} ${context ? 'for ' + context : ''}`);
  return true;
}

/**
 * Generate SQL CASE statement for safe poster URL updates
 * @param {string} excludedColumn - Name of the EXCLUDED column (default: 'poster_url')
 * @returns {string} - SQL CASE statement for ON CONFLICT clauses
 */
function generateSafePosterUpdateSQL(excludedColumn = 'poster_url') {
  const corruptedUrls = Array.from(CORRUPTED_POSTER_URLS).map(url => `'${url}'`).join(', ');
  
  return `
    CASE 
      WHEN EXCLUDED.${excludedColumn} IS NOT NULL 
        AND EXCLUDED.${excludedColumn} NOT IN (${corruptedUrls})
        AND EXCLUDED.${excludedColumn} != '/images/placeholder-poster.jpg'
        AND EXCLUDED.${excludedColumn} NOT LIKE '%placeholder%'
      THEN EXCLUDED.${excludedColumn}
      ELSE movies.${excludedColumn}
    END`.trim();
}

/**
 * Add a new corrupted poster URL to the blocklist
 * @param {string} posterUrl - Corrupted poster URL to block
 */
function addCorruptedPosterUrl(posterUrl) {
  CORRUPTED_POSTER_URLS.add(posterUrl);
  
  const posterId = extractPosterId(posterUrl);
  if (posterId) {
    CORRUPTED_POSTER_IDS.add(posterId);
  }
  
  console.log(`🚨 Added corrupted poster to blocklist: ${posterId} (${posterUrl})`);
}

/**
 * Get statistics about current validation rules
 * @returns {object} - Validation statistics
 */
function getValidationStats() {
  return {
    corrupted_urls_blocked: CORRUPTED_POSTER_URLS.size,
    corrupted_ids_blocked: CORRUPTED_POSTER_IDS.size,
    validation_enabled: true,
    last_updated: '2025-08-09'
  };
}

export {
  extractPosterId,
  isCorruptedPosterUrl,
  isPlaceholderPosterUrl,
  isValidPosterUrl,
  generateSafePosterUpdateSQL,
  addCorruptedPosterUrl,
  getValidationStats,
  CORRUPTED_POSTER_IDS,
  CORRUPTED_POSTER_URLS
};