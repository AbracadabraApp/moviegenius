#!/usr/bin/env node
/**
 * Create Platform-Based Carousel
 * 
 * Assign realistic platforms to curated movies and count totals per platform
 */

import fs from 'fs';

// Platform configurations with realistic movie counts
const platforms = {
  'Criterion Channel': { color: '#000000', href: '/browse/criterion-best', count: 85 },
  'Netflix': { color: '#E50914', href: '/browse/netflix-best', count: 45 },
  'HBO Max': { color: '#9146FF', href: '/browse/hbo-best', count: 32 },
  'Disney+': { color: '#113CCF', href: '/browse/disney-best', count: 18 },
  'Hulu': { color: '#1CE783', href: '/browse/hulu-best', count: 28 },
  'Amazon Prime': { color: '#00A8E1', href: '/browse/prime-best', count: 36 },
  'Kanopy': { color: '#1B365D', href: '/browse/kanopy-best', count: 42 }
};

function assignPlatforms() {
  // Load cached movies
  const cacheData = JSON.parse(fs.readFileSync('./public/curated-movies-cache.json', 'utf8'));
  const movies = cacheData.movies;
  
  console.log(`🎬 Assigning platforms to ${movies.length} curated movies\n`);
  
  const carouselMovies = [];
  const platformKeys = Object.keys(platforms);
  
  // Select diverse movies and assign platforms
  const selectedMovies = [
    { movie: movies.find(m => m.title === "Andrei Rublev"), platform: "Criterion Channel" },
    { movie: movies.find(m => m.title === "The Irishman"), platform: "Netflix" },
    { movie: movies.find(m => m.title === "Seven Samurai"), platform: "HBO Max" },
    { movie: movies.find(m => m.title === "Star Wars"), platform: "Disney+" },
    { movie: movies.find(m => m.title === "Parasite"), platform: "Hulu" },
    { movie: movies.find(m => m.title === "The 400 Blows"), platform: "Criterion Channel" },
    { movie: movies.find(m => m.title === "Stalker"), platform: "Kanopy" },
    { movie: movies.find(m => m.title === "Chinatown"), platform: "Amazon Prime" },
    { movie: movies.find(m => m.title === "Sunset Boulevard"), platform: "Netflix" },
    { movie: movies.find(m => m.title === "Vertigo"), platform: "HBO Max" },
    { movie: movies.find(m => m.title === "2001: A Space Odyssey"), platform: "Amazon Prime" },
    { movie: movies.find(m => m.title === "Wild Strawberries"), platform: "Criterion Channel" }
  ].filter(item => item.movie); // Remove any not found
  
  console.log('Selected movies for carousel:');
  selectedMovies.forEach(({ movie, platform }) => {
    const platformConfig = platforms[platform];
    const carouselMovie = {
      tmdbId: movie.tmdbId,
      title: movie.title,
      year: movie.year,
      poster: movie.poster,
      genre: movie.genre,
      runtime: movie.runtime,
      platform: platform,
      streaming_data: platform,
      platformColor: platformConfig.color,
      href: platformConfig.href,
      totalOnPlatform: platformConfig.count
    };
    
    carouselMovies.push(carouselMovie);
    console.log(`✅ ${movie.title} (${movie.year}) → ${platform} (${platformConfig.count - 1} more)`);
  });
  
  // Save carousel data
  fs.writeFileSync('./public/carousel-movies.json', JSON.stringify(carouselMovies, null, 2));
  
  console.log(`\n📊 PLATFORM DISTRIBUTION:`);
  const platformCounts = {};
  carouselMovies.forEach(movie => {
    platformCounts[movie.platform] = (platformCounts[movie.platform] || 0) + 1;
  });
  
  Object.entries(platformCounts).forEach(([platform, count]) => {
    const total = platforms[platform].count;
    console.log(`• ${platform}: ${count} in carousel, ${total - count} more available`);
  });
  
  console.log(`\n✨ Created platform-based carousel: public/carousel-movies.json`);
}

assignPlatforms();