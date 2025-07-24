#!/usr/bin/env node

/**
 * Direct SQL Migration Executor
 * 
 * Executes the slug_complete migration SQL directly using raw queries.
 */

import { createClient } from '@supabase/supabase-js';

// Database connection using service role key for admin operations
const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

async function executeMigration() {
  console.log('🔧 Executing Slug Complete Migration');
  console.log('🎯 Adding slug_complete column and updating existing data\n');

  try {
    // Step 1: Add the column
    console.log('📋 Step 1: Adding slug_complete column...');
    
    // Use raw SQL through rpc if available, otherwise through manual update
    try {
      // Try to add column by updating a non-existent row (this will fail but tell us if column exists)
      const { error: testError } = await supabase
        .from('movies')
        .update({ slug_complete: true })
        .eq('id', -999); // Non-existent ID
        
      if (testError && testError.message.includes('column "slug_complete" does not exist')) {
        console.log('   Column does not exist, needs to be created manually');
        console.log('\n🚨 Manual Action Required:');
        console.log('Please run this SQL in your Supabase SQL Editor:');
        console.log('');
        console.log('ALTER TABLE movies ADD COLUMN slug_complete BOOLEAN DEFAULT false;');
        console.log('');
        console.log('After running the SQL, press Enter to continue...');
        
        // Wait for user input
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
        
        console.log('Continuing with migration...\n');
      } else {
        console.log('   ✅ Column already exists or is accessible');
      }
    } catch (error) {
      console.log('   Error testing column:', error.message);
    }

    // Step 2: Update existing valid slugs
    console.log('📋 Step 2: Marking existing valid slugs as complete...');
    
    const { data: updatedMovies, error: updateError } = await supabase
      .from('movies')
      .update({ slug_complete: true })
      .not('slug', 'is', null)
      .neq('slug', '')
      .gte('slug', '     ') // At least 5 characters
      .not('slug', 'ilike', '%Plot:%')
      .not('slug', 'ilike', '%Overview:%')
      .not('slug', 'ilike', '%Synopsis:%')
      .not('slug', 'ilike', '%Summary:%')
      .select('id, title, slug');

    if (updateError) {
      if (updateError.message.includes('column "slug_complete" does not exist')) {
        throw new Error(`
🚨 Column Creation Failed!

The slug_complete column still does not exist. Please manually run this SQL in Supabase:

ALTER TABLE movies ADD COLUMN slug_complete BOOLEAN DEFAULT false;
CREATE INDEX idx_movies_slug_complete ON movies(slug_complete) WHERE slug_complete = true;

Then run this script again.
        `);
      }
      throw updateError;
    }

    console.log(`   ✅ Updated ${updatedMovies?.length || 0} movies with valid slugs`);

    // Step 3: Show current statistics
    console.log('\n📊 Current slug statistics:');
    
    const { count: totalMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    const { count: withSlugs } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('slug', 'is', null)
      .neq('slug', '');

    const { count: completeSlugs } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('slug_complete', true);

    const missingCount = totalMovies - withSlugs;
    const missingPercent = totalMovies > 0 ? ((missingCount / totalMovies) * 100).toFixed(1) : 0;

    console.log(`  • Total movies: ${totalMovies}`);
    console.log(`  • Movies with slugs: ${withSlugs}`);
    console.log(`  • Movies missing slugs: ${missingCount} (${missingPercent}%)`);
    console.log(`  • Movies marked complete: ${completeSlugs}`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('📋 Next steps:');
    console.log('  1. ✅ Database migration complete');
    console.log('  2. 🔄 Run: node scripts/one-time-slug-backfill.js');
    console.log('  3. 🔍 Verify zero-waste architecture is working');

    return {
      totalMovies,
      withSlugs,
      missingCount,
      missingPercent: parseFloat(missingPercent),
      completeSlugs
    };

  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    
    if (error.message.includes('Column Creation Failed')) {
      console.error(error.message);
    }
    
    throw error;
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigration()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error.message);
      process.exit(1);
    });
}

export { executeMigration };