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

async function checkUnprocessedMovies() {
  try {
    console.log('🔍 Analyzing unprocessed movies in the database...\n');

    // First, get the total count of movies
    const { count: totalMovies, error: totalError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get all movies first (we need to analyze them anyway)
    console.log('Fetching all movies...');
    const { data: allMovies, error: moviesError } = await supabase
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
        official_title,
        release_date,
        created_at,
        updated_at
      `);

    if (moviesError) throw moviesError;

    // Get all processed movie IDs
    console.log('Fetching processed movie analyses...');
    const { data: processedAnalyses, error: analysesError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (analysesError) throw analysesError;

    // Create a Set for faster lookup
    const processedMovieIds = new Set(processedAnalyses.map(a => a.movie_id));

    // Filter unprocessed movies
    const unprocessedMovies = allMovies.filter(movie => !processedMovieIds.has(movie.id));

    if (unprocessedError) throw unprocessedError;

    const unprocessedCount = unprocessedMovies.length;

    console.log(`📊 Database Overview:`);
    console.log(`Total movies in database: ${totalMovies}`);
    console.log(`Movies WITHOUT page_analysis: ${unprocessedCount}`);
    console.log(`Movies WITH page_analysis: ${totalMovies - unprocessedCount}`);
    console.log('');

    if (unprocessedCount === 0) {
      console.log('✅ All movies have been processed!');
      return;
    }

    // Analyze column data for unprocessed movies
    console.log(`📋 Column Data Analysis for ${unprocessedCount} Unprocessed Movies:\n`);

    const columnStats = {};
    const columns = [
      'title',
      'year', 
      'tmdb_id',
      'slug',
      'poster_url',
      'streaming_data',
      'has_analysis',
      'official_title',
      'release_date'
    ];

    // Count non-null values for each column
    columns.forEach(column => {
      const nonNullCount = unprocessedMovies.filter(movie => {
        const value = movie[column];
        // Handle different types of "empty" values
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && Object.keys(value).length === 0) return false;
        return true;
      }).length;

      const percentage = ((nonNullCount / unprocessedCount) * 100).toFixed(1);
      
      columnStats[column] = {
        count: nonNullCount,
        percentage: percentage
      };
    });

    // Sort columns by percentage of populated data
    const sortedColumns = Object.entries(columnStats)
      .sort(([,a], [,b]) => b.count - a.count);

    console.log('Column'.padEnd(20) + 'Populated'.padEnd(12) + 'Percentage');
    console.log('─'.repeat(50));

    sortedColumns.forEach(([column, stats]) => {
      const countStr = `${stats.count}/${unprocessedCount}`;
      console.log(
        column.padEnd(20) + 
        countStr.padEnd(12) + 
        `${stats.percentage}%`
      );
    });

    console.log('\n📈 Data Quality Summary:');
    
    // Categories
    const excellent = sortedColumns.filter(([,stats]) => parseFloat(stats.percentage) >= 90);
    const good = sortedColumns.filter(([,stats]) => parseFloat(stats.percentage) >= 70 && parseFloat(stats.percentage) < 90);
    const fair = sortedColumns.filter(([,stats]) => parseFloat(stats.percentage) >= 50 && parseFloat(stats.percentage) < 70);
    const poor = sortedColumns.filter(([,stats]) => parseFloat(stats.percentage) < 50);

    if (excellent.length > 0) {
      console.log(`✅ Excellent (≥90%): ${excellent.map(([col]) => col).join(', ')}`);
    }
    if (good.length > 0) {
      console.log(`🟢 Good (70-89%): ${good.map(([col]) => col).join(', ')}`);
    }
    if (fair.length > 0) {
      console.log(`🟡 Fair (50-69%): ${fair.map(([col]) => col).join(', ')}`);
    }
    if (poor.length > 0) {
      console.log(`🔴 Poor (<50%): ${poor.map(([col]) => col).join(', ')}`);
    }

    // Sample of unprocessed movies for context
    console.log('\n🎬 Sample of Unprocessed Movies:');
    const sampleMovies = unprocessedMovies.slice(0, 5);
    sampleMovies.forEach((movie, index) => {
      console.log(`${index + 1}. "${movie.title}" (${movie.year || 'No year'})`);
      console.log(`   TMDB ID: ${movie.tmdb_id || 'None'}`);
      console.log(`   Slug: ${movie.slug || 'None'}`);
      console.log(`   Poster: ${movie.poster_url ? 'Yes' : 'No'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error analyzing unprocessed movies:', error.message);
    process.exit(1);
  }
}

// Run the analysis
checkUnprocessedMovies();