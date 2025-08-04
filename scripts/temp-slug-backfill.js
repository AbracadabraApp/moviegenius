#!/usr/bin/env node
/**
 * Temporary Slug Backfill Script
 * 
 * Generates slugs for movies missing them (works without slug_complete column).
 * This version will generate slugs for the ~53.5% missing slugs.
 * 
 * Usage: node scripts/temp-slug-backfill.js [--dry-run] [--limit=100]
 */

import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

console.log('🚀 Temporary Slug Backfill Script');
console.log('===================================');
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
console.log(`Limit: ${limit} movies`);
console.log('');

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
  console.log('📊 Finding movies needing slugs...');
  
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title, year, tmdb_id, slug')
    .or('slug.is.null,slug.eq.')
    .not('tmdb_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get movies needing slugs: ${error.message}`);
  }

  console.log(`✅ Found ${movies?.length || 0} movies needing slugs`);
  return movies || [];
}

async function updateMovieSlug(movieId, slug, title) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would update "${title}" with slug: "${slug}"`);
    return true;
  }

  try {
    const { error } = await supabase
      .from('movies')
      .update({ 
        slug: slug,
        updated_at: new Date().toISOString()
      })
      .eq('id', movieId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to update movie ${movieId}:`, error.message);
    return false;
  }
}

async function processMovies() {
  try {
    const movies = await getMoviesNeedingSlugs();
    
    if (movies.length === 0) {
      console.log('🎉 No movies need slug generation!');
      return;
    }

    console.log(`\n🔄 Processing ${movies.length} movies...\n`);

    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const movie of movies) {
      processed++;
      
      console.log(`🎬 [${processed}/${movies.length}] ${movie.title} (${movie.year})`);
      
      try {
        const slug = await generateSlugForMovie(movie.title, movie.year);
        const updated = await updateMovieSlug(movie.id, slug, movie.title);
        
        if (updated) {
          successful++;
          console.log(`   ✅ Generated: "${slug}"`);
        } else {
          failed++;
          console.log(`   ❌ Failed to save slug`);
        }
      } catch (error) {
        failed++;
        console.log(`   ❌ Error: ${error.message}`);
      }

      // Rate limiting
      if (processed < movies.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n📊 Processing Complete:');
    console.log(`  • Processed: ${processed}`);
    console.log(`  • Successful: ${successful}`);
    console.log(`  • Failed: ${failed}`);
    console.log(`  • Success rate: ${((successful / processed) * 100).toFixed(1)}%`);

    if (!isDryRun) {
      console.log('\n🎯 Next steps:');
      console.log('  1. Add slug_complete column to database (run SQL manually)');
      console.log('  2. Mark these processed slugs as complete');
      console.log('  3. Run full backfill with completion tracking');
    }

  } catch (error) {
    console.error('💥 Processing failed:', error.message);
    throw error;
  }
}

// Run the backfill
processMovies()
  .then(() => {
    console.log('\n✅ Temporary slug backfill completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error.message);
    process.exit(1);
  });