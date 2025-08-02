#!/usr/bin/env node

/**
 * Restore Test Analyses Utility
 * Restores analyses from backup file
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findLatestBackup() {
  const backupFiles = readdirSync('.')
    .filter(file => file.startsWith('test-analyses-backup-') && file.endsWith('.json'))
    .sort()
    .reverse();

  if (backupFiles.length === 0) {
    throw new Error('No backup files found. Run backup-test-analyses.js first.');
  }

  return backupFiles[0];
}

async function restoreTestAnalyses(backupFile) {
  console.log(`🔄 Starting restore from ${backupFile}...`);
  
  const backupData = JSON.parse(readFileSync(backupFile, 'utf8'));
  
  console.log(`📋 Backup contains: ${backupData.movies.length} movies, ${backupData.analyses.length} analyses`);
  console.log(`📅 Backup created: ${backupData.timestamp}`);

  if (backupData.analyses.length === 0) {
    console.log('✨ No analyses to restore (backup was empty)');
    return;
  }

  // First, delete any existing analyses for these movies
  const movieIds = backupData.movies.map(m => m.id);
  
  console.log('🗑️ Clearing existing analyses for test movies...');
  const { error: deleteError } = await supabase
    .from('movie_analyses')
    .delete()
    .in('movie_id', movieIds);

  if (deleteError) {
    throw new Error(`Error deleting existing analyses: ${deleteError.message}`);
  }

  // Restore analyses
  console.log(`💾 Restoring ${backupData.analyses.length} analyses...`);
  
  const { error: insertError } = await supabase
    .from('movie_analyses')
    .insert(backupData.analyses);

  if (insertError) {
    throw new Error(`Error restoring analyses: ${insertError.message}`);
  }

  console.log('✅ Restore complete!');
  
  // Verify restore
  const { data: restoredAnalyses } = await supabase
    .from('movie_analyses')
    .select('id, movie_id, analysis_type')
    .in('movie_id', movieIds);

  console.log(`🔍 Verification: ${restoredAnalyses?.length || 0} analyses restored`);
}

async function main() {
  const backupFile = process.argv[2] || await findLatestBackup();
  
  try {
    await restoreTestAnalyses(backupFile);
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    process.exit(1);
  }
}

main();