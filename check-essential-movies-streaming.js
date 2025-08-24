#!/usr/bin/env node

/**
 * Check Streaming Availability for All 50 Essential Movies
 * 
 * Queries the database for streaming data on all essential movies
 * and creates a filtered list of only those with streaming availability.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { getAllEssentialMovies } from './data/essential-movies.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkEssentialMoviesStreaming() {
  console.log('🎬 Checking streaming availability for 50 essential movies...\n');
  
  const client = await pool.connect();
  
  try {
    // Get all essential movies
    const essentialMovies = getAllEssentialMovies();
    const tmdbIds = essentialMovies.map(movie => movie.tmdb_id);
    
    console.log(`📊 Total essential movies: ${essentialMovies.length}`);
    console.log(`🔍 TMDB IDs to check: [${tmdbIds.slice(0, 10).join(', ')}...]`);
    
    // Query database for streaming data
    const query = `
      SELECT 
        m.tmdb_id,
        m.title,
        m.year,
        m.streaming_data
      FROM movies m
      WHERE m.tmdb_id = ANY($1)
      ORDER BY m.title
    `;
    
    const result = await client.query(query, [tmdbIds]);
    
    console.log(`\n✅ Found ${result.rows.length} movies in database\n`);
    
    // Categorize movies by streaming availability
    const withStreaming = [];
    const withoutStreaming = [];
    const notInDatabase = [];
    
    // Create lookup for database results
    const dbMovieMap = new Map();
    result.rows.forEach(row => {
      dbMovieMap.set(row.tmdb_id, row);
    });
    
    // Check each essential movie
    essentialMovies.forEach(movie => {
      const dbMovie = dbMovieMap.get(movie.tmdb_id);
      
      if (!dbMovie) {
        notInDatabase.push(movie);
      } else if (dbMovie.streaming_data && dbMovie.streaming_data.trim() !== '') {
        withStreaming.push({
          ...movie,
          streaming_data: dbMovie.streaming_data
        });
      } else {
        withoutStreaming.push(movie);
      }
    });
    
    // Print detailed results
    console.log('🎯 STREAMING AVAILABILITY RESULTS\n');
    console.log('================================\n');
    
    console.log(`✅ WITH STREAMING (${withStreaming.length} movies):`);
    withStreaming.forEach(movie => {
      console.log(`   📺 ${movie.title} (${movie.year}) - ${movie.streaming_data}`);
    });
    
    console.log(`\n❌ WITHOUT STREAMING (${withoutStreaming.length} movies):`);
    withoutStreaming.forEach(movie => {
      console.log(`   ⚪ ${movie.title} (${movie.year}) - ${movie.theme}`);
    });
    
    if (notInDatabase.length > 0) {
      console.log(`\n🚫 NOT IN DATABASE (${notInDatabase.length} movies):`);
      notInDatabase.forEach(movie => {
        console.log(`   ❓ ${movie.title} (${movie.year}) - TMDB ID: ${movie.tmdb_id}`);
      });
    }
    
    // Summary statistics
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Essential Movies: ${essentialMovies.length}`);
    console.log(`   With Streaming Data: ${withStreaming.length} (${Math.round(withStreaming.length / essentialMovies.length * 100)}%)`);
    console.log(`   Without Streaming Data: ${withoutStreaming.length} (${Math.round(withoutStreaming.length / essentialMovies.length * 100)}%)`);
    console.log(`   Not in Database: ${notInDatabase.length} (${Math.round(notInDatabase.length / essentialMovies.length * 100)}%)`);
    
    // Theme breakdown for movies with streaming
    const themeBreakdown = {};
    withStreaming.forEach(movie => {
      themeBreakdown[movie.theme] = (themeBreakdown[movie.theme] || 0) + 1;
    });
    
    console.log('\n🎭 THEME BREAKDOWN (With Streaming):');
    Object.entries(themeBreakdown).forEach(([theme, count]) => {
      console.log(`   ${theme}: ${count} movies`);
    });
    
    // Export filtered list for homepage use
    const streamingMovies = withStreaming.map(movie => ({
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      theme: movie.theme,
      themePage: movie.themePage,
      streaming_data: movie.streaming_data,
      poster: `https://image.tmdb.org/t/p/w500/${movie.tmdb_id}.jpg` // Generate poster URL
    }));
    
    console.log('\n💾 Exporting filtered streaming movies for homepage...');
    
    // Write to JSON file for homepage component
    const fs = await import('fs');
    const outputFile = './data/essential-movies-with-streaming.json';
    fs.writeFileSync(outputFile, JSON.stringify(streamingMovies, null, 2));
    console.log(`✅ Exported ${streamingMovies.length} streaming movies to: ${outputFile}`);
    
    return streamingMovies;
    
  } catch (error) {
    console.error('❌ Error checking streaming availability:', error);
  } finally {
    client.release();
  }
}

// Run the check
checkEssentialMoviesStreaming()
  .then((streamingMovies) => {
    console.log(`\n🎉 Done! Found ${streamingMovies?.length || 0} essential movies with streaming availability.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });