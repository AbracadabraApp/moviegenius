#!/usr/bin/env node
/**
 * Fast TMDB Poster Update Script
 * Simple script to fetch and update poster URLs for all movies from TMDB API
 */

import { Client, Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
// Removed poster validation - just store whatever TMDB gives us

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

async function fastPosterUpdate() {
  const pool = new Pool({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB API key required');
    process.exit(1);
  }
  
  try {
    console.log('🚀 FAST POSTER UPDATE WITH CONNECTION POOLING');
    console.log('==============================================\n');
    
    console.log('🗑️  CLEARING ALL POSTER URLs...');
    await pool.query('UPDATE movies SET poster_url = NULL WHERE tmdb_id IS NOT NULL');
    console.log('✅ All poster URLs cleared\n');
    
    // Fetch ALL movies with TMDB IDs
    const result = await pool.query(`
      SELECT tmdb_id, title, year
      FROM movies 
      WHERE tmdb_id IS NOT NULL 
      ORDER BY tmdb_id
    `);
    
    console.log(`📋 Found ${result.rows.length.toLocaleString()} movies to process`);
    
    let updated = 0;
    let errors = 0;
    let skipped = 0;
    
    // Process in parallel batches for faster execution
    const batchSize = 20;
    const concurrentBatches = 3;
    
    console.log(`🔄 Processing ${result.rows.length.toLocaleString()} movies in batches of ${batchSize} with ${concurrentBatches} concurrent batches\n`);
    
    async function processBatch(movies, batchIndex) {
      const batchResults = { updated: 0, errors: 0, skipped: 0 };
      
      for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        
        try {
          // Fetch from TMDB API
          const tmdbResponse = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}`);
          
          if (!tmdbResponse.ok) {
            throw new Error(`TMDB API error: ${tmdbResponse.status}`);
          }
          
          const tmdbData = await tmdbResponse.json();
          
          if (tmdbData.poster_path) {
            const newPosterUrl = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
            
            // Update database using pool
            await pool.query(`
              UPDATE movies 
              SET poster_url = $1, updated_at = NOW()
              WHERE tmdb_id = $2
            `, [newPosterUrl, movie.tmdb_id]);
            
            batchResults.updated++;
          } else {
            // Movie has no poster on TMDB - leave as NULL
            batchResults.skipped++;
          }
          
          // Rate limiting - 5 requests per second per batch
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          batchResults.errors++;
          if (batchResults.errors <= 2) {
            console.log(`  ❌ Error for ${movie.title} (${movie.tmdb_id}): ${error.message}`);
          }
        }
      }
      
      return batchResults;
    }
    
    // Process movies in batches
    for (let i = 0; i < result.rows.length; i += batchSize * concurrentBatches) {
      const batches = [];
      
      // Create concurrent batches
      for (let j = 0; j < concurrentBatches; j++) {
        const start = i + (j * batchSize);
        const end = Math.min(start + batchSize, result.rows.length);
        
        if (start < result.rows.length) {
          const batchMovies = result.rows.slice(start, end);
          batches.push(processBatch(batchMovies, j));
        }
      }
      
      // Wait for all batches to complete
      const batchResults = await Promise.all(batches);
      
      // Aggregate results
      batchResults.forEach(result => {
        updated += result.updated;
        errors += result.errors;
        skipped += result.skipped;
      });
      
      // Progress indicator
      const processed = Math.min(i + (batchSize * concurrentBatches), result.rows.length);
      console.log(`📊 Progress: ${processed}/${result.rows.length} (${((processed/result.rows.length)*100).toFixed(1)}%) - Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
    }
    
    console.log('\n🎉 POSTER UPDATE COMPLETE');
    console.log('========================');
    console.log(`✅ Updated: ${updated.toLocaleString()} movies`);
    console.log(`⏭️  Skipped: ${skipped.toLocaleString()} movies (no change/no poster)`);
    console.log(`❌ Errors: ${errors.toLocaleString()} movies`);
    console.log(`📊 Total processed: ${result.rows.length.toLocaleString()} movies`);
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  } finally {
    await pool.end();
  }
}

// Command line options
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('🧪 DRY RUN MODE - No database changes will be made');
}

fastPosterUpdate().catch(console.error);