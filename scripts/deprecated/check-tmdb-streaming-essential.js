#!/usr/bin/env node

/**
 * Check TMDB Streaming Data for All 50 Essential Movies
 * 
 * Calls TMDB API directly for streaming availability on all essential movies
 * and creates a filtered list of only those with streaming data.
 */

import 'dotenv/config';
import { getAllEssentialMovies } from './data/essential-movies.js';
import { config } from 'dotenv';

// Load environment from .env.local
config({ path: '.env.local' });

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY not found in environment variables');
  process.exit(1);
}

// Deduplication function from update-streaming-from-tmdb.js
function deduplicatePlatforms(serviceNames) {
  if (!serviceNames || serviceNames.length === 0) return [];
  
  const normalized = serviceNames.map(name => {
    // Convert to preferred short forms
    if (name === 'Paramount Plus' || name === 'Paramount+') return 'Paramount+';
    if (name === 'Disney Plus') return 'Disney+';  
    if (name === 'Amazon Prime Video') return 'Amazon Prime';
    if (name === 'Apple TV Plus') return 'Apple TV+';
    if (name === 'HBO Max') return 'HBO Max';
    if (name === 'Netflix with ads') return 'Netflix';
    if (name.includes(' with ads')) return name.replace(' with ads', '');
    
    // Remove Amazon Channel suffixes but keep unique services
    if (name.includes('Amazon Channel')) {
      const baseName = name.replace(' Amazon Channel', '').trim();
      // Keep unique services like Shudder, Criterion Channel
      const uniqueServices = ['Shudder', 'Starz', 'Showtime', 'Cinemax', 'Criterion Channel'];
      if (uniqueServices.some(service => baseName.includes(service))) {
        return baseName;
      }
      // Skip generic Amazon channels
      return null;
    }
    
    return name;
  }).filter(name => name !== null);
  
  // Remove exact duplicates
  return [...new Set(normalized)];
}

async function getStreamingData(tmdbId) {
  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Movie not found' };
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const usData = data.results?.US;
    
    if (!usData) {
      return { streaming: null };
    }
    
    // Collect all streaming services
    const allServices = [];
    
    if (usData.flatrate) {
      allServices.push(...usData.flatrate.map(provider => provider.provider_name));
    }
    if (usData.free) {
      allServices.push(...usData.free.map(provider => provider.provider_name));
    }
    
    const dedupedServices = deduplicatePlatforms(allServices);
    
    return {
      streaming: dedupedServices.length > 0 ? dedupedServices.join(', ') : null
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

async function checkAllEssentialMovies() {
  console.log('🎬 Checking TMDB streaming data for 50 essential movies...\n');
  
  const essentialMovies = getAllEssentialMovies();
  console.log(`📊 Total essential movies: ${essentialMovies.length}\n`);
  
  const results = {
    withStreaming: [],
    withoutStreaming: [],
    errors: []
  };
  
  console.log('🔄 Fetching streaming data...\n');
  
  for (let i = 0; i < essentialMovies.length; i++) {
    const movie = essentialMovies[i];
    console.log(`${i + 1}/${essentialMovies.length}: ${movie.title} (${movie.year}) - TMDB ${movie.tmdb_id}`);
    
    const streamingData = await getStreamingData(movie.tmdb_id);
    
    if (streamingData.error) {
      console.log(`   ❌ Error: ${streamingData.error}`);
      results.errors.push({
        ...movie,
        error: streamingData.error
      });
    } else if (streamingData.streaming) {
      console.log(`   ✅ ${streamingData.streaming}`);
      results.withStreaming.push({
        ...movie,
        streaming_data: streamingData.streaming,
        poster: `https://image.tmdb.org/t/p/w500/poster_${movie.tmdb_id}.jpg`
      });
    } else {
      console.log(`   ⚪ No streaming services`);
      results.withoutStreaming.push(movie);
    }
    
    // Rate limit: 1 request per second
    if (i < essentialMovies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Print summary
  console.log('\n🎯 STREAMING AVAILABILITY RESULTS');
  console.log('================================\n');
  
  console.log(`✅ WITH STREAMING (${results.withStreaming.length} movies):`);
  results.withStreaming.forEach(movie => {
    console.log(`   📺 ${movie.title} (${movie.year}) - ${movie.streaming_data}`);
  });
  
  console.log(`\n⚪ WITHOUT STREAMING (${results.withoutStreaming.length} movies):`);
  results.withoutStreaming.forEach(movie => {
    console.log(`   ❌ ${movie.title} (${movie.year}) - ${movie.theme}`);
  });
  
  if (results.errors.length > 0) {
    console.log(`\n🚫 ERRORS (${results.errors.length} movies):`);
    results.errors.forEach(movie => {
      console.log(`   ⚠️  ${movie.title} (${movie.year}) - ${movie.error}`);
    });
  }
  
  // Summary statistics
  console.log('\n📊 SUMMARY:');
  console.log(`   Total Essential Movies: ${essentialMovies.length}`);
  console.log(`   With Streaming Data: ${results.withStreaming.length} (${Math.round(results.withStreaming.length / essentialMovies.length * 100)}%)`);
  console.log(`   Without Streaming Data: ${results.withoutStreaming.length} (${Math.round(results.withoutStreaming.length / essentialMovies.length * 100)}%)`);
  console.log(`   Errors: ${results.errors.length} (${Math.round(results.errors.length / essentialMovies.length * 100)}%)`);
  
  // Theme breakdown
  const themeBreakdown = {};
  results.withStreaming.forEach(movie => {
    themeBreakdown[movie.theme] = (themeBreakdown[movie.theme] || 0) + 1;
  });
  
  console.log('\n🎭 THEME BREAKDOWN (With Streaming):');
  Object.entries(themeBreakdown).forEach(([theme, count]) => {
    console.log(`   ${theme}: ${count} movies`);
  });
  
  // Export for homepage
  const streamingMovies = results.withStreaming.map(movie => ({
    tmdbId: movie.tmdb_id,
    title: movie.title,
    year: movie.year,
    theme: movie.theme,
    themePage: movie.themePage,
    streaming_data: movie.streaming_data,
    poster: `https://image.tmdb.org/t/p/w500/poster_placeholder.jpg` // Will be replaced with actual TMDB poster
  }));
  
  console.log('\n💾 Exporting streaming movies for homepage...');
  
  const fs = await import('fs');
  const outputFile = './data/essential-movies-with-streaming.json';
  fs.writeFileSync(outputFile, JSON.stringify(streamingMovies, null, 2));
  console.log(`✅ Exported ${streamingMovies.length} streaming movies to: ${outputFile}`);
  
  return results;
}

// Run the check
checkAllEssentialMovies()
  .then((results) => {
    console.log(`\n🎉 Done! Found ${results.withStreaming.length} essential movies with streaming availability.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });