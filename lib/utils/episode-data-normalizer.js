/**
 * Episode Data Normalizer
 *
 * Fixes broken episode content by normalizing movie data:
 * - Converts IMDb IDs to TMDB IDs
 * - Adds missing poster URLs
 * - Ensures proper movie linking
 */

// Common IMDb to TMDB ID mappings for movies in episode data
const IMDB_TO_TMDB_MAP = {
  tt0045555: 13667, // The Big Heat (1953)
  tt0036775: 996, // Double Indemnity (1944)
  tt0039874: 37503, // T-Men (1947)
  tt0048424: 1273, // The Night of the Hunter (1955)
  tt0040525: 1092, // The Lady from Shanghai (1947)
  tt0040636: 27583, // The Naked City (1948)
  tt0037638: 3090, // Detour (1945)
  tt0038787: 1585, // Notorious (1946)
  tt0039725: 27084, // Possessed (1947)
  tt0042792: 28679, // No Way Out (1950)
  tt0075314: 103, // Taxi Driver (1976)
  tt1856101: 335984, // Blade Runner 2049 (2017)
  tt0022100: 11067, // M (1931)
  tt0010323: 234, // The Cabinet of Dr. Caligari (1920)
  tt0038057: 27072, // Scarlet Street (1945)
  tt0038960: 27085, // The Spiral Staircase (1946)
  tt0041786: 28680, // The Reckless Moment (1949)
  tt0037913: 18785, // Mildred Pierce (1945)
  tt0038109: 1640, // Spellbound (1945)
  tt0041959: 1092, // The Third Man (1949)
  tt0052311: 1593, // Touch of Evil (1958)
  tt0090756: 2677, // Blue Velvet (1986)
};

// Common movies without TMDB IDs that need to be looked up
const MOVIES_NEEDING_TMDB_LOOKUP = [
  { title: 'M', year: 1931, tmdb_id: 11067 },
  { title: 'Hypocrites', year: 1914, tmdb_id: 105408 },
  { title: 'The Cabinet of Dr. Caligari', year: 1920, tmdb_id: 234 },
  { title: 'Nosferatu', year: 1922, tmdb_id: 653 },
  { title: 'The Last Laugh', year: 1924, tmdb_id: 5991 },
  { title: 'Sunrise: A Song of Two Humans', year: 1927, tmdb_id: 631 },
  { title: 'Waxworks', year: 1924, tmdb_id: 27522 },
  { title: "Pandora's Box", year: 1929, tmdb_id: 905 },
  { title: 'Berlin: Symphony of a Great City', year: 1927, tmdb_id: 222 },
  { title: 'The Golem', year: 1920, tmdb_id: 2972 },
  { title: 'Double Indemnity', year: 1944, tmdb_id: 996 },
  { title: 'The Third Man', year: 1949, tmdb_id: 1092 },
];

/**
 * Normalize a movie object to ensure proper TMDB ID and poster URL
 */
export function normalizeMovie(movie) {
  if (!movie || !movie.title) return movie;

  const normalizedMovie = { ...movie };

  // Fix IMDb ID format to TMDB ID
  if (typeof normalizedMovie.tmdb_id === 'string' && normalizedMovie.tmdb_id.startsWith('tt')) {
    const tmdbId = IMDB_TO_TMDB_MAP[normalizedMovie.tmdb_id];
    if (tmdbId) {
      console.log(
        `🔄 Converting IMDb ID ${normalizedMovie.tmdb_id} to TMDB ID ${tmdbId} for "${movie.title}"`
      );
      normalizedMovie.tmdb_id = tmdbId;
    } else {
      console.warn(`❌ Unknown IMDb ID ${normalizedMovie.tmdb_id} for "${movie.title}"`);
      normalizedMovie.tmdb_id = null;
    }
  }

  // Look up TMDB ID for movies that need it
  if (!normalizedMovie.tmdb_id || normalizedMovie.tmdb_id === null) {
    const lookup = MOVIES_NEEDING_TMDB_LOOKUP.find(
      m => m.title.toLowerCase() === movie.title.toLowerCase() && m.year === movie.year
    );
    if (lookup) {
      console.log(`🔍 Adding TMDB ID ${lookup.tmdb_id} for "${movie.title}" (${movie.year})`);
      normalizedMovie.tmdb_id = lookup.tmdb_id;
    }
  }

  // Leave poster_url as null if not available - will use styled placeholder
  if (!normalizedMovie.poster_url || normalizedMovie.poster_url === null) {
    normalizedMovie.poster_url = null;
  }

  return normalizedMovie;
}

/**
 * Normalize episode content by fixing all movie references
 */
export function normalizeEpisodeContent(episodeData) {
  if (!episodeData || !episodeData.content) return episodeData;

  const normalizedData = { ...episodeData };

  // Normalize movies in sections
  if (normalizedData.content.sections) {
    normalizedData.content.sections = normalizedData.content.sections.map(section => {
      if (section.type === 'movies' && section.movies) {
        return {
          ...section,
          movies: section.movies.map(normalizeMovie),
        };
      }
      return section;
    });
  }

  // Normalize movies in moreIdeas
  if (normalizedData.content.moreIdeas?.movies) {
    normalizedData.content.moreIdeas.movies =
      normalizedData.content.moreIdeas.movies.map(normalizeMovie);
  }

  return normalizedData;
}

/**
 * Check if episode content needs normalization
 */
export function needsNormalization(episodeData) {
  if (!episodeData || !episodeData.content) return false;

  const allMovies = [];

  // Collect all movies from sections
  if (episodeData.content.sections) {
    episodeData.content.sections.forEach(section => {
      if (section.type === 'movies' && section.movies) {
        allMovies.push(...section.movies);
      }
    });
  }

  // Collect movies from moreIdeas
  if (episodeData.content.moreIdeas?.movies) {
    allMovies.push(...episodeData.content.moreIdeas.movies);
  }

  // Check if any movie needs fixing
  return allMovies.some(movie => {
    if (!movie || !movie.title) return false;

    // Needs fixing if:
    // - Has IMDb ID format
    // - Has null tmdb_id
    // - Missing poster URL
    return (
      (typeof movie.tmdb_id === 'string' && movie.tmdb_id.startsWith('tt')) ||
      movie.tmdb_id === null ||
      !movie.poster_url ||
      movie.poster_url === null
    );
  });
}
