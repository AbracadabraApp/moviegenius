#!/usr/bin/env node

import fs from 'fs';

// Load the current streaming data
const streamingData = JSON.parse(fs.readFileSync('/Users/josh.petersen/moviegenius/curated-streaming-ranked.json', 'utf8'));
const rankedFilms = streamingData.rankedFilms;

console.log(`🔄 UPDATING RANKING WITHOUT PLATFORM QUALITY WEIGHT...`);
console.log(`Current films with streaming: ${rankedFilms.length}`);

// Updated ranking criteria (removed streaming platform quality weight)
const updatedRankedFilms = rankedFilms.map(film => {
  let score = 0;
  
  // 1. Source Prestige (60% weight - increased from 45%)
  if (film.source === 'Criterion Collection' || (film.sources && film.sources.includes('Criterion Collection'))) {
    score += 100 * 0.60;
  } else if (film.source === 'Genius Episodes 1950s-1980s' || (film.sources && film.sources.includes('Genius Episodes 1950s-1980s'))) {
    score += 90 * 0.60;
  } else if (film.source === 'AFI 30-70' || (film.sources && film.sources.includes('AFI 30-70'))) {
    score += 70 * 0.60;
  }
  
  // 2. Era Balance (25% weight - increased from 15%)
  if (film.year >= 1950 && film.year <= 1989) {
    score += 100 * 0.25;
  } else if ((film.year >= 1940 && film.year < 1950) || (film.year >= 1990 && film.year < 2000)) {
    score += 80 * 0.25;
  } else {
    score += 60 * 0.25;
  }
  
  // 3. Multiple Source Bonus (15% weight - increased from 10%)
  if (film.sources && film.sources.length >= 2) {
    if (film.sources.length >= 3) {
      score += 35 * 0.15;
    } else {
      score += 20 * 0.15;
    }
  }
  
  return { ...film, score: Math.round(score) };
});

// Re-sort by updated score
updatedRankedFilms.sort((a, b) => b.score - a.score);

console.log(`\n🏆 TOP 20 WITH UPDATED RANKING (No Platform Weight):`);
updatedRankedFilms.slice(0, 20).forEach((film, index) => {
  const sources = film.sources ? film.sources.join(' + ') : film.source;
  const platformInfo = film.streaming || 'Unknown streaming';
  console.log(`${index + 1}. ${film.title} (${film.year}) - ${platformInfo} [Score: ${film.score}] [${sources}]`);
});

// Analysis of changes
console.log(`\n📊 RANKING CHANGES ANALYSIS:`);

// Compare top 10 before and after
const oldTop10 = rankedFilms.slice(0, 10).map(f => f.title);
const newTop10 = updatedRankedFilms.slice(0, 10).map(f => f.title);

console.log(`\nOLD Top 10:`);
oldTop10.forEach((title, i) => console.log(`${i + 1}. ${title}`));

console.log(`\nNEW Top 10:`);
newTop10.forEach((title, i) => console.log(`${i + 1}. ${title}`));

// Show score distribution
const scoreDistribution = {};
updatedRankedFilms.forEach(film => {
  const scoreRange = `${Math.floor(film.score / 10) * 10}-${Math.floor(film.score / 10) * 10 + 9}`;
  scoreDistribution[scoreRange] = (scoreDistribution[scoreRange] || 0) + 1;
});

console.log(`\n📈 SCORE DISTRIBUTION:`);
Object.entries(scoreDistribution)
  .sort((a, b) => b[0].split('-')[0] - a[0].split('-')[0])
  .forEach(([range, count]) => {
    console.log(`${range}: ${count} films`);
  });

// Update the data structure
const updatedStreamingData = {
  ...streamingData,
  summary: {
    ...streamingData.summary,
    rankingCriteria: [
      "Source Prestige (60% weight): Criterion Collection 100pts, Genius Episodes 90pts, AFI 30-70 70pts",
      "Era Balance (25% weight): 1950s-1980s 100pts, adjacent decades 80pts, other 60pts", 
      "Multiple Source Bonus (15% weight): 2+ sources +20pts, 3+ sources +35pts"
    ],
    lastUpdated: new Date().toISOString(),
    removedPlatformWeight: true
  },
  rankedFilms: updatedRankedFilms
};

// Save updated ranking
fs.writeFileSync('/Users/josh.petersen/moviegenius/curated-streaming-ranked.json', JSON.stringify(updatedStreamingData, null, 2));
console.log(`\n💾 Updated ranking saved (no platform weight)`);

// Show platform distribution in top 20 (for reference only, not scored)
console.log(`\n📊 PLATFORM DISTRIBUTION IN TOP 20 (Reference Only):`);
const top20Platforms = {};
updatedRankedFilms.slice(0, 20).forEach(film => {
  const platform = (film.streaming || 'Unknown').split(' (')[0]; // Remove (+X) part
  top20Platforms[platform] = (top20Platforms[platform] || 0) + 1;
});

Object.entries(top20Platforms)
  .sort((a, b) => b[1] - a[1])
  .forEach(([platform, count]) => {
    console.log(`${platform}: ${count} films`);
  });