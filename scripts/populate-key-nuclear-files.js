#!/usr/bin/env node

/**
 * Populate Key Nuclear Static Files
 * 
 * Creates nuclear static files for key movie IDs that are required
 * for getStaticPaths prebuild to prevent 404s.
 * 
 * These files provide the essential data structure needed for
 * Next.js static generation.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const NUCLEAR_DIR = path.join(PROJECT_ROOT, 'nuclear-static');

// Key movie data for essential routes
const KEY_MOVIES = [
  {
    id: '11',
    title: 'Star Wars',
    year: 1977,
    overview: 'Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire\'s world-destroying battle station, while also attempting to rescue Princess Leia from the mysterious Darth Vader.',
    poster_path: '/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg',
    backdrop_path: '/4iJfYYoQzZcONB9hNzg0J0wWyPH.jpg',
    vote_average: 8.6,
    vote_count: 20950,
    release_date: '1977-05-25'
  },
  {
    id: '550',
    title: 'Fight Club',
    year: 1999,
    overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy. Their concept catches on, with underground "fight clubs" forming in every town, until an eccentric gets in the way and ignites an out-of-control spiral toward oblivion.',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg',
    vote_average: 8.4,
    vote_count: 29260,
    release_date: '1999-10-15'
  },
  {
    id: '238',
    title: 'The Godfather',
    year: 1972,
    overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps in to take care of the would-be killers, launching a campaign of bloody revenge.',
    poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
    vote_average: 9.2,
    vote_count: 20050,
    release_date: '1972-03-14'
  },
  {
    id: '155',
    title: 'The Dark Knight',
    year: 2008,
    overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to the terrified citizens of Gotham as the Joker.',
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop_path: '/qlGoGQSVMzIjGbpvXzZUOH1FjNu.jpg',
    vote_average: 9.0,
    vote_count: 33460,
    release_date: '2008-07-18'
  },
  {
    id: '78',
    title: 'Blade Runner',
    year: 1982,
    overview: 'In the smog-choked dystopian Los Angeles of 2019, blade runner Rick Deckard is called out of retirement to terminate a quartet of replicants who have escaped to Earth seeking their creator for a way to extend their short life spans.',
    poster_path: '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg',
    backdrop_path: '/eIi3klFf7mp3oL5EEF4mLIDs26r.jpg',
    vote_average: 8.2,
    vote_count: 14520,
    release_date: '1982-06-25'
  }
];

/**
 * Generate nuclear static data structure
 */
function generateNuclearData(movie) {
  return {
    // Root level data for validation compatibility
    tmdbId: parseInt(movie.id),
    title: movie.title,
    year: movie.year,
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    releaseDate: movie.release_date,
    genres: [], // Will be populated by actual TMDB data later
    cast: [],   // Will be populated by actual TMDB data later
    crew: [],   // Will be populated by actual TMDB data later
    
    // Next.js static props structure (nested for SSG compatibility)
    props: {
      tmdbId: parseInt(movie.id),
      title: movie.title,
      year: movie.year,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
      releaseDate: movie.release_date,
      genres: [],
      cast: [],
      crew: [],
      // Essential fields for nuclear static generation
      nuclearGenerated: true,
      nuclearTimestamp: new Date().toISOString(),
      nuclearVersion: '1.0.0'
    },
    
    // Next.js static props structure
    revalidate: false // Static generation, no revalidation needed
  };
}

/**
 * Ensure nuclear-static directory exists
 */
async function ensureNuclearDirectory() {
  try {
    await fs.access(NUCLEAR_DIR);
    console.log('✅ Nuclear static directory exists');
  } catch (error) {
    console.log('📁 Creating nuclear-static directory...');
    await fs.mkdir(NUCLEAR_DIR, { recursive: true });
    console.log('✅ Nuclear static directory created');
  }
}

/**
 * Create nuclear static file for a movie
 */
async function createNuclearFile(movie) {
  const filename = `${movie.id}.json`;
  const filepath = path.join(NUCLEAR_DIR, filename);
  const data = generateNuclearData(movie);
  
  try {
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Created ${filename} - ${movie.title} (${movie.year})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create ${filename}: ${error.message}`);
    return false;
  }
}

/**
 * Verify created files
 */
async function verifyNuclearFiles() {
  console.log('\n🔍 Verifying created files...');
  let verified = 0;
  
  for (const movie of KEY_MOVIES) {
    const filepath = path.join(NUCLEAR_DIR, `${movie.id}.json`);
    
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const data = JSON.parse(content);
      
      if (data.props && data.props.title === movie.title) {
        console.log(`✅ ${movie.id}.json - Valid`);
        verified++;
      } else {
        console.log(`❌ ${movie.id}.json - Invalid structure`);
      }
    } catch (error) {
      console.log(`❌ ${movie.id}.json - ${error.message}`);
    }
  }
  
  return verified === KEY_MOVIES.length;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Populating Key Nuclear Static Files');
  console.log('=====================================');
  console.log(`Target directory: ${NUCLEAR_DIR}`);
  console.log(`Key movies to create: ${KEY_MOVIES.length}\n`);
  
  try {
    // Ensure directory exists
    await ensureNuclearDirectory();
    
    // Create files
    console.log('📝 Creating nuclear static files...');
    let created = 0;
    
    for (const movie of KEY_MOVIES) {
      const success = await createNuclearFile(movie);
      if (success) created++;
    }
    
    console.log(`\n📊 Created ${created}/${KEY_MOVIES.length} files`);
    
    // Verify files
    const allValid = await verifyNuclearFiles();
    
    console.log('\n🎯 SUMMARY');
    console.log('==========');
    console.log(`✅ Files created: ${created}`);
    console.log(`✅ Files verified: ${allValid ? 'All valid' : 'Some invalid'}`);
    console.log(`📁 Directory: ${NUCLEAR_DIR}`);
    
    if (allValid) {
      console.log('\n🎉 Key nuclear static files successfully populated!');
      console.log('These files will prevent 404s for essential movie routes.');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some files could not be verified.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Failed to populate nuclear static files:');
    console.error('==========================================');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as populateKeyNuclearFiles, generateNuclearData };