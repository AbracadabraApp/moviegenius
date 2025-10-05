/**
 * Movie Page Data Loader
 *
 * SINGLE ENTRY POINT for all movie page data.
 * Replaces the complex 3-tier fallback logic in pages/movie/[id].js
 *
 * Flow:
 * 1. Try enhanced static file (fastest, pre-resolved)
 * 2. Try database API (medium, structured) - 21,275 analyses available
 * 3. Fall back to multiple APIs (slowest, for discovery)
 *
 * All paths return the SAME data shape (MoviePageData)
 */

import {
  validateMoviePageData,
  emptyMoviePageData,
  safeString,
  safeNumber,
  safeArray
} from './types/movie-page-data.js';

/**
 * Load complete movie page data
 * @param {number} tmdbId - TMDB movie ID
 * @returns {Promise<MoviePageData>}
 * @throws {Error} If movie cannot be loaded from any source
 */
export async function loadMoviePageData(tmdbId) {
  const startTime = performance.now();

  console.log(`🔍 Loading movie ${tmdbId}...`);

  // Try each data source in order
  const loaders = [
    { name: 'Enhanced Static', fn: () => loadFromEnhancedStatic(tmdbId) },
    // Nuclear static skipped - only 6 files, not worth maintaining
    { name: 'Database API', fn: () => loadFromDatabase(tmdbId) },
    { name: 'Multiple APIs', fn: () => loadFromAPIs(tmdbId) }
  ];

  for (const { name, fn } of loaders) {
    try {
      const data = await fn();
      if (data) {
        data.source.loadTimeMs = performance.now() - startTime;
        validateMoviePageData(data);
        console.log(`✅ Loaded from ${name} in ${data.source.loadTimeMs.toFixed(0)}ms`);
        return data;
      }
    } catch (error) {
      console.log(`⚠️  ${name} failed: ${error.message}`);
      continue;
    }
  }

  throw new Error(`Could not load movie ${tmdbId} from any source`);
}

/**
 * Load from enhanced static file
 * Format: /data/enhanced-movies/movie-{tmdbId}.json
 */
async function loadFromEnhancedStatic(tmdbId) {
  const res = await fetch(`/data/enhanced-movies/movie-${tmdbId}.json`);
  if (!res.ok) return null;

  const data = await res.json();

  // Enhanced format validation
  if (!data.enhancedFormat || !data.analysis) {
    return null;
  }

  return {
    header: {
      tmdbId: safeNumber(data.tmdbId, tmdbId),
      title: safeString(data.title, 'Unknown Movie'),
      year: safeNumber(data.year),
      tagline: safeString(data.movieHeader?.overview, ''),
      posterUrl: safeString(data.movieHeader?.posterUrl, '/images/placeholder-poster.jpg'),
      trailerVideoId: data.movieHeader?.trailerVideoId || null,
      overview: safeString(data.movieHeader?.overview, '')
    },
    analysis: {
      sections: transformSections(data.analysis.sections),
      featuredMovies: transformMovies(data.analysis.featuredMovies),
      whyWatch: data.analysis.whyWatch || null,
      moreIdeas: transformMovies(data.analysis.moreIdeas),
      exploreTopics: safeArray(data.analysis.exploreTopics)
    },
    contributors: transformContributors(data.keyElements),
    streaming: data.movieHeader?.streaming || null,
    source: {
      type: 'static',
      loadTimeMs: 0,
      cached: true
    }
  };
}

/**
 * loadFromNuclearStatic() - REMOVED
 *
 * Nuclear static format not worth maintaining:
 * - Only 6 files exist
 * - Legacy format with incomplete data
 * - Database has 21,275 complete analyses
 * - Better to focus on enhanced static generation
 *
 * Decision: Skip nuclear, go straight to database fallback
 */

/**
 * Load from database API
 * Uses existing /api/movie-analysis endpoint
 */
async function loadFromDatabase(tmdbId) {
  // Fetch both TMDB data and analysis in parallel
  const [tmdbRes, analysisRes, streamingRes] = await Promise.all([
    fetch(`/api/tmdb-movie?id=${tmdbId}`),
    fetch(`/api/movie-analysis?tmdbId=${tmdbId}`),
    fetch(`/api/movie-streaming?id=${tmdbId}`)
  ]);

  if (!tmdbRes.ok) return null;

  const tmdbData = await tmdbRes.json();
  const analysisData = analysisRes.ok ? await analysisRes.json() : null;
  const streamingData = streamingRes.ok ? await streamingRes.json() : null;

  // Extract year from release_date
  const year = tmdbData.release_date
    ? new Date(tmdbData.release_date).getFullYear()
    : null;

  // Build poster URL
  const posterUrl = tmdbData.poster_path
    ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
    : '/images/placeholder-poster.jpg';

  return {
    header: {
      tmdbId,
      title: safeString(tmdbData.title, 'Unknown Movie'),
      year,
      tagline: safeString(tmdbData.tagline, ''),
      posterUrl,
      trailerVideoId: null, // Would need separate API call
      overview: safeString(tmdbData.overview, '')
    },
    analysis: parseAnalysisResponse(analysisData),
    contributors: [],
    streaming: streamingData?.streaming_data || null,
    source: {
      type: 'database',
      loadTimeMs: 0,
      cached: !!analysisData?.cached
    }
  };
}

/**
 * Load from multiple APIs (slowest fallback)
 */
async function loadFromAPIs(tmdbId) {
  // Same as loadFromDatabase for now
  // Could add additional API calls here if needed
  return loadFromDatabase(tmdbId);
}

/**
 * Parse analysis response from database API
 * Handles both old text format and new JSON format
 */
function parseAnalysisResponse(analysisData) {
  if (!analysisData) {
    return {
      sections: [],
      featuredMovies: [],
      whyWatch: null,
      moreIdeas: [],
      exploreTopics: []
    };
  }

  // Check if analysis is in JSON format
  const content = analysisData.analysis || analysisData.rawAnalysis || '';

  try {
    // Try to parse as JSON
    const jsonData = JSON.parse(content);

    if (jsonData.content || jsonData.sections) {
      return {
        sections: transformSections(jsonData.content || jsonData.sections),
        featuredMovies: transformMovies(jsonData.featuredMovies),
        whyWatch: jsonData.whyWatch || null,
        moreIdeas: transformMovies(jsonData.moreIdeas),
        exploreTopics: safeArray(jsonData.exploreTopics)
      };
    }
  } catch (e) {
    // Not JSON, treat as text format
  }

  // Legacy text format - parse PARAGRAPH: sections
  const sections = parseLegacyTextFormat(content);

  // Extract featured movies from entityData
  const featuredMovies = analysisData.entityData?.featuredMovies
    ? transformMovies(analysisData.entityData.featuredMovies)
    : [];

  return {
    sections,
    featuredMovies,
    whyWatch: null,
    moreIdeas: [],
    exploreTopics: []
  };
}

/**
 * Parse legacy PARAGRAPH: format
 */
function parseLegacyTextFormat(content) {
  if (!content) return [];

  const sections = [];
  const paragraphs = content.split(/PARAGRAPH:\s*/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed && !trimmed.startsWith('MOVIES:') && !trimmed.startsWith('KEY_CONTRIBUTORS:')) {
      sections.push({
        text: trimmed,
        subhead: null
      });
    }
  }

  return sections;
}

/**
 * Transform sections array to consistent format
 */
function transformSections(sections) {
  if (!sections || !Array.isArray(sections)) return [];

  return sections.map(section => {
    // Handle different section formats
    if (typeof section === 'string') {
      return { text: section, subhead: null };
    }

    if (section.text) {
      return {
        text: safeString(section.text, ''),
        subhead: section.subhead || null
      };
    }

    if (section.content) {
      return {
        text: safeString(section.content, ''),
        subhead: null
      };
    }

    return { text: '', subhead: null };
  }).filter(s => s.text); // Remove empty sections
}

/**
 * transformNuclearSections() - REMOVED
 * Nuclear static format no longer supported (only 6 files existed)
 */

/**
 * Transform movies array to consistent format
 */
function transformMovies(movies) {
  if (!movies || !Array.isArray(movies)) return [];

  return movies.map(movie => {
    const tmdbId = safeNumber(movie.tmdbId || movie.tmdb_id);

    return {
      title: safeString(movie.title, 'Unknown Movie'),
      year: safeNumber(movie.year),
      tmdbId,
      posterUrl: safeString(
        movie.posterUrl || movie.poster_url || movie.poster,
        '/images/placeholder-poster.jpg'
      ),
      slug: movie.slug || (tmdbId ? `/movie/${tmdbId}` : ''),
      description: movie.description || movie.overview || '',
      connection: movie.connection || ''
    };
  }).filter(m => m.title && m.title !== 'Unknown Movie');
}

/**
 * Transform contributors/keyElements to consistent format
 */
function transformContributors(keyElements) {
  if (!keyElements) return [];

  const contributors = [];

  // Director
  if (keyElements.director) {
    contributors.push({
      name: safeString(keyElements.director.name, ''),
      role: 'director',
      personId: safeNumber(keyElements.director.personId)
    });
  }

  // Writers
  if (Array.isArray(keyElements.writers)) {
    keyElements.writers.forEach(writer => {
      contributors.push({
        name: safeString(writer.name, ''),
        role: 'writer',
        personId: safeNumber(writer.personId)
      });
    });
  }

  // Stars
  if (Array.isArray(keyElements.stars)) {
    keyElements.stars.forEach(star => {
      contributors.push({
        name: safeString(star.name, ''),
        role: 'star',
        personId: safeNumber(star.personId)
      });
    });
  }

  // Cinematographer
  if (keyElements.cinematographer) {
    contributors.push({
      name: safeString(keyElements.cinematographer.name, ''),
      role: 'cinematographer',
      personId: safeNumber(keyElements.cinematographer.personId)
    });
  }

  // Composer
  if (keyElements.composer) {
    contributors.push({
      name: safeString(keyElements.composer.name, ''),
      role: 'composer',
      personId: safeNumber(keyElements.composer.personId)
    });
  }

  return contributors.filter(c => c.name);
}

/**
 * Preflight check - test if enhanced static exists
 * Useful for conditional logic without loading full file
 */
export async function hasEnhancedStatic(tmdbId) {
  try {
    const res = await fetch(`/data/enhanced-movies/movie-${tmdbId}.json`, {
      method: 'HEAD'
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get data source type without loading full data
 * Useful for analytics/debugging
 */
export async function getDataSourceType(tmdbId) {
  try {
    const enhanced = await fetch(`/data/enhanced-movies/movie-${tmdbId}.json`, { method: 'HEAD' });
    if (enhanced.ok) return 'enhanced-static';

    const nuclear = await fetch(`/nuclear-static/${tmdbId}.json`, { method: 'HEAD' });
    if (nuclear.ok) return 'nuclear-static';

    return 'dynamic';
  } catch {
    return 'dynamic';
  }
}
