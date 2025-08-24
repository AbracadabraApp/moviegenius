#!/usr/bin/env node

/**
 * Test YES/NO distribution using random walk algorithm
 * Samples 200 movies from TMDB ID range 100-21000
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { buildWhyWatchPrompt } from '../lib/prompts/why-watch-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const MIN_TMDB_ID = 100;
const MAX_TMDB_ID = 21000;
const TARGET_MOVIES = 200;

/**
 * Random walk algorithm to generate diverse movie sample
 * Starts at random point, takes steps of varying sizes
 */
function generateRandomWalkSample(count, min, max) {
  const sample = new Set();
  let current = Math.floor(Math.random() * (max - min)) + min;
  
  while (sample.size < count) {
    sample.add(current);
    
    // Random walk step: small steps (1-100) or large jumps (100-1000)
    const stepType = Math.random();
    let step;
    
    if (stepType < 0.7) {
      // 70% small steps (dense sampling)
      step = Math.floor(Math.random() * 100) + 1;
    } else {
      // 30% large jumps (wide coverage)
      step = Math.floor(Math.random() * 1000) + 100;
    }
    
    // Random direction
    if (Math.random() < 0.5) step = -step;
    
    current += step;
    
    // Wrap around if out of bounds
    if (current < min) current = max - (min - current);
    if (current > max) current = min + (current - max);
  }
  
  return Array.from(sample).sort((a, b) => a - b);
}

/**
 * Fetch movie details from TMDB
 */
async function fetchMovieDetails(tmdbId) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const movie = await response.json();
    
    // Skip if missing essential data
    if (!movie.title || !movie.release_date) {
      return null;
    }
    
    return {
      tmdb_id: tmdbId,
      title: movie.title,
      year: new Date(movie.release_date).getFullYear(),
      overview: movie.overview,
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      genres: movie.genres?.map(g => g.name).join(', ') || 'Unknown'
    };
  } catch (error) {
    return null;
  }
}

/**
 * Test Why Watch recommendation for a movie
 */
async function testMovie(movie) {
  try {
    const movieTitle = `${movie.title} (${movie.year})`;
    const prompt = buildWhyWatchPrompt(movieTitle, {
      director: 'Unknown',
      genre: movie.genres,
      vote_average: movie.vote_average
    });
    
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 600,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: [{
          type: 'text',
          text: prompt,
          cache_control: { type: 'ephemeral' }
        }]
      }],
    });

    const response = JSON.parse(message.content[0].text);
    return {
      ...movie,
      recommendation: response.whyWatch.recommendation,
      reasons: response.whyWatch.reasons,
      cost: (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000
    };
  } catch (error) {
    return { ...movie, error: error.message };
  }
}

async function runRandomWalkDistributionTest() {
  console.log('🎯 Random Walk Distribution Analysis');
  console.log('===================================\n');
  console.log(`Generating ${TARGET_MOVIES} movie sample from TMDB ID range ${MIN_TMDB_ID}-${MAX_TMDB_ID}...`);
  
  // Generate random walk sample
  const tmdbIds = generateRandomWalkSample(TARGET_MOVIES, MIN_TMDB_ID, MAX_TMDB_ID);
  console.log(`✅ Generated ${tmdbIds.length} TMDB IDs using random walk\n`);
  
  console.log('📡 Fetching movie details from TMDB...\n');
  
  // Fetch movie details
  const movies = [];
  for (let i = 0; i < tmdbIds.length; i++) {
    process.stdout.write(`\r[${i + 1}/${tmdbIds.length}] Fetching TMDB ${tmdbIds[i]}...`);
    
    const movie = await fetchMovieDetails(tmdbIds[i]);
    if (movie) {
      movies.push(movie);
    }
    
    // Rate limit TMDB API
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n✅ Successfully fetched ${movies.length} valid movies\n`);
  
  // Test Why Watch recommendations
  console.log('🤖 Testing Why Watch recommendations...\n');
  
  const results = { YES: 0, NO: 0, errors: 0 };
  const details = [];
  const qualityBuckets = {
    'High (8.0+)': { YES: 0, NO: 0 },
    'Good (6.0-7.9)': { YES: 0, NO: 0 },
    'Average (4.0-5.9)': { YES: 0, NO: 0 },
    'Poor (<4.0)': { YES: 0, NO: 0 }
  };
  
  let totalCost = 0;
  
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    process.stdout.write(`\r[${i + 1}/${movies.length}] ${movie.title} (${movie.year})...`);
    
    const result = await testMovie(movie);
    
    if (result.error) {
      results.errors++;
    } else if (result.recommendation) {
      results[result.recommendation]++;
      totalCost += result.cost || 0;
      
      // Categorize by quality
      let bucket;
      if (result.vote_average >= 8.0) bucket = 'High (8.0+)';
      else if (result.vote_average >= 6.0) bucket = 'Good (6.0-7.9)';
      else if (result.vote_average >= 4.0) bucket = 'Average (4.0-5.9)';
      else bucket = 'Poor (<4.0)';
      
      qualityBuckets[bucket][result.recommendation]++;
      
      details.push(result);
    }
    
    // Rate limit Anthropic API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const total = results.YES + results.NO;
  
  console.log('\n\n📊 RANDOM WALK DISTRIBUTION RESULTS');
  console.log('===================================\n');
  
  console.log(`✅ YES: ${results.YES}/${total} (${((results.YES / total) * 100).toFixed(1)}%)`);
  console.log(`❌ NO:  ${results.NO}/${total} (${((results.NO / total) * 100).toFixed(1)}%)`);
  console.log(`❗ Errors: ${results.errors}\n`);
  
  console.log('📈 BY TMDB RATING:');
  console.log('==================');
  Object.entries(qualityBuckets).forEach(([bucket, counts]) => {
    const bucketTotal = counts.YES + counts.NO;
    if (bucketTotal > 0) {
      const yesRate = ((counts.YES / bucketTotal) * 100).toFixed(0);
      console.log(`${bucket.padEnd(16)}: ${counts.YES}Y/${counts.NO}N (${yesRate}% YES)`);
    }
  });
  
  console.log(`\n💰 Total Cost: $${totalCost.toFixed(3)}`);
  console.log(`📊 Sample Coverage: ${((tmdbIds.length / (MAX_TMDB_ID - MIN_TMDB_ID)) * 100).toFixed(3)}% of ID range`);
  console.log(`🎬 Valid Movies: ${movies.length}/${TARGET_MOVIES} (${((movies.length / TARGET_MOVIES) * 100).toFixed(1)}%)`);
  
  // Show some examples
  const yesExamples = details.filter(d => d.recommendation === 'YES')
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 3);
  
  const noExamples = details.filter(d => d.recommendation === 'NO')
    .sort((a, b) => a.vote_average - b.vote_average)
    .slice(0, 3);
  
  if (yesExamples.length > 0) {
    console.log('\n✅ YES Examples:');
    yesExamples.forEach(movie => {
      console.log(`   ${movie.title} (${movie.year}) - TMDB: ${movie.vote_average}`);
    });
  }
  
  if (noExamples.length > 0) {
    console.log('\n❌ NO Examples:');
    noExamples.forEach(movie => {
      console.log(`   ${movie.title} (${movie.year}) - TMDB: ${movie.vote_average}`);
    });
  }
  
  return { results, qualityBuckets, totalCost, sampleSize: details.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRandomWalkDistributionTest().catch(console.error);
}