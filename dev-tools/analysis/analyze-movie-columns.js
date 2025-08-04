#!/usr/bin/env node

// Script to analyze column data for movies that have never been processed by Movie Analysis
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function analyzeMovieColumns() {
  try {
    console.log('Querying Supabase for 900 movies without movie analysis...\n');

    // First, get all analyzed movie IDs (in smaller batches to avoid URI size issues)
    const analyzedIds = new Set();
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from('movie_analyses')
        .select('movie_id')
        .eq('analysis_type', 'page_analysis')
        .range(from, from + batchSize - 1);

      if (batchError) {
        throw batchError;
      }

      if (batch && batch.length > 0) {
        batch.forEach(item => analyzedIds.add(item.movie_id));
        from += batchSize;
        hasMore = batch.length === batchSize; // Continue if we got a full batch
      } else {
        hasMore = false;
      }
    }

    console.log(`Found ${analyzedIds.size} movies that already have page analysis.`);

    // Now get all movies and filter out the analyzed ones
    const unanalyzedMovies = [];
    from = 0;
    hasMore = true;

    while (hasMore && unanalyzedMovies.length < 900) {
      const { data: movieBatch, error: movieError } = await supabase
        .from('movies')
        .select(`
          id,
          title,
          year,
          tmdb_id,
          slug,
          poster_url,
          streaming_data,
          has_analysis,
          created_at,
          updated_at
        `)
        .range(from, from + batchSize - 1);

      if (movieError) {
        throw movieError;
      }

      if (movieBatch && movieBatch.length > 0) {
        // Filter out movies that have been analyzed
        const filteredBatch = movieBatch.filter(movie => !analyzedIds.has(movie.id));
        unanalyzedMovies.push(...filteredBatch);
        
        from += batchSize;
        hasMore = movieBatch.length === batchSize; // Continue if we got a full batch
      } else {
        hasMore = false;
      }
    }

    // Take only the first 900 movies
    const movies = unanalyzedMovies.slice(0, 900);

    if (!movies || movies.length === 0) {
      console.log('No movies found that haven\'t been analyzed.');
      return;
    }

    console.log(`Found ${movies.length} movies without page analysis.\n`);

    // Count non-null/non-empty values for each column
    const columnCounts = {
      title: 0,
      year: 0,
      tmdb_id: 0,
      slug: 0,
      poster_url: 0,
      streaming_data: 0,
      has_analysis: 0,
      created_at: 0,
      updated_at: 0
    };

    // Helper function to check if value is non-null and non-empty
    const hasValue = (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      return true;
    };

    // Count values for each column
    movies.forEach(movie => {
      Object.keys(columnCounts).forEach(column => {
        if (hasValue(movie[column])) {
          columnCounts[column]++;
        }
      });
    });

    // Display results
    console.log('COLUMN DATA ANALYSIS RESULTS');
    console.log('============================');
    console.log(`Total movies analyzed: ${movies.length}\n`);

    Object.entries(columnCounts).forEach(([column, count]) => {
      const percentage = ((count / movies.length) * 100).toFixed(1);
      console.log(`${column.padEnd(15)}: ${count.toString().padStart(3)} / ${movies.length} (${percentage}%)`);
    });

    console.log('\nDETAILED BREAKDOWN');
    console.log('==================');

    // Show some sample data for context
    console.log('\nSample of movies (first 5):');
    movies.slice(0, 5).forEach((movie, index) => {
      console.log(`\n${index + 1}. ${movie.title || 'NO TITLE'} (${movie.year || 'NO YEAR'})`);
      console.log(`   tmdb_id: ${movie.tmdb_id || 'null'}`);
      console.log(`   slug: ${movie.slug || 'null'}`);
      console.log(`   poster_url: ${movie.poster_url ? 'present' : 'null'}`);
      console.log(`   streaming_data: ${movie.streaming_data ? 'present' : 'null'}`);
      console.log(`   has_analysis: ${movie.has_analysis || 'null'}`);
    });

    // Additional insights
    console.log('\nINSIGHTS');
    console.log('=========');
    
    const moviesWithoutTitleOrYear = movies.filter(m => !hasValue(m.title) || !hasValue(m.year)).length;
    const moviesWithTMDBId = movies.filter(m => hasValue(m.tmdb_id)).length;
    const moviesWithPoster = movies.filter(m => hasValue(m.poster_url)).length;
    const moviesWithStreamingData = movies.filter(m => hasValue(m.streaming_data)).length;

    console.log(`Movies missing title or year: ${moviesWithoutTitleOrYear}`);
    console.log(`Movies with TMDB ID: ${moviesWithTMDBId}`);
    console.log(`Movies with poster URL: ${moviesWithPoster}`);
    console.log(`Movies with streaming data: ${moviesWithStreamingData}`);

    // Check for data quality issues
    console.log('\nDATA QUALITY ISSUES');
    console.log('===================');
    
    const emptyTitles = movies.filter(m => !hasValue(m.title)).length;
    const emptyYears = movies.filter(m => !hasValue(m.year)).length;
    const emptySlugs = movies.filter(m => !hasValue(m.slug)).length;
    
    console.log(`Movies with empty/null title: ${emptyTitles}`);
    console.log(`Movies with empty/null year: ${emptyYears}`);
    console.log(`Movies with empty/null slug: ${emptySlugs}`);

  } catch (error) {
    console.error('Error analyzing movie columns:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeMovieColumns();