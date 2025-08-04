#!/usr/bin/env node
/**
 * One-Time Slug Backfill Script
 * 
 * Generates slugs for the 53.5% of movies missing them, then marks them complete.
 * This is a ONE-TIME operation, not a continuous process.
 * 
 * After this runs, new movies get slugs via createBasicMovieEntry automatically.
 * 
 * Usage: node scripts/one-time-slug-backfill.js [--dry-run] [--batch-size=50]
 */

import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configuration
const CONFIG = {
  batchSize: 50,
  delayMs: 500, // Conservative rate limiting
  maxRetries: 3,
  dryRun: false,
};

async function generateSlugForMovie(title, year) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Create a movie poster tagline for "${title}" (${year}). 
Requirements:
- 5-50 characters
- Engaging and cinematic
- NO plot summaries or character names
- NO "Plot:", "Overview:", "Synopsis:" prefixes
- Movie poster marketing style
- Examples: "Evil never dies", "Love conquers all", "Justice has a price"

Movie: ${title} (${year})`
      }]
    });

    const slug = message.content[0].text.trim().replace(/"/g, '');
    
    // Validate the generated slug
    if (slug.length < 5 || slug.length > 50 || 
        slug.includes('Plot:') || slug.includes('Overview:') || 
        slug.includes('Synopsis:') || slug.includes('Summary:')) {
      return `${title} - A cinematic experience`;
    }
    
    return slug;
  } catch (error) {
    console.log(`⚠️ Slug generation failed for ${title}: ${error.message}`);
    return `${title} - A cinematic experience`;
  }
}

async function getMoviesNeedingSlugs() {
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title, year, tmdb_id')
    .or('slug.is.null,slug.eq.')
    .not('slug_complete', 'is', true)
    .not('tmdb_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`Failed to get movies needing slugs: ${error.message}`);
  }

  return movies || [];
}

async function updateMovieSlug(movieId, slug) {
  if (CONFIG.dryRun) {
    console.log(`[DRY RUN] Would update movie ${movieId} with slug: "${slug}"`);
    return true;
  }

  const { error } = await supabase
    .from('movies')
    .update({ 
      slug: slug,
      slug_complete: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', movieId);

  if (error) {
    console.error(`Failed to update movie ${movieId}:`, error.message);
    return false;
  }

  return true;
}

async function main() {
  console.log('🚀 One-Time Slug Backfill Script');
  console.log('===================================');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg === '--dry-run') {
      CONFIG.dryRun = true;
    } else if (arg.startsWith('--batch-size=')) {
      CONFIG.batchSize = parseInt(arg.split('=')[1]) || 50;
    }
  }

  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Get movies needing slugs
    console.log('📊 Finding movies needing slugs...');
    const movies = await getMoviesNeedingSlugs();
    
    if (movies.length === 0) {
      console.log('✅ All movies already have slugs! Backfill complete.');
      return;
    }

    console.log(`📋 Found ${movies.length} movies needing slugs`);
    console.log(`⚙️  Processing in batches of ${CONFIG.batchSize}\n`);

    let processed = 0;
    let successful = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < movies.length; i += CONFIG.batchSize) {
      const batch = movies.slice(i, i + CONFIG.batchSize);
      
      console.log(`🎬 Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(movies.length / CONFIG.batchSize)}`);
      
      for (const movie of batch) {
        processed++;
        
        try {
          const slug = await generateSlugForMovie(movie.title, movie.year);
          const success = await updateMovieSlug(movie.id, slug);
          
          if (success) {
            successful++;
            console.log(`✅ [${processed}/${movies.length}] "${movie.title}" (${movie.year}) → "${slug}"`);
          } else {
            failed++;
            console.log(`❌ [${processed}/${movies.length}] Failed to update "${movie.title}" (${movie.year})`);
          }
          
          // Rate limiting
          if (i + 1 < movies.length) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs));
          }
        } catch (error) {
          failed++;
          console.log(`❌ [${processed}/${movies.length}] Error processing "${movie.title}": ${error.message}`);
        }
      }
      
      // Progress update
      console.log(`📊 Batch complete. Success: ${successful}, Failed: ${failed}\n`);
    }

    // Final summary
    console.log('🎉 One-Time Slug Backfill Complete!');
    console.log('===================================');
    console.log(`Total processed: ${processed}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${((successful / processed) * 100).toFixed(1)}%`);
    
    if (!CONFIG.dryRun && successful > 0) {
      console.log(`\n✅ ${successful} movies now have slugs and are marked complete`);
      console.log('🔒 These slugs will never be regenerated (zero-waste protection)');
      console.log('🎯 New movies will get slugs automatically via createBasicMovieEntry');
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});