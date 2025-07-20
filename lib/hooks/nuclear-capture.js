/**
 * Nuclear Capture Client-Side Hook
 *
 * Client-side stub for nuclear capture functionality
 * Actual nuclear capture happens server-side during static generation
 */

/**
 * Client-side stub - no-op on browser
 */
export async function captureAsNuclear(tmdbId, pageProps) {
  // Nuclear capture happens server-side during build time
  // This is a client-side no-op to prevent errors
  if (typeof window !== 'undefined') {
    return; // Browser environment - do nothing
  }
}

/**
 * Client-side stub - only works server-side
 */
export function hasNuclearStatic(tmdbId) {
  // This function only works server-side during build
  if (typeof window !== 'undefined') {
    return false; // Browser environment
  }

  // Server-side implementation would be here
  try {
    const fs = require('fs');
    const path = require('path');
    const filepath = path.join(process.cwd(), 'nuclear-static', `${tmdbId}.json`);
    return fs.existsSync(filepath);
  } catch (error) {
    return false;
  }
}

/**
 * Client-side stub - only works server-side
 */
export function loadNuclearStatic(tmdbId) {
  // This function only works server-side during build
  if (typeof window !== 'undefined') {
    return null; // Browser environment
  }

  // Server-side implementation
  try {
    const fs = require('fs');
    const path = require('path');
    const filepath = path.join(process.cwd(), 'nuclear-static', `${tmdbId}.json`);
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}
