#!/usr/bin/env node
/**
 * Cache Curated Movie Posters
 * 
 * Fetch TMDB data for all 218 curated movies and cache posters + basic info
 */

import fs from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('TMDB_API_KEY not found in .env.local');
  process.exit(1);
}

async function fetchMovieData(tmdbId) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
    if (!response.ok) return null;
    
    const movie = await response.json();
    
    return {
      tmdbId: movie.id,
      title: movie.title,
      year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      genre: movie.genres[0]?.name || 'Drama',
      runtime: movie.runtime || null
    };
  } catch (error) {
    console.error(`Error fetching TMDB ${tmdbId}:`, error.message);
    return null;
  }
}

async function cacheAllPosters() {
  console.log('🎬 CACHING ALL CURATED MOVIE POSTERS\n');
  
  // Load curated IDs
  const curatedData = JSON.parse(fs.readFileSync('./public/curated-film-ids.json', 'utf8'));
  const movieIds = curatedData.selectedIds.filter(id => typeof id === 'number' || !isNaN(id));
  
  console.log(`Found ${movieIds.length} numeric movie IDs to process`);
  
  const cachedMovies = [];
  const batchSize = 10;
  
  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(movieIds.length/batchSize)}: IDs ${batch[0]}-${batch[batch.length-1]}`);
    
    const promises = batch.map(id => fetchMovieData(id));
    const results = await Promise.all(promises);
    
    results.forEach(movie => {
      if (movie && movie.poster) {
        cachedMovies.push(movie);
        console.log(`✅ ${movie.title} (${movie.year})`);
      }
    });
    
    // Rate limiting
    if (i + batchSize < movieIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n📊 RESULTS:`);
  console.log(`• Total IDs processed: ${movieIds.length}`);
  console.log(`• Movies with posters: ${cachedMovies.length}`);
  console.log(`• Success rate: ${Math.round(cachedMovies.length/movieIds.length * 100)}%`);
  
  // Save cached data
  const outputData = {
    metadata: {
      created: new Date().toISOString(),
      totalMovies: cachedMovies.length,
      sourceList: 'curated-film-ids.json'
    },
    movies: cachedMovies
  };
  
  fs.writeFileSync('./public/curated-movies-cache.json', JSON.stringify(outputData, null, 2));
  console.log(`\n💾 Saved to: public/curated-movies-cache.json`);
  
  // Create carousel subset (15 random movies)
  const shuffled = [...cachedMovies].sort(() => 0.5 - Math.random());
  const carouselMovies = shuffled.slice(0, 15).map(movie => ({
    ...movie,
    platform: "Streaming",
    streaming_data: "Multiple Platforms",
    platformColor: "#6b7280",
    href: "/browse/curated-best"
  }));
  
  fs.writeFileSync('./public/carousel-movies.json', JSON.stringify(carouselMovies, null, 2));
  console.log(`✨ Created carousel subset: public/carousel-movies.json`);
}

cacheAllPosters().catch(console.error);