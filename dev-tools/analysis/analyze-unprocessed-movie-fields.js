#!/usr/bin/env node
/**
 * Analyze Field Population for Unprocessed Movies
 * 
 * Query the database to analyze which fields are populated vs NULL/empty
 * for the 11,161 movies that have never been processed by Movie Analysis.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function analyzeUnprocessedMovieFields() {
  console.log('📊 Analyzing Field Population for Unprocessed Movies');
  console.log('=====================================================\n');

  try {
    // First, get all movies that DON'T have entries in movie_analyses table
    console.log('🔍 Finding movies without analysis...\n');

    // Get all movie IDs that have been analyzed
    const { data: analyzedMovies, error: analyzedError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (analyzedError) throw analyzedError;

    const analyzedMovieIds = [...new Set(analyzedMovies.map(a => a.movie_id))];
    console.log(`📈 Found ${analyzedMovieIds.length} movies with analysis`);

    // Get all movies first
    const { data: allMovies, error: allMoviesError } = await supabase
      .from('movies')
      .select('*');

    if (allMoviesError) throw allMoviesError;

    // Filter out movies that have been analyzed (client-side filtering to avoid URI limit)
    const unprocessedMovies = allMovies.filter(movie => !analyzedMovieIds.includes(movie.id));

    const totalUnprocessed = unprocessedMovies.length;
    console.log(`📊 Found ${totalUnprocessed} unprocessed movies\n`);

    // Analyze field population
    const fieldAnalysis = {
      title: { populated: 0, null_or_empty: 0 },
      year: { populated: 0, null_or_empty: 0 },
      tmdb_id: { populated: 0, null_or_empty: 0 },
      slug: { populated: 0, null_or_empty: 0 },
      poster_url: { populated: 0, null_or_empty: 0 },
      streaming_data: { populated: 0, null_or_empty: 0 },
      has_analysis: { populated: 0, null_or_empty: 0 },
      official_title: { populated: 0, null_or_empty: 0 },
      release_date: { populated: 0, null_or_empty: 0 },
      created_at: { populated: 0, null_or_empty: 0 },
      updated_at: { populated: 0, null_or_empty: 0 },
      trailer_url: { populated: 0, null_or_empty: 0 }
    };

    // Count populated vs null/empty for each field
    unprocessedMovies.forEach(movie => {
      Object.keys(fieldAnalysis).forEach(field => {
        const value = movie[field];
        const isEmpty = value === null || value === undefined || value === '';
        
        if (isEmpty) {
          fieldAnalysis[field].null_or_empty++;
        } else {
          fieldAnalysis[field].populated++;
        }
      });
    });

    // Display results
    console.log('📊 Field Population Analysis for Unprocessed Movies:');
    console.log('====================================================\n');

    Object.entries(fieldAnalysis).forEach(([field, stats]) => {
      const populatedPercent = ((stats.populated / totalUnprocessed) * 100).toFixed(1);
      const emptyPercent = ((stats.null_or_empty / totalUnprocessed) * 100).toFixed(1);
      
      console.log(`🔸 ${field.toUpperCase()}:`);
      console.log(`   • Populated: ${stats.populated.toLocaleString()} (${populatedPercent}%)`);
      console.log(`   • NULL/Empty: ${stats.null_or_empty.toLocaleString()} (${emptyPercent}%)`);
      console.log('');
    });

    // Additional insights
    console.log('🔍 Key Insights:');
    console.log('================\n');

    // Count movies with TMDB data
    const withTmdbData = fieldAnalysis.tmdb_id.populated;
    const withoutTmdbData = fieldAnalysis.tmdb_id.null_or_empty;
    
    console.log(`📈 TMDB Coverage:`);
    console.log(`   • With TMDB ID: ${withTmdbData.toLocaleString()} (${((withTmdbData/totalUnprocessed)*100).toFixed(1)}%)`);
    console.log(`   • Without TMDB ID: ${withoutTmdbData.toLocaleString()} (${((withoutTmdbData/totalUnprocessed)*100).toFixed(1)}%)`);
    console.log('');

    // Count movies with poster URLs
    const withPosters = fieldAnalysis.poster_url.populated;
    const withoutPosters = fieldAnalysis.poster_url.null_or_empty;
    
    console.log(`🖼️  Poster Coverage:`);
    console.log(`   • With Poster URL: ${withPosters.toLocaleString()} (${((withPosters/totalUnprocessed)*100).toFixed(1)}%)`);
    console.log(`   • Without Poster URL: ${withoutPosters.toLocaleString()} (${((withoutPosters/totalUnprocessed)*100).toFixed(1)}%)`);
    console.log('');

    // Count movies with streaming data
    const withStreaming = fieldAnalysis.streaming_data.populated;
    const withoutStreaming = fieldAnalysis.streaming_data.null_or_empty;
    
    console.log(`📺 Streaming Data Coverage:`);
    console.log(`   • With Streaming Data: ${withStreaming.toLocaleString()} (${((withStreaming/totalUnprocessed)*100).toFixed(1)}%)`);
    console.log(`   • Without Streaming Data: ${withoutStreaming.toLocaleString()} (${((withoutStreaming/totalUnprocessed)*100).toFixed(1)}%)`);
    console.log('');

    // Count movies with slugs
    const withSlugs = fieldAnalysis.slug.populated;
    const withoutSlugs = fieldAnalysis.slug.null_or_empty;
    
    console.log(`🔗 Slug Coverage:`);
    console.log(`   • With Slug: ${withSlugs.toLocaleString()} (${((withSlugs/totalUnprocessed)*100).toFixed(1)}%)`);
    console.log(`   • Without Slug: ${withoutSlugs.toLocaleString()} (${((withoutSlugs/totalUnprocessed)*100).toFixed(1)}%)`);
    console.log('');

    // Sample analysis - show examples of different field population patterns
    console.log('📋 Sample Data Patterns:');
    console.log('========================\n');

    // Movies with TMDB data but no analysis
    const moviesWithTmdb = unprocessedMovies.filter(m => m.tmdb_id && m.tmdb_id !== '').slice(0, 5);
    console.log('🎬 Sample unprocessed movies WITH TMDB data:');
    moviesWithTmdb.forEach((movie, index) => {
      console.log(`   ${index + 1}. "${movie.title}" (${movie.year}) - TMDB: ${movie.tmdb_id}`);
      console.log(`      Poster: ${movie.poster_url ? 'Yes' : 'No'} | Slug: ${movie.slug ? 'Yes' : 'No'} | Streaming: ${movie.streaming_data ? 'Yes' : 'No'}`);
    });
    console.log('');

    // Movies without TMDB data
    const moviesWithoutTmdb = unprocessedMovies.filter(m => !m.tmdb_id || m.tmdb_id === '').slice(0, 5);
    console.log('🎭 Sample unprocessed movies WITHOUT TMDB data:');
    moviesWithoutTmdb.forEach((movie, index) => {
      console.log(`   ${index + 1}. "${movie.title}" (${movie.year}) - No TMDB ID`);
      console.log(`      Poster: ${movie.poster_url ? 'Yes' : 'No'} | Slug: ${movie.slug ? 'Yes' : 'No'} | Streaming: ${movie.streaming_data ? 'Yes' : 'No'}`);
    });
    console.log('');

    // Summary statistics
    console.log('📊 Summary Statistics:');
    console.log('=====================\n');
    console.log(`• Total unprocessed movies: ${totalUnprocessed.toLocaleString()}`);
    console.log(`• Most populated field: ${Object.entries(fieldAnalysis).reduce((a, b) => fieldAnalysis[a[0]].populated > fieldAnalysis[b[0]].populated ? a : b)[0]} (${Object.entries(fieldAnalysis).reduce((a, b) => fieldAnalysis[a[0]].populated > fieldAnalysis[b[0]].populated ? a : b)[1].populated.toLocaleString()})`);
    console.log(`• Least populated field: ${Object.entries(fieldAnalysis).reduce((a, b) => fieldAnalysis[a[0]].populated < fieldAnalysis[b[0]].populated ? a : b)[0]} (${Object.entries(fieldAnalysis).reduce((a, b) => fieldAnalysis[a[0]].populated < fieldAnalysis[b[0]].populated ? a : b)[1].populated.toLocaleString()})`);
    
    // Data quality assessment
    const completeMovies = unprocessedMovies.filter(m => 
      m.title && m.year && m.tmdb_id && m.poster_url
    ).length;
    
    console.log(`• Movies with core data (title, year, tmdb_id, poster): ${completeMovies.toLocaleString()} (${((completeMovies/totalUnprocessed)*100).toFixed(1)}%)`);

    return {
      totalUnprocessed,
      fieldAnalysis,
      sampleData: {
        withTmdb: moviesWithTmdb,
        withoutTmdb: moviesWithoutTmdb
      }
    };

  } catch (error) {
    console.error('❌ Error analyzing unprocessed movie fields:', error.message);
    throw error;
  }
}

// Run the analysis
analyzeUnprocessedMovieFields()
  .then((results) => {
    console.log('\n✅ Unprocessed movie field analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed:', error.message);
    process.exit(1);
  });