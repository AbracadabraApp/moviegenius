#!/usr/bin/env node

/**
 * Reprocess Failed Movies - Enhanced Analysis
 * 
 * Takes the failed movies from enhanced-analysis-progress.json
 * and reprocesses them with improved JSON handling
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { readFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Get failed movies from progress file
 */
function getFailedMovies() {
  try {
    const progressData = JSON.parse(readFileSync('/Users/josh.petersen/moviegenius/enhanced-analysis-progress.json', 'utf8'));
    const failedMovieIds = Object.keys(progressData.failedMovies);
    
    console.log(`Found ${failedMovieIds.length} failed movies to reprocess`);
    
    // Get movie details from the submitted batches
    const failedMovies = [];
    
    progressData.submittedBatches.forEach(batch => {
      batch.movies.forEach(movie => {
        if (failedMovieIds.includes(movie.tmdb_id.toString())) {
          failedMovies.push({
            tmdb_id: movie.tmdb_id,
            title: movie.title,
            year: movie.year,
            movie_db_id: movie.movie_db_id,
            error: progressData.failedMovies[movie.tmdb_id.toString()]
          });
        }
      });
    });
    
    return failedMovies;
  } catch (error) {
    console.error('Error reading progress file:', error.message);
    return [];
  }
}

/**
 * Improved JSON parsing with error handling
 */
function parseJSONSafely(content) {
  try {
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    console.log('JSON parse failed, attempting cleanup...');
    
    // Common fixes for malformed JSON
    let cleaned = content;
    
    // Fix unescaped quotes in text
    cleaned = cleaned.replace(/([^\\])"([^"]*)"([^:])/g, '$1\\"$2\\"$3');
    
    // Fix trailing commas
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing commas between properties
    cleaned = cleaned.replace(/}(\s*){/g, '},$1{');
    
    try {
      return { success: true, data: JSON.parse(cleaned) };
    } catch (secondError) {
      return { 
        success: false, 
        error: `JSON parsing failed: ${error.message}`,
        originalError: error.message,
        cleanupError: secondError.message
      };
    }
  }
}

/**
 * Process individual movie
 */
async function processMovie(movie) {
  console.log(`Processing: ${movie.title} (${movie.year}) - TMDB ${movie.tmdb_id}`);
  
  try {
    // Use the same prompt as the batch script
    const { buildEnhancedAnalysisPrompt } = await import('../lib/prompts/enhanced-analysis-generator.js');
    const prompt = buildEnhancedAnalysisPrompt(movie.title, movie.year);
    
    // Make individual API call
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2500,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const content = response.content[0].text;
    const parseResult = parseJSONSafely(content);
    
    if (!parseResult.success) {
      console.log(`  ❌ JSON parsing still failed: ${parseResult.error}`);
      return { success: false, error: parseResult.error };
    }
    
    const analysisData = parseResult.data;
    
    // Validate structure
    if (!analysisData.sections || !Array.isArray(analysisData.sections) || analysisData.sections.length !== 4) {
      const error = `Invalid structure: expected 4 sections, got ${analysisData.sections ? analysisData.sections.length : 'none'}`;
      console.log(`  ❌ ${error}`);
      return { success: false, error };
    }
    
    // Update database
    const updateResult = await pool.query(`
      UPDATE movie_analyses 
      SET enhanced_sections = $1,
          enhanced_key_elements = $2,
          enhanced_format = TRUE,
          enhanced_processed_at = NOW()
      WHERE movie_id = $3
      AND analysis_type = 'general'
    `, [
      JSON.stringify(analysisData.sections),
      JSON.stringify(analysisData.keyElements || {}),
      movie.movie_db_id
    ]);
    
    if (updateResult.rowCount === 0) {
      const error = `No database record updated for TMDB ${movie.tmdb_id}`;
      console.log(`  ❌ ${error}`);
      return { success: false, error };
    }
    
    // Calculate cost
    const usage = response.usage || { input_tokens: 0, output_tokens: 0 };
    const cost = (usage.input_tokens * 0.0015 + usage.output_tokens * 0.0075) / 1000;
    
    const totalWords = analysisData.sections.reduce((sum, section) => 
      sum + (section.text ? section.text.split(' ').length : 0), 0
    );
    
    console.log(`  ✅ Success: ${analysisData.sections.length} sections, ${totalWords} words, $${cost.toFixed(4)}`);
    
    return { 
      success: true, 
      cost,
      totalWords,
      sections: analysisData.sections.length
    };
    
  } catch (error) {
    console.log(`  ❌ API Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔄 Reprocessing Failed Enhanced Analysis Movies');
  console.log('===============================================');
  
  const failedMovies = getFailedMovies();
  
  if (failedMovies.length === 0) {
    console.log('No failed movies found to reprocess');
    return;
  }
  
  console.log(`\nReprocessing ${failedMovies.length} movies individually...\n`);
  
  let successful = 0;
  let stillFailed = 0;
  let totalCost = 0;
  let totalWords = 0;
  
  for (const movie of failedMovies) {
    const result = await processMovie(movie);
    
    if (result.success) {
      successful++;
      totalCost += result.cost;
      totalWords += result.totalWords;
    } else {
      stillFailed++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 REPROCESSING RESULTS');
  console.log('========================');
  console.log(`Total movies reprocessed: ${failedMovies.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Still failed: ${stillFailed}`);
  console.log(`Success rate: ${(successful / failedMovies.length * 100).toFixed(1)}%`);
  console.log(`Total cost: $${totalCost.toFixed(3)}`);
  console.log(`Average words: ${successful > 0 ? Math.round(totalWords / successful) : 0}`);
  
  if (stillFailed > 0) {
    console.log(`\n⚠️  ${stillFailed} movies still failed - may need manual review`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error).finally(() => pool.end());
}