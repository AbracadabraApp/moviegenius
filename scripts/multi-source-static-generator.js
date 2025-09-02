#!/usr/bin/env node

/**
 * Multi-Source Static File Generator
 * 
 * Creates enhanced static JSON files by composing data from multiple sources:
 * 1. Analysis - Railway database movie_analyses 
 * 2. Why Watch - Railway database (binary YES/NO system)
 * 3. Browse Collections - static files (/public/data/movie-lists/)
 * 4. Contributors - movie_contributors table via service
 * 5. More Ideas - generated via More Ideas service
 * 
 * Output: Enhanced static files in /public/data/enhanced-movies/
 */

import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMovieContributors } from '../lib/services/contributors-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Configuration
 */
const CONFIG = {
  batchSize: 10,
  maxMovies: null, // null = all movies
  outputDir: path.join(PROJECT_ROOT, 'public', 'data', 'enhanced-movies'),
  skipExisting: true,
  generateMoreIdeas: false, // Toggle expensive More Ideas generation
  verbose: true
};

// Parse command line args
const args = process.argv.slice(2);
if (args.includes('--all')) CONFIG.maxMovies = null;
if (args.includes('--no-skip')) CONFIG.skipExisting = false;
if (args.includes('--more-ideas')) CONFIG.generateMoreIdeas = true;

const batchArg = args.find(a => a.startsWith('--batch='));
if (batchArg) {
  const value = parseInt(batchArg.split('=')[1], 10);
  if (!isNaN(value)) CONFIG.batchSize = value;
}

// Add specific movie support
CONFIG.specificMovie = null;
const movieArg = args.find(a => a.startsWith('--movie='));
if (movieArg) {
  const value = parseInt(movieArg.split('=')[1], 10);
  if (!isNaN(value)) CONFIG.specificMovie = value;
}

/**
 * Get movies that need enhanced static files
 */
async function getMoviesToProcess() {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        m.id,
        m.tmdb_id,
        m.title,
        m.year,
        ma.id as analysis_id,
        ma.claude_response
      FROM movies m
      JOIN movie_analyses ma ON m.id = ma.movie_id
      WHERE ma.claude_response IS NOT NULL
        AND ma.claude_response->>'raw_content' IS NOT NULL
    `;
    
    const params = [];
    if (CONFIG.specificMovie) {
      query += ` AND m.tmdb_id = $1`;
      params.push(CONFIG.specificMovie);
    } else if (CONFIG.maxMovies) {
      query += ` LIMIT $1`;
      params.push(CONFIG.maxMovies);
    }
    
    const result = await client.query(query, params);
    
    if (CONFIG.verbose) {
      console.log(`📊 Found ${result.rows.length} movies with analyses`);
    }
    
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Load Why Watch data from enhanced_why_watch table
 */
async function loadWhyWatchData(movieId, tmdbId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT recommendation, reasons
      FROM enhanced_why_watch 
      WHERE movie_id = $1 OR tmdb_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [movieId, tmdbId]);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        recommendation: row.recommendation || 'NO',
        reasons: Array.isArray(row.reasons) ? row.reasons : []
      };
    }
  } catch (error) {
    if (CONFIG.verbose) {
      console.log(`    ⚠️  No Why Watch data for ${tmdbId}: ${error.message}`);
    }
  } finally {
    client.release();
  }
  
  return { recommendation: 'NO', reasons: [] };
}

/**
 * Load browse collections for a movie
 */
async function loadBrowseCollections(tmdbId) {
  const browseFilePath = path.join(PROJECT_ROOT, 'public', 'data', 'movie-lists', `movie-${tmdbId}.json`);
  
  try {
    if (fs.existsSync(browseFilePath)) {
      const browseData = JSON.parse(fs.readFileSync(browseFilePath, 'utf-8'));
      return {
        lists: browseData.lists || [],
        totalLists: browseData.totalLists || 0
      };
    }
  } catch (error) {
    if (CONFIG.verbose) {
      console.log(`    ⚠️  No browse collections for ${tmdbId}: ${error.message}`);
    }
  }
  
  return { lists: [], totalLists: 0 };
}

/**
 * Generate enhanced static file for a single movie
 */
async function generateEnhancedMovieFile(movie) {
  const startTime = Date.now();
  const outputFilePath = path.join(CONFIG.outputDir, `movie-${movie.tmdb_id}.json`);
  
  // Skip if file exists and skipExisting is enabled
  if (CONFIG.skipExisting && fs.existsSync(outputFilePath)) {
    if (CONFIG.verbose) {
      console.log(`    ⏭️  Skipping existing: movie-${movie.tmdb_id}.json`);
    }
    return { skipped: true };
  }
  
  try {
    // 1. Parse Analysis (use processed_content with links, fallback to raw_content)
    let analysis;
    try {
      const analysisContent = movie.claude_response.processed_content || 
                             movie.claude_response.raw_content;
      analysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error(`❌ JSON parse error for ${movie.title}: ${parseError.message}`);
      return { error: `Invalid analysis JSON: ${parseError.message}` };
    }
    
    // 2. Load Why Watch Data
    const whyWatchData = await loadWhyWatchData(movie.id, movie.tmdb_id);
    
    // 3. Load Browse Collections
    const browseCollections = await loadBrowseCollections(movie.tmdb_id);
    
    // 4. Get Contributors
    let contributors = null;
    try {
      contributors = await getMovieContributors(movie.id, movie.tmdb_id);
    } catch (error) {
      if (CONFIG.verbose) {
        console.log(`    ⚠️  Contributors error for ${movie.title}: ${error.message}`);
      }
    }
    
    // 4. Load More Ideas from database
    let moreIdeas = null;
    if (CONFIG.generateMoreIdeas) {
      try {
        const moreIdeasClient = await pool.connect();
        const moreIdeasResult = await moreIdeasClient.query(`
          SELECT ideas 
          FROM more_ideas 
          WHERE movie_id = $1 OR tmdb_id = $2
          ORDER BY created_at DESC
          LIMIT 1
        `, [movie.id, movie.tmdb_id]);
        
        if (moreIdeasResult.rows.length > 0) {
          const ideas = moreIdeasResult.rows[0].ideas;
          moreIdeas = {
            recommendations: Array.isArray(ideas) ? ideas : JSON.parse(ideas),
            totalRecommendations: Array.isArray(ideas) ? ideas.length : JSON.parse(ideas).length
          };
        }
        moreIdeasClient.release();
      } catch (error) {
        if (CONFIG.verbose) {
          console.log(`    ⚠️  No More Ideas data for ${movie.title}: ${error.message}`);
        }
      }
    }
    
    // 5. Compose Enhanced Static File
    const enhancedData = {
      enhancedFormat: true,
      // Core movie data
      movieId: movie.id,
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      
      // Analysis data (main content)
      analysis: {
        keyElements: analysis.keyElements || {},
        sections: analysis.content || [],
        whyWatch: whyWatchData,
        featuredMovies: analysis.featuredMovies || [],
        exploreTopics: analysis.exploreTopics || []
      },
      
      // Browse collections
      browseCollections: {
        lists: browseCollections.lists,
        totalLists: browseCollections.totalLists
      },
      
      // Contributors footer
      contributors: contributors || {
        director: null,
        writers: [],
        stars: [],
        cinematographer: null,
        composer: null
      },
      
      // More ideas (if generated)
      moreIdeas: moreIdeas ? {
        recommendations: moreIdeas.recommendations || [],
        totalRecommendations: moreIdeas.recommendations?.length || 0
      } : null,
      
      // Metadata
      generatedAt: new Date().toISOString(),
      sources: {
        analysis: 'railway_database',
        browseCollections: browseCollections.totalLists > 0 ? 'static_files' : null,
        contributors: contributors ? 'movie_contributors_table' : 'analysis_fallback',
        moreIdeas: moreIdeas ? 'more_ideas_table' : null
      }
    };
    
    // 6. Write to file
    fs.writeFileSync(outputFilePath, JSON.stringify(enhancedData, null, 2));
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      file: `movie-${movie.tmdb_id}.json`,
      processingTime,
      sources: enhancedData.sources
    };
    
  } catch (error) {
    console.error(`❌ Error generating enhanced file for ${movie.title}:`, error.message);
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
    console.log(`\n🎬 Processing: ${movie.title} (${movie.year})`);
    
    const result = await generateEnhancedMovieFile(movie);
    results.push({
      movie: `${movie.title} (${movie.year})`,
      tmdbId: movie.tmdb_id,
      ...result
    });
    
    if (result.success) {
      console.log(`   ✅ Generated ${result.file} in ${result.processingTime}ms`);
      if (CONFIG.verbose && result.sources) {
        const sourcesList = Object.entries(result.sources)
          .filter(([_, value]) => value)
          .map(([key, value]) => `${key}:${value}`)
          .join(', ');
        console.log(`   📊 Sources: ${sourcesList}`);
      }
    } else if (result.skipped) {
      console.log(`   ⏭️  Skipped existing file`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    
    // Small delay between movies
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Multi-Source Static File Generator');
  console.log('=====================================');
  console.log(`📋 Configuration:`);
  console.log(`   Batch Size: ${CONFIG.batchSize}`);
  console.log(`   Max Movies: ${CONFIG.maxMovies || 'All'}`);
  console.log(`   Skip Existing: ${CONFIG.skipExisting}`);
  console.log(`   Generate More Ideas: ${CONFIG.generateMoreIdeas}`);
  console.log(`   Output Dir: ${CONFIG.outputDir}`);
  
  try {
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${CONFIG.outputDir}`);
    }
    
    // Get movies to process
    const movies = await getMoviesToProcess();
    if (movies.length === 0) {
      console.log('❌ No movies found to process');
      return;
    }
    
    const totalBatches = Math.ceil(movies.length / CONFIG.batchSize);
    console.log(`\n📊 Processing ${movies.length} movies in ${totalBatches} batches`);
    
    // Process in batches
    let allResults = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < totalBatches; i++) {
      const batchResults = await processBatch(movies, i);
      allResults = allResults.concat(batchResults);
      
      // Update counters
      batchResults.forEach(result => {
        if (result.success) successCount++;
        else if (result.skipped) skippedCount++;
        else errorCount++;
      });
      
      console.log(`\n📊 Batch ${i + 1}/${totalBatches} Complete - Success: ${successCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
      
      // Small delay between batches
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Final summary
    console.log('\n🏁 GENERATION COMPLETE');
    console.log('=====================');
    console.log(`Total Movies: ${movies.length}`);
    console.log(`Generated: ${successCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (successCount > 0) {
      console.log(`\n📁 Enhanced static files available in: ${CONFIG.outputDir}`);
      console.log('🎉 Multi-source static page architecture ready for testing!');
    }
    
    if (errorCount > 0) {
      console.log(`\n⚠️  ${errorCount} movies failed processing. Review logs above.`);
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

export { generateEnhancedMovieFile };