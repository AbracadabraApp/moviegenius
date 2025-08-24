#!/usr/bin/env node

/**
 * Generate Contributors Static Files
 * 
 * Pre-generates contributor JSON files for all movies to eliminate database queries
 * during static page generation. Stores files in /public/data/contributors/
 */

import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const CONFIG = {
  batchSize: 100,
  outputDir: path.join(PROJECT_ROOT, 'public', 'data', 'contributors'),
  skipExisting: true,
  verbose: true
};

// Parse command line args
const args = process.argv.slice(2);
if (args.includes('--no-skip')) CONFIG.skipExisting = false;
if (args.includes('--batch')) CONFIG.batchSize = parseInt(args.find(a => a.startsWith('--batch=')).split('=')[1]);

/**
 * Get all movies that have contributors in the database
 */
async function getMoviesWithContributors() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT DISTINCT 
        m.tmdb_id,
        m.title,
        m.year,
        COUNT(mc.id) as contributor_count
      FROM movies m 
      JOIN movie_contributors mc ON m.tmdb_id = mc.movie_tmdb_id
      GROUP BY m.tmdb_id, m.title, m.year
      ORDER BY m.tmdb_id
    `);
    
    if (CONFIG.verbose) {
      console.log(`📊 Found ${result.rows.length} movies with contributors`);
    }
    
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Get contributors for a specific movie
 */
async function getMovieContributorsData(tmdbId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        mc.*,
        p.name as canonical_name
      FROM movie_contributors mc
      LEFT JOIN persons p ON mc.person_id = p.id
      WHERE mc.movie_tmdb_id = $1
      ORDER BY 
        CASE mc.role 
          WHEN 'director' THEN 1
          WHEN 'writer' THEN 2 
          WHEN 'star' THEN 3
          WHEN 'cinematographer' THEN 4
          WHEN 'composer' THEN 5
          ELSE 6 
        END,
        p.name
    `, [tmdbId]);
    
    return formatContributorsData(result.rows);
    
  } finally {
    client.release();
  }
}

/**
 * Format contributors into organized structure
 */
function formatContributorsData(contributorRows) {
  const contributors = {
    director: null,
    writers: [],
    stars: [],
    cinematographer: null,
    composer: null,
    producer: null
  };
  
  contributorRows.forEach(row => {
    const person = {
      name: row.canonical_name || row.person_name,
      personId: row.person_id,
      slug: row.person_id ? `/person/${row.person_id}` : null,
      role: row.role
    };
    
    switch (row.role?.toLowerCase()) {
      case 'director':
        contributors.director = person;
        break;
      case 'writer':
      case 'screenplay':
        contributors.writers.push(person);
        break;
      case 'actor':
      case 'star':
        contributors.stars.push(person);
        break;
      case 'cinematographer':
      case 'director of photography':
        contributors.cinematographer = person;
        break;
      case 'composer':
      case 'music':
        contributors.composer = person;
        break;
      case 'producer':
        contributors.producer = person;
        break;
    }
  });
  
  // Calculate summary stats
  const totalContributors = [
    contributors.director,
    contributors.cinematographer, 
    contributors.composer,
    contributors.producer
  ].filter(c => c).length + contributors.writers.length + contributors.stars.length;
  
  const linkedContributors = [
    contributors.director,
    contributors.cinematographer,
    contributors.composer, 
    contributors.producer
  ].filter(c => c?.personId).length + 
    contributors.writers.filter(w => w.personId).length + 
    contributors.stars.filter(s => s.personId).length;
  
  return {
    contributors,
    metadata: {
      totalContributors,
      linkedContributors,
      linkPercentage: totalContributors > 0 ? (linkedContributors / totalContributors * 100).toFixed(1) : 0,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate static file for a single movie
 */
async function generateMovieContributorFile(movie) {
  const outputFilePath = path.join(CONFIG.outputDir, `movie-${movie.tmdb_id}.json`);
  
  // Skip if file exists and skipExisting is enabled
  if (CONFIG.skipExisting && fs.existsSync(outputFilePath)) {
    return { skipped: true };
  }
  
  try {
    const contributorData = await getMovieContributorsData(movie.tmdb_id);
    
    // Add movie metadata
    const fileData = {
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      ...contributorData
    };
    
    // Write to file
    fs.writeFileSync(outputFilePath, JSON.stringify(fileData, null, 2));
    
    return {
      success: true,
      file: `movie-${movie.tmdb_id}.json`,
      contributorCount: fileData.metadata.totalContributors,
      linkedCount: fileData.metadata.linkedContributors
    };
    
  } catch (error) {
    console.error(`❌ Error generating contributor file for ${movie.title}:`, error.message);
    return { error: error.message };
  }
}

/**
 * Process movies in batches
 */
async function processBatch(movies, batchIndex) {
  const batchStart = batchIndex * CONFIG.batchSize;
  const batch = movies.slice(batchStart, batchStart + CONFIG.batchSize);
  
  console.log(`\n🔄 Processing Batch ${batchIndex + 1} (${batch.length} movies)`);
  console.log(`   Range: ${batchStart + 1}-${batchStart + batch.length} of ${movies.length}`);
  
  const results = [];
  
  for (const movie of batch) {
    const result = await generateMovieContributorFile(movie);
    results.push({
      movie: `${movie.title} (${movie.year})`,
      tmdbId: movie.tmdb_id,
      ...result
    });
    
    if (result.success) {
      console.log(`   ✅ ${movie.title}: ${result.contributorCount} contributors (${result.linkedCount} linked)`);
    } else if (result.skipped) {
      console.log(`   ⏭️  Skipped: ${movie.title}`);
    } else {
      console.log(`   ❌ Failed: ${movie.title} - ${result.error}`);
    }
  }
  
  return results;
}

/**
 * Main execution function
 */
async function main() {
  console.log('📁 Contributors Static File Generator');
  console.log('====================================');
  console.log(`📋 Configuration:`);
  console.log(`   Batch Size: ${CONFIG.batchSize}`);
  console.log(`   Skip Existing: ${CONFIG.skipExisting}`);
  console.log(`   Output Dir: ${CONFIG.outputDir}`);
  
  try {
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${CONFIG.outputDir}`);
    }
    
    // Get movies with contributors
    const movies = await getMoviesWithContributors();
    if (movies.length === 0) {
      console.log('❌ No movies found with contributors');
      return;
    }
    
    const totalBatches = Math.ceil(movies.length / CONFIG.batchSize);
    console.log(`\n📊 Processing ${movies.length} movies in ${totalBatches} batches`);
    
    // Process in batches
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalContributors = 0;
    let totalLinked = 0;
    
    for (let i = 0; i < totalBatches; i++) {
      const batchResults = await processBatch(movies, i);
      
      // Update counters
      batchResults.forEach(result => {
        if (result.success) {
          successCount++;
          totalContributors += result.contributorCount || 0;
          totalLinked += result.linkedCount || 0;
        } else if (result.skipped) {
          skippedCount++;
        } else {
          errorCount++;
        }
      });
      
      console.log(`📊 Batch ${i + 1}/${totalBatches} Complete - Success: ${successCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
      
      // Small delay between batches
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Final summary
    console.log('\n🏁 GENERATION COMPLETE');
    console.log('=====================');
    console.log(`Total Movies: ${movies.length}`);
    console.log(`Generated: ${successCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total Contributors: ${totalContributors}`);
    console.log(`Linked Contributors: ${totalLinked} (${totalContributors > 0 ? (totalLinked / totalContributors * 100).toFixed(1) : 0}%)`);
    
    if (successCount > 0) {
      console.log(`\n📁 Contributor files available in: ${CONFIG.outputDir}`);
      console.log('🎉 Contributors system ready for static file integration!');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}