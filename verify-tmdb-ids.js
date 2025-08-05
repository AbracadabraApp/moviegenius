// Verify TMDB IDs for essential movies
import { essentialMovies } from './data/essential-movies.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyTMDBIds() {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    console.log('❌ No TMDB API key found');
    return;
  }
  
  console.log('🔍 Verifying TMDB IDs for Horror & Suspense essential movies...\n');
  
  const horrorMovies = essentialMovies['horror-suspense'];
  
  for (const movie of horrorMovies) {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${apiKey}`);
      const tmdbData = await response.json();
      
      if (response.ok) {
        const tmdbYear = new Date(tmdbData.release_date).getFullYear();
        const titleMatch = tmdbData.title.toLowerCase() === movie.title.toLowerCase();
        const yearMatch = tmdbYear === movie.year;
        
        console.log(`${titleMatch && yearMatch ? '✅' : '❌'} ${movie.title} (${movie.year}) - TMDB: ${movie.tmdb_id}`);
        console.log(`   TMDB says: "${tmdbData.title}" (${tmdbYear})`);
        
        if (!titleMatch) {
          console.log(`   ⚠️  TITLE MISMATCH: Expected "${movie.title}", got "${tmdbData.title}"`);
        }
        if (!yearMatch) {
          console.log(`   ⚠️  YEAR MISMATCH: Expected ${movie.year}, got ${tmdbYear}`);
        }
        
        // Also show the poster path for verification
        if (tmdbData.poster_path) {
          console.log(`   🖼️  Poster: https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`);
        }
        
      } else {
        console.log(`❌ ${movie.title} (${movie.year}) - TMDB: ${movie.tmdb_id}`);
        console.log(`   ERROR: ${tmdbData.status_message || 'Movie not found'}`);
      }
      
      console.log(''); // Empty line for readability
      
      // Add delay to respect API limits
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log(`❌ ${movie.title} - Error: ${error.message}\n`);
    }
  }
  
  // Also check a few from other themes for comparison
  console.log('🔍 Quick check of a few other essential movies...\n');
  
  const otherMovies = [
    essentialMovies['film-noir'][0], // The Maltese Falcon
    essentialMovies['comedy-through-time'][0], // Everything Everywhere All at Once
    essentialMovies['drama-human-condition'][0] // Citizen Kane
  ];
  
  for (const movie of otherMovies) {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${apiKey}`);
      const tmdbData = await response.json();
      
      if (response.ok) {
        const tmdbYear = new Date(tmdbData.release_date).getFullYear();
        const titleMatch = tmdbData.title.toLowerCase() === movie.title.toLowerCase();
        const yearMatch = tmdbYear === movie.year;
        
        console.log(`${titleMatch && yearMatch ? '✅' : '❌'} ${movie.title} (${movie.year}) - TMDB: ${movie.tmdb_id}`);
        if (!titleMatch || !yearMatch) {
          console.log(`   TMDB says: "${tmdbData.title}" (${tmdbYear})`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log(`❌ ${movie.title} - Error: ${error.message}`);
    }
  }
}

verifyTMDBIds();