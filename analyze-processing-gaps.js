#!/usr/bin/env node

import fs from 'fs';

// Load the test data to get all movie IDs
const testData = JSON.parse(fs.readFileSync('./musical-test-data.json', 'utf8'));
const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));

console.log(`📊 Processing Analysis:`);
console.log(`- Total movies in dataset: ${testData.movieData.length}`);
console.log(`- Last processed index: ${progressData.lastProcessedIndex}`);
console.log(`- Movies successfully processed: ${progressData.totalMoviesProcessed}`);
console.log(`- Actual failures: ${progressData.failures.length}`);

// Get all processed movie IDs from master lists
const processedMovieIds = new Set();
progressData.masterLists.forEach(list => {
  if (list.movieIds) {
    list.movieIds.forEach(id => processedMovieIds.add(id));
  }
});

console.log(`- Unique movies in lists: ${processedMovieIds.size}`);

// Find which movies were never processed
const unprocessedMovies = [];
testData.movieData.forEach((movie, index) => {
  if (!processedMovieIds.has(movie.id) && 
      !progressData.failures.some(f => f.movieId === movie.id)) {
    unprocessedMovies.push({ index, ...movie });
  }
});

console.log(`\n🔍 Unprocessed Movies: ${unprocessedMovies.length}`);
if (unprocessedMovies.length > 0) {
  console.log('Sample unprocessed movies:');
  unprocessedMovies.slice(0, 10).forEach(movie => {
    console.log(`  - Index ${movie.index}: "${movie.title}" (${movie.year})`);
  });
}

// Check for index ranges that might have been skipped
const processedIndices = [];
for (let i = 0; i <= progressData.lastProcessedIndex; i++) {
  const movie = testData.movieData[i];
  if (movie && (processedMovieIds.has(movie.id) || 
      progressData.failures.some(f => f.movieId === movie.id))) {
    processedIndices.push(i);
  }
}

console.log(`\n📈 Processing Coverage:`);
console.log(`- Indices 0-${progressData.lastProcessedIndex}: ${processedIndices.length} processed`);
console.log(`- Expected: ${progressData.lastProcessedIndex + 1}`);
console.log(`- Gap: ${(progressData.lastProcessedIndex + 1) - processedIndices.length}`);

// The discrepancy explanation
const expectedFromIndex = progressData.lastProcessedIndex + 1;
const actualSuccessful = progressData.totalMoviesProcessed;
const actualFailures = progressData.failures.length;
const totalAttempted = actualSuccessful + actualFailures;

console.log(`\n💡 Discrepancy Analysis:`);
console.log(`- Movies that should have been attempted (0-${progressData.lastProcessedIndex}): ${expectedFromIndex}`);
console.log(`- Movies actually attempted: ${totalAttempted}`);
console.log(`- Movies never attempted: ${expectedFromIndex - totalAttempted}`);
console.log(`- This suggests ${expectedFromIndex - totalAttempted} movies were skipped during processing`);