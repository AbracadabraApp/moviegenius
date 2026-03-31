#!/usr/bin/env node

import fs from 'fs';

// Load the analysis results
const streamingData = JSON.parse(fs.readFileSync('/Users/josh.petersen/moviegenius/curated-streaming-ranked.json', 'utf8'));
const needLookup = streamingData.needStreamingLookup;

console.log(`🔍 LOOKING UP STREAMING FOR ${needLookup.length} FILMS...`);

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'your_api_key_here';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Platform name mappings for consistency
const platformMappings = {
  'Amazon Prime Video': 'Amazon Prime',
  'Prime Video': 'Amazon Prime', 
  'HBO Max': 'HBO Max',
  'Max': 'HBO Max',
  'Netflix': 'Netflix',
  'Disney Plus': 'Disney+',
  'Disney+': 'Disney+',
  'Hulu': 'Hulu',
  'Paramount Plus': 'Paramount+',
  'Paramount+': 'Paramount+',
  'Apple TV Plus': 'Apple TV+',
  'Apple TV+': 'Apple TV+',
  'The Criterion Channel': 'Criterion Channel',
  'Criterion Channel': 'Criterion Channel'
};

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function lookupTMDBStreaming(tmdbId) {
  if (!tmdbId) return null;
  
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const usProviders = data.results?.US;
    
    if (!usProviders) return null;
    
    // Get streaming providers (flatrate)
    const streamingProviders = usProviders.flatrate || [];
    
    if (streamingProviders.length === 0) return null;
    
    // Map to consistent platform names and get primary + count
    const platforms = streamingProviders.map(p => platformMappings[p.provider_name] || p.provider_name);
    const primary = platforms[0];
    const additionalCount = platforms.length - 1;
    
    if (additionalCount > 0) {
      return `${primary} (+${additionalCount})`;
    }
    return primary;
    
  } catch (error) {
    console.error(`❌ Error fetching TMDB data for ${tmdbId}:`, error.message);
    return null;
  }
}

async function searchTMDBByTitleYear(title, year) {
  try {
    const searchQuery = encodeURIComponent(title);
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}&year=${year}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = data.results || [];
    
    // Find best match by year and title similarity
    const exactMatch = results.find(r => r.release_date?.startsWith(year.toString()));
    return exactMatch?.id || results[0]?.id || null;
    
  } catch (error) {
    console.error(`❌ Error searching TMDB for "${title}" (${year}):`, error.message);
    return null;
  }
}

// Process the 51 films
const results = [];
let successCount = 0;

for (let i = 0; i < needLookup.length; i++) {
  const film = needLookup[i];
  console.log(`${i + 1}/${needLookup.length} Processing: ${film.title} (${film.year})`);
  
  let tmdbId = film.tmdb_id;
  
  // If no TMDB ID, search for it
  if (!tmdbId) {
    console.log(`  🔍 Searching TMDB for "${film.title}" (${film.year})`);
    tmdbId = await searchTMDBByTitleYear(film.title, film.year);
    if (!tmdbId) {
      console.log(`  ❌ No TMDB match found`);
      results.push({ ...film, streaming: 'No TMDB match', tmdb_id: null });
      continue;
    }
    console.log(`  ✅ Found TMDB ID: ${tmdbId}`);
  }
  
  // Look up streaming data
  const streaming = await lookupTMDBStreaming(tmdbId);
  
  if (streaming) {
    console.log(`  ✅ Streaming: ${streaming}`);
    successCount++;
  } else {
    console.log(`  ⚪ No streaming services`);
  }
  
  results.push({
    ...film,
    streaming: streaming || 'No streaming services',
    tmdb_id: tmdbId
  });
  
  // Rate limiting - wait between requests
  if (i < needLookup.length - 1) {
    await sleep(250); // 4 requests per second max
  }
}

console.log(`\n📊 LOOKUP RESULTS:`);
console.log(`✅ Found streaming: ${successCount}/${needLookup.length} films`);
console.log(`⚪ No streaming: ${needLookup.length - successCount}/${needLookup.length} films`);

// Show films that got streaming data
const foundStreaming = results.filter(f => f.streaming && !f.streaming.includes('No streaming'));
console.log(`\n🎬 NEWLY FOUND STREAMING:`);
foundStreaming.forEach((film, index) => {
  const sources = film.sources ? film.sources.join(' + ') : film.source;
  console.log(`${index + 1}. ${film.title} (${film.year}) - ${film.streaming} [${sources}]`);
});

// Save results
const output = {
  summary: {
    totalProcessed: needLookup.length,
    foundStreaming: successCount,
    noStreaming: needLookup.length - successCount,
    lookupDate: new Date().toISOString()
  },
  results: results,
  newStreamingFilms: foundStreaming
};

fs.writeFileSync('/Users/josh.petersen/moviegenius/missing-streaming-results.json', JSON.stringify(output, null, 2));
console.log(`\n💾 Saved results to: missing-streaming-results.json`);

// Now combine with existing streaming films for final ranking
console.log(`\n🔄 UPDATING COMPLETE RANKING...`);

// Load original streaming films and add the new ones
const originalStreamingFilms = streamingData.rankedFilms;
const updatedStreamingFilms = [...originalStreamingFilms];

// Add newly found streaming films with scoring
foundStreaming.forEach(film => {
  let score = 0;
  
  // Apply same ranking criteria
  if (film.source === 'Criterion Collection') score += 100 * 0.45;
  else if (film.source === 'Genius Episodes 1950s-1980s') score += 90 * 0.45;
  else if (film.source === 'AFI 30-70') score += 70 * 0.45;
  
  const platform = film.streaming.toLowerCase();
  if (platform.includes('hbo max') || platform.includes('criterion channel')) score += 100 * 0.30;
  else if (platform.includes('netflix') || platform.includes('amazon prime')) score += 85 * 0.30;
  else if (platform.includes('disney+') || platform.includes('hulu')) score += 80 * 0.30;
  else if (platform.includes('paramount+') || platform.includes('starz')) score += 75 * 0.30;
  else if (platform.includes('mubi') || platform.includes('bfi')) score += 70 * 0.30;
  else score += 60 * 0.30;
  
  if (film.year >= 1950 && film.year <= 1989) score += 100 * 0.15;
  else if ((film.year >= 1940 && film.year < 1950) || (film.year >= 1990 && film.year < 2000)) score += 80 * 0.15;
  else score += 60 * 0.15;
  
  if (film.sources && film.sources.length >= 2) {
    if (film.sources.length >= 3) score += 35 * 0.10;
    else score += 20 * 0.10;
  }
  
  updatedStreamingFilms.push({ ...film, score: Math.round(score) });
});

// Re-sort by score
updatedStreamingFilms.sort((a, b) => b.score - a.score);

console.log(`\n🏆 UPDATED TOP 15 WITH NEW STREAMING FILMS:`);
updatedStreamingFilms.slice(0, 15).forEach((film, index) => {
  const sources = film.sources ? film.sources.join(' + ') : film.source;
  console.log(`${index + 1}. ${film.title} (${film.year}) - ${film.streaming} [Score: ${film.score}] [${sources}]`);
});

// Save final updated ranking
const finalOutput = {
  ...streamingData,
  summary: {
    ...streamingData.summary,
    totalWithStreaming: streamingData.summary.withStreaming + successCount,
    updatedAt: new Date().toISOString()
  },
  rankedFilms: updatedStreamingFilms.slice(0, 50)
};

fs.writeFileSync('/Users/josh.petersen/moviegenius/curated-streaming-ranked.json', JSON.stringify(finalOutput, null, 2));
console.log(`\n💾 Updated final ranking saved to: curated-streaming-ranked.json`);