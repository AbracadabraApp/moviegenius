#!/usr/bin/env node

import fs from 'fs';

const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));
const testData = JSON.parse(fs.readFileSync('./musical-test-data.json', 'utf8'));

console.log('🎭 COMPREHENSIVE MUSICAL CATEGORY DATA EXPLORATION\n');

// === OVERALL STATISTICS ===
console.log('📊 OVERALL STATISTICS:');
console.log(`- Total movies in dataset: ${testData.movieData.length}`);
console.log(`- Successfully processed: ${progressData.totalMoviesProcessed}`);
console.log(`- Total failures: ${progressData.failures.length}`);
console.log(`- Total lists generated: ${progressData.masterLists.length}`);
console.log(`- Total cost: $${progressData.totalCost.toFixed(4)}`);

// === LIST SIZE DISTRIBUTION ===
console.log('\n📋 LIST SIZE DISTRIBUTION:');
const listSizes = progressData.masterLists.map(list => list.movieIds.length).sort((a, b) => b - a);
const sizeGroups = {
  'Single movie (1)': listSizes.filter(size => size === 1).length,
  'Small (2-5)': listSizes.filter(size => size >= 2 && size <= 5).length,
  'Medium (6-15)': listSizes.filter(size => size >= 6 && size <= 15).length,
  'Large (16-50)': listSizes.filter(size => size >= 16 && size <= 50).length,
  'Very Large (50+)': listSizes.filter(size => size > 50).length
};

Object.entries(sizeGroups).forEach(([range, count]) => {
  const percentage = ((count / progressData.masterLists.length) * 100).toFixed(1);
  console.log(`  - ${range}: ${count} lists (${percentage}%)`);
});

console.log(`\nLargest lists:`);
progressData.masterLists
  .sort((a, b) => b.movieIds.length - a.movieIds.length)
  .slice(0, 10)
  .forEach(list => {
    console.log(`  - "${list.name}": ${list.movieIds.length} movies`);
  });

// === MOVIE PLACEMENT ANALYSIS ===
console.log('\n🎬 MOVIE PLACEMENT ANALYSIS:');
const moviePlacements = {};
const allMovieIds = new Set();

progressData.masterLists.forEach(list => {
  list.movieIds.forEach(movieId => {
    allMovieIds.add(movieId);
    moviePlacements[movieId] = (moviePlacements[movieId] || 0) + 1;
  });
});

const placementCounts = Object.values(moviePlacements);
const avgPlacements = placementCounts.reduce((sum, count) => sum + count, 0) / placementCounts.length;

console.log(`- Unique movies in lists: ${allMovieIds.size}`);
console.log(`- Average placements per movie: ${avgPlacements.toFixed(1)}`);
console.log(`- Total movie placements: ${placementCounts.reduce((sum, count) => sum + count, 0)}`);

const placementDistribution = {};
placementCounts.forEach(count => {
  placementDistribution[count] = (placementDistribution[count] || 0) + 1;
});

console.log('\nPlacement distribution:');
Object.entries(placementDistribution)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .forEach(([placements, movieCount]) => {
    const percentage = ((movieCount / allMovieIds.size) * 100).toFixed(1);
    console.log(`  - ${placements} lists: ${movieCount} movies (${percentage}%)`);
  });

// === THEMATIC ANALYSIS ===
console.log('\n🎨 THEMATIC ANALYSIS:');

// Group lists by themes
const themeGroups = {
  'Era/Period': [],
  'Genre/Style': [],
  'Source Material': [],
  'Production/Industry': [],
  'Character Types': [],
  'Settings/Locations': [],
  'Cultural/Identity': [],
  'Technical/Format': [],
  'Other': []
};

progressData.masterLists.forEach(list => {
  const name = list.name.toLowerCase();
  
  if (name.includes('era') || name.includes('age') || name.includes('revolution') || 
      name.includes('1920s') || name.includes('1930s') || name.includes('1940s') ||
      name.includes('golden') || name.includes('early') || name.includes('prohibition')) {
    themeGroups['Era/Period'].push(list);
  } else if (name.includes('broadway') || name.includes('stage') || name.includes('adaptation') ||
             name.includes('based on') || name.includes('novel')) {
    themeGroups['Source Material'].push(list);
  } else if (name.includes('backstage') || name.includes('hollywood') || name.includes('showbiz') ||
             name.includes('production') || name.includes('studio')) {
    themeGroups['Production/Industry'].push(list);
  } else if (name.includes('jazz') || name.includes('blues') || name.includes('swing') ||
             name.includes('rock') || name.includes('folk') || name.includes('country')) {
    themeGroups['Genre/Style'].push(list);
  } else if (name.includes('romance') || name.includes('comedy') || name.includes('drama') ||
             name.includes('family') || name.includes('children') || name.includes('animated')) {
    themeGroups['Character Types'].push(list);
  } else if (name.includes('american') || name.includes('southern') || name.includes('western') ||
             name.includes('urban') || name.includes('rural')) {
    themeGroups['Settings/Locations'].push(list);
  } else if (name.includes('jewish') || name.includes('african') || name.includes('immigrant') ||
             name.includes('cultural') || name.includes('identity')) {
    themeGroups['Cultural/Identity'].push(list);
  } else if (name.includes('sound') || name.includes('color') || name.includes('3d') ||
             name.includes('technical') || name.includes('format')) {
    themeGroups['Technical/Format'].push(list);
  } else {
    themeGroups['Other'].push(list);
  }
});

Object.entries(themeGroups).forEach(([theme, lists]) => {
  if (lists.length > 0) {
    console.log(`\n${theme} (${lists.length} lists):`);
    lists.slice(0, 5).forEach(list => {
      console.log(`  - "${list.name}" (${list.movieIds.length} movies)`);
    });
    if (lists.length > 5) console.log(`  ... and ${lists.length - 5} more`);
  }
});

// === POTENTIAL CONSOLIDATION OPPORTUNITIES ===
console.log('\n🔍 POTENTIAL CONSOLIDATION OPPORTUNITIES:');

// Find similar list names
const similarLists = [];
const listNames = progressData.masterLists.map(list => list.name);

listNames.forEach((name, i) => {
  const words = name.toLowerCase().split(/\s+/);
  listNames.forEach((otherName, j) => {
    if (i !== j) {
      const otherWords = otherName.toLowerCase().split(/\s+/);
      const commonWords = words.filter(word => otherWords.includes(word) && word.length > 3);
      if (commonWords.length >= 2) {
        similarLists.push({ list1: name, list2: otherName, commonWords });
      }
    }
  });
});

// Remove duplicates
const uniqueSimilar = [];
const seen = new Set();
similarLists.forEach(pair => {
  const key = [pair.list1, pair.list2].sort().join('|');
  if (!seen.has(key)) {
    seen.add(key);
    uniqueSimilar.push(pair);
  }
});

console.log('Lists with similar names (potential duplicates/related):');
uniqueSimilar.slice(0, 10).forEach(pair => {
  console.log(`  - "${pair.list1}" <-> "${pair.list2}"`);
  console.log(`    Common words: ${pair.commonWords.join(', ')}`);
});

// Find very small lists that might be consolidated
console.log('\nVery small lists (potential consolidation candidates):');
progressData.masterLists
  .filter(list => list.movieIds.length === 1)
  .slice(0, 15)
  .forEach(list => {
    console.log(`  - "${list.name}" (1 movie)`);
  });

// === TEMPORAL ANALYSIS ===
console.log('\n📅 TEMPORAL ANALYSIS:');

// Get movie years and analyze temporal distribution
const movieYearMap = {};
testData.movieData.forEach(movie => {
  movieYearMap[movie.id] = movie.year;
});

const listTemporalData = progressData.masterLists.map(list => {
  const years = list.movieIds
    .map(id => movieYearMap[id])
    .filter(year => year)
    .sort((a, b) => a - b);
  
  if (years.length === 0) return null;
  
  return {
    name: list.name,
    movieCount: list.movieIds.length,
    minYear: years[0],
    maxYear: years[years.length - 1],
    span: years[years.length - 1] - years[0],
    avgYear: Math.round(years.reduce((sum, year) => sum + year, 0) / years.length)
  };
}).filter(data => data);

console.log('Lists with largest temporal spans:');
listTemporalData
  .sort((a, b) => b.span - a.span)
  .slice(0, 10)
  .forEach(data => {
    console.log(`  - "${data.name}": ${data.minYear}-${data.maxYear} (${data.span} years, ${data.movieCount} movies)`);
  });

console.log('\nLists most focused on specific eras:');
listTemporalData
  .filter(data => data.movieCount >= 5) // Only consider substantial lists
  .sort((a, b) => a.span - b.span)
  .slice(0, 10)
  .forEach(data => {
    console.log(`  - "${data.name}": ${data.minYear}-${data.maxYear} (${data.span} years, ${data.movieCount} movies)`);
  });

console.log('\n✅ Data exploration complete!');