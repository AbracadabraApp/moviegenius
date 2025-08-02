#!/usr/bin/env node

/**
 * Archive & Replace Migration Script
 * 
 * Phase 1: Archive ALL existing analyses (they're legacy format)
 * Phase 2: Generate 1000 fresh JSON analyses for testing
 * Phase 3: Scale to full 17K after validation
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class ArchiveMigrator {
  constructor() {
    this.startTime = Date.now();
    this.stats = {
      archived: 0,
      errors: 0
    };
  }

  async run() {
    console.log('🗄️  ARCHIVE & REPLACE MIGRATION');
    console.log('================================');
    console.log('Phase 1: Archive ALL existing analyses');
    console.log('Phase 2: Ready for 1000 fresh JSON analyses');
    
    try {
      await this.validateEnvironment();
      await this.createArchiveTable();
      await this.archiveExistingAnalyses();
      await this.clearMainTable();
      await this.validateMigration();
      
      this.printSummary();
      this.printNextSteps();
      
    } catch (error) {
      console.error('💥 MIGRATION FAILED:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('\n📡 Validating environment...');
    
    // Test database connection
    const { error } = await supabase.from('movies').select('count').limit(1);
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // Check if movie_analyses table exists
    const { data: tables } = await supabase.rpc('get_table_names');
    if (!tables?.includes('movie_analyses')) {
      throw new Error('movie_analyses table not found');
    }
    
    console.log('✅ Environment validated');
  }

  async createArchiveTable() {
    console.log('\n📋 Creating archive table...');
    
    // Create legacy archive table with same structure + migration metadata
    const createArchiveSQL = `
      CREATE TABLE IF NOT EXISTS movie_analyses_legacy (
        id BIGINT,
        movie_id BIGINT,
        analysis_type TEXT,
        claude_response JSONB,
        query_text TEXT,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        -- Migration metadata
        archived_at TIMESTAMPTZ DEFAULT NOW(),
        migration_version TEXT DEFAULT '2025-07-28-json-migration',
        original_format TEXT DEFAULT 'text'
      );
      
      -- Index for performance  
      CREATE INDEX IF NOT EXISTS idx_movie_analyses_legacy_movie_id 
      ON movie_analyses_legacy(movie_id);
      
      CREATE INDEX IF NOT EXISTS idx_movie_analyses_legacy_archived_at 
      ON movie_analyses_legacy(archived_at);
    `;

    const { error } = await supabase.rpc('execute_sql', { sql: createArchiveSQL });
    if (error) {
      throw new Error(`Failed to create archive table: ${error.message}`);
    }
    
    console.log('✅ Archive table ready: movie_analyses_legacy');
  }

  async archiveExistingAnalyses() {
    console.log('\n📦 Archiving existing analyses...');
    
    // Get count of existing analyses
    const { count: totalCount, error: countError } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw new Error(`Failed to count analyses: ${countError.message}`);
    }
    
    console.log(`   Found ${totalCount} analyses to archive`);
    
    if (totalCount === 0) {
      console.log('✅ No analyses to archive');
      return;
    }
    
    // Archive in batches to avoid memory issues
    const batchSize = 1000;
    let offset = 0;
    let totalArchived = 0;
    
    while (offset < totalCount) {
      console.log(`   Archiving batch ${Math.floor(offset/batchSize) + 1}/${Math.ceil(totalCount/batchSize)}...`);
      
      // Get batch of analyses
      const { data: batch, error: fetchError } = await supabase
        .from('movie_analyses')
        .select('*')
        .range(offset, offset + batchSize - 1)
        .order('id');
      
      if (fetchError) {
        throw new Error(`Failed to fetch batch: ${fetchError.message}`);
      }
      
      if (batch && batch.length > 0) {
        // Insert into archive table
        const archiveData = batch.map(analysis => ({
          id: analysis.id,
          movie_id: analysis.movie_id,
          analysis_type: analysis.analysis_type,
          claude_response: analysis.claude_response,
          query_text: analysis.query_text,
          created_at: analysis.created_at,
          updated_at: analysis.updated_at
        }));
        
        const { error: insertError } = await supabase
          .from('movie_analyses_legacy')
          .insert(archiveData);
        
        if (insertError) {
          throw new Error(`Failed to archive batch: ${insertError.message}`);
        }
        
        totalArchived += batch.length;
        console.log(`   ✅ Archived ${totalArchived}/${totalCount} analyses`);
      }
      
      offset += batchSize;
    }
    
    this.stats.archived = totalArchived;
    console.log(`✅ Successfully archived ${totalArchived} analyses`);
  }

  async clearMainTable() {
    console.log('\n🧹 Clearing main analysis table...');
    
    // Delete all analyses from main table (they're now safely archived)
    const { error } = await supabase
      .from('movie_analyses')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (error) {
      throw new Error(`Failed to clear main table: ${error.message}`);
    }
    
    console.log('✅ Main table cleared - ready for fresh JSON analyses');
  }

  async validateMigration() {
    console.log('\n🔍 Validating migration...');
    
    // Check archive table has data
    const { count: archivedCount, error: archiveError } = await supabase
      .from('movie_analyses_legacy')
      .select('*', { count: 'exact', head: true });
    
    if (archiveError) {
      throw new Error(`Failed to validate archive: ${archiveError.message}`);
    }
    
    // Check main table is empty
    const { count: mainCount, error: mainError } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true });
    
    if (mainError) {
      throw new Error(`Failed to validate main table: ${mainError.message}`);
    }
    
    console.log(`   📋 Archive table: ${archivedCount} analyses`);
    console.log(`   📋 Main table: ${mainCount} analyses`);
    
    if (archivedCount !== this.stats.archived) {
      throw new Error(`Archive validation failed: expected ${this.stats.archived}, found ${archivedCount}`);
    }
    
    if (mainCount !== 0) {
      throw new Error(`Main table should be empty, found ${mainCount} analyses`);
    }
    
    console.log('✅ Migration validated successfully');
  }

  printSummary() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    
    console.log('\n🎯 MIGRATION SUMMARY');
    console.log('===================');
    console.log(`✅ Analyses archived: ${this.stats.archived}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`⏱️  Total time: ${elapsed.toFixed(1)}s`);
    console.log('✅ Ready for fresh JSON generation');
  }

  printNextSteps() {
    console.log('\n📋 NEXT STEPS');
    console.log('=============');
    console.log('1. Test with 1000 fresh JSON analyses:');
    console.log('   npm run batch:test -- --count 1000');
    console.log('');
    console.log('2. Validate the JSON analyses work in UI:');
    console.log('   npm run test:quick');
    console.log('');
    console.log('3. If successful, scale to full 17K:');
    console.log('   npm run batch:production');
    console.log('');
    console.log('📁 Legacy analyses safely stored in: movie_analyses_legacy');
    console.log('💰 Estimated cost for 1000 test: ~$18 (with batch API)');
    console.log('💰 Estimated cost for full 17K: ~$306 (with batch API)');
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new ArchiveMigrator();
  migrator.run().catch(error => {
    console.error('💥 MIGRATION FAILED:', error.message);
    process.exit(1);
  });
}

export default ArchiveMigrator;