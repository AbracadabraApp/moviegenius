#!/usr/bin/env node

import fs from 'fs';

// Read the extracted movies data
const data = JSON.parse(fs.readFileSync('/Users/josh.petersen/moviegenius/episode-movies-extraction.json', 'utf8'));

// Filter for 1950s-1980s
const targetDecades = ['1950', '1960', '1970', '1980'];
const filtered50s80s = [];

targetDecades.forEach(decade => {
    if (data.byDecade[decade]) {
        filtered50s80s.push(...data.byDecade[decade]);
    }
});

// Sort by year
filtered50s80s.sort((a, b) => a.year - b.year);

console.log(`🎬 GENIUS EPISODE MOVIES FROM 1950s-1980s: ${filtered50s80s.length} films\n`);

// Group by decade for display
const byDecade = {
    '1950s': filtered50s80s.filter(m => m.year >= 1950 && m.year < 1960),
    '1960s': filtered50s80s.filter(m => m.year >= 1960 && m.year < 1970),
    '1970s': filtered50s80s.filter(m => m.year >= 1970 && m.year < 1980),
    '1980s': filtered50s80s.filter(m => m.year >= 1980 && m.year < 1990)
};

Object.entries(byDecade).forEach(([decade, movies]) => {
    console.log(`\n📅 ${decade.toUpperCase()} (${movies.length} films):`);
    movies.slice(0, 15).forEach((movie, index) => {
        const streaming = movie.streaming || 'No streaming';
        console.log(`  ${index + 1}. ${movie.title} (${movie.year}) - ${streaming}`);
    });
    if (movies.length > 15) {
        console.log(`  ... and ${movies.length - 15} more`);
    }
});

// Show some highlights with streaming info
console.log(`\n⭐ HIGHLIGHTS WITH STREAMING:`);
const withStreaming = filtered50s80s.filter(m => m.streaming && !m.streaming.includes('No streaming') && !m.streaming.includes('Theatrical'));
withStreaming.slice(0, 20).forEach((movie, index) => {
    console.log(`${index + 1}. ${movie.title} (${movie.year}) - ${movie.streaming}`);
});

// Save filtered data
const output = {
    summary: {
        totalFilms: filtered50s80s.length,
        decades: ['1950s', '1960s', '1970s', '1980s'],
        filteredAt: new Date().toISOString()
    },
    byDecade: byDecade,
    allFilms: filtered50s80s,
    withStreaming: withStreaming
};

fs.writeFileSync('/Users/josh.petersen/moviegenius/genius-50s-80s-films.json', JSON.stringify(output, null, 2));
console.log(`\n💾 Saved 1950s-1980s films to: genius-50s-80s-films.json`);