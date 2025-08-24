#!/usr/bin/env node

import fs from 'fs';

const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));
const testData = JSON.parse(fs.readFileSync('./musical-test-data.json', 'utf8'));

// Create movie lookup
const movieLookup = {};
testData.movieData.forEach(movie => {
  movieLookup[movie.id] = movie;
});

console.log('🔍 DETAILED CONSOLIDATION ISSUES ANALYSIS\n');

// === ANALYZE SINGLE-MOVIE LISTS ===
console.log('1. SINGLE-MOVIE LISTS ANALYSIS:');
const singleMovieLists = progressData.masterLists.filter(list => list.movieIds.length === 1);
console.log(`Found ${singleMovieLists.length} single-movie lists (45.6% of all lists)\n`);

// Group single-movie lists by theme
const singleMovieByTheme = {};
singleMovieLists.forEach(list => {
  const name = list.name.toLowerCase();
  let theme = 'Other';
  
  if (name.includes('era') || name.includes('age') || name.includes('1920') || name.includes('1930') || name.includes('1940')) {
    theme = 'Era/Period';
  } else if (name.includes('romance') || name.includes('love')) {
    theme = 'Romance';
  } else if (name.includes('comedy') || name.includes('comedies')) {
    theme = 'Comedy';
  } else if (name.includes('drama') || name.includes('dramas')) {
    theme = 'Drama';
  } else if (name.includes('biopic') || name.includes('biographical')) {
    theme = 'Biographical';
  } else if (name.includes('christmas') || name.includes('holiday')) {
    theme = 'Holiday';
  } else if (name.includes('adaptation') || name.includes('adaptations')) {
    theme = 'Adaptations';
  }
  
  if (!singleMovieByTheme[theme]) singleMovieByTheme[theme] = [];
  singleMovieByTheme[theme].push(list);
});

Object.entries(singleMovieByTheme).forEach(([theme, lists]) => {
  console.log(`${theme}: ${lists.length} single-movie lists`);
  lists.slice(0, 5).forEach(list => {
    const movie = movieLookup[list.movieIds[0]];
    console.log(`  - "${list.name}" -> "${movie?.title}" (${movie?.year})`);
  });
  if (lists.length > 5) console.log(`  ... and ${lists.length - 5} more`);
  console.log();
});

// === ANALYZE POTENTIAL DUPLICATES ===
console.log('2. POTENTIAL DUPLICATE/SIMILAR LISTS:');

const potentialDuplicates = [];

// Find lists with very similar names or overlapping movies
for (let i = 0; i < progressData.masterLists.length; i++) {
  for (let j = i + 1; j < progressData.masterLists.length; j++) {
    const list1 = progressData.masterLists[i];
    const list2 = progressData.masterLists[j];
    
    // Check name similarity (simplified)
    const name1Words = list1.name.toLowerCase().split(/\s+/);
    const name2Words = list2.name.toLowerCase().split(/\s+/);
    const commonWords = name1Words.filter(word => name2Words.includes(word) && word.length > 3);
    
    // Check movie overlap
    const set1 = new Set(list1.movieIds);
    const set2 = new Set(list2.movieIds);
    const overlap = [...set1].filter(id => set2.has(id));
    const overlapRatio = overlap.length / Math.min(list1.movieIds.length, list2.movieIds.length);
    
    if (commonWords.length >= 2 || overlapRatio > 0.5) {
      potentialDuplicates.push({
        list1: list1.name,
        list2: list2.name,
        size1: list1.movieIds.length,
        size2: list2.movieIds.length,
        commonWords,
        overlap: overlap.length,
        overlapRatio: overlapRatio.toFixed(2)
      });
    }
  }
}

console.log(`Found ${potentialDuplicates.length} potential duplicate/similar pairs:\n`);

// Sort by highest overlap ratio first
potentialDuplicates
  .sort((a, b) => parseFloat(b.overlapRatio) - parseFloat(a.overlapRatio))
  .slice(0, 15)
  .forEach(dup => {
    console.log(`"${dup.list1}" (${dup.size1} movies) <-> "${dup.list2}" (${dup.size2} movies)`);
    console.log(`  Common words: [${dup.commonWords.join(', ')}]`);
    console.log(`  Movie overlap: ${dup.overlap} movies (${(dup.overlapRatio * 100).toFixed(1)}%)`);
    console.log();
  });

// === ANALYZE OVERLY SPECIFIC LISTS ===
console.log('3. OVERLY SPECIFIC/NICHE LISTS:');

const specificLists = progressData.masterLists
  .filter(list => list.movieIds.length <= 3)
  .filter(list => {
    const name = list.name.toLowerCase();
    return name.length > 30 || // Very long names
           name.split(' ').length > 5 || // Many words
           name.includes('specific') ||
           name.includes('particular') ||
           /\d{4}/.test(name); // Contains specific years
  });

console.log(`Found ${specificLists.length} overly specific lists:\n`);

specificLists.slice(0, 20).forEach(list => {
  const movies = list.movieIds.map(id => {
    const movie = movieLookup[id];
    return movie ? `"${movie.title}" (${movie.year})` : 'Unknown movie';
  }).join(', ');
  console.log(`- "${list.name}" (${list.movieIds.length} movies)`);
  console.log(`  Movies: ${movies}`);
  console.log();
});

// === ANALYZE TEMPORAL INCONSISTENCIES ===
console.log('4. TEMPORAL INCONSISTENCIES:');

const temporalInconsistencies = [];

progressData.masterLists.forEach(list => {
  if (list.movieIds.length < 3) return; // Skip very small lists
  
  const years = list.movieIds
    .map(id => movieLookup[id]?.year)
    .filter(year => year)
    .sort((a, b) => a - b);
    
  if (years.length === 0) return;
  
  const span = years[years.length - 1] - years[0];
  const name = list.name.toLowerCase();
  
  // Check for era-specific lists with wide spans
  if ((name.includes('1920') || name.includes('1930') || name.includes('1940') || 
       name.includes('golden age') || name.includes('early')) && span > 20) {
    temporalInconsistencies.push({
      name: list.name,
      movieCount: list.movieIds.length,
      minYear: years[0],
      maxYear: years[years.length - 1],
      span: span
    });
  }
});

console.log(`Found ${temporalInconsistencies.length} lists with temporal inconsistencies:\n`);

temporalInconsistencies
  .sort((a, b) => b.span - a.span)
  .slice(0, 10)
  .forEach(list => {
    console.log(`- "${list.name}"`);
    console.log(`  ${list.minYear}-${list.maxYear} (${list.span} years, ${list.movieCount} movies)`);
    console.log();
  });

// === SUMMARY STATISTICS ===
console.log('5. CONSOLIDATION OPPORTUNITY SUMMARY:');
console.log(`- Single-movie lists: ${singleMovieLists.length} (${((singleMovieLists.length / progressData.masterLists.length) * 100).toFixed(1)}%)`);
console.log(`- Potential duplicates: ${potentialDuplicates.length} pairs`);
console.log(`- Overly specific lists: ${specificLists.length}`);
console.log(`- Temporal inconsistencies: ${temporalInconsistencies.length}`);

const totalConsolidationCandidates = singleMovieLists.length + specificLists.length + potentialDuplicates.length;
console.log(`- Total consolidation candidates: ~${totalConsolidationCandidates} items`);
console.log(`- Potential reduction: ${((totalConsolidationCandidates / progressData.masterLists.length) * 100).toFixed(1)}% of lists`);

console.log('\n✅ Consolidation analysis complete!');