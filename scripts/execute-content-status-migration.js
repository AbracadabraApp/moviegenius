#!/usr/bin/env node
/**
 * Execute Enhanced Content Status Migration
 * 
 * Runs the comprehensive content status tracking migration and provides
 * detailed reporting on the current state of movie content.
 * 
 * Features:
 * - Safely adds new content status flags
 * - Syncs existing data with new tracking system
 * - Creates performance indexes for status queries
 * - Provides comprehensive status reporting
 * - Validates migration success
 * 
 * Usage: node scripts/execute-content-status-migration.js [--dry-run] [--verify-only]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables first
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

// Supabase client with service role for DDL operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const verifyOnly = args.includes('--verify-only');

class ContentStatusMigrationExecutor {
  constructor() {
    this.migrationFile = join(__dirname, '../sql/enhanced_content_status_migration.sql');
    this.stats = {
      startTime: Date.now(),
      phasesExecuted: 0,
      errorsEncountered: 0,
      queriesExecuted: 0,
    };
  }

  async executeMigration() {
    console.log('🚀 Enhanced Content Status Migration');
    console.log('=====================================');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE EXECUTION'}`);
    console.log(`Verify Only: ${verifyOnly ? 'YES' : 'NO'}`);
    console.log('');

    try {
      if (verifyOnly) {
        return await this.verifyMigration();
      }

      // Load migration SQL
      const migrationSQL = readFileSync(this.migrationFile, 'utf8');
      const phases = this.extractPhases(migrationSQL);

      console.log(`📝 Found ${phases.length} migration phases to execute\n`);

      // Execute each phase
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        console.log(`🔧 Executing ${phase.name}...`);
        
        if (!isDryRun) {
          await this.executePhase(phase);
        } else {
          console.log(`[DRY RUN] Would execute ${phase.queries.length} queries`);
        }
        
        this.stats.phasesExecuted++;
        console.log(`✅ ${phase.name} complete\n`);
      }

      // Verify migration success
      await this.verifyMigration();

      console.log('🎉 Content Status Migration Complete!');
      this.printExecutionSummary();

    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      this.stats.errorsEncountered++;
      throw error;
    }
  }

  extractPhases(migrationSQL) {
    const phases = [];
    const phaseRegex = /-- PHASE \d+: (.+)\n-- =+\n([\s\S]*?)(?=-- PHASE \d+:|-- =+\n-- VERIFICATION|$)/g;
    
    let match;
    while ((match = phaseRegex.exec(migrationSQL)) !== null) {
      const [, name, content] = match;
      const queries = content
        .split(';')
        .map(q => q.trim())
        .filter(q => q && !q.startsWith('--'));

      phases.push({
        name: name.trim(),
        content: content.trim(),
        queries
      });
    }

    return phases;
  }

  async executePhase(phase) {
    for (const query of phase.queries) {
      if (!query.trim()) continue;

      console.log(`  • Executing: ${query.substring(0, 60)}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: query });
        
        if (error) {
          // Some errors are expected (e.g., column already exists)
          if (this.isExpectedError(error)) {
            console.log(`    ⚠️  Expected: ${error.message}`);
          } else {
            throw error;
          }
        } else {
          console.log(`    ✅ Success`);
        }
        
        this.stats.queriesExecuted++;
      } catch (execError) {
        console.error(`    ❌ Error: ${execError.message}`);
        this.stats.errorsEncountered++;
        
        // Continue with non-critical errors
        if (!this.isCriticalError(execError)) {
          console.log(`    ⏭️  Continuing with non-critical error`);
          continue;
        }
        throw execError;
      }
    }
  }

  isExpectedError(error) {
    const expectedPatterns = [
      /column .+ already exists/i,
      /relation .+ already exists/i,
      /index .+ already exists/i,
      /function .+ already exists/i
    ];
    
    return expectedPatterns.some(pattern => pattern.test(error.message));
  }

  isCriticalError(error) {
    const criticalPatterns = [
      /permission denied/i,
      /database .+ does not exist/i,
      /syntax error/i
    ];
    
    return criticalPatterns.some(pattern => pattern.test(error.message));
  }

  async verifyMigration() {
    console.log('🔍 Verifying Migration Results');
    console.log('==============================\n');

    try {
      // Check if new columns exist
      await this.verifyColumnsExist();
      
      // Check content status dashboard
      await this.verifyContentStatusDashboard();
      
      // Check content gap views
      await this.verifyContentGapViews();
      
      // Verify data consistency
      await this.verifyDataConsistency();

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      throw error;
    }
  }

  async verifyColumnsExist() {
    console.log('📋 Checking new content status columns...');
    
    const expectedColumns = [
      'analysis_ready', 'links_processed', 'content_complete', 
      'display_ready', 'slug_generated', 'validation_passed',
      'quality_score', 'failure_count'
    ];

    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'movies')
      .in('column_name', expectedColumns);

    if (error) throw error;

    const existingColumns = columns.map(c => c.column_name);
    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));

    console.log(`  ✅ Found ${existingColumns.length}/${expectedColumns.length} expected columns`);
    
    if (missingColumns.length > 0) {
      console.log(`  ⚠️  Missing columns: ${missingColumns.join(', ')}`);
    }
  }

  async verifyContentStatusDashboard() {
    console.log('📊 Verifying content status dashboard...');
    
    const { data: dashboard, error } = await supabase
      .from('content_status_dashboard')
      .select('*')
      .single();

    if (error) {
      console.log(`  ❌ Dashboard view error: ${error.message}`);
      return;
    }

    console.log('  📈 Content Status Summary:');
    console.log(`    • Total Movies: ${dashboard.total_items}`);
    console.log(`    • Analysis Complete: ${dashboard.analysis_complete}`);
    console.log(`    • Links Processed: ${dashboard.links_processed}`);
    console.log(`    • Slugs Generated: ${dashboard.slugs_generated}`);
    console.log(`    • Content Complete: ${dashboard.content_complete}`);
    console.log(`    • Display Ready: ${dashboard.display_ready}`);
    console.log(`    • Completion Rate: ${dashboard.completion_percentage}%`);
    console.log(`    • Avg Quality Score: ${dashboard.avg_quality_score}`);
    console.log(`    • Failed Items: ${dashboard.failed_items}\n`);
  }

  async verifyContentGapViews() {
    console.log('🔍 Checking content gap analysis views...');
    
    const views = [
      'movies_needing_analysis',
      'movies_needing_links', 
      'movies_needing_slugs',
      'movies_needing_review'
    ];

    for (const viewName of views) {
      try {
        const { data, error } = await supabase
          .from(viewName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`    ❌ ${viewName}: ${error.message}`);
        } else {
          console.log(`    ✅ ${viewName}: ${data?.length || 0} items`);
        }
      } catch (e) {
        console.log(`    ❌ ${viewName}: Failed to query`);
      }
    }
    console.log('');
  }

  async verifyDataConsistency() {
    console.log('🔎 Verifying data consistency...');

    // Check for logical inconsistencies
    const { data: inconsistencies, error } = await supabase
      .from('movies')
      .select('id, title, analysis_ready, links_processed, content_complete')
      .eq('content_complete', true)
      .or('analysis_ready.eq.false,links_processed.eq.false');

    if (error) {
      console.log(`  ❌ Consistency check failed: ${error.message}`);
      return;
    }

    if (inconsistencies.length > 0) {
      console.log(`  ⚠️  Found ${inconsistencies.length} data inconsistencies`);
      console.log('    (Movies marked complete but missing required content)');
    } else {
      console.log('  ✅ Data consistency verified');
    }
    console.log('');
  }

  printExecutionSummary() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    
    console.log('\n📊 Migration Execution Summary');
    console.log('===============================');
    console.log(`• Phases Executed: ${this.stats.phasesExecuted}`);
    console.log(`• Queries Executed: ${this.stats.queriesExecuted}`);
    console.log(`• Errors Encountered: ${this.stats.errorsEncountered}`);
    console.log(`• Execution Time: ${elapsed.toFixed(1)} seconds`);
    console.log(`• Status: ${this.stats.errorsEncountered === 0 ? '✅ SUCCESS' : '⚠️ COMPLETED WITH WARNINGS'}`);
  }
}

// Execute migration
if (import.meta.url === `file://${process.argv[1]}`) {
  const executor = new ContentStatusMigrationExecutor();
  
  executor.executeMigration()
    .then(() => {
      console.log('\n🎉 Content status migration completed successfully!');
      console.log('\n📝 Next Steps:');
      console.log('• Use content_status_dashboard view for reporting');
      console.log('• Query gap analysis views to identify work needed');
      console.log('• Update batch processing scripts to use new flags');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration execution failed:', error.message);
      process.exit(1);
    });
}

export { ContentStatusMigrationExecutor };