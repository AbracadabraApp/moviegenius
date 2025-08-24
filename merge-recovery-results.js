#!/usr/bin/env node

import fs from 'fs';

// Load both progress files
const mainProgress = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));
const recoveryProgress = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-recovery-progress.json', 'utf8'));

console.log('📊 Before Merger:');
console.log(`- Main processed: ${mainProgress.totalMoviesProcessed}`);
console.log(`- Main failures: ${mainProgress.failures.length}`);
console.log(`- Main lists: ${mainProgress.masterLists.length}`);
console.log(`- Main cost: $${mainProgress.totalCost.toFixed(6)}`);

console.log(`\n- Recovery processed: ${recoveryProgress.totalMoviesProcessed}`);
console.log(`- Recovery failures: ${recoveryProgress.failures.length}`);
console.log(`- Recovery lists: ${recoveryProgress.masterLists.length}`);
console.log(`- Recovery cost: $${recoveryProgress.totalCost.toFixed(6)}`);

// Get all processed movie IDs from main progress
const mainProcessedIds = new Set();
mainProgress.masterLists.forEach(list => {
  if (list.movieIds) {
    list.movieIds.forEach(id => mainProcessedIds.add(id));
  }
});

// Get all processed movie IDs from recovery
const recoveryProcessedIds = new Set();
recoveryProgress.masterLists.forEach(list => {
  if (list.movieIds) {
    list.movieIds.forEach(id => recoveryProcessedIds.add(id));
  }
});

// Merge the results
const mergedProgress = {
  ...mainProgress,
  totalMoviesProcessed: mainProgress.totalMoviesProcessed + recoveryProgress.totalMoviesProcessed,
  totalCost: mainProgress.totalCost + recoveryProgress.totalCost,
  failures: [...mainProgress.failures, ...recoveryProgress.failures]
};

// Merge master lists - add recovery movies to existing lists or create new ones
recoveryProgress.masterLists.forEach(recoveryList => {
  const existingList = mergedProgress.masterLists.find(list => list.name === recoveryList.name);
  if (existingList) {
    // Add recovery movies to existing list (avoid duplicates)
    recoveryList.movieIds.forEach(movieId => {
      if (!existingList.movieIds.includes(movieId)) {
        existingList.movieIds.push(movieId);
      }
    });
  } else {
    // Add new list from recovery
    mergedProgress.masterLists.push(recoveryList);
  }
});

// Save merged results
fs.writeFileSync('./musical-fresh-start/musical-progress.json', JSON.stringify(mergedProgress, null, 2));

console.log('\n✅ After Merger:');
console.log(`- Total processed: ${mergedProgress.totalMoviesProcessed}`);
console.log(`- Total failures: ${mergedProgress.failures.length}`);
console.log(`- Total lists: ${mergedProgress.masterLists.length}`);
console.log(`- Total cost: $${mergedProgress.totalCost.toFixed(6)}`);

// Calculate final completion stats
const totalMovies = 644;
const finalSuccessRate = ((mergedProgress.totalMoviesProcessed / totalMovies) * 100).toFixed(1);
console.log(`\n🎯 Final Musical Category Completion:`);
console.log(`- Movies successfully processed: ${mergedProgress.totalMoviesProcessed}/${totalMovies}`);
console.log(`- Success rate: ${finalSuccessRate}%`);
console.log(`- Total failures: ${mergedProgress.failures.length}`);
console.log(`- True failure rate: ${((mergedProgress.failures.length / totalMovies) * 100).toFixed(1)}%`);