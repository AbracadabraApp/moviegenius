#!/usr/bin/env node

/**
 * Reprocess Specific Failed Movies
 * 
 * Based on the 17 failed movies identified from the batch run
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// The 17 failed movies from our analysis
const failedTmdbIds = [451, 503, 576, 588, 646, 682, 742, 762, 765, 771, 794, 865, 918, 966, 976, 981, 1059];

/**
 * Get movie details from database
 */
async function getMovieDetails(tmdbIds) {
  const query = `
    SELECT m.tmdb_id, m.title, m.year, m.id as movie_db_id
    FROM movies m
    WHERE m.tmdb_id = ANY($1)
    ORDER BY m.tmdb_id
  `;
  
  const result = await pool.query(query, [tmdbIds]);
  return result.rows;
}

/**
 * Improved JSON parsing with error handling
 */
function parseJSONSafely(content, movieTitle) {
  try {
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    console.log(`    JSON parse failed for ${movieTitle}, attempting cleanup...`);
    
    // Common fixes for malformed JSON
    let cleaned = content;
    
    // Fix unescaped quotes in text (most common issue)
    // Look for patterns like: "text": "Some text with "quotes" here"
    cleaned = cleaned.replace(/"text":\s*"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
      return `"text": "${p1}\\"${p2}\\"${p3}"`;
    });
    
    // Fix unescaped quotes in subheads
    cleaned = cleaned.replace(/"subhead":\s*"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
      return `"subhead": "${p1}\\"${p2}\\"${p3}"`;
    });
    
    // Fix trailing commas
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing commas between properties
    cleaned = cleaned.replace(/}(\s*){/g, '},$1{');
    
    try {
      return { success: true, data: JSON.parse(cleaned), wasFixed: true };
    } catch (secondError) {
      console.log(`    Cleanup also failed: ${secondError.message}`);
      return { 
        success: false, 
        error: `JSON parsing failed: ${error.message}`,
        content: content.substring(0, 200) + '...'
      };
    }
  }
}

/**
 * Process individual movie
 */
async function processMovie(movie) {
  console.log(`\n${movie.tmdb_id}: ${movie.title} (${movie.year})`);
  
  try {
    // Use the same prompt as the batch script
    const { buildEnhancedAnalysisPrompt } = await import('../lib/prompts/enhanced-analysis-generator.js');
    const prompt = buildEnhancedAnalysisPrompt(movie.title, movie.year);
    
    // Make individual API call with higher temperature for variety
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2500,
      temperature: 0.5, // Lower temperature for more consistent JSON
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const content = response.content[0].text;
    const parseResult = parseJSONSafely(content, movie.title);
    
    if (!parseResult.success) {
      console.log(`  ❌ JSON parsing failed: ${parseResult.error}`);
      if (parseResult.content) {
        console.log(`  Content preview: ${parseResult.content}`);
      }
      return { success: false, error: parseResult.error };
    }
    
    if (parseResult.wasFixed) {
      console.log('  🔧 JSON was repaired automatically');
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
    
    // Calculate cost (Batch API rates)
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
      sections: analysisData.sections.length,
      usage
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
  console.log('🔄 Reprocessing 17 Failed Enhanced Analysis Movies');
  console.log('==================================================');
  
  const movies = await getMovieDetails(failedTmdbIds);
  console.log(`Found ${movies.length} movies in database to reprocess`);
  
  if (movies.length !== failedTmdbIds.length) {
    console.log(`⚠️  Expected ${failedTmdbIds.length} movies, found ${movies.length}`);
  }
  
  let successful = 0;
  let stillFailed = 0;
  let totalCost = 0;
  let totalWords = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  for (const movie of movies) {
    const result = await processMovie(movie);
    
    if (result.success) {
      successful++;
      totalCost += result.cost;
      totalWords += result.totalWords;
      totalInputTokens += result.usage.input_tokens;
      totalOutputTokens += result.usage.output_tokens;
    } else {
      stillFailed++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 REPROCESSING RESULTS');
  console.log('========================');
  console.log(`Total movies attempted: ${movies.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Still failed: ${stillFailed}`);
  console.log(`Success rate: ${(successful / movies.length * 100).toFixed(1)}%`);
  console.log(`Total cost: $${totalCost.toFixed(3)}`);
  console.log(`Average cost per movie: $${successful > 0 ? (totalCost / successful).toFixed(4) : '0'}`);
  console.log(`Average words: ${successful > 0 ? Math.round(totalWords / successful) : 0}`);
  console.log(`Token usage: ${totalInputTokens} in, ${totalOutputTokens} out`);
  
  if (stillFailed > 0) {
    console.log(`\n⚠️  ${stillFailed} movies still failed after reprocessing`);
  } else {
    console.log('\n🎉 All failed movies successfully reprocessed!');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error).finally(() => pool.end());
}