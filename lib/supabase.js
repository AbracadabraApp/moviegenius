// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only throw error in production or when actually using the client
const isBuild = process.env.NODE_ENV === 'production' && !process.env.RAILWAY_ENVIRONMENT_NAME;
if (!isBuild && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('Missing Supabase environment variables - using placeholders for build');
}

// Client for browser/frontend use with build-safe fallbacks
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Database helpers
export const MovieService = {
  // Insert movie with focused fields
  async upsertMovie(movieData) {
    const { data, error } = await supabase
      .from('movies')
      .upsert(
        {
          tmdb_id: movieData.tmdb_id,
          official_title: movieData.official_title,
          release_date: movieData.release_date,
          title: movieData.title,
          year: movieData.year,
          slug: movieData.slug,
          poster_url: movieData.poster_url,
          streaming_data: movieData.streaming_data,
        },
        {
          onConflict: 'title,year',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get movie by title and year
  async getMovie(title, year) {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('title', title)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Get movie by TMDB ID (efficient lookup)
  async getMovieByTMDBId(tmdbId) {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Search movies
  async searchMovies(query, limit = 20) {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .or(`title.ilike.%${query}%, official_title.ilike.%${query}%, slug.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Get all movies (for admin/stats)
  async getAllMovies() {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get movies with TMDB data (premium movies)
  async getMoviesWithTMDB() {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .not('tmdb_id', 'is', null)
      .order('title');

    if (error) throw error;
    return data;
  },
};

export const EpisodeService = {
  // Get episode by theme, series, and episode ID
  async getEpisode(themeId, seriesId, episodeId) {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('episodes')
      .select('*')
      .eq('theme_id', themeId)
      .eq('series_id', seriesId)
      .eq('episode_id', episodeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Insert or update episode content
  async upsertEpisode(episodeData) {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('episodes')
      .upsert(
        {
          theme_id: episodeData.theme_id,
          series_id: episodeData.series_id,
          episode_id: episodeData.episode_id,
          title: episodeData.title,
          subtitle: episodeData.subtitle,
          content: episodeData.content,
          hero_image: episodeData.hero_image,
          generated_at: episodeData.generated_at,
          version: episodeData.version,
          locked: episodeData.locked,
          locked_at: episodeData.locked_at,
          locked_by: episodeData.locked_by,
        },
        {
          onConflict: 'theme_id,series_id,episode_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all episodes for a theme
  async getEpisodesByTheme(themeId) {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('episodes')
      .select('*')
      .eq('theme_id', themeId)
      .order('series_id', { ascending: true })
      .order('episode_id', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get all episodes for a series
  async getEpisodesBySeries(themeId, seriesId) {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('episodes')
      .select('*')
      .eq('theme_id', themeId)
      .eq('series_id', seriesId)
      .order('episode_id', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Search episodes by content
  async searchEpisodes(query, limit = 20) {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('episodes')
      .select('*')
      .or(`title.ilike.%${query}%, subtitle.ilike.%${query}%`)
      .limit(limit)
      .order('theme_id', { ascending: true })
      .order('series_id', { ascending: true })
      .order('episode_id', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get all episodes (for admin/stats)
  async getAllEpisodes() {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .order('theme_id', { ascending: true })
      .order('series_id', { ascending: true })
      .order('episode_id', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Lock/unlock episode to prevent regeneration
  async lockEpisode(themeId, seriesId, episodeId, lockedBy = 'system') {
    const { data, error } = await supabase
      .from('episodes')
      .update({
        locked: true,
        locked_at: new Date().toISOString(),
        locked_by: lockedBy,
      })
      .eq('theme_id', themeId)
      .eq('series_id', seriesId)
      .eq('episode_id', episodeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async unlockEpisode(themeId, seriesId, episodeId) {
    const { data, error } = await supabase
      .from('episodes')
      .update({
        locked: false,
        locked_at: null,
        locked_by: null,
      })
      .eq('theme_id', themeId)
      .eq('series_id', seriesId)
      .eq('episode_id', episodeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Check if episode is locked
  async isEpisodeLocked(themeId, seriesId, episodeId) {
    const { data, error } = await supabase
      .from('episodes')
      .select('locked, locked_at, locked_by')
      .eq('theme_id', themeId)
      .eq('series_id', seriesId)
      .eq('episode_id', episodeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.locked || false;
  },
};

export const CacheService = {
  // Get cached response
  async getCache(queryHash) {
    const { data, error } = await supabase
      .from('query_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Set cache
  async setCache(queryHash, queryText, responseData, cacheType, expiresAt) {
    const { data, error } = await supabase
      .from('query_cache')
      .upsert(
        {
          query_hash: queryHash,
          query_text: queryText,
          response_data: responseData,
          cache_type: cacheType,
          expires_at: expiresAt,
        },
        { onConflict: 'query_hash' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Clear expired cache
  async clearExpiredCache() {
    const { error } = await supabase
      .from('query_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
  },
};
