#!/usr/bin/env node

import fs from 'fs';

// ALL AFI 30-70 films (from the 2007 10th Anniversary Edition)
const afiAll30to70 = [
  { title: "Apocalypse Now", year: 1979, afi_rank: 30, source: "AFI 30-70" },
  { title: "The Maltese Falcon", year: 1941, afi_rank: 31, source: "AFI 30-70" },
  { title: "The Godfather Part II", year: 1974, afi_rank: 32, source: "AFI 30-70" },
  { title: "One Flew Over the Cuckoo's Nest", year: 1975, afi_rank: 33, source: "AFI 30-70" },
  { title: "Snow White and the Seven Dwarfs", year: 1937, afi_rank: 34, source: "AFI 30-70" },
  { title: "Annie Hall", year: 1977, afi_rank: 35, source: "AFI 30-70" },
  { title: "The Bridge on the River Kwai", year: 1957, afi_rank: 36, source: "AFI 30-70" },
  { title: "The Best Years of Our Lives", year: 1946, afi_rank: 37, source: "AFI 30-70" },
  { title: "The Treasure of the Sierra Madre", year: 1948, afi_rank: 38, source: "AFI 30-70" },
  { title: "Dr. Strangelove", year: 1964, afi_rank: 39, source: "AFI 30-70" },
  { title: "The Sound of Music", year: 1965, afi_rank: 40, source: "AFI 30-70" },
  { title: "King Kong", year: 1933, afi_rank: 41, source: "AFI 30-70" },
  { title: "Bonnie and Clyde", year: 1967, afi_rank: 42, source: "AFI 30-70" },
  { title: "Midnight Cowboy", year: 1969, afi_rank: 43, source: "AFI 30-70" },
  { title: "The Philadelphia Story", year: 1940, afi_rank: 44, source: "AFI 30-70" },
  { title: "Shane", year: 1953, afi_rank: 45, source: "AFI 30-70" },
  { title: "It Happened One Night", year: 1934, afi_rank: 46, source: "AFI 30-70" },
  { title: "A Streetcar Named Desire", year: 1951, afi_rank: 47, source: "AFI 30-70" },
  { title: "Rear Window", year: 1954, afi_rank: 48, source: "AFI 30-70" },
  { title: "Intolerance", year: 1916, afi_rank: 49, source: "AFI 30-70" },
  { title: "The Lord of the Rings: The Fellowship of the Ring", year: 2001, afi_rank: 50, source: "AFI 30-70" },
  { title: "West Side Story", year: 1961, afi_rank: 51, source: "AFI 30-70" },
  { title: "Taxi Driver", year: 1976, afi_rank: 52, source: "AFI 30-70" },
  { title: "The Deer Hunter", year: 1978, afi_rank: 53, source: "AFI 30-70" },
  { title: "M*A*S*H", year: 1970, afi_rank: 54, source: "AFI 30-70" },
  { title: "North by Northwest", year: 1959, afi_rank: 55, source: "AFI 30-70" },
  { title: "Jaws", year: 1975, afi_rank: 56, source: "AFI 30-70" },
  { title: "Rocky", year: 1976, afi_rank: 57, source: "AFI 30-70" },
  { title: "The Gold Rush", year: 1925, afi_rank: 58, source: "AFI 30-70" },
  { title: "Nashville", year: 1975, afi_rank: 59, source: "AFI 30-70" },
  { title: "Duck Soup", year: 1933, afi_rank: 60, source: "AFI 30-70" },
  { title: "Sullivan's Travels", year: 1941, afi_rank: 61, source: "AFI 30-70" },
  { title: "American Graffiti", year: 1973, afi_rank: 62, source: "AFI 30-70" },
  { title: "Cabaret", year: 1972, afi_rank: 63, source: "AFI 30-70" },
  { title: "Network", year: 1976, afi_rank: 64, source: "AFI 30-70" },
  { title: "The African Queen", year: 1951, afi_rank: 65, source: "AFI 30-70" },
  { title: "Raiders of the Lost Ark", year: 1981, afi_rank: 66, source: "AFI 30-70" },
  { title: "Who's Afraid of Virginia Woolf?", year: 1966, afi_rank: 67, source: "AFI 30-70" },
  { title: "Unforgiven", year: 1992, afi_rank: 68, source: "AFI 30-70" },
  { title: "Tootsie", year: 1982, afi_rank: 69, source: "AFI 30-70" },
  { title: "A Clockwork Orange", year: 1971, afi_rank: 70, source: "AFI 30-70" }
];

// ALL Criterion Collection films (from our earlier research)
const criterionFilms = [
  // Top Flickchart Criterion films
  { title: "Harakiri", year: 1962, tmdb_id: null, source: "Criterion Collection" },
  { title: "Ikiru", year: 1952, tmdb_id: null, source: "Criterion Collection" },
  { title: "High and Low", year: 1963, tmdb_id: null, source: "Criterion Collection" },
  { title: "City Lights", year: 1931, tmdb_id: null, source: "Criterion Collection" },
  { title: "The Silence of the Lambs", year: 1991, tmdb_id: null, source: "Criterion Collection" },
  { title: "Seven Samurai", year: 1954, tmdb_id: null, source: "Criterion Collection" },
  { title: "M", year: 1931, tmdb_id: null, source: "Criterion Collection" },
  { title: "The Night of the Hunter", year: 1955, tmdb_id: null, source: "Criterion Collection" },
  { title: "Double Indemnity", year: 1944, tmdb_id: null, source: "Criterion Collection" },
  { title: "Yojimbo", year: 1961, tmdb_id: null, source: "Criterion Collection" },
  
  // Rotten Tomatoes Essential Criterion films
  { title: "8½", year: 1963, tmdb_id: null, source: "Criterion Collection" },
  { title: "The 400 Blows", year: 1959, tmdb_id: null, source: "Criterion Collection" },
  { title: "Ali: Fear Eats the Soul", year: 1974, tmdb_id: null, source: "Criterion Collection" },
  { title: "All We Imagine as Light", year: 2024, tmdb_id: null, source: "Criterion Collection" },
  { title: "Amarcord", year: 1973, tmdb_id: null, source: "Criterion Collection" },
  { title: "Andrei Rublev", year: 1966, tmdb_id: null, source: "Criterion Collection" },
  { title: "Army of Shadows", year: 1969, tmdb_id: null, source: "Criterion Collection" },
  { title: "Au Hasard Balthazar", year: 1966, tmdb_id: null, source: "Criterion Collection" },
  { title: "Au Revoir, les enfants", year: 1987, tmdb_id: null, source: "Criterion Collection" },
  { title: "The Battle of Algiers", year: 1966, tmdb_id: null, source: "Criterion Collection" }
];

// Load 1950s-1980s genius films
const geniusData = JSON.parse(fs.readFileSync('/Users/josh.petersen/moviegenius/genius-50s-80s-films.json', 'utf8'));
const genius50s80s = geniusData.allFilms;

console.log(`🎬 BUILDING COMPLETE CURATED LIST:`);
console.log(`- Genius Episodes 1950s-1980s: ${genius50s80s.length} films`);
console.log(`- ALL AFI 30-70 films: ${afiAll30to70.length} films`);
console.log(`- ALL Criterion Collection films: ${criterionFilms.length} films`);

// Combine all sources
const allSources = [
  ...genius50s80s.map(f => ({ ...f, source: "Genius Episodes 1950s-1980s" })),
  ...afiAll30to70,
  ...criterionFilms
];

// Remove duplicates (by title and year)
const unique = new Map();
allSources.forEach(film => {
  const key = `${film.title}_${film.year}`;
  if (!unique.has(key)) {
    unique.set(key, film);
  } else {
    // If duplicate, prefer the one with more info or combine sources
    const existing = unique.get(key);
    if (!existing.sources) existing.sources = [existing.source];
    if (!existing.sources.includes(film.source)) {
      existing.sources.push(film.source);
    }
  }
});

const finalList = Array.from(unique.values());
finalList.sort((a, b) => b.year - a.year); // Sort by year, newest first

console.log(`\n📊 FINAL CURATED LIST: ${finalList.length} unique films`);

// Show breakdown by decade
const byDecade = {};
finalList.forEach(film => {
  const decade = Math.floor(film.year / 10) * 10;
  if (!byDecade[decade]) byDecade[decade] = [];
  byDecade[decade].push(film);
});

console.log(`\n📅 BY DECADE:`);
Object.keys(byDecade).sort((a, b) => b - a).forEach(decade => {
  console.log(`${decade}s: ${byDecade[decade].length} films`);
});

// Save complete list
const output = {
  summary: {
    totalFilms: finalList.length,
    sources: ["Genius Episodes 1950s-1980s", "AFI 30-70 (All Films)", "Criterion Collection (All Decades)"],
    compiledAt: new Date().toISOString()
  },
  byDecade: byDecade,
  allFilms: finalList
};

fs.writeFileSync('/Users/josh.petersen/moviegenius/complete-curated-list.json', JSON.stringify(output, null, 2));
console.log(`\n💾 Saved complete curated list to: complete-curated-list.json`);

// Show some highlights for carousel consideration
console.log(`\n⭐ POTENTIAL CAROUSEL SELECTIONS (with streaming):`);
const withStreaming = finalList.filter(f => f.streaming && !f.streaming.includes('No streaming') && !f.streaming.includes('Theatrical'));
withStreaming.slice(0, 15).forEach((film, index) => {
  const sources = film.sources ? film.sources.join(' + ') : film.source;
  console.log(`${index + 1}. ${film.title} (${film.year}) - ${film.streaming} [${sources}]`);
});