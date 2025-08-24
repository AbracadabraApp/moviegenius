#!/usr/bin/env node

/**
 * Generate Build Indexes - Production Static Build Component
 * 
 * Creates optimized lookup indexes for fast static page generation.
 * One-time database query to enable O(1) lookups during builds.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../lib/railway-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEXES_DIR = path.join(__dirname, '..', 'public', 'data', 'indexes');

/**
 * Generate movie lookup indexes
 */
async function generateMovieIndexes(pool) {
  console.log('📽️ Building movie indexes...');
  
  const result = await pool.query(`
    SELECT tmdb_id, title, year, official_title, slug, poster_url 
    FROM movies 
    WHERE tmdb_id IS NOT NULL
    ORDER BY id
  `);
  
  const movies = result.rows;
  console.log(`   Loaded ${movies.length} movies from database`);
  
  // Build lookup indexes
  const byTitle = {};
  const byTitleYear = {};
  const byTmdbId = {};
  
  movies.forEach(movie => {
    const normalizedTitle = movie.title.toLowerCase().trim();
    
    // Title-only lookup
    byTitle[normalizedTitle] = {
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      poster_url: movie.poster_url
    };
    
    // Title + year lookup (more precise)
    if (movie.year) {
      byTitleYear[`${normalizedTitle} ${movie.year}`] = {
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: movie.year,
        poster_url: movie.poster_url
      };
    }
    
    // TMDB ID lookup
    byTmdbId[movie.tmdb_id.toString()] = {
      title: movie.title,
      year: movie.year,
      official_title: movie.official_title,
      slug: movie.slug,
      poster_url: movie.poster_url
    };
  });
  
  return {
    by_title: byTitle,
    by_title_year: byTitleYear,
    by_tmdb_id: byTmdbId,
    count: movies.length,
    generated_at: new Date().toISOString()
  };
}

/**
 * Generate person lookup indexes
 */
async function generatePersonIndexes(pool) {
  console.log('👥 Building person indexes...');
  
  const result = await pool.query(`
    SELECT id, name 
    FROM persons 
    ORDER BY id
  `);
  
  const persons = result.rows;
  console.log(`   Loaded ${persons.length} persons from database`);
  
  // Build lookup indexes
  const byName = {};
  const byId = {};
  
  persons.forEach(person => {
    const normalizedName = person.name.toLowerCase().trim();
    
    // Name lookup
    byName[normalizedName] = {
      id: person.id,
      name: person.name
    };
    
    // ID lookup
    byId[person.id.toString()] = {
      name: person.name
    };
  });
  
  return {
    by_name: byName,
    by_id: byId,
    count: persons.length,
    generated_at: new Date().toISOString()
  };
}

/**
 * Generate movie-contributor relationship indexes
 */
async function generateContributorIndexes(pool) {
  console.log('🎬 Building contributor indexes...');
  
  const result = await pool.query(`
    SELECT movie_tmdb_id, person_id, person_name, role 
    FROM movie_contributors 
    ORDER BY movie_tmdb_id, person_id
  `);
  
  const contributors = result.rows;
  console.log(`   Loaded ${contributors.length} movie-contributor relationships`);
  
  // Build movie-to-contributors index
  const byMovieTmdbId = {};
  
  contributors.forEach(contributor => {
    const movieId = contributor.movie_tmdb_id.toString();
    
    if (!byMovieTmdbId[movieId]) {
      byMovieTmdbId[movieId] = [];
    }
    
    byMovieTmdbId[movieId].push({
      person_id: contributor.person_id,
      name: contributor.person_name,
      role: contributor.role
    });
  });
  
  return {
    by_movie_tmdb_id: byMovieTmdbId,
    count: contributors.length,
    generated_at: new Date().toISOString()
  };
}

/**
 * Main index generation function
 */
async function generateAllIndexes() {
  console.log('🚀 MovieGenius Static Build Index Generator');
  console.log('==========================================');
  
  const startTime = Date.now();
  let pool;
  
  try {
    // Connect to database
    pool = getPool();
    console.log('✅ Connected to database\n');
    
    // Create indexes directory
    await fs.promises.mkdir(INDEXES_DIR, { recursive: true });
    console.log(`📁 Created indexes directory: ${INDEXES_DIR}\n`);
    
    // Generate all indexes in parallel
    const [movieIndexes, personIndexes, contributorIndexes] = await Promise.all([
      generateMovieIndexes(pool),
      generatePersonIndexes(pool),
      generateContributorIndexes(pool)
    ]);
    
    // Write index files
    const indexFiles = [
      { name: 'movies.json', data: movieIndexes },
      { name: 'persons.json', data: personIndexes }, 
      { name: 'movie-contributors.json', data: contributorIndexes }
    ];
    
    console.log('\n💾 Writing index files...');
    
    for (const indexFile of indexFiles) {
      const filePath = path.join(INDEXES_DIR, indexFile.name);
      const jsonContent = JSON.stringify(indexFile.data, null, 2);
      await fs.promises.writeFile(filePath, jsonContent);
      
      const sizeKB = (jsonContent.length / 1024).toFixed(1);
      console.log(`   ✅ ${indexFile.name}: ${indexFile.data.count} entries (${sizeKB}KB)`);
    }
    
    // Generate summary
    const totalTime = Date.now() - startTime;
    const summary = {
      generated_at: new Date().toISOString(),
      generation_time_ms: totalTime,
      indexes: {
        movies: movieIndexes.count,
        persons: personIndexes.count,
        contributors: contributorIndexes.count
      },
      total_entries: movieIndexes.count + personIndexes.count + contributorIndexes.count
    };
    
    // Write summary
    const summaryPath = path.join(INDEXES_DIR, 'build-summary.json');
    await fs.promises.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n🎉 INDEX GENERATION COMPLETE');
    console.log('============================');
    console.log(`⏱️ Total time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log(`📊 Movies: ${movieIndexes.count}`);
    console.log(`👥 Persons: ${personIndexes.count}`);
    console.log(`🎬 Contributors: ${contributorIndexes.count}`);
    console.log(`📁 Files saved to: ${INDEXES_DIR}`);
    console.log('\n🚀 Indexes ready for static build generation!');
    
  } catch (error) {
    console.error('\n💥 Index generation failed:', error.message);
    process.exit(1);
    
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllIndexes().catch(console.error);
}

export { generateAllIndexes };