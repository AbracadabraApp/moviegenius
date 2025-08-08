// lib/supabase.js - Deprecated - Use Railway services directly
// This file exists only for legacy compatibility and will be removed

const browserError = () => {
  throw new Error('Supabase is deprecated - use Railway services directly');
};

// Stub exports to prevent build failures
export const supabase = {
  from: () => ({ 
    select: () => ({ 
      eq: () => ({ 
        single: browserError 
      }) 
    }) 
  })
};

export const supabaseAdmin = supabase;

// Legacy service exports (deprecated)
export const MovieService = {
  upsertMovie: browserError,
  getMovie: browserError,
  getMovieByTMDBId: browserError,
  getMovieByTitle: browserError,
  searchMovies: browserError,
  getAllMovies: browserError,
  getMoviesWithTMDB: browserError,
  getLatestAnalysis: browserError,
  hasAnalysis: browserError,
  deleteMovie: browserError
};

export const EpisodeService = {
  getEpisode: browserError,
  upsertEpisode: browserError,
  getEpisodesByTheme: browserError,
  getEpisodesBySeries: browserError,
  searchEpisodes: browserError,
  getAllEpisodes: browserError,
  lockEpisode: browserError,
  unlockEpisode: browserError,
  isEpisodeLocked: browserError
};

export const CacheService = {
  getCache: browserError,
  setCache: browserError,
  clearExpiredCache: browserError
};
