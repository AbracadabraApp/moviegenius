#!/usr/bin/env node
/**
 * Simple Test Link Processing for Nuclear Static Files
 */

import fs from 'fs';

// Process **Movie Title** to links or plain text
function processMovieLinks(text, movieMap, currentMovie) {
  return text.replace(/\*\*([^*]+)\*\* \((\d{4})\)/g, (match, title, year) => {
    // Handle self-references - strip ** marks
    if (title.toLowerCase() === currentMovie.toLowerCase()) {
      return `${title} (${year})`; // Remove ** marks
    }
    
    // Check if movie exists in our available data
    const key = `${title.toLowerCase()} (${year})`;
    const movieData = movieMap.get(key);
    
    if (movieData) {
      // Create link
      return `<a href="/movie/${movieData.tmdbId}">${title}</a> (${year})`;
    } else {
      // Strip ** marks
      return `${title} (${year})`;
    }
  });
}

function testSimpleProcessing() {
  console.log('🔧 Simple Link Processing Test');
  console.log('==============================\n');
  
  // Read test file
  const data = JSON.parse(fs.readFileSync('nuclear-static/100.json', 'utf8'));
  
  // Build available movies map from featured sections
  const movieMap = new Map();
  data.props.sections.forEach(section => {
    if (section.type === 'movies' && section.movies) {
      section.movies.forEach(movie => {
        const key = `${movie.title.toLowerCase()} (${movie.year})`;
        movieMap.set(key, { tmdbId: movie.tmdb_id, title: movie.title });
      });
    }
  });
  
  console.log(`🎬 Available movies for linking: ${movieMap.size}`);
  movieMap.forEach((movie, key) => {
    console.log(`  - ${key} → /movie/${movie.tmdbId}`);
  });
  
  console.log('\n📝 Processing Text Sections:');
  console.log('----------------------------');
  
  // Process each text section
  data.props.sections.forEach((section, index) => {
    if (section.type === 'text') {
      console.log(`\nSection ${index + 1}:`);
      
      const original = section.content.substring(0, 200);
      console.log(`BEFORE: ${original}...`);
      
      const processed = processMovieLinks(section.content, movieMap, data.props.title);
      const processedPreview = processed.substring(0, 200);
      console.log(`AFTER:  ${processedPreview}...`);
      
      // Count links created
      const linksCreated = (processed.match(/<a href="/g) || []).length;
      const originalMovies = (section.content.match(/\*\*[^*]+\*\*/g) || []).length;
      
      console.log(`🔗 ${linksCreated} links created from ${originalMovies} movie patterns`);
    }
  });
  
  console.log('\n✅ Test Complete!');
}

testSimpleProcessing();