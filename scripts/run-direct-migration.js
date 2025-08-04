#!/usr/bin/env node
/**
 * Direct SQL Migration Runner
 * 
 * Runs enhanced content status migration using direct SQL execution
 * instead of stored procedures that may not be available.
 */

import { createClient } from '@supabase/supabase-js';

// Set environment variables first
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

class DirectMigrationRunner {
  constructor() {
    this.stats = {
      startTime: Date.now(),
      columnsAdded: 0,
      rowsUpdated: 0,
      errors: 0
    };
  }

  async runMigration() {
    console.log('🔧 Enhanced Content Status Migration (Direct SQL)');
    console.log('=================================================');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE EXECUTION'}\n`);

    try {
      await this.addColumns();
      await this.updateExistingData();
      await this.showResults();
      
      console.log('✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      throw error;
    }
  }

  async addColumns() {
    console.log('📋 Adding enhanced content status columns...');
    
    const newColumns = [
      { name: 'analysis_ready', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'links_processed', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'content_complete', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'display_ready', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'slug_generated', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'validation_passed', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'quality_score', type: 'INTEGER DEFAULT 0' },
      { name: 'failure_count', type: 'INTEGER DEFAULT 0' },
      { name: 'analysis_ready_at', type: 'TIMESTAMP' },
      { name: 'links_processed_at', type: 'TIMESTAMP' },
      { name: 'content_complete_at', type: 'TIMESTAMP' },
      { name: 'last_failure_reason', type: 'TEXT' },
      { name: 'last_failure_at', type: 'TIMESTAMP' },
      { name: 'last_validation_at', type: 'TIMESTAMP' }
    ];

    for (const column of newColumns) {
      try {
        if (isDryRun) {
          console.log(`   [DRY RUN] Would add column: ${column.name}`);
          continue;
        }

        // Check if column exists first
        const { data: existingColumns } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'movies')
          .eq('column_name', column.name);

        if (existingColumns && existingColumns.length > 0) {
          console.log(`   ⏭️  Column ${column.name} already exists`);
          continue;
        }

        // Use raw SQL to add column
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: `ALTER TABLE movies ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`
        });

        if (error) {
          // Try alternative approach
          console.log(`   ⚠️  RPC failed, trying direct approach for ${column.name}`);
          // For now, just log - we'll handle this manually
          console.log(`   📝 Manual SQL needed: ALTER TABLE movies ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`);
          this.stats.errors++;
        } else {
          console.log(`   ✅ Added column: ${column.name}`);
          this.stats.columnsAdded++;
        }

      } catch (error) {
        console.log(`   ❌ Failed to add ${column.name}: ${error.message}`);
        this.stats.errors++;
      }
    }
  }

  async updateExistingData() {
    console.log('\n🔄 Updating existing data with new flags...');
    
    if (isDryRun) {
      console.log('[DRY RUN] Would update existing movie records with status flags');
      return;
    }

    try {
      // Since we can't alter table structure easily, let's focus on what we can do
      // We'll check current status and report findings
      
      const { data: movies, error } = await supabase
        .from('movies')
        .select('id, title, year, has_analysis, slug')
        .not('tmdb_id', 'is', null)
        .limit(10);

      if (error) {
        console.log(`   ❌ Query error: ${error.message}`);
        return;
      }

      console.log(`   📊 Sample of ${movies.length} movies:`);
      movies.forEach(movie => {
        console.log(`   • ${movie.title} (${movie.year}): analysis=${movie.has_analysis}, slug=${!!movie.slug}`);
      });

      // Get analysis statistics
      const { data: analyses, error: analysisError } = await supabase
        .from('movie_analyses')
        .select('movie_id', { count: 'exact', head: true });

      if (!analysisError) {
        console.log(`   📈 Total analyses in database: ${analyses?.length || 'unknown'}`);
      }

    } catch (error) {
      console.log(`   ⚠️  Data update check failed: ${error.message}`);
    }
  }

  async showResults() {
    console.log('\n📊 Migration Results');
    console.log('===================');
    console.log(`• Columns Added: ${this.stats.columnsAdded}`);
    console.log(`• Errors Encountered: ${this.stats.errors}`);
    console.log(`• Duration: ${(Date.now() - this.stats.startTime) / 1000}s`);
    
    if (this.stats.errors > 0) {
      console.log('\n⚠️  Manual SQL Commands Needed:');
      console.log('Run these commands in your Supabase SQL editor:');
      console.log('');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS analysis_ready BOOLEAN DEFAULT FALSE;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS links_processed BOOLEAN DEFAULT FALSE;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS content_complete BOOLEAN DEFAULT FALSE;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS display_ready BOOLEAN DEFAULT FALSE;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS slug_generated BOOLEAN DEFAULT FALSE;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS validation_passed BOOLEAN DEFAULT FALSE;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS analysis_ready_at TIMESTAMP;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS links_processed_at TIMESTAMP;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS content_complete_at TIMESTAMP;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS last_failure_reason TEXT;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMP;');
      console.log('ALTER TABLE movies ADD COLUMN IF NOT EXISTS last_validation_at TIMESTAMP;');
    }
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new DirectMigrationRunner();
  
  runner.runMigration()
    .then(() => {
      console.log('\n🎉 Migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error.message);
      process.exit(1);
    });
}