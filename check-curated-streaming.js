#!/usr/bin/env node

import fs from 'fs';

// Load our curated list
const curatedData = JSON.parse(fs.readFileSync('/Users/josh.petersen/moviegenius/complete-curated-list.json', 'utf8'));
const curatedFilms = curatedData.allFilms;

console.log(`🎬 CHECKING STREAMING FOR ${curatedFilms.length} CURATED FILMS...`);

// Sample of films with streaming from our genius collection
const withStreaming = curatedFilms.filter(film => {
  return film.streaming && 
         film.streaming !== 'No streaming' && 
         film.streaming !== 'Theatrical' &&
         film.streaming !== 'Not Streaming' &&
         !film.streaming.includes('Archives');
});

console.log(`\n📊 STREAMING AVAILABILITY:`);
console.log(`✅ With streaming: ${withStreaming.length} films`);
console.log(`⚪ Need streaming lookup: ${curatedFilms.length - withStreaming.length} films`);

// Group with streaming by platform
const streamingPlatforms = {};
withStreaming.forEach(film => {
  const platform = film.streaming;
  if (!streamingPlatforms[platform]) streamingPlatforms[platform] = [];
  streamingPlatforms[platform].push(film);
});

console.log(`\n🎯 TOP STREAMING PLATFORMS IN OUR CURATED LIST:`);
Object.entries(streamingPlatforms)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10)
  .forEach(([platform, films]) => {
    console.log(`${platform}: ${films.length} films`);
  });

// Apply our refined ranking criteria
console.log(`\n⭐ APPLYING RANKING CRITERIA TO STREAMING FILMS:`);

const rankedStreamingFilms = withStreaming.map(film => {
  let score = 0;
  
  // 1. Source Prestige (45% weight)
  if (film.source === 'Criterion Collection') score += 100 * 0.45;
  else if (film.source === 'Genius Episodes 1950s-1980s') score += 90 * 0.45;
  else if (film.source === 'AFI 30-70') score += 70 * 0.45;
  
  // 2. Streaming Platform Quality (30% weight)
  const platform = film.streaming.toLowerCase();
  if (platform.includes('hbo max') || platform.includes('criterion channel')) score += 100 * 0.30;
  else if (platform.includes('netflix') || platform.includes('amazon prime')) score += 85 * 0.30;
  else if (platform.includes('disney+') || platform.includes('hulu')) score += 80 * 0.30;
  else if (platform.includes('paramount+') || platform.includes('starz')) score += 75 * 0.30;
  else if (platform.includes('mubi') || platform.includes('bfi')) score += 70 * 0.30;
  else score += 60 * 0.30; // Other platforms
  
  // 3. Era Balance (15% weight)  
  if (film.year >= 1950 && film.year <= 1989) score += 100 * 0.15;
  else if ((film.year >= 1940 && film.year < 1950) || (film.year >= 1990 && film.year < 2000)) score += 80 * 0.15;
  else score += 60 * 0.15;
  
  // 4. Multiple Source Bonus (10% weight)
  if (film.sources && film.sources.length >= 2) {
    if (film.sources.length >= 3) score += 35 * 0.10;
    else score += 20 * 0.10;
  }
  
  return { ...film, score: Math.round(score) };
});

// Sort by score
rankedStreamingFilms.sort((a, b) => b.score - a.score);

console.log(`\n🏆 TOP 20 RANKED STREAMING FILMS FOR CAROUSEL:`);
rankedStreamingFilms.slice(0, 20).forEach((film, index) => {
  const sources = film.sources ? film.sources.join(' + ') : film.source;
  console.log(`${index + 1}. ${film.title} (${film.year}) - ${film.streaming} [Score: ${film.score}] [${sources}]`);
});

// Save results
const output = {
  summary: {
    totalCuratedFilms: curatedFilms.length,
    withStreaming: withStreaming.length,
    needLookup: curatedFilms.length - withStreaming.length,
    rankedAt: new Date().toISOString()
  },
  streamingPlatforms: streamingPlatforms,
  rankedFilms: rankedStreamingFilms.slice(0, 50), // Top 50 for carousel options
  needStreamingLookup: curatedFilms.filter(film => !film.streaming || film.streaming === 'No streaming' || film.streaming === 'Theatrical')
};

fs.writeFileSync('/Users/josh.petersen/moviegenius/curated-streaming-ranked.json', JSON.stringify(output, null, 2));
console.log(`\n💾 Saved streaming analysis to: curated-streaming-ranked.json`);

// Show platform distribution for top 20
console.log(`\n📊 PLATFORM DISTRIBUTION IN TOP 20:`);
const top20Platforms = {};
rankedStreamingFilms.slice(0, 20).forEach(film => {
  const platform = film.streaming;
  top20Platforms[platform] = (top20Platforms[platform] || 0) + 1;
});

Object.entries(top20Platforms)
  .sort((a, b) => b[1] - a[1])
  .forEach(([platform, count]) => {
    console.log(`${platform}: ${count} films`);
  });