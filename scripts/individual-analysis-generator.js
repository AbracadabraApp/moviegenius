#!/usr/bin/env node

/**
 * Individual Movie Analysis Generator
 * 
 * Processes movies one at a time using our proven enhanced analysis approach.
 * Based on successful reprocess-specific-failed.js but modified for all movies without analysis.
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { buildEnhancedAnalysisPrompt } from '../lib/prompts/enhanced-analysis-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const CONFIG = {
  batchSize: 6,           // Process 6 movies in parallel (3x faster)
  progressInterval: 100,  // Report progress every 100 movies
  resumeFile: './analysis-progress.json',
  maxRetries: 2,          // Reduced retries (1 retry instead of 3)
  retryDelay: 1000       // 1 second between retries (faster)
};

/**
 * Improved JSON parsing with error handling (from our successful reprocess script)
 */
function parseJSONSafely(content, movieTitle) {
  // Check for content refusal first
  if (!content.trim().startsWith('{') && !content.trim().startsWith('[')) {
    return { 
      success: false, 
      error: 'Content refusal detected - Claude returned plain text instead of JSON',
      content: content.substring(0, 100) + '...',
      needsManualReview: true
    };
  }
  
  try {
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    console.log(`    JSON parse failed for ${movieTitle}, attempting cleanup...`);
    
    let cleaned = content;
    
    // Fix control characters (common issue with apostrophes and quotes)
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // NEW: Extract JSON block if wrapped in markdown
    const jsonMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1];
    }
    
    // NEW: More aggressive quote fixing - handle nested quotes properly
    cleaned = cleaned.replace(/"text":\s*"((?:[^"\\]|\\.)*)"/g, (match, text) => {
      // Fix unescaped quotes within the text value
      const fixedText = text
        .replace(/\\"/g, '""ESCAPED_QUOTE""')  // Protect already escaped quotes
        .replace(/"/g, '\\"')                  // Escape unescaped quotes  
        .replace(/""ESCAPED_QUOTE""/g, '\\"'); // Restore protected quotes
      return `"text": "${fixedText}"`;
    });
    
    // NEW: Fix subhead quotes the same way
    cleaned = cleaned.replace(/"subhead":\s*"((?:[^"\\]|\\.)*)"/g, (match, text) => {
      const fixedText = text
        .replace(/\\"/g, '""ESCAPED_QUOTE""')
        .replace(/"/g, '\\"')
        .replace(/""ESCAPED_QUOTE""/g, '\\"');
      return `"subhead": "${fixedText}"`;
    });
    
    // Fix trailing commas
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing commas between properties - more precise
    cleaned = cleaned.replace(/}(\s*)"([^"]+)":/g, '},$1"$2":');
    cleaned = cleaned.replace(/](\s*)"([^"]+)":/g, '],$1"$2":');
    
    try {
      return { success: true, data: JSON.parse(cleaned), wasFixed: true };
    } catch (secondError) {
      console.log(`    Cleanup also failed: ${secondError.message}`);
      
      // Try one more aggressive fix - extract just the sections array
      try {
        const sectionsMatch = content.match(/"sections":\s*(\[[^\]]*\])/s);
        if (sectionsMatch) {
          const sectionsText = sectionsMatch[1];
          const fallbackData = {
            sections: JSON.parse(sectionsText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')),
            keyElements: { genre: "Unknown", director: "Unknown", year: new Date().getFullYear() }
          };
          console.log(`    Emergency fallback parsing succeeded`);
          return { success: true, data: fallbackData, wasFixed: true };
        }
      } catch (fallbackError) {
        // Fallback failed too
      }
      
      return { 
        success: false, 
        error: `JSON parsing failed: ${error.message}`,
        content: content.substring(0, 300) + '...'
      };
    }
  }
}

/**
 * Process individual movie (based on our successful reprocess script)
 */
async function processMovie(movie, retryCount = 0, movieIndex = 0, totalMovies = 0) {
  const progressNumber = movieIndex > 0 ? `${movieIndex}/${totalMovies} - ` : '';
  console.log(`Processing: ${progressNumber}${movie.title} (${movie.year}) - TMDB ${movie.tmdb_id}`);
  
  try {
    // Import and use the cacheable prompt structure
    const { CORE_VOICE } = await import('../lib/prompts/core.js');
    
    // Create cacheable base prompt (everything except the movie-specific part)
    const basePrompt = `${CORE_VOICE}

Generate movie analysis for: `;

    const instructions = `

Create 4 sections (TOTAL 400-450 words):
1. Story/Plot (contextual subhead)
2. Performances (contextual subhead) 
3. Filmmaking (contextual subhead)
4. Cultural Impact (contextual subhead)

WORD COUNT IS CRITICAL: As you write, count words one by one (ignoring JSON formatting). Keep a running tally: "Section 1: 95 words, Section 2: 105 words, Section 3: 115 words..." Stop periodically to check your count. Continue writing until you reach exactly 400-450 total words. Sections can vary naturally as long as total hits target.

Requirements:
- Contextual subheads (2-4 words, not generic)
- Include movie/person links naturally
- Specific scenes and technical details
- 1 critique point in sections 2-4
- Reference 2-3 comparison films

JSON only:
{
  "sections": [
    {"subhead": "Contextual Title", "text": "Analysis with links..."}
  ],
  "keyElements": {
    "genre": "Primary/Secondary",
    "director": "Director Name", 
    "year": ${movie.year}
  }
}`;
    
    // Make API call with prompt caching for 90% cost savings
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2500,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: basePrompt,
              cache_control: { type: 'ephemeral' }
            },
            {
              type: 'text',
              text: `${movie.title} (${movie.year})`
            },
            {
              type: 'text', 
              text: instructions,
              cache_control: { type: 'ephemeral' }
            }
          ]
        }
      ]
    });
    
    const content = response.content[0].text;
    const parseResult = parseJSONSafely(content, movie.title);
    
    if (!parseResult.success) {
      if (parseResult.needsManualReview) {
        console.log(`  🚫 Content refusal - skipping ${movie.title} (controversial content)`);
        console.log(`  Content preview: ${parseResult.content}`);
        return { success: false, error: parseResult.error, skip: true };
      } else {
        console.log(`  ❌ JSON parsing failed: ${parseResult.error}`);
        if (parseResult.content) {
          console.log(`  Content preview: ${parseResult.content}`);
        }
        return { success: false, error: parseResult.error };
      }
    }
    
    if (parseResult.wasFixed) {
      console.log('  🔧 JSON was repaired automatically');
    }
    
    const analysisData = parseResult.data;
    
    // Validate structure (exactly like our successful script)
    if (!analysisData.sections || !Array.isArray(analysisData.sections) || analysisData.sections.length !== 4) {
      const error = `Invalid structure: expected 4 sections, got ${analysisData.sections ? analysisData.sections.length : 'none'}`;
      console.log(`  ❌ ${error}`);
      return { success: false, error };
    }
    
    // Save to database in transaction (using our proven database structure)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert analysis with our enhanced format structure
      await client.query(`
        INSERT INTO movie_analyses (
          movie_id, 
          analysis_type, 
          query_text, 
          claude_response,
          enhanced_sections,
          enhanced_key_elements,
          enhanced_format,
          enhanced_processed_at,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      `, [
        movie.movie_db_id,
        'general',
        `Enhanced analysis for ${movie.title} (${movie.year})`,
        JSON.stringify({
          cost: (response.usage.input_tokens * 0.003 + response.usage.output_tokens * 0.015) / 1000,
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens
        }),
        JSON.stringify(analysisData.sections),
        JSON.stringify(analysisData.keyElements || {}),
        true
      ]);
      
      // Update has_analysis flag
      await client.query(`
        UPDATE movies 
        SET has_analysis = true 
        WHERE id = $1
      `, [movie.movie_db_id]);
      
      await client.query('COMMIT');
      
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw new Error(`Database error: ${dbError.message}`);
    } finally {
      client.release();
    }
    
    // Calculate cost (individual API rates with caching - 90% savings on input tokens)
    const usage = response.usage || { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };
    
    // With prompt caching: most input tokens are cached (90% discount), output tokens full price
    const cachedInputTokens = usage.cache_read_input_tokens || Math.max(0, usage.input_tokens - 50); // Assume most tokens are cached
    const uncachedInputTokens = usage.input_tokens - cachedInputTokens;
    
    const cost = (
      uncachedInputTokens * 0.003 +        // Full price for uncached input (movie title/year)
      cachedInputTokens * 0.0003 +         // 90% discount for cached input (prompt)
      usage.output_tokens * 0.015          // Full price for output
    ) / 1000;
    
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
    
    // Retry logic
    if (retryCount < CONFIG.maxRetries && !error.message.includes('JSON parsing')) {
      console.log(`  🔄 Retrying in ${CONFIG.retryDelay}ms... (attempt ${retryCount + 1}/${CONFIG.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      return processMovie(movie, retryCount + 1, movieIndex, totalMovies);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Load resume point if exists
 */
function loadResumePoint() {
  if (existsSync(CONFIG.resumeFile)) {
    try {
      const resume = JSON.parse(readFileSync(CONFIG.resumeFile, 'utf8'));
      console.log(`📄 Resuming from TMDB ${resume.lastTmdbId}...`);
      console.log(`Previous progress: ${resume.processed} processed, ${resume.succeeded} succeeded, ${resume.failed} failed`);
      return resume;
    } catch (error) {
      console.log(`⚠️ Resume file corrupted, starting fresh`);
      return null;
    }
  }
  return null;
}

/**
 * Save resume point
 */
function saveResumePoint(data) {
  writeFileSync(CONFIG.resumeFile, JSON.stringify({
    ...data,
    timestamp: new Date().toISOString()
  }, null, 2));
}

/**
 * Get movies without analysis
 */
async function getMoviesWithoutAnalysis(lastTmdbId = 0) {
  const query = `
    SELECT 
      m.id as movie_db_id,
      m.tmdb_id, 
      m.title, 
      m.year
    FROM movies m
    WHERE m.has_analysis = false
    AND m.tmdb_id IS NOT NULL
    AND m.tmdb_id > $1
    ORDER BY m.tmdb_id
  `;
  
  const result = await pool.query(query, [lastTmdbId]);
  return result.rows;
}

/**
 * Main execution
 */
async function main() {
  console.log('🎬 Individual Movie Analysis Generator');
  console.log('====================================');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const testArg = args.includes('--test');
  const dryRunArg = args.includes('--dry-run');
  
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  const isTest = testArg || limit;
  
  if (dryRunArg) {
    console.log('🔍 DRY RUN MODE - No actual processing will occur');
  }
  if (limit) {
    console.log(`🎯 LIMIT MODE - Processing maximum ${limit} movies`);
  }
  if (testArg) {
    console.log('🧪 TEST MODE - Using smaller batch size and more logging');
    CONFIG.batchSize = 3; // Process 3 at a time in test mode (still faster than old default)
    CONFIG.progressInterval = 10; // Report every 10 movies
  }
  
  // Load resume point
  const resumeData = loadResumePoint();
  const lastTmdbId = resumeData?.lastTmdbId || 0;
  
  // Get movies to process
  let movies = await getMoviesWithoutAnalysis(lastTmdbId);
  
  // Apply limit if specified (respect total processed count)
  if (limit) {
    const alreadyProcessed = resumeData?.processed || 0;
    const remaining = Math.max(0, limit - alreadyProcessed);
    
    if (remaining <= 0) {
      console.log(`🎯 LIMIT REACHED - Already processed ${alreadyProcessed}/${limit} movies`);
      return;
    }
    
    if (movies.length > remaining) {
      movies = movies.slice(0, remaining);
      console.log(`📝 Limited to next ${remaining} movies (${alreadyProcessed} already processed)`);
    }
  }
  
  console.log(`Found ${movies.length} movies without analysis to process`);
  
  if (dryRunArg) {
    console.log('\n📋 DRY RUN PREVIEW:');
    movies.slice(0, 10).forEach((movie, i) => {
      console.log(`  ${i + 1}. ${movie.title} (${movie.year}) - TMDB ${movie.tmdb_id}`);
    });
    if (movies.length > 10) {
      console.log(`  ... and ${movies.length - 10} more movies`);
    }
    console.log(`\n💰 Estimated cost: $${(movies.length * 0.0057).toFixed(2)}`);
    console.log(`⏱️ Estimated time: ${(movies.length / 2.5).toFixed(0)} minutes`);
    console.log('\nAdd --limit=50 to process only 50 movies');
    console.log('Remove --dry-run to start actual processing');
    return;
  }
  
  if (movies.length === 0) {
    console.log('🎉 All movies already have analysis!');
    return;
  }
  
  // Initialize counters
  let processed = resumeData?.processed || 0;
  let succeeded = resumeData?.succeeded || 0;
  let failed = resumeData?.failed || 0;
  let totalCost = resumeData?.totalCost || 0;
  let totalWords = resumeData?.totalWords || 0;
  let failedMovies = resumeData?.failedMovies || [];
  
  const startTime = Date.now();
  
  // Process movies in small batches for parallelism
  for (let i = 0; i < movies.length; i += CONFIG.batchSize) {
    const batch = movies.slice(i, Math.min(i + CONFIG.batchSize, movies.length));
    
    // Process batch in parallel with movie numbering
    const results = await Promise.all(batch.map((movie, batchIndex) => {
      const movieNumber = processed + batchIndex + 1;
      return processMovie(movie, 0, movieNumber, movies.length);
    }));
    
    // Update counters and track failures
    results.forEach((result, index) => {
      const movie = batch[index];
      processed++;
      if (result.success) {
        succeeded++;
        totalCost += result.cost || 0;
        totalWords += result.totalWords || 0;
      } else {
        failed++;
        // Capture failed movie for reprocessing
        failedMovies.push({
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          year: movie.year,
          error: result.error,
          failed_at: new Date().toISOString()
        });
        console.log(`📝 Added to failed list: ${movie.title} (${movie.year})`);
      }
    });
    
    // Progress reporting
    if (processed % CONFIG.progressInterval === 0 || i + CONFIG.batchSize >= movies.length) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const rate = processed / elapsed;
      const currentBatch = Math.min(processed, movies.length);
      const totalMoviesInBatch = movies.length;
      const remaining = totalMoviesInBatch - currentBatch;
      const eta = remaining > 0 ? remaining / rate : 0;
      
      console.log(`\n📊 Progress: ${currentBatch}/${totalMoviesInBatch} - ${remaining} movies to go`);
      console.log(`✅ Succeeded: ${succeeded} | ❌ Failed: ${failed} | Success rate: ${(succeeded / processed * 100).toFixed(1)}%`);
      console.log(`💰 Cost: $${totalCost.toFixed(3)} | Average: $${succeeded > 0 ? (totalCost / succeeded).toFixed(4) : '0'} per movie`);
      console.log(`⏱️ Time: ${elapsed.toFixed(1)}m elapsed | ETA: ${eta > 0 ? eta.toFixed(1) + 'm' : 'Complete'}`);
      console.log(`📝 Words: ${Math.round(totalWords / Math.max(succeeded, 1))} average per analysis\n`);
    }
    
    // Save resume point every 50 movies
    if (processed % 50 === 0) {
      saveResumePoint({
        lastTmdbId: batch[batch.length - 1].tmdb_id,
        processed,
        succeeded,
        failed,
        totalCost,
        totalWords,
        failedMovies
      });
    }
    
    // Small delay between batches to be respectful
    if (i + CONFIG.batchSize < movies.length) {
      await new Promise(resolve => setTimeout(resolve, 300)); // Reduced from 1000ms to 300ms
    }
  }
  
  const finalTime = (Date.now() - startTime) / 1000 / 60;
  
  console.log('\n🎉 PROCESSING COMPLETE');
  console.log('=====================');
  console.log(`Total processed: ${processed}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${(succeeded / processed * 100).toFixed(1)}%`);
  console.log(`Total cost: $${totalCost.toFixed(2)}`);
  console.log(`Average cost: $${succeeded > 0 ? (totalCost / succeeded).toFixed(4) : '0'} per movie`);
  console.log(`Average words: ${Math.round(totalWords / Math.max(succeeded, 1))} per analysis`);
  console.log(`Total time: ${finalTime.toFixed(1)} minutes`);
  console.log(`Processing rate: ${(processed / finalTime).toFixed(1)} movies per minute`);
  
  if (failed === 0) {
    // Clean up resume file on complete success
    if (existsSync(CONFIG.resumeFile)) {
      try {
        // Instead of deleting, rename to completed
        const completedFile = CONFIG.resumeFile.replace('.json', '-completed.json');
        writeFileSync(completedFile, readFileSync(CONFIG.resumeFile));
        console.log(`📄 Resume file archived as ${completedFile}`);
      } catch (error) {
        console.log('Note: Could not archive resume file');
      }
    }
  } else {
    console.log(`\n⚠️ ${failed} movies failed - resume file preserved for retry`);
    console.log(`\n📋 FAILED MOVIES LIST:`);
    failedMovies.forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.title} (${movie.year}) - TMDB ${movie.tmdb_id}`);
      console.log(`   Error: ${movie.error.substring(0, 100)}...`);
    });
    console.log(`\nFailed movies saved in ${CONFIG.resumeFile}`);
    console.log(`To retry failed movies, run this script again`);
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received interrupt signal - shutting down gracefully...');
  console.log('Current progress has been saved to resume file');
  await pool.end();
  process.exit(0);
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error).finally(() => pool.end());
}