#!/usr/bin/env node
/**
 * Create Balanced Platform Carousel
 * 
 * Target distribution:
 * - Criterion Channel: 18 movies (most variety, art films)
 * - Netflix: 14 movies (popular streaming)
 * - HBO Max: 12 movies (premium content)
 * - Amazon Prime: 10 movies 
 * - Hulu: 8 movies
 * - Disney+: 6 movies
 * - Kanopy: 6 movies (educational)
 * - Peacock: 6 movies
 * Total: 80 movies
 */

import fs from 'fs';

const platforms = {
  'Criterion Channel': { color: '#000000', href: '/browse/criterion-best', count: 85, target: 18 },
  'Netflix': { color: '#E50914', href: '/browse/netflix-best', count: 45, target: 14 },
  'HBO Max': { color: '#9146FF', href: '/browse/hbo-best', count: 32, target: 12 },
  'Amazon Prime': { color: '#00A8E1', href: '/browse/prime-best', count: 36, target: 10 },
  'Hulu': { color: '#1CE783', href: '/browse/hulu-best', count: 28, target: 8 },
  'Disney+': { color: '#113CCF', href: '/browse/disney-best', count: 18, target: 6 },
  'Kanopy': { color: '#1B365D', href: '/browse/kanopy-best', count: 42, target: 6 },
  'Peacock': { color: '#00B4D8', href: '/browse/peacock-best', count: 22, target: 6 }
};

function createBalancedCarousel() {
  const cacheData = JSON.parse(fs.readFileSync('./public/curated-movies-cache.json', 'utf8'));
  const movies = cacheData.movies;
  
  console.log(`🎬 Creating balanced carousel from ${movies.length} curated movies\n`);
  
  // Shuffle all movies for random selection
  const shuffledMovies = [...movies].sort(() => 0.5 - Math.random());
  const carouselMovies = [];
  
  // Track how many we've assigned per platform
  const assigned = {};
  Object.keys(platforms).forEach(platform => assigned[platform] = 0);
  
  // Assign movies to platforms based on target distribution
  for (const [platform, config] of Object.entries(platforms)) {
    const platformMovies = [];
    let moviesNeeded = config.target;
    
    // Find movies for this platform (avoiding duplicates)
    for (const movie of shuffledMovies) {
      if (platformMovies.length >= moviesNeeded) break;
      
      // Skip if already assigned to carousel
      if (carouselMovies.find(cm => cm.tmdbId === movie.tmdbId)) continue;
      
      platformMovies.push({
        tmdbId: movie.tmdbId,
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        genre: movie.genre,
        runtime: movie.runtime,
        platform: platform,
        streaming_data: platform,
        platformColor: config.color,
        href: config.href,
        totalOnPlatform: config.count
      });
    }
    
    carouselMovies.push(...platformMovies);
    assigned[platform] = platformMovies.length;
    
    console.log(`✅ ${platform}: ${platformMovies.length} movies`);
    platformMovies.forEach(m => console.log(`   - ${m.title} (${m.year})`));
    console.log();
  }
  
  // Distribute platforms evenly to avoid clustering
  console.log('🔄 Distributing platforms evenly...');
  const finalCarousel = [];
  const moviesByPlatform = {};
  
  // Group movies by platform
  carouselMovies.forEach(movie => {
    if (!moviesByPlatform[movie.platform]) {
      moviesByPlatform[movie.platform] = [];
    }
    moviesByPlatform[movie.platform].push(movie);
  });
  
  // Shuffle each platform's movies
  Object.keys(moviesByPlatform).forEach(platform => {
    moviesByPlatform[platform] = moviesByPlatform[platform].sort(() => 0.5 - Math.random());
  });
  
  // Distribute evenly using round-robin approach
  const platformKeys = Object.keys(moviesByPlatform);
  let platformIndex = 0;
  let allMoviesPlaced = false;
  
  while (!allMoviesPlaced) {
    allMoviesPlaced = true;
    
    for (let i = 0; i < platformKeys.length; i++) {
      const currentPlatform = platformKeys[(platformIndex + i) % platformKeys.length];
      const platformMovies = moviesByPlatform[currentPlatform];
      
      if (platformMovies.length > 0) {
        finalCarousel.push(platformMovies.shift());
        allMoviesPlaced = false;
      }
    }
    platformIndex++;
  }
  
  // Save carousel data
  fs.writeFileSync('./public/carousel-movies.json', JSON.stringify(finalCarousel, null, 2));
  
  console.log(`📊 FINAL DISTRIBUTION:`);
  Object.entries(assigned).forEach(([platform, count]) => {
    console.log(`• ${platform}: ${count} movies`);
  });
  
  console.log(`\n🎯 Total: ${finalCarousel.length} movies`);
  console.log(`✨ Created balanced carousel: public/carousel-movies.json`);
}

createBalancedCarousel();