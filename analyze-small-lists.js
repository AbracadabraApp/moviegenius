#!/usr/bin/env node

import fs from 'fs';

const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));
const testData = JSON.parse(fs.readFileSync('./musical-test-data.json', 'utf8'));

// Create movie lookup
const movieLookup = {};
testData.movieData.forEach(movie => {
  movieLookup[movie.id] = movie;
});

console.log('🔍 SMALL LISTS ANALYSIS (< 8 items)\n');

// Count how many lists each movie appears in
const movieListCounts = {};
progressData.masterLists.forEach(list => {
  list.movieIds.forEach(movieId => {
    movieListCounts[movieId] = (movieListCounts[movieId] || 0) + 1;
  });
});

// Find lists with fewer than 8 items
const smallLists = progressData.masterLists.filter(list => list.movieIds.length < 8);

console.log(`📊 LISTS WITH < 8 ITEMS: ${smallLists.length} total`);

// Break down by size
const sizeBreakdown = {};
smallLists.forEach(list => {
  const size = list.movieIds.length;
  sizeBreakdown[size] = (sizeBreakdown[size] || 0) + 1;
});

console.log('Size breakdown:');
Object.entries(sizeBreakdown)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .forEach(([size, count]) => {
    const percentage = ((count / smallLists.length) * 100).toFixed(1);
    console.log(`  - ${size} items: ${count} lists (${percentage}%)`);
  });

// Find movies that appear ONLY in small lists (and check if any appear in NO other lists)
console.log('\n🎯 CHECKING FOR MOVIES THAT ONLY APPEAR IN SMALL LISTS:\n');

const moviesInSmallListsOnly = [];
const trulyIsolatedMovies = [];

// Get all movies that appear in small lists
const moviesInSmallLists = new Set();
smallLists.forEach(list => {
  list.movieIds.forEach(movieId => {
    moviesInSmallLists.add(movieId);
  });
});

// Check each movie in small lists to see if they appear elsewhere
moviesInSmallLists.forEach(movieId => {
  const totalAppearances = movieListCounts[movieId] || 0;
  const movie = movieLookup[movieId];
  
  // Count appearances in non-small lists
  let appearancesInLargeLists = 0;
  progressData.masterLists.forEach(list => {
    if (list.movieIds.length >= 8 && list.movieIds.includes(movieId)) {
      appearancesInLargeLists++;
    }
  });
  
  if (appearancesInLargeLists === 0) {
    // This movie only appears in small lists
    moviesInSmallListsOnly.push({
      movieId,
      movie,
      totalAppearances,
      smallListsOnly: true
    });
    
    if (totalAppearances === 1) {
      // This movie appears in exactly 1 list total (and it's small)
      trulyIsolatedMovies.push({
        movieId,
        movie,
        totalAppearances
      });
    }
  }
});

console.log(`📈 MOVIES ONLY IN SMALL LISTS (< 8 items): ${moviesInSmallListsOnly.length}`);
console.log(`🎯 TRULY ISOLATED MOVIES (appear in exactly 1 small list): ${trulyIsolatedMovies.length}\n`);

if (trulyIsolatedMovies.length > 0) {
  console.log('TRULY ISOLATED MOVIES:');
  trulyIsolatedMovies.forEach((item, index) => {
    const movie = item.movie;
    // Find which list contains this movie
    const containingList = smallLists.find(list => list.movieIds.includes(item.movieId));
    console.log(`${index + 1}. "${movie?.title}" (${movie?.year}) → only in "${containingList?.name}" (${containingList?.movieIds.length} items)`);
  });
  console.log();
} else {
  console.log('✅ NO truly isolated movies found!\n');
}

if (moviesInSmallListsOnly.length > trulyIsolatedMovies.length) {
  console.log(`MOVIES ONLY IN SMALL LISTS (but appear in multiple small lists): ${moviesInSmallListsOnly.length - trulyIsolatedMovies.length}`);
  const multipleSmallOnly = moviesInSmallListsOnly.filter(item => item.totalAppearances > 1);
  multipleSmallOnly.slice(0, 10).forEach((item, index) => {
    const movie = item.movie;
    console.log(`${index + 1}. "${movie?.title}" (${movie?.year}) → appears in ${item.totalAppearances} small lists`);
  });
  if (multipleSmallOnly.length > 10) {
    console.log(`... and ${multipleSmallOnly.length - 10} more`);
  }
  console.log();
}

// Show some examples of small lists
console.log('📋 SAMPLE SMALL LISTS:');
const sampleSmallLists = smallLists
  .filter(list => list.movieIds.length > 1) // Skip single-movie lists for now
  .slice(0, 15);

sampleSmallLists.forEach((list, index) => {
  const movies = list.movieIds.map(id => {
    const movie = movieLookup[id];
    return movie ? `"${movie.title}" (${movie.year})` : 'Unknown';
  });
  console.log(`${index + 1}. "${list.name}" (${list.movieIds.length} items)`);
  console.log(`   Movies: ${movies.join(', ')}`);
  console.log();
});

console.log('📊 SUMMARY:');
console.log(`- Total lists: ${progressData.masterLists.length}`);
console.log(`- Small lists (< 8 items): ${smallLists.length} (${((smallLists.length / progressData.masterLists.length) * 100).toFixed(1)}%)`);
console.log(`- Movies only in small lists: ${moviesInSmallListsOnly.length}`);
console.log(`- Truly isolated movies: ${trulyIsolatedMovies.length}`);

console.log('\n✅ Analysis complete!');