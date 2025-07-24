#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUnprocessedMovies() {
  try {
    console.log('🔍 Finding 3 movies that have never been processed by Movie Analysis...\n');

    // Use LEFT JOIN to find movies that DON'T have page_analysis entries
    const { data: unprocessedMovies, error } = await supabase
      .from('movies')
      .select(`
        tmdb_id,
        title,
        year
      `)
      .filter('tmdb_id', 'not.is', 'null')
      .filter('title', 'not.is', 'null')
      .limit(100); // Get more to filter from

    if (error) throw error;

    if (!unprocessedMovies || unprocessedMovies.length === 0) {
      console.log('❌ No movies found in database');
      return;
    }

    // Get all movie IDs that have page_analysis entries
    const { data: processedAnalyses, error: analysesError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (analysesError) throw analysesError;

    // Get movie IDs from the movies we fetched
    const movieIds = unprocessedMovies.map(m => m.tmdb_id);
    
    // Get full movie data for those IDs
    const { data: fullMovies, error: fullError } = await supabase
      .from('movies')
      .select('id, tmdb_id, title, year')
      .in('tmdb_id', movieIds);

    if (fullError) throw fullError;

    // Create lookup for processed movie IDs
    const processedMovieIds = new Set(processedAnalyses.map(a => a.movie_id));

    // Filter out movies that have been processed
    const unprocessed = fullMovies.filter(movie => !processedMovieIds.has(movie.id));

    if (unprocessed.length === 0) {
      console.log('✅ All movies in sample have been processed! Try expanding the search.');
      return;
    }

    // Return exactly 3 movies
    const selectedMovies = unprocessed.slice(0, 3);

    console.log('📋 Found 3 unprocessed movies:\n');

    selectedMovies.forEach((movie, index) => {
      console.log(`${index + 1}. "${movie.title}" (${movie.year || 'Unknown year'})`);
      console.log(`   TMDB ID: ${movie.tmdb_id}`);
      console.log('');
    });

    // Also output as JSON for easy copying
    console.log('🔧 JSON format for easy use:');
    console.log(JSON.stringify(selectedMovies.map(m => ({
      tmdb_id: m.tmdb_id,
      title: m.title,
      year: m.year
    })), null, 2));

  } catch (error) {
    console.error('❌ Error finding unprocessed movies:', error.message);
    process.exit(1);
  }
}

// Run the search
findUnprocessedMovies();