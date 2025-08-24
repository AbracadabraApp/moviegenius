#!/usr/bin/env node

import fs from 'fs';
import { ProductionListAnalyzer } from './production-list-analyzer.js';

// Load the test data and progress
const testData = JSON.parse(fs.readFileSync('./musical-test-data.json', 'utf8'));
const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));

// Get all processed movie IDs from master lists
const processedMovieIds = new Set();
progressData.masterLists.forEach(list => {
  if (list.movieIds) {
    list.movieIds.forEach(id => processedMovieIds.add(id));
  }
});

// Find unprocessed movies
const unprocessedMovies = [];
testData.movieData.forEach((movie, index) => {
  if (!processedMovieIds.has(movie.id) && 
      !progressData.failures.some(f => f.movieId === movie.id)) {
    unprocessedMovies.push({ index, ...movie });
  }
});

console.log(`🎯 Found ${unprocessedMovies.length} unprocessed movies`);

// Create a temporary data file with just the unprocessed movies
const skippedMoviesData = {
  movieData: unprocessedMovies.map(m => ({ id: m.id, title: m.title, year: m.year })),
  movieCount: unprocessedMovies.length,
  category: "Musical",
  method: "skipped-recovery"
};

fs.writeFileSync('./skipped-musical-movies.json', JSON.stringify(skippedMoviesData, null, 2));

console.log('📋 Sample skipped movies:');
unprocessedMovies.slice(0, 10).forEach(movie => {
  console.log(`  - Index ${movie.index}: "${movie.title}" (${movie.year})`);
});

console.log(`\n💾 Created skipped-musical-movies.json with ${unprocessedMovies.length} movies`);
console.log('🚀 Ready to process with production analyzer...');

// Now process them
async function processSkippedMovies() {
  const analyzer = new ProductionListAnalyzer(
    'Musical-Recovery', 
    './skipped-musical-movies.json', 
    './musical-fresh-start'
  );
  
  try {
    console.log('\n🎬 Starting processing of skipped movies...');
    const results = await analyzer.analyzeMovies(0, null);
    
    console.log('\n🎉 SKIPPED MOVIES PROCESSING COMPLETE!');
    console.log(`✅ Successfully processed: ${results.totalMoviesProcessed}`);
    console.log(`❌ Failures: ${results.failures}`);
    console.log(`💰 Cost: $${results.totalCost.toFixed(6)}`);
    
  } catch (error) {
    console.error('❌ Processing failed:', error.message);
  }
}

// Run the processing
processSkippedMovies();