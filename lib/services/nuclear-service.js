/**
 * Nuclear Service - Simplified nuclear movie classification
 * 
 * Single responsibility: Determine if a movie should be nuclear (permanent static)
 */

import { createClient } from '@supabase/supabase-js';
import { NUCLEAR_CONFIG } from '../nuclear-config.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export class NuclearService {
  /**
   * Simple nuclear classification: test movies OR top N movies by creation date
   */
  static async isNuclearCandidate(tmdbId) {
    try {
      // Test movies always nuclear in development
      if (NUCLEAR_CONFIG.TEST_MOVIES.includes(tmdbId)) {
        return true;
      }
      
      // Check if movie is in top N by creation date
      const { data: topMovies } = await supabase
        .from('movies')
        .select('tmdb_id')
        .not('tmdb_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(NUCLEAR_CONFIG.TOP_MOVIE_COUNT);
      
      return topMovies?.some(movie => movie.tmdb_id === tmdbId) || false;
      
    } catch (error) {
      console.warn('Nuclear classification failed, defaulting to ISR:', error);
      return false; // Safe fallback to ISR
    }
  }
  
  /**
   * Get nuclear candidates for batch processing
   */
  static async getNuclearCandidates(limit = NUCLEAR_CONFIG.TOP_MOVIE_COUNT) {
    const { data: movies } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, created_at')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return movies || [];
  }
  
  /**
   * Check if movie has nuclear analysis
   */
  static async hasNuclearAnalysis(movieId) {
    const { data: analysis } = await supabase
      .from('movie_analyses')
      .select('id')
      .eq('movie_id', movieId)
      .eq('analysis_type', NUCLEAR_CONFIG.DATABASE.ANALYSIS_TYPE)
      .single();
    
    return !!analysis;
  }
}