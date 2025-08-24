#!/usr/bin/env node

import fs from 'fs';

const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));
const testData = JSON.parse(fs.readFileSync('./musical-test-data.json', 'utf8'));

// Create movie lookup
const movieLookup = {};
testData.movieData.forEach(movie => {
  movieLookup[movie.id] = movie;
});

console.log('📊 LARGE LISTS COMPOSITION ANALYSIS\n');

// Get the 10 largest lists
const largestLists = progressData.masterLists
  .sort((a, b) => b.movieIds.length - a.movieIds.length)
  .slice(0, 10);

largestLists.forEach((list, index) => {
  console.log(`${index + 1}. "${list.name}" (${list.movieIds.length} movies)`);
  
  // Get movie details and analyze composition
  const movies = list.movieIds
    .map(id => movieLookup[id])
    .filter(movie => movie)
    .sort((a, b) => a.year - b.year);
    
  if (movies.length === 0) {
    console.log('   No movie data available\n');
    return;
  }
  
  // Temporal analysis
  const years = movies.map(m => m.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const span = maxYear - minYear;
  
  console.log(`   Years: ${minYear}-${maxYear} (${span} year span)`);
  
  // Decade distribution
  const decades = {};
  movies.forEach(movie => {
    const decade = Math.floor(movie.year / 10) * 10;
    decades[decade] = (decades[decade] || 0) + 1;
  });
  
  const decadeStr = Object.entries(decades)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([decade, count]) => `${decade}s: ${count}`)
    .join(', ');
  console.log(`   Decades: ${decadeStr}`);
  
  // Show sample movies from different eras
  const earlyMovies = movies.slice(0, 3).map(m => `"${m.title}" (${m.year})`).join(', ');
  const recentMovies = movies.slice(-3).map(m => `"${m.title}" (${m.year})`).join(', ');
  
  console.log(`   Early: ${earlyMovies}`);
  console.log(`   Recent: ${recentMovies}`);
  console.log();
});

// Analyze medium-sized lists (10-30 movies) for themes
console.log('🎯 MEDIUM-SIZED LISTS THEMATIC COHERENCE:');

const mediumLists = progressData.masterLists
  .filter(list => list.movieIds.length >= 10 && list.movieIds.length <= 30)
  .sort((a, b) => b.movieIds.length - a.movieIds.length)
  .slice(0, 15);

mediumLists.forEach(list => {
  const movies = list.movieIds
    .map(id => movieLookup[id])
    .filter(movie => movie)
    .sort((a, b) => a.year - b.year);
    
  if (movies.length === 0) return;
  
  const years = movies.map(m => m.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const span = maxYear - minYear;
  
  console.log(`"${list.name}" (${list.movieIds.length} movies, ${minYear}-${maxYear}, ${span}yr span)`);
  
  // Show 5 representative movies
  const sampleMovies = [
    movies[0], // Earliest
    movies[Math.floor(movies.length * 0.25)], // 25%
    movies[Math.floor(movies.length * 0.5)], // Middle
    movies[Math.floor(movies.length * 0.75)], // 75%
    movies[movies.length - 1] // Latest
  ].filter((movie, index, arr) => arr.indexOf(movie) === index) // Remove duplicates
   .map(m => `"${m.title}" (${m.year})`)
   .join(', ');
   
  console.log(`  Sample: ${sampleMovies}`);
  console.log();
});

console.log('✅ Large lists analysis complete!');