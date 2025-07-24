#!/usr/bin/env node

/**
 * Slug Migration Runner - Execute Database Schema Changes
 * 
 * Runs the slug_complete column migration and updates existing valid slugs.
 * This is part of the zero-waste architecture implementation.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection
const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

class SlugMigrationRunner {
  constructor() {
    this.migrationFile = join(__dirname, 'migrations', 'add-slug-complete-column.sql');
  }

  async checkColumnExists() {
    console.log('🔍 Checking if slug_complete column already exists...');
    
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('slug_complete')
        .limit(1);

      if (error) {
        if (error.message.includes('column "slug_complete" does not exist')) {
          console.log('✅ Column does not exist, migration needed');
          return false;
        }
        throw error;
      }

      console.log('⚠️  Column already exists, checking if migration is complete...');
      return true;
    } catch (error) {
      console.error('❌ Error checking column existence:', error.message);
      throw error;
    }
  }

  async runMigrationDirectly() {
    console.log('🚀 Running migration via direct SQL execution...');
    
    try {
      // Step 1: Add column if it doesn't exist
      console.log('📋 Step 1: Adding slug_complete column...');
      
      const { error: addColumnError } = await supabase
        .rpc('exec', {
          sql: 'ALTER TABLE movies ADD COLUMN IF NOT EXISTS slug_complete BOOLEAN DEFAULT false;'
        });

      if (addColumnError) {
        // Try alternative approach for Supabase
        console.log('   Trying alternative column addition...');
        
        // Test if column exists by attempting to select it
        const { error: testError } = await supabase
          .from('movies')
          .select('slug_complete')
          .limit(1);
          
        if (testError && testError.message.includes('column "slug_complete" does not exist')) {
          throw new Error('Column creation failed. Manual intervention required.');
        }
        
        console.log('   ✅ Column already exists');
      } else {
        console.log('   ✅ Column added successfully');
      }

      // Step 2: Update existing valid slugs
      console.log('📋 Step 2: Marking existing valid slugs as complete...');
      
      const { data: updatedMovies, error: updateError } = await supabase
        .from('movies')
        .update({ slug_complete: true })
        .not('slug', 'is', null)
        .neq('slug', '')
        .not('slug', 'ilike', '%Plot:%')
        .not('slug', 'ilike', '%Overview:%')
        .not('slug', 'ilike', '%Synopsis:%')
        .not('slug', 'ilike', '%Summary:%')
        .select('id');

      if (updateError) {
        throw updateError;
      }

      console.log(`   ✅ Updated ${updatedMovies?.length || 0} movies with valid slugs`);

      // Step 3: Create index for performance
      console.log('📋 Step 3: Creating performance index...');
      
      const { error: indexError } = await supabase
        .rpc('exec', {
          sql: 'CREATE INDEX IF NOT EXISTS idx_movies_slug_complete ON movies(slug_complete) WHERE slug_complete = true;'
        });

      if (indexError) {
        console.log('   ⚠️  Index creation failed (may require manual creation)');
      } else {
        console.log('   ✅ Performance index created');
      }

      console.log('\n🎉 Migration completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async runMigrationManual() {
    console.log('🔧 Running manual migration steps...');
    
    try {
      // Check if we can update existing movies (which would indicate column exists)
      console.log('📋 Testing column existence and updating valid slugs...');
      
      const { data: testUpdate, error: testError } = await supabase
        .from('movies')
        .update({ slug_complete: true })
        .not('slug', 'is', null)
        .neq('slug', '')
        .not('slug', 'ilike', '%Plot:%')
        .not('slug', 'ilike', '%Overview:%')
        .not('slug', 'ilike', '%Synopsis:%')
        .not('slug', 'ilike', '%Summary:%')
        .limit(5)
        .select('id, title, slug');

      if (testError) {
        if (testError.message.includes('column "slug_complete" does not exist')) {
          throw new Error(`
🚨 Database Migration Required!

The slug_complete column does not exist in the movies table.
Please run this SQL manually in your Supabase dashboard:

ALTER TABLE movies ADD COLUMN slug_complete BOOLEAN DEFAULT false;
CREATE INDEX idx_movies_slug_complete ON movies(slug_complete) WHERE slug_complete = true;

Then run this script again.
          `);
        }
        throw testError;
      }

      console.log(`✅ Successfully updated ${testUpdate?.length || 0} test movies`);
      
      // If test worked, update all valid slugs
      console.log('📋 Updating all movies with valid slugs...');
      
      const { data: allUpdates, error: allError } = await supabase
        .from('movies')
        .update({ slug_complete: true })
        .not('slug', 'is', null)
        .neq('slug', '')
        .not('slug', 'ilike', '%Plot:%')
        .not('slug', 'ilike', '%Overview:%')
        .not('slug', 'ilike', '%Synopsis:%')
        .not('slug', 'ilike', '%Summary:%')
        .select('id');

      if (allError) {
        throw allError;
      }

      console.log(`✅ Updated ${allUpdates?.length || 0} movies with valid slugs`);
      console.log('\n🎉 Migration completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Manual migration failed:', error.message);
      throw error;
    }
  }

  async verifyMigration() {
    console.log('\n🔍 Verifying migration results...');

    try {
      // Check column exists
      const { data, error } = await supabase
        .from('movies')
        .select('slug_complete')
        .limit(1);

      if (error) {
        if (error.message.includes('column "slug_complete" does not exist')) {
          throw new Error('Column was not created successfully');
        }
        throw error;
      }
      
      console.log('✅ Column exists and is accessible');

      // Check if existing valid slugs were marked complete
      const { count: completedCount, error: completedError } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })
        .eq('slug_complete', true);

      if (completedError) {
        throw completedError;
      }

      console.log(`✅ Found ${completedCount || 0} movies with slug_complete=true`);

      console.log('\n🎯 Migration verification complete!');
      return true;
    } catch (error) {
      console.error('❌ Migration verification failed:', error.message);
      throw error;
    }
  }

  async printStats() {
    console.log('\n📊 Current slug statistics:');

    try {
      // Total movies
      const { count: totalMovies, error: totalError } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Movies with slugs
      const { count: withSlugs, error: slugError } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })
        .not('slug', 'is', null)
        .neq('slug', '');

      if (slugError) throw slugError;

      // Movies with slug_complete=true
      const { count: slugComplete, error: completeError } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })
        .eq('slug_complete', true);

      if (completeError) throw completeError;

      const missingSlugCount = totalMovies - withSlugs;
      const missingSlugPercent = totalMovies > 0 ? ((missingSlugCount / totalMovies) * 100).toFixed(1) : 0;

      console.log(`  • Total movies: ${totalMovies}`);
      console.log(`  • Movies with slugs: ${withSlugs}`);
      console.log(`  • Movies missing slugs: ${missingSlugCount} (${missingSlugPercent}%)`);
      console.log(`  • Movies marked slug_complete: ${slugComplete}`);

      return {
        totalMovies,
        withSlugs,
        missingSlugCount,
        missingSlugPercent: parseFloat(missingSlugPercent),
        slugComplete
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
      return null;
    }
  }

  async run() {
    console.log('🔧 Slug Database Migration Runner');
    console.log('🎯 Adding slug_complete column for zero-waste architecture\n');

    try {
      // Check if migration is needed
      const columnExists = await this.checkColumnExists();
      
      if (!columnExists) {
        // Try manual migration approach (more reliable for Supabase)
        await this.runMigrationManual();
      } else {
        console.log('✅ Column exists, updating existing valid slugs...');
        await this.runMigrationManual();
      }

      // Verify results
      await this.verifyMigration();

      // Print current stats
      const stats = await this.printStats();

      console.log('\n🎉 Migration runner completed successfully!');
      console.log('📋 Next steps:');
      console.log('  1. ✅ Migration complete');
      console.log('  2. 🔄 Run slug backfill: node scripts/one-time-slug-backfill.js');
      console.log('  3. 🔍 Verify zero-waste systems are respecting completion flags');

      return stats;
    } catch (error) {
      console.error('\n💥 Migration runner failed:', error.message);
      
      if (error.message.includes('column "slug_complete" does not exist')) {
        console.error('\n🔧 Manual Action Required:');
        console.error('Please run this SQL in your Supabase dashboard:');
        console.error('');
        console.error('ALTER TABLE movies ADD COLUMN slug_complete BOOLEAN DEFAULT false;');
        console.error('CREATE INDEX idx_movies_slug_complete ON movies(slug_complete) WHERE slug_complete = true;');
        console.error('');
        console.error('Then run this script again.');
      }
      
      process.exit(1);
    }
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new SlugMigrationRunner();
  runner.run();
}

export { SlugMigrationRunner };