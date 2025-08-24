#!/usr/bin/env node

import fs from 'fs';

const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));

console.log('📊 COMPLETE LIST SIZE BREAKDOWN\n');

const totalLists = progressData.masterLists.length;

// Create size categories
const categories = {
  '100+': { min: 100, max: Infinity, lists: [] },
  '99-70': { min: 70, max: 99, lists: [] },
  '69-30': { min: 30, max: 69, lists: [] },
  '29-10': { min: 10, max: 29, lists: [] },
  '9-8': { min: 8, max: 9, lists: [] },
  '7-6': { min: 6, max: 7, lists: [] },
  '5-1': { min: 1, max: 5, lists: [] }
};

// Categorize all lists
progressData.masterLists.forEach(list => {
  const size = list.movieIds.length;
  
  if (size >= 100) {
    categories['100+'].lists.push(list);
  } else if (size >= 70) {
    categories['99-70'].lists.push(list);
  } else if (size >= 30) {
    categories['69-30'].lists.push(list);
  } else if (size >= 10) {
    categories['29-10'].lists.push(list);
  } else if (size >= 8) {
    categories['9-8'].lists.push(list);
  } else if (size >= 6) {
    categories['7-6'].lists.push(list);
  } else {
    categories['5-1'].lists.push(list);
  }
});

console.log(`TOTAL LISTS: ${totalLists}\n`);

// Display breakdown
Object.entries(categories).forEach(([range, data]) => {
  const count = data.lists.length;
  const percentage = ((count / totalLists) * 100).toFixed(1);
  console.log(`${range} items: ${count} lists (${percentage}%)`);
});

console.log('\n' + '='.repeat(50) + '\n');

// Show details for each category
Object.entries(categories).forEach(([range, data]) => {
  const count = data.lists.length;
  const percentage = ((count / totalLists) * 100).toFixed(1);
  
  console.log(`📋 ${range} ITEMS: ${count} lists (${percentage}%)`);
  
  if (count > 0) {
    // Sort by size descending
    const sortedLists = data.lists.sort((a, b) => b.movieIds.length - a.movieIds.length);
    
    if (count <= 10) {
      // Show all if 10 or fewer
      sortedLists.forEach((list, index) => {
        console.log(`  ${index + 1}. "${list.name}" (${list.movieIds.length} movies)`);
      });
    } else {
      // Show top 5 and bottom 3
      console.log('  Top lists:');
      sortedLists.slice(0, 5).forEach((list, index) => {
        console.log(`    ${index + 1}. "${list.name}" (${list.movieIds.length} movies)`);
      });
      console.log('  ...');
      console.log('  Smallest in this range:');
      sortedLists.slice(-3).forEach((list, index) => {
        console.log(`    "${list.name}" (${list.movieIds.length} movies)`);
      });
    }
  }
  console.log();
});

// Additional specific breakdowns
console.log('🔍 DETAILED SMALL LIST BREAKDOWN:\n');

const smallListSizes = {};
progressData.masterLists
  .filter(list => list.movieIds.length <= 10)
  .forEach(list => {
    const size = list.movieIds.length;
    smallListSizes[size] = (smallListSizes[size] || 0) + 1;
  });

Object.entries(smallListSizes)
  .sort(([a], [b]) => parseInt(b) - parseInt(a))
  .forEach(([size, count]) => {
    const percentage = ((count / totalLists) * 100).toFixed(1);
    console.log(`${size} items: ${count} lists (${percentage}%)`);
  });

console.log('\n✅ Complete breakdown finished!');