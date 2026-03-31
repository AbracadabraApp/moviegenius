#!/usr/bin/env node

import fs from 'fs';

const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));
const testData = JSON.parse(fs.readFileSync('./musical-test-data.json', 'utf8'));

// Create movie lookup
const movieLookup = {};
testData.movieData.forEach(movie => {
  movieLookup[movie.id] = movie;
});

console.log('🔍 ISOLATED MOVIES ANALYSIS\n');

// Count how many lists each movie appears in
const movieListCounts = {};
progressData.masterLists.forEach(list => {
  list.movieIds.forEach(movieId => {
    movieListCounts[movieId] = (movieListCounts[movieId] || 0) + 1;
  });
});

// Find single-movie lists
const singleMovieLists = progressData.masterLists.filter(list => list.movieIds.length === 1);

console.log(`📊 SINGLE-MOVIE LISTS: ${singleMovieLists.length} total\n`);

// Find movies that appear in ONLY one list (and that list has only that movie)
const completelyIsolatedMovies = [];
const isolatedInSingleList = []; // Movies that only appear once, but in a single-movie list

singleMovieLists.forEach(list => {
  const movieId = list.movieIds[0];
  const totalAppearances = movieListCounts[movieId] || 0;
  
  if (totalAppearances === 1) {
    // This movie only appears in this single-movie list
    completelyIsolatedMovies.push({
      movieId,
      listName: list.name,
      movie: movieLookup[movieId]
    });
  } else {
    // This movie appears in other lists too
    isolatedInSingleList.push({
      movieId,
      listName: list.name,
      movie: movieLookup[movieId],
      totalAppearances
    });
  }
});

console.log(`🎯 COMPLETELY ISOLATED MOVIES: ${completelyIsolatedMovies.length}`);
console.log('(Movies that appear in exactly 1 list, and that list contains only them)\n');

completelyIsolatedMovies.slice(0, 20).forEach((item, index) => {
  const movie = item.movie;
  console.log(`${index + 1}. "${item.listName}" → "${movie?.title}" (${movie?.year})`);
});

if (completelyIsolatedMovies.length > 20) {
  console.log(`... and ${completelyIsolatedMovies.length - 20} more\n`);
} else {
  console.log();
}

console.log(`📋 SINGLE-MOVIE LISTS WHERE MOVIE APPEARS ELSEWHERE: ${isolatedInSingleList.length}`);
console.log('(Single-movie lists, but the movie also appears in other lists)\n');

isolatedInSingleList.slice(0, 15).forEach((item, index) => {
  const movie = item.movie;
  console.log(`${index + 1}. "${item.listName}" → "${movie?.title}" (${movie?.year}) [appears in ${item.totalAppearances} total lists]`);
});

if (isolatedInSingleList.length > 15) {
  console.log(`... and ${isolatedInSingleList.length - 15} more\n`);
} else {
  console.log();
}

// Summary stats
console.log('📊 SUMMARY:');
console.log(`- Total single-movie lists: ${singleMovieLists.length}`);
console.log(`- Completely isolated movies: ${completelyIsolatedMovies.length} (${((completelyIsolatedMovies.length / singleMovieLists.length) * 100).toFixed(1)}%)`);
console.log(`- Single-movie lists where movie appears elsewhere: ${isolatedInSingleList.length} (${((isolatedInSingleList.length / singleMovieLists.length) * 100).toFixed(1)}%)`);

// Show the distribution of total appearances for single-movie list movies
console.log('\n📈 APPEARANCE DISTRIBUTION FOR SINGLE-MOVIE LIST MOVIES:');
const appearanceDistribution = {};
singleMovieLists.forEach(list => {
  const movieId = list.movieIds[0];
  const appearances = movieListCounts[movieId] || 0;
  appearanceDistribution[appearances] = (appearanceDistribution[appearances] || 0) + 1;
});

Object.entries(appearanceDistribution)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .forEach(([appearances, count]) => {
    console.log(`- ${appearances} lists: ${count} movies (${((count / singleMovieLists.length) * 100).toFixed(1)}%)`);
  });

console.log('\n✅ Analysis complete!');