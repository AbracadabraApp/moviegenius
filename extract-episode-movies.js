#!/usr/bin/env node

/**
 * Extract all movies from genius episode files
 */

import fs from 'fs';
import path from 'path';

// Track all unique movies
const allMovies = new Map();

function extractMoviesFromEpisode(filePath) {
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const movies = [];
        
        // Extract movies from sections
        if (content.content && content.content.sections) {
            content.content.sections.forEach(section => {
                if (section.type === 'movies' && section.movies) {
                    section.movies.forEach(movie => {
                        movies.push(movie);
                    });
                }
            });
        }
        
        // Extract movies from moreIdeas
        if (content.content && content.content.moreIdeas && content.content.moreIdeas.movies) {
            content.content.moreIdeas.movies.forEach(movie => {
                movies.push(movie);
            });
        }
        
        // Add to global collection
        movies.forEach(movie => {
            const key = `${movie.title}_${movie.year}`;
            if (!allMovies.has(key)) {
                allMovies.set(key, {
                    title: movie.title,
                    year: movie.year,
                    tmdb_id: movie.tmdb_id,
                    slug: movie.slug,
                    streaming: movie.streaming,
                    poster_url: movie.poster_url,
                    source_episode: path.basename(filePath)
                });
            }
        });
        
        return movies.length;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
        return 0;
    }
}

// Process all episode files
const episodeDir = '/Users/josh.petersen/moviegenius/public/data/episodes/';
const files = fs.readdirSync(episodeDir).filter(f => f.startsWith('genius-') && f.endsWith('.json'));

console.log(`Found ${files.length} episode files to process...`);

let totalMovies = 0;
files.forEach(file => {
    const filePath = path.join(episodeDir, file);
    const movieCount = extractMoviesFromEpisode(filePath);
    totalMovies += movieCount;
    console.log(`${file}: ${movieCount} movies`);
});

// Convert to array and sort
const movieArray = Array.from(allMovies.values());
movieArray.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year; // Newest first
    return a.title.localeCompare(b.title);
});

console.log(`\n📊 SUMMARY:`);
console.log(`Total movies found: ${movieArray.length} unique movies`);
console.log(`Total movie references: ${totalMovies}`);

// Group by decade
const byDecade = {};
movieArray.forEach(movie => {
    const decade = Math.floor(movie.year / 10) * 10;
    if (!byDecade[decade]) byDecade[decade] = [];
    byDecade[decade].push(movie);
});

console.log(`\n📅 BY DECADE:`);
Object.keys(byDecade).sort((a, b) => b - a).forEach(decade => {
    console.log(`${decade}s: ${byDecade[decade].length} movies`);
});

// Save to file
const outputPath = '/Users/josh.petersen/moviegenius/episode-movies-extraction.json';
fs.writeFileSync(outputPath, JSON.stringify({
    summary: {
        totalUnique: movieArray.length,
        totalReferences: totalMovies,
        episodesProcessed: files.length,
        extractedAt: new Date().toISOString()
    },
    byDecade: byDecade,
    movies: movieArray
}, null, 2));

console.log(`\n💾 Saved complete extraction to: ${outputPath}`);

// Show top 20 movies (most recent first)
console.log(`\n🎬 TOP 20 MOVIES (Most Recent):`);
movieArray.slice(0, 20).forEach((movie, index) => {
    console.log(`${index + 1}. ${movie.title} (${movie.year}) - ${movie.streaming || 'No streaming'}`);
});