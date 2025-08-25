#!/usr/bin/env node

import fs from 'fs';

const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));

console.log(`Total failures: ${progressData.failures.length}`);

// Group by error type
const errorTypes = {};
progressData.failures.forEach(failure => {
  const error = failure.error;
  if (!errorTypes[error]) {
    errorTypes[error] = [];
  }
  errorTypes[error].push(failure);
});

console.log('\n📊 Failures by Error Type:');
Object.entries(errorTypes).forEach(([error, failures]) => {
  console.log(`  - "${error}": ${failures.length} movies`);
});

// Show some examples
console.log('\n🎬 Sample Failed Movies:');
progressData.failures.slice(0, 10).forEach(failure => {
  console.log(`  - "${failure.title}" (${failure.year}): ${failure.error}`);
});

// Check for year patterns
console.log('\n📅 Year Distribution of Failures:');
const yearCounts = {};
progressData.failures.forEach(failure => {
  const decade = Math.floor(failure.year / 10) * 10;
  yearCounts[decade] = (yearCounts[decade] || 0) + 1;
});

Object.entries(yearCounts).sort().forEach(([decade, count]) => {
  console.log(`  - ${decade}s: ${count} failures`);
});

console.log('\n💡 Analysis Summary:');
console.log(`- Total movies attempted: 644`);
console.log(`- Successfully processed: ${progressData.totalMoviesProcessed}`);
console.log(`- Failed: ${progressData.failures.length}`);
console.log(`- Success rate: ${((progressData.totalMoviesProcessed / 644) * 100).toFixed(1)}%`);