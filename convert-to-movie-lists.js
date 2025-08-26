#!/usr/bin/env node

/**
 * Convert Consolidated Genre Collections to Movie-Lists Format
 * 
 * Takes the existing consolidated genre reports and aggregated lists
 * and converts them into the individual movie-{tmdbId}.json files
 * that the enhanced static generator expects.
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import 'dotenv/config';

const PROJECT_ROOT = process.cwd();
const MOVIE_LISTS_DIR = path.join(PROJECT_ROOT, 'public', 'data', 'movie-lists');

// Ensure movie-lists directory exists
if (!fs.existsSync(MOVIE_LISTS_DIR)) {
  fs.mkdirSync(MOVIE_LISTS_DIR, { recursive: true });
  console.log('📁 Created /public/data/movie-lists/ directory');
}

async function main() {
  console.log('🎬 Converting Genre Collections to Movie-Lists Format\n');

  // Load all consolidation reports
  const consolidationFiles = fs.readdirSync(PROJECT_ROOT)
    .filter(file => file.startsWith('consolidation-report-') && file.endsWith('.json'));
  
  console.log(`📊 Found ${consolidationFiles.length} consolidation reports`);

  // Create movie-to-lists mapping
  const movieToLists = new Map();
  let totalLists = 0;

  // Process each consolidation report
  for (const filename of consolidationFiles) {
    const genre = filename.replace('consolidation-report-', '').replace('.json', '');
    const filePath = path.join(PROJECT_ROOT, filename);
    const consolidationData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const collections = consolidationData.consolidatedCollections || {};
    const listsCount = Object.keys(collections).length;
    console.log(`  📂 ${genre}: ${listsCount} lists`);
    totalLists += listsCount;

    // Process each collection in this genre
    Object.values(collections).forEach(collection => {
      const movieIds = collection.movieIds || [];
      
      movieIds.forEach(movieId => {
        // Convert UUID to string for mapping - we'll need to resolve these to TMDB IDs
        if (!movieToLists.has(movieId)) {
          movieToLists.set(movieId, {
            lists: [],
            totalLists: 0
          });
        }

        const movieData = movieToLists.get(movieId);
        
        // Clean name to remove problematic characters
        const cleanName = collection.name
          .replace(/[\ud800-\udfff]/g, '') // Remove surrogate pairs
          .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, '') // Keep only safe unicode
          .trim();
        
        if (cleanName) { // Only add if name is not empty after cleaning
          movieData.lists.push({
            name: cleanName,
            url_path: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: `${cleanName} collection`,
            category: genre,
            connectionReason: `Part of ${cleanName} collection`
          });
        }
        movieData.totalLists++;
      });
    });
  }

  console.log(`📊 Total lists processed: ${totalLists}`);
  console.log(`🎯 Processing ${movieToLists.size} unique movies (UUIDs)`);
  
  // Convert UUIDs to TMDB IDs
  console.log('🔄 Converting UUIDs to TMDB IDs...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
  });

  const uuids = Array.from(movieToLists.keys());
  const batchSize = 1000;
  const uuidToTmdb = new Map();

  for (let i = 0; i < uuids.length; i += batchSize) {
    const batch = uuids.slice(i, i + batchSize);
    const placeholders = batch.map((_, index) => `$${index + 1}`).join(', ');
    
    const result = await pool.query(
      `SELECT id, tmdb_id FROM movies WHERE id IN (${placeholders})`,
      batch
    );

    result.rows.forEach(row => {
      uuidToTmdb.set(row.id, row.tmdb_id.toString());
    });

    console.log(`  📋 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uuids.length/batchSize)}: ${result.rows.length} UUIDs mapped`);
  }

  await pool.end();

  console.log(`✅ UUID mapping complete: ${uuidToTmdb.size}/${uuids.length} movies found`);

  // Convert to TMDB-based mapping
  const tmdbMovieLists = new Map();
  for (const [uuid, listsData] of movieToLists.entries()) {
    const tmdbId = uuidToTmdb.get(uuid);
    if (tmdbId) {
      tmdbMovieLists.set(tmdbId, listsData);
    }
  }

  console.log(`🎯 Writing files for ${tmdbMovieLists.size} movies with TMDB IDs`);

  // Write individual movie-{tmdbId}.json files
  let filesCreated = 0;
  let skippedFiles = 0;
  
  for (const [tmdbId, listsData] of tmdbMovieLists.entries()) {
    try {
      // Test JSON serialization first
      const jsonString = JSON.stringify(listsData, null, 2);
      const filePath = path.join(MOVIE_LISTS_DIR, `movie-${tmdbId}.json`);
      fs.writeFileSync(filePath, jsonString);
      filesCreated++;
    } catch (error) {
      console.warn(`⚠️  Skipping movie ${tmdbId}: ${error.message}`);
      skippedFiles++;
    }
  }

  console.log(`\n✅ Conversion Complete!`);
  console.log(`📁 Created ${filesCreated} movie-list files`);
  if (skippedFiles > 0) {
    console.log(`⚠️  Skipped ${skippedFiles} files due to encoding issues`);
  }
  console.log(`📍 Location: ${MOVIE_LISTS_DIR}`);
  console.log(`\n🎬 Enhanced static generator can now access browse collections!`);
}

main().catch(console.error);