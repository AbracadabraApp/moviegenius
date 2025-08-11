#!/usr/bin/env node

/**
 * Browse List Generation CLI
 * 
 * Command-line interface for processing 19k movie analyses 
 * through Claude to generate the polyhierarchical browse list taxonomy.
 * 
 * Usage:
 *   node scripts/generate-browse-lists.js --help
 *   node scripts/generate-browse-lists.js --test --limit=10
 *   node scripts/generate-browse-lists.js --run --target-lists=1000
 */

import { BrowseListPipelineOrchestrator } from '../lib/browse-lists/pipeline-orchestrator.js';
import { getRailwayClient } from '../lib/railway-db.js';

class BrowseListCLI {
  constructor() {
    this.orchestrator = new BrowseListPipelineOrchestrator();
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const config = {
      mode: 'help',
      limit: null,
      targetLists: 1000,
      focusFacets: ['genre', 'theme', 'location', 'time'],
      minYear: null,
      maxYear: null,
      dryRun: false
    };

    for (const arg of args) {
      if (arg === '--help' || arg === '-h') {
        config.mode = 'help';
        break;
      } else if (arg === '--test') {
        config.mode = 'test';
        config.limit = config.limit || 10; // Default test limit
      } else if (arg === '--run') {
        config.mode = 'run';
      } else if (arg === '--status') {
        config.mode = 'status';
      } else if (arg === '--dry-run') {
        config.dryRun = true;
      } else if (arg.startsWith('--limit=')) {
        config.limit = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--target-lists=')) {
        config.targetLists = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--min-year=')) {
        config.minYear = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--max-year=')) {
        config.maxYear = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--facets=')) {
        config.focusFacets = arg.split('=')[1].split(',');
      }
    }

    return config;
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log(`
🎬 Browse List Generation CLI

DESCRIPTION:
  Generate polyhierarchical browse lists from movie analyses using Claude.
  Creates 1000+ curated movie lists organized by genre, theme, location, time, etc.

MODES:
  --help, -h          Show this help message
  --test              Test mode: process small sample (default: 10 movies)
  --run               Production mode: process all analyses
  --status            Show current job statuses and database stats

OPTIONS:
  --limit=N           Limit number of movies to process (test mode)
  --target-lists=N    Target number of lists to create (default: 1000)
  --min-year=YYYY     Only process movies from this year onwards
  --max-year=YYYY     Only process movies up to this year
  --facets=list       Focus facets (comma-separated): genre,theme,location,time
  --dry-run           Show what would be processed without running

EXAMPLES:
  # Test with 10 movies
  node scripts/generate-browse-lists.js --test

  # Test with 50 recent movies
  node scripts/generate-browse-lists.js --test --limit=50 --min-year=2020

  # Full production run
  node scripts/generate-browse-lists.js --run --target-lists=1500

  # Check current status
  node scripts/generate-browse-lists.js --status

  # Dry run to see what would be processed
  node scripts/generate-browse-lists.js --test --dry-run --limit=100
`);
  }

  /**
   * Run the CLI
   */
  async run() {
    const config = this.parseArgs();

    console.log('🎬 MovieGenius Browse List Generation');
    console.log('=====================================\n');

    try {
      switch (config.mode) {
        case 'help':
          this.showHelp();
          break;
        case 'test':
          await this.runTestMode(config);
          break;
        case 'run':
          await this.runProductionMode(config);
          break;
        case 'status':
          await this.showStatus();
          break;
        default:
          console.log('❌ Unknown mode. Use --help for usage information.');
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ CLI Error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Run in test mode
   */
  async runTestMode(config) {
    console.log(`🧪 TEST MODE - Processing ${config.limit} movies`);
    console.log(`🎯 Target lists: ${config.targetLists}`);
    console.log(`📊 Focus facets: ${config.focusFacets.join(', ')}`);
    
    if (config.minYear || config.maxYear) {
      console.log(`📅 Year range: ${config.minYear || 'any'} - ${config.maxYear || 'any'}`);
    }
    
    console.log('');

    if (config.dryRun) {
      return await this.runDryRun(config);
    }

    // Show database status first
    await this.showDatabaseStatus();
    console.log('');

    // Confirm before proceeding
    console.log('⚠️  This will generate browse lists and modify the database.');
    const proceed = await this.confirmProceed('Continue with test?');
    if (!proceed) {
      console.log('❌ Cancelled by user.');
      return;
    }

    // Run the pipeline
    const analysisFilter = {
      limit: config.limit,
      minYear: config.minYear,
      maxYear: config.maxYear
    };

    const result = await this.orchestrator.startBrowseListGeneration({
      analysisFilter,
      targetListCount: Math.min(config.targetLists, 100), // Cap test mode
      focusFacets: config.focusFacets,
      jobDescription: `Test run - ${config.limit} movies`
    });

    this.displayResults(result);
  }

  /**
   * Run in production mode
   */
  async runProductionMode(config) {
    console.log('🚀 PRODUCTION MODE - Processing all movie analyses');
    console.log(`🎯 Target lists: ${config.targetLists}`);
    console.log(`📊 Focus facets: ${config.focusFacets.join(', ')}`);
    console.log('');

    // Show database status first  
    await this.showDatabaseStatus();
    console.log('');

    // Strong confirmation for production
    console.log('🚨 PRODUCTION MODE CONFIRMATION:');
    console.log('   • This will process ALL movie analyses in the database');
    console.log('   • This will generate hundreds or thousands of browse lists');
    console.log('   • This will cost significant API usage ($50-200+ estimated)');
    console.log('   • This process may take 1-3 hours to complete');
    console.log('');

    const proceed1 = await this.confirmProceed('Are you sure you want to run production mode?');
    if (!proceed1) {
      console.log('❌ Cancelled by user.');
      return;
    }

    const proceed2 = await this.confirmProceed('Really proceed with full production run?');
    if (!proceed2) {
      console.log('❌ Cancelled by user.');
      return;
    }

    // Run the full pipeline
    const analysisFilter = {
      minYear: config.minYear,
      maxYear: config.maxYear
    };

    const result = await this.orchestrator.startBrowseListGeneration({
      analysisFilter,
      targetListCount: config.targetLists,
      focusFacets: config.focusFacets,
      jobDescription: `Full production run - all analyses`
    });

    this.displayResults(result);
  }

  /**
   * Show current status
   */
  async showStatus() {
    console.log('📊 Current Status\n');

    await this.showDatabaseStatus();
    await this.showJobHistory();
  }

  /**
   * Show database status
   */
  async showDatabaseStatus() {
    const client = getRailwayClient();
    await client.connect();

    try {
      // Count movie analyses
      const analysisCount = await client.query(`
        SELECT COUNT(*) as total
        FROM movies m
        INNER JOIN movie_analyses ma ON m.id = ma.movie_id
        WHERE ma.claude_response IS NOT NULL 
          AND LENGTH(ma.claude_response::text) > 500
      `);

      // Count existing browse lists
      const listsCount = await client.query(`
        SELECT COUNT(*) as total
        FROM browse_lists
        WHERE status = 'active'
      `);

      // Count existing facets
      const facetsCount = await client.query(`
        SELECT facet_type, COUNT(*) as count
        FROM browse_facets
        GROUP BY facet_type
        ORDER BY facet_type
      `);

      // Get list statistics
      const listStats = await client.query(`
        SELECT 
          AVG(total_movies) as avg_movies_per_list,
          MAX(total_movies) as max_movies_per_list,
          MIN(total_movies) as min_movies_per_list
        FROM browse_lists
        WHERE status = 'active' AND total_movies > 0
      `);

      console.log('📊 Database Status:');
      console.log(`   • Movie analyses available: ${analysisCount.rows[0].total}`);
      console.log(`   • Existing browse lists: ${listsCount.rows[0].total}`);
      
      if (facetsCount.rows.length > 0) {
        console.log('   • Facets by type:');
        facetsCount.rows.forEach(row => {
          console.log(`     - ${row.facet_type}: ${row.count}`);
        });
      }

      if (listStats.rows[0].avg_movies_per_list) {
        console.log('   • List statistics:');
        console.log(`     - Average movies per list: ${Math.round(listStats.rows[0].avg_movies_per_list)}`);
        console.log(`     - Largest list: ${listStats.rows[0].max_movies_per_list} movies`);
        console.log(`     - Smallest list: ${listStats.rows[0].min_movies_per_list} movies`);
      }

    } finally {
      await client.end();
    }
  }

  /**
   * Show job history
   */
  async showJobHistory() {
    const client = getRailwayClient();
    await client.connect();

    try {
      const jobs = await client.query(`
        SELECT 
          id,
          job_type,
          status,
          movie_count,
          lists_created,
          lists_updated,
          movies_assigned,
          total_cost,
          created_at,
          started_at,
          completed_at,
          error_message
        FROM browse_list_jobs
        ORDER BY created_at DESC
        LIMIT 10
      `);

      if (jobs.rows.length > 0) {
        console.log('\n📋 Recent Jobs:');
        jobs.rows.forEach(job => {
          const duration = job.completed_at && job.started_at 
            ? Math.round((new Date(job.completed_at) - new Date(job.started_at)) / 1000 / 60)
            : null;

          console.log(`   • Job ${job.id.substr(0, 8)}: ${job.status}`);
          console.log(`     Type: ${job.job_type} | Movies: ${job.movie_count || 'N/A'}`);
          console.log(`     Created: ${job.lists_created || 0} | Updated: ${job.lists_updated || 0}`);
          if (job.total_cost) console.log(`     Cost: $${job.total_cost.toFixed(4)}`);
          if (duration) console.log(`     Duration: ${duration} minutes`);
          if (job.error_message) console.log(`     Error: ${job.error_message.substr(0, 100)}...`);
          console.log('');
        });
      } else {
        console.log('\n📋 No previous jobs found.');
      }

    } finally {
      await client.end();
    }
  }

  /**
   * Run dry run mode
   */
  async runDryRun(config) {
    console.log('🔍 DRY RUN - Showing what would be processed\n');

    const analysisFilter = {
      limit: config.limit,
      minYear: config.minYear,
      maxYear: config.maxYear
    };

    // Get movies that would be processed
    const movies = await this.orchestrator.getMoviesToProcess(analysisFilter);

    console.log(`📽️ Movies that would be processed (${movies.length}):`);
    console.log('   Title (Year) | TMDB ID | Analysis Length');
    console.log('   ' + '─'.repeat(60));
    
    movies.slice(0, 20).forEach(movie => {
      const analysisLength = movie.claude_response ? movie.claude_response.length : 0;
      console.log(`   ${movie.title} (${movie.year}) | ${movie.tmdb_id} | ${analysisLength} chars`);
    });
    
    if (movies.length > 20) {
      console.log(`   ... and ${movies.length - 20} more movies`);
    }

    // Show what the configuration would be
    console.log('\n⚙️ Configuration:');
    console.log(`   • Target lists: ${config.targetLists}`);
    console.log(`   • Focus facets: ${config.focusFacets.join(', ')}`);
    console.log(`   • Estimated cost: $${this.estimateCost(movies.length)}`);
    console.log(`   • Estimated duration: ${this.estimateDuration(movies.length)} minutes`);
  }

  /**
   * Estimate API cost
   */
  estimateCost(movieCount) {
    // Rough estimate: $0.01-0.03 per movie (varies by analysis length)
    const avgCostPerMovie = 0.02;
    return (movieCount * avgCostPerMovie).toFixed(2);
  }

  /**
   * Estimate processing duration  
   */
  estimateDuration(movieCount) {
    // Rough estimate: 2-3 seconds per movie including API calls and DB operations
    const avgSecondsPerMovie = 2.5;
    return Math.round((movieCount * avgSecondsPerMovie) / 60);
  }

  /**
   * Display final results
   */
  displayResults(result) {
    console.log('\n✅ Pipeline Completed!');
    console.log('======================\n');
    console.log(`📊 Results:`);
    console.log(`   • Total movies processed: ${result.totalMovies}`);
    console.log(`   • Browse lists created: ${result.listsCreated}`);
    console.log(`   • Browse lists updated: ${result.listsUpdated}`);
    console.log(`   • Total cost: $${result.totalCost.toFixed(4)}`);
    console.log(`   • Success rate: ${result.results.successRate}`);
    
    if (result.results.errors.length > 0) {
      console.log(`   • Errors: ${result.results.errors.length}`);
    }

    console.log(`\n🆔 Job ID: ${result.jobId}`);
    console.log('Use --status to view detailed job history');
  }

  /**
   * Prompt user for confirmation
   */
  async confirmProceed(message) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`${message} (yes/no): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }
}

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new BrowseListCLI();
  cli.run().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}