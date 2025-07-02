/**
 * Smart Trailer Populator
 * 
 * - Checks database first to skip already processed movies
 * - Starts from where it left off (last processed ID)
 * - Handles failures and retries
 * - Saves progress and can resume
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

const PROGRESS_FILE = 'scripts/.trailer-progress.json';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/tmdb-trailer`;
const DELAY_MS = 200;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

// Generate smart ID ranges - focus on most likely to have trailers
function generateSmartRanges() {
  const ranges = [];
  
  // Popular classics (1-2000) - highest success rate
  for (let i = 1; i <= 2000; i++) {
    ranges.push(i);
  }
  
  // Recent blockbusters (300000-600000)
  for (let i = 300000; i <= 600000; i += 10) {
    ranges.push(...Array.from({length: 3}, (_, j) => i + j));
  }
  
  return ranges;
}

class SmartTrailerPopulator {
  constructor() {
    this.movieIds = generateSmartRanges();
    this.stats = {
      processed: 0,
      found: 0,
      cached: 0,
      skipped: 0,
      errors: 0,
      startTime: Date.now()
    };
    this.progress = this.loadProgress();
  }
  
  loadProgress() {
    if (existsSync(PROGRESS_FILE)) {
      try {
        const data = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
        console.log(`📂 Resuming from TMDB ID ${data.lastProcessed}`);
        return data;
      } catch (e) {
        console.log('🆕 Starting fresh - no valid progress file');
      }
    }
    return { lastProcessed: 0, processedIds: new Set() };
  }
  
  saveProgress() {
    try {
      const data = {
        lastProcessed: this.progress.lastProcessed,
        processedIds: Array.from(this.progress.processedIds),
        stats: this.stats,
        timestamp: new Date().toISOString()
      };
      writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to save progress:', e.message);
    }
  }
  
  async checkIfTrailerExists(tmdbId) {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Quick check - if API returns cached, trailer exists
      const { stdout } = await execAsync(`curl -s "${API_BASE}?tmdbId=${tmdbId}"`);
      const result = JSON.parse(stdout);
      
      return result.source === 'cache' && result.videoId;
    } catch (e) {
      return false;
    }
  }
  
  async processMovie(tmdbId, retryCount = 0) {
    try {
      // Skip if already processed
      if (this.progress.processedIds.has(tmdbId)) {
        this.stats.skipped++;
        return 'skipped';
      }
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync(`curl -s "${API_BASE}?tmdbId=${tmdbId}"`);
      const result = JSON.parse(stdout);
      
      this.stats.processed++;
      this.progress.processedIds.add(tmdbId);
      this.progress.lastProcessed = tmdbId;
      
      if (result.videoId) {
        if (result.source === 'cache') {
          this.stats.cached++;
          console.log(`🚀 [${this.stats.processed}] ${tmdbId} - Already cached`);
        } else {
          this.stats.found++;
          console.log(`✅ [${this.stats.processed}] ${tmdbId} - NEW: ${result.videoId.substring(0, 8)}...`);
        }
        return 'found';
      } else {
        if (this.stats.processed % 25 === 0) {
          console.log(`⚪ [${this.stats.processed}] ${tmdbId} - No trailer`);
        }
        return 'not_found';
      }
      
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 [${this.stats.processed}] ${tmdbId} - Retry ${retryCount + 1}/${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return await this.processMovie(tmdbId, retryCount + 1);
      } else {
        this.stats.errors++;
        console.error(`💥 [${this.stats.processed}] ${tmdbId} - Failed after ${MAX_RETRIES} retries`);
        return 'error';
      }
    }
  }
  
  printProgress() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000 / 60;
    const rate = this.stats.processed / elapsed;
    const successRate = (((this.stats.found + this.stats.cached) / this.stats.processed) * 100).toFixed(1);
    
    console.log(`\n📊 Progress Update:`);
    console.log(`  • Processed: ${this.stats.processed}`);
    console.log(`  • New trailers: ${this.stats.found}`);
    console.log(`  • Already cached: ${this.stats.cached}`);
    console.log(`  • Skipped: ${this.stats.skipped}`);
    console.log(`  • Errors: ${this.stats.errors}`);
    console.log(`  • Success rate: ${successRate}%`);
    console.log(`  • Rate: ${rate.toFixed(1)} movies/min`);
    console.log(`  • Last ID: ${this.progress.lastProcessed}`);
  }
  
  async run() {
    console.log('🧠 Smart Trailer Populator');
    console.log(`📊 Processing ${this.movieIds.length} TMDB IDs intelligently`);
    console.log(`🎯 Starting from ID ${this.progress.lastProcessed + 1}`);
    
    // Filter to unprocessed IDs starting from where we left off
    const remainingIds = this.movieIds.filter(id => 
      id > this.progress.lastProcessed && !this.progress.processedIds.has(id)
    );
    
    console.log(`📋 ${remainingIds.length} IDs remaining to process\n`);
    
    for (const tmdbId of remainingIds) {
      await this.processMovie(tmdbId);
      
      // Save progress every 50 movies
      if (this.stats.processed % 50 === 0) {
        this.saveProgress();
        this.printProgress();
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
    
    // Final save and summary
    this.saveProgress();
    this.printFinalSummary();
  }
  
  printFinalSummary() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000 / 60;
    const totalWithTrailers = this.stats.found + this.stats.cached;
    
    console.log('\n🎯 Smart Population Complete!');
    console.log('═══════════════════════════════');
    console.log(`📊 Final Results:`);
    console.log(`  • Total processed: ${this.stats.processed}`);
    console.log(`  • New trailers found: ${this.stats.found}`);
    console.log(`  • Already cached: ${this.stats.cached}`);
    console.log(`  • Total with trailers: ${totalWithTrailers}`);
    console.log(`  • Skipped (already done): ${this.stats.skipped}`);
    console.log(`  • Errors: ${this.stats.errors}`);
    console.log(`  • Success rate: ${((totalWithTrailers/this.stats.processed)*100).toFixed(1)}%`);
    console.log(`  • Duration: ${elapsed.toFixed(1)} minutes`);
    console.log(`  • Rate: ${(this.stats.processed/elapsed).toFixed(1)} movies/minute`);
    console.log(`\n💾 Progress saved to: ${PROGRESS_FILE}`);
    console.log(`🔄 Can resume anytime with: node scripts/smart-trailer-populator.js`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Gracefully shutting down...');
  if (global.populator) {
    global.populator.saveProgress();
    global.populator.printProgress();
    console.log('💾 Progress saved. Run again to resume.');
  }
  process.exit(0);
});

// Run the smart populator
const populator = new SmartTrailerPopulator();
global.populator = populator; // For graceful shutdown
populator.run();