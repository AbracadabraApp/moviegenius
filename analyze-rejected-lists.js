#!/usr/bin/env node

import fs from 'fs';

// Load and analyze the themes
const allThemes = JSON.parse(fs.readFileSync('./generated-lists-batch/all-themes.json', 'utf8'));

// Group by list name to count movies per list
const themeGroups = {};
for (const theme of allThemes) {
  const listName = theme.listName;
  if (!themeGroups[listName]) {
    themeGroups[listName] = new Set();
  }
  themeGroups[listName].add(theme.tmdbId);
}

// Convert to array with counts
const listsWithCounts = Object.entries(themeGroups).map(([name, movieSet]) => ({
  name,
  count: movieSet.size
}));

// Sort by count descending
listsWithCounts.sort((a, b) => b.count - a.count);

console.log('100 sample rejected lists with movie counts:\n');

listsWithCounts.slice(0, 100).forEach((list, i) => {
  const status = list.count < 5 ? 'TOO FEW' : list.count > 30 ? 'TOO MANY' : 'VALID';
  console.log(`${i+1}. "${list.name}" (${list.count} movies) - ${status}`);
});

// Show distribution
const distribution = {
  '1 movie': listsWithCounts.filter(l => l.count === 1).length,
  '2-4 movies': listsWithCounts.filter(l => l.count >= 2 && l.count <= 4).length,
  '5-30 movies': listsWithCounts.filter(l => l.count >= 5 && l.count <= 30).length,
  '31-50 movies': listsWithCounts.filter(l => l.count >= 31 && l.count <= 50).length,
  '51+ movies': listsWithCounts.filter(l => l.count > 50).length
};

console.log('\nDistribution:');
Object.entries(distribution).forEach(([range, count]) => {
  console.log(`${range}: ${count} lists`);
});