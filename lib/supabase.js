// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Only throw error in production or when actually using the client
const isBuild = process.env.NODE_ENV === 'production' && !process.env.RAILWAY_ENVIRONMENT
if (!isBuild && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('Missing Supabase environment variables - using placeholders for build')
}

// Client for browser/frontend use with build-safe fallbacks
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Database helpers
export const MovieService = {
  // Insert movie with focused fields
  async upsertMovie(movieData) {
    const { data, error } = await supabase
      .from('movies')
      .upsert({
        tmdb_id: movieData.tmdb_id,
        official_title: movieData.official_title,
        release_date: movieData.release_date,
        title: movieData.title,
        year: movieData.year,
        slug: movieData.slug,
        poster_url: movieData.poster_url,
        streaming_data: movieData.streaming_data
      }, { 
        onConflict: 'title,year',
        ignoreDuplicates: false 
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get movie by title and year
  async getMovie(title, year) {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('title', title)
      .eq('year', year)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
    return data
  },

  // Get movie by TMDB ID (efficient lookup)
  async getMovieByTMDBId(tmdbId) {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Search movies
  async searchMovies(query, limit = 20) {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .or(`title.ilike.%${query}%, official_title.ilike.%${query}%, slug.ilike.%${query}%`)
      .limit(limit)
    
    if (error) throw error
    return data
  },

  // Get all movies (for admin/stats)
  async getAllMovies() {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get movies with TMDB data (premium movies)
  async getMoviesWithTMDB() {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .not('tmdb_id', 'is', null)
      .order('title')
    
    if (error) throw error
    return data
  }
}

export const CacheService = {
  // Get cached response
  async getCache(queryHash) {
    const { data, error } = await supabase
      .from('query_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .gte('expires_at', new Date().toISOString())
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Set cache
  async setCache(queryHash, queryText, responseData, cacheType, expiresAt) {
    const { data, error } = await supabase
      .from('query_cache')
      .upsert({
        query_hash: queryHash,
        query_text: queryText,
        response_data: responseData,
        cache_type: cacheType,
        expires_at: expiresAt
      }, { onConflict: 'query_hash' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Clear expired cache
  async clearExpiredCache() {
    const { error } = await supabase
      .from('query_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    if (error) throw error
  }
}