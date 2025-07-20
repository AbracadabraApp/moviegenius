#!/usr/bin/env node

/**
 * Nuclear Batch Processing Script
 *
 * Manually trigger batch processing of nuclear movies
 * Usage:
 *   node scripts/nuclear-batch.js --count 100 --dry-run
 *   node scripts/nuclear-batch.js --start 1 --end 500
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
config({ path: resolve(__dirname, '../.env.local') });

import { NuclearBatchGenerator } from '../lib/nuclear-batch-generator.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options = {
    count: 100,
    start: 1,
    end: null,
    dryRun: false,
    maxConcurrency: 2,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count':
        options.count = parseInt(args[++i]) || 100;
        break;
      case '--start':
        options.start = parseInt(args[++i]) || 1;
        break;
      case '--end':
        options.end = parseInt(args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--concurrency':
        options.maxConcurrency = parseInt(args[++i]) || 2;
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }

  console.log('🚀 Nuclear Batch Processing');
  console.log('Options:', options);
  console.log('');

  try {
    // Get nuclear candidates (top 1,000 movies)
    const { data: nuclearCandidates } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!nuclearCandidates || nuclearCandidates.length === 0) {
      console.log('❌ No nuclear candidates found');
      process.exit(1);
    }

    console.log(`📊 Found ${nuclearCandidates.length} nuclear candidates`);

    // Determine which movies to process
    let moviesToProcess;

    if (options.end) {
      // Process specific range
      const startIndex = options.start - 1;
      const endIndex = options.end;
      moviesToProcess = nuclearCandidates.slice(startIndex, endIndex);
      console.log(
        `🎯 Processing movies ${options.start}-${options.end} (${moviesToProcess.length} movies)`
      );
    } else {
      // Process next N movies that need analysis
      const processed = await getProcessedMovieIds(nuclearCandidates.map(m => m.id));
      const pending = nuclearCandidates.filter(m => !processed.has(m.id));
      moviesToProcess = pending.slice(0, options.count);
      console.log(`🎯 Processing next ${moviesToProcess.length} pending movies`);
    }

    if (moviesToProcess.length === 0) {
      console.log('✅ No movies need processing');
      process.exit(0);
    }

    // Show what will be processed
    console.log('\n📋 Movies to process:');
    moviesToProcess.slice(0, 10).forEach((movie, index) => {
      const rank = nuclearCandidates.findIndex(m => m.id === movie.id) + 1;
      console.log(`  ${rank}. ${movie.title} (${movie.year}) [ID: ${movie.tmdb_id}]`);
    });

    if (moviesToProcess.length > 10) {
      console.log(`  ... and ${moviesToProcess.length - 10} more`);
    }

    const estimatedCost = moviesToProcess.length * 0.015 * 0.5; // With batch discount
    console.log(`\n💰 Estimated cost: $${estimatedCost.toFixed(2)} (with 50% batch discount)`);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - No actual processing will occur');
      process.exit(0);
    }

    // Confirm before proceeding
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const proceed = await new Promise(resolve => {
      rl.question('\n❓ Proceed with batch processing? (y/N): ', answer => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });

    rl.close();

    if (!proceed) {
      console.log('❌ Cancelled by user');
      process.exit(0);
    }

    // Initialize batch generator
    const batchGenerator = new NuclearBatchGenerator();

    // Process movies
    console.log('\n🚀 Starting batch processing...');
    const movieIds = moviesToProcess.map(m => m.id);

    const results = await batchGenerator.generateBulkAnalysis(movieIds, {
      maxConcurrency: options.maxConcurrency,
      batchSize: Math.min(50, moviesToProcess.length), // Smaller batches for safety
    });

    console.log('\n✅ Batch processing complete!');
    console.log(
      `📊 Results: ${results.successfulAnalyses} successful, ${results.failedAnalyses} failed`
    );
    console.log(`💰 Total cost: $${results.totalCost.toFixed(4)}`);

    if (results.failedAnalyses > 0) {
      console.log('\n⚠️ Some analyses failed. Check logs for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Batch processing failed:', error);
    process.exit(1);
  }
}

async function getProcessedMovieIds(movieIds) {
  const { data: analyses } = await supabase
    .from('movie_analyses')
    .select('movie_id')
    .eq('analysis_type', 'page_analysis')
    .in('movie_id', movieIds);

  return new Set(analyses?.map(a => a.movie_id) || []);
}

function showHelp() {
  console.log(`
Nuclear Batch Processing Script

Usage:
  node scripts/nuclear-batch.js [options]

Options:
  --count <n>        Process next N pending movies (default: 100)
  --start <n>        Start at movie rank N (default: 1)
  --end <n>          End at movie rank N
  --concurrency <n>  Max concurrent batches (default: 2)
  --dry-run          Show what would be processed without doing it
  --help             Show this help

Examples:
  # Process next 50 pending movies
  node scripts/nuclear-batch.js --count 50
  
  # Process movies ranked 101-200
  node scripts/nuclear-batch.js --start 101 --end 200
  
  # Dry run to see what would be processed
  node scripts/nuclear-batch.js --count 100 --dry-run
  
  # Conservative processing with single batch
  node scripts/nuclear-batch.js --count 25 --concurrency 1
`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n❌ Interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n❌ Terminated');
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
