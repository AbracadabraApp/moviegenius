#!/usr/bin/env node

/**
 * Extract Movie IDs from Backup
 * Creates a clean list of movie IDs that need analysis regeneration
 */

import { readFileSync, writeFileSync } from 'fs';

const BACKUP_FILE = './backups/analyses-pre-july24/analyses-backup-2025-07-27T08-27-56-043Z.json';
const OUTPUT_FILE = './movie-ids-to-process.json';

console.log('🔍 Extracting movie IDs from backup...');

try {
  // Read backup file
  const backup = JSON.parse(readFileSync(BACKUP_FILE, 'utf8'));
  console.log(`📁 Loaded backup with ${backup.length} analyses`);

  // Extract unique movie IDs
  const movieIds = [...new Set(backup.map(item => item.movie_id))];
  console.log(`🎬 Found ${movieIds.length} unique movie IDs`);

  // Save to output file
  writeFileSync(OUTPUT_FILE, JSON.stringify(movieIds, null, 2));
  console.log(`💾 Saved movie IDs to: ${OUTPUT_FILE}`);

  // Show sample
  console.log('\n📋 Sample movie IDs:');
  movieIds.slice(0, 5).forEach((id, i) => {
    console.log(`  ${i + 1}. ${id}`);
  });

  console.log(`\n✅ Ready to process ${movieIds.length} movies with Claude Batch API`);

} catch (error) {
  console.error('❌ Error extracting movie IDs:', error.message);
  process.exit(1);
}