#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Now import and run the migration
const { migrateEpisodes } = await import('./migrate-episodes-to-db.js');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

console.log('🚀 Starting Genius Episodes Migration');
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
console.log(`Force overwrite: ${isForce ? 'YES' : 'NO'}`);
console.log('');

try {
  await migrateEpisodes();
  console.log('✅ Migration completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
