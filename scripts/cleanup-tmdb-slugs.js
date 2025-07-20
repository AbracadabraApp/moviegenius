#!/usr/bin/env node
/**
 * TMDB Slug Cleanup Script
 *
 * Removes TMDB overview text, plot summaries, and other low-quality
 * slug data from the movies table. Preserves only Claude-generated
 * taglines that meet quality standards.
 *
 * Run with: node scripts/cleanup-tmdb-slugs.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Patterns that indicate TMDB/low-quality content
const BAD_SLUG_PATTERNS = [
  'directed by',
  'starring',
  'follows',
  'tells the story',
  'Plot:',
  'Overview:',
  'Synopsis:',
  'In this',
  'The story of',
  'A tale of',
  'Set in',
  'Based on',
  'When a',
  'After a',
  'During the',
  'chronicles the',
  'explores the',
  'centers on',
  'focuses on',
];

async function cleanupTMDBSlugs() {
  console.log('🧹 Starting TMDB slug cleanup...');

  try {
    // Step 1: Get all movies with slugs
    console.log('📊 Analyzing existing slugs...');
    const { data: movies, error: fetchError } = await supabase
      .from('movies')
      .select('id, title, year, slug')
      .not('slug', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${movies.length} movies with slugs`);

    // Step 2: Identify bad slugs
    const badSlugs = [];
    const goodSlugs = [];

    movies.forEach(movie => {
      const slug = movie.slug;

      // Check for bad patterns
      const isBadSlug =
        BAD_SLUG_PATTERNS.some(pattern => slug.toLowerCase().includes(pattern.toLowerCase())) ||
        slug.length > 200 || // Too long (TMDB overview)
        slug.length < 5 || // Too short
        slug === slug.toLowerCase() || // All lowercase (likely auto-generated)
        slug.includes('-') || // URL-style formatting
        slug.split(' ').length > 15; // Too many words (likely plot summary)

      if (isBadSlug) {
        badSlugs.push({
          id: movie.id,
          title: movie.title,
          year: movie.year,
          badSlug: slug.substring(0, 100) + (slug.length > 100 ? '...' : ''),
        });
      } else {
        goodSlugs.push(movie);
      }
    });

    console.log(`📈 Analysis complete:`);
    console.log(`  ✅ Good slugs: ${goodSlugs.length}`);
    console.log(`  ❌ Bad slugs: ${badSlugs.length}`);

    // Step 3: Show examples of what will be cleaned
    if (badSlugs.length > 0) {
      console.log('\n🔍 Examples of bad slugs to be cleaned:');
      badSlugs.slice(0, 5).forEach(movie => {
        console.log(`  "${movie.title}" (${movie.year}): "${movie.badSlug}"`);
      });
    }

    // Step 4: Confirm cleanup
    if (badSlugs.length === 0) {
      console.log('🎉 No bad slugs found! Database is clean.');
      return;
    }

    console.log(`\n⚠️  About to clean ${badSlugs.length} bad slugs...`);

    // In production, you might want to add a confirmation prompt here
    // For now, proceeding automatically

    // Step 5: Clean bad slugs in batches
    const BATCH_SIZE = 50;
    let cleaned = 0;

    for (let i = 0; i < badSlugs.length; i += BATCH_SIZE) {
      const batch = badSlugs.slice(i, i + BATCH_SIZE);
      const movieIds = batch.map(movie => movie.id);

      console.log(
        `🧹 Cleaning batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(badSlugs.length / BATCH_SIZE)}...`
      );

      const { error: updateError } = await supabase
        .from('movies')
        .update({
          slug: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', movieIds);

      if (updateError) {
        console.error(`❌ Error cleaning batch: ${updateError.message}`);
        continue;
      }

      cleaned += batch.length;
      console.log(`  ✅ Cleaned ${batch.length} slugs (${cleaned}/${badSlugs.length} total)`);
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`📊 Final stats:`);
    console.log(`  ✅ Good Claude slugs preserved: ${goodSlugs.length}`);
    console.log(`  🧹 Bad TMDB slugs cleaned: ${cleaned}`);
    console.log(`  📝 Total movies ready for Claude generation: ${cleaned}`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTMDBSlugs().then(() => {
  console.log('✨ Slug cleanup script completed successfully');
  process.exit(0);
});
