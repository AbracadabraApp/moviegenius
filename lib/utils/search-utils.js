/**
 * Search Utilities
 *
 * Pure utility functions for search query processing
 * Browser-safe - no database or server dependencies
 */

/**
 * Parse search query to extract title and year
 * Examples:
 * - "The Matrix 1999" → { title: "The Matrix", year: 1999 }
 * - "Inception" → { title: "Inception", year: null }
 * - "The Dark Knight 2008" → { title: "The Dark Knight", year: 2008 }
 */
export function parseSearchQuery(query) {
  // Extract year from end of query
  const yearMatch = query.match(/\s(\d{4})$/);
  if (!yearMatch) {
    return { title: query.trim(), year: null };
  }
  
  const year = parseInt(yearMatch[1]);
  const title = query.replace(/\s\d{4}$/, '').trim();
  
  // Validate year is reasonable (1900-current year + 5)
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear + 5) {
    // If year seems invalid, treat as part of title
    return { title: query.trim(), year: null };
  }
  
  return { title, year };
}

/**
 * Clean and normalize movie title for search
 */
export function normalizeTitle(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Create search variations for better matching
 */
export function createSearchVariations(title) {
  const variations = [title];
  
  // Remove common articles
  const withoutArticles = title.replace(/^(the|a|an)\s+/i, '');
  if (withoutArticles !== title) {
    variations.push(withoutArticles);
  }
  
  // Add "The" prefix if not present
  if (!title.toLowerCase().startsWith('the ')) {
    variations.push(`The ${title}`);
  }
  
  return [...new Set(variations)]; // Remove duplicates
}