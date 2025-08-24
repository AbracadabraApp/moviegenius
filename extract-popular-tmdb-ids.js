#!/usr/bin/env node
/**
 * Extract Popular TMDB IDs from Browse Collections
 * 
 * Reads all consolidation reports, extracts movie UUIDs from collections,
 * maps UUIDs to TMDB IDs, and ranks by cross-collection appearances.
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
});

async function extractPopularTmdbIds() {
  console.log('🎬 Extracting popular TMDB IDs from browse collections...\n');

  // Step 1: Read all consolidation reports
  const consolidationFiles = fs.readdirSync('.')
    .filter(f => f.startsWith('consolidation-report-') && f.endsWith('.json'));

  console.log(`📁 Found ${consolidationFiles.length} consolidation reports`);

  // Step 2: Extract all movie UUIDs with collection counts
  const movieUuidCounts = {};
  let totalCollections = 0;
  
  for (const file of consolidationFiles) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const genre = file.replace('consolidation-report-', '').replace('.json', '');
    
    console.log(`📊 Processing ${genre}: ${Object.keys(data.consolidatedCollections).length} collections`);
    
    // Count appearances in each collection
    for (const [collectionName, collection] of Object.entries(data.consolidatedCollections)) {
      totalCollections++;
      
      for (const movieUuid of collection.movieIds) {
        movieUuidCounts[movieUuid] = (movieUuidCounts[movieUuid] || 0) + 1;
      }
    }
  }

  const totalUniqueMovies = Object.keys(movieUuidCounts).length;
  console.log(`\n🎯 Found ${totalUniqueMovies} unique movies across ${totalCollections} collections`);

  // Step 3: Map UUIDs to TMDB IDs
  console.log('\n🔍 Mapping UUIDs to TMDB IDs...');
  
  const uuids = Object.keys(movieUuidCounts);
  const batchSize = 100;
  const tmdbIdMap = {};
  
  for (let i = 0; i < uuids.length; i += batchSize) {
    const batchUuids = uuids.slice(i, i + batchSize);
    
    const query = `
      SELECT id, tmdb_id, title, year 
      FROM movies 
      WHERE id = ANY($1) AND tmdb_id IS NOT NULL
    `;
    
    const result = await pool.query(query, [batchUuids]);
    
    for (const row of result.rows) {
      tmdbIdMap[row.id] = {
        tmdb_id: row.tmdb_id,
        title: row.title,
        year: row.year,
        appearances: movieUuidCounts[row.id]
      };
    }
    
    console.log(`  Processed ${Math.min(i + batchSize, uuids.length)}/${uuids.length} UUIDs`);
  }

  // Step 4: Create popularity rankings
  const popularMovies = Object.values(tmdbIdMap)
    .sort((a, b) => b.appearances - a.appearances);

  console.log(`\n📈 Successfully mapped ${popularMovies.length} movies to TMDB IDs`);

  // Step 5: Generate statistics
  const appearanceCounts = {};
  popularMovies.forEach(movie => {
    const count = movie.appearances;
    appearanceCounts[count] = (appearanceCounts[count] || 0) + 1;
  });

  console.log('\n📊 Cross-collection appearance distribution:');
  Object.entries(appearanceCounts)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))
    .slice(0, 10)
    .forEach(([appearances, count]) => {
      console.log(`  ${appearances} collections: ${count} movies`);
    });

  // Show top 20 most popular movies
  console.log('\n🏆 Top 20 most popular movies (by collection appearances):');
  popularMovies.slice(0, 20).forEach((movie, index) => {
    console.log(`  ${index + 1}. ${movie.title} (${movie.year}) - TMDB:${movie.tmdb_id} - ${movie.appearances} collections`);
  });

  // Step 6: Save results in multiple formats
  const results = {
    metadata: {
      totalMovies: popularMovies.length,
      totalCollections: totalCollections,
      generatedAt: new Date().toISOString(),
      sourceFiles: consolidationFiles
    },
    movies: popularMovies
  };

  // Save complete results
  fs.writeFileSync('popular-movies-analysis.json', JSON.stringify(results, null, 2));
  
  // Save just TMDB IDs ranked by popularity (for streaming update)
  const tmdbIds = popularMovies.map(movie => movie.tmdb_id);
  fs.writeFileSync('popular-tmdb-ids-ranked.json', JSON.stringify(tmdbIds, null, 2));
  
  // Save top 500 for initial batch
  const top500 = tmdbIds.slice(0, 500);
  fs.writeFileSync('popular-tmdb-ids-top500.json', JSON.stringify(top500, null, 2));
  
  // Save top 1000 for comprehensive batch
  const top1000 = tmdbIds.slice(0, 1000);
  fs.writeFileSync('popular-tmdb-ids-top1000.json', JSON.stringify(top1000, null, 2));

  console.log('\n✅ Files created:');
  console.log('  📄 popular-movies-analysis.json - Complete analysis with metadata');
  console.log('  📄 popular-tmdb-ids-ranked.json - All TMDB IDs ranked by popularity');
  console.log('  📄 popular-tmdb-ids-top500.json - Top 500 most popular movies');
  console.log('  📄 popular-tmdb-ids-top1000.json - Top 1000 most popular movies');

  console.log(`\n🎯 Ready for TMDB streaming update with ${popularMovies.length} movies!`);
  
  await pool.end();
}

extractPopularTmdbIds().catch(console.error);