#!/usr/bin/env node

/**
 * Simple Content Coverage Monitor
 * 
 * Tracks content coverage every 3 minutes and logs to console and file
 * Based on existing coverage analysis scripts
 * 
 * Usage: node content-coverage-monitor.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class ContentCoverageMonitor {
  constructor() {
    this.startTime = new Date();
    this.logFile = 'content-coverage.log';
    this.interval = 3 * 60 * 1000; // 3 minutes
    this.previousStats = null;
    
    console.log('📊 Content Coverage Monitor Started');
    console.log(`⏰ Start Time: ${this.startTime.toLocaleTimeString()}`);
    console.log(`📝 Logging to: ${this.logFile}`);
    console.log(`🔄 Update Interval: 3 minutes\n`);
    
    this.logToFile(`\n=== CONTENT COVERAGE MONITOR STARTED ===`);
    this.logToFile(`Start Time: ${this.startTime.toISOString()}`);
    this.logToFile(`Update Interval: 3 minutes\n`);
  }

  logToFile(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `[${timestamp}] ${message}\n`);
  }

  async getCoverageStats() {
    try {
      // Get total movies count
      const { count: totalMovies } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true });

      // Get movies with analysis
      const { count: moviesWithAnalysis } = await supabase
        .from('movie_analyses')
        .select('*', { count: 'exact', head: true });

      // Get movies with explore_further content
      const { count: moviesWithExploreFurther } = await supabase
        .from('movie_analyses')
        .select('*', { count: 'exact', head: true })
        .not('explore_further', 'is', null)
        .neq('explore_further', '');

      // Get total people count
      const { count: totalPeople } = await supabase
        .from('people')
        .select('*', { count: 'exact', head: true });

      // Get people with analysis
      const { count: peopleWithAnalysis } = await supabase
        .from('person_analyses')
        .select('*', { count: 'exact', head: true });

      // Get total movie lists
      const { count: totalLists } = await supabase
        .from('movie_lists')
        .select('*', { count: 'exact', head: true });

      // Get list analyses
      const { count: listAnalyses } = await supabase
        .from('list_analyses')
        .select('*', { count: 'exact', head: true });

      // Get movies with good slugs (not URL-formatted)
      const { count: moviesWithGoodSlugs } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })
        .not('slug', 'is', null)
        .neq('slug', '')
        .not('slug', 'like', '%-%-%-%-%')  // Exclude UUID-like slugs
        .not('slug', 'like', 'movie-%');   // Exclude generic movie-123 slugs

      return {
        movies: {
          total: totalMovies || 0,
          withAnalysis: moviesWithAnalysis || 0,
          withExploreFurther: moviesWithExploreFurther || 0,
          withGoodSlugs: moviesWithGoodSlugs || 0,
          analysisPercent: totalMovies ? ((moviesWithAnalysis || 0) / totalMovies * 100).toFixed(1) : '0.0',
          exploreFurtherPercent: totalMovies ? ((moviesWithExploreFurther || 0) / totalMovies * 100).toFixed(1) : '0.0',
          goodSlugPercent: totalMovies ? ((moviesWithGoodSlugs || 0) / totalMovies * 100).toFixed(1) : '0.0'
        },
        people: {
          total: totalPeople || 0,
          withAnalysis: peopleWithAnalysis || 0,
          analysisPercent: totalPeople ? ((peopleWithAnalysis || 0) / totalPeople * 100).toFixed(1) : '0.0'
        },
        lists: {
          total: totalLists || 0,
          withAnalysis: listAnalyses || 0,
          analysisPercent: totalLists ? ((listAnalyses || 0) / totalLists * 100).toFixed(1) : '0.0'
        }
      };
    } catch (error) {
      console.error('❌ Error fetching coverage stats:', error.message);
      this.logToFile(`ERROR: ${error.message}`);
      return null;
    }
  }

  formatStats(stats) {
    if (!stats) return 'Error fetching stats';

    const lines = [
      `📊 CONTENT COVERAGE REPORT`,
      `▸ Runtime: ${Math.round((Date.now() - this.startTime) / 1000 / 60)} minutes`,
      ''
    ];

    // Show changes since last check
    if (this.previousStats) {
      const changes = this.calculateChanges(this.previousStats, stats);
      if (changes.hasChanges) {
        lines.push(`🆕 CHANGES IN LAST 3 MINUTES:`);
        if (changes.movies.total !== 0) lines.push(`  ▪ Movies: +${changes.movies.total}`);
        if (changes.movies.withAnalysis !== 0) lines.push(`  ▪ Movie Analysis: +${changes.movies.withAnalysis}`);
        if (changes.movies.withExploreFurther !== 0) lines.push(`  ▪ Explore Further: +${changes.movies.withExploreFurther}`);
        if (changes.movies.withGoodSlugs !== 0) lines.push(`  ▪ Good Slugs: +${changes.movies.withGoodSlugs}`);
        if (changes.people.withAnalysis !== 0) lines.push(`  ▪ Person Analysis: +${changes.people.withAnalysis}`);
        if (changes.lists.withAnalysis !== 0) lines.push(`  ▪ List Analysis: +${changes.lists.withAnalysis}`);
        lines.push('');
      }
    }

    lines.push(
      `🎬 MOVIES: ${stats.movies.total} total`,
      `  ▪ Analysis: ${stats.movies.withAnalysis}/${stats.movies.total} (${stats.movies.analysisPercent}%)`,
      `  ▪ Explore Further: ${stats.movies.withExploreFurther}/${stats.movies.total} (${stats.movies.exploreFurtherPercent}%)`,
      `  ▪ Good Slugs: ${stats.movies.withGoodSlugs}/${stats.movies.total} (${stats.movies.goodSlugPercent}%)`,
      '',
      `👤 PEOPLE: ${stats.people.total} total`,
      `  ▪ Analysis: ${stats.people.withAnalysis}/${stats.people.total} (${stats.people.analysisPercent}%)`,
      '',
      `📋 LISTS: ${stats.lists.total} total`,
      `  ▪ Analysis: ${stats.lists.withAnalysis}/${stats.lists.total} (${stats.lists.analysisPercent}%)`
    );

    return lines.join('\n');
  }

  calculateChanges(previous, current) {
    const changes = {
      hasChanges: false,
      movies: {
        total: current.movies.total - previous.movies.total,
        withAnalysis: current.movies.withAnalysis - previous.movies.withAnalysis,
        withExploreFurther: current.movies.withExploreFurther - previous.movies.withExploreFurther,
        withGoodSlugs: current.movies.withGoodSlugs - previous.movies.withGoodSlugs
      },
      people: {
        total: current.people.total - previous.people.total,
        withAnalysis: current.people.withAnalysis - previous.people.withAnalysis
      },
      lists: {
        total: current.lists.total - previous.lists.total,
        withAnalysis: current.lists.withAnalysis - previous.lists.withAnalysis
      }
    };

    // Check if any changes occurred
    changes.hasChanges = Object.values(changes.movies).some(val => val !== 0) ||
                        Object.values(changes.people).some(val => val !== 0) ||
                        Object.values(changes.lists).some(val => val !== 0);

    return changes;
  }

  async checkCoverage() {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n⏰ ${timestamp} - Checking coverage...`);
    
    const stats = await this.getCoverageStats();
    const report = this.formatStats(stats);
    
    console.log(report);
    console.log('─'.repeat(50));
    
    // Log to file
    this.logToFile('');
    this.logToFile(report);
    this.logToFile('─'.repeat(50));
    
    // Store current stats for next comparison
    this.previousStats = stats;
  }

  start() {
    // Initial check
    this.checkCoverage();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkCoverage();
    }, this.interval);
    
    console.log('\n🚀 Monitor running! Press Ctrl+C to stop.');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    const endTime = new Date();
    const duration = Math.round((endTime - this.startTime) / 1000 / 60);
    
    console.log(`\n📊 Content Coverage Monitor Stopped`);
    console.log(`⏰ End Time: ${endTime.toLocaleTimeString()}`);
    console.log(`⏱️ Total Runtime: ${duration} minutes`);
    
    this.logToFile('');
    this.logToFile('=== MONITOR STOPPED ===');
    this.logToFile(`End Time: ${endTime.toISOString()}`);
    this.logToFile(`Total Runtime: ${duration} minutes`);
  }
}

// Handle graceful shutdown
const monitor = new ContentCoverageMonitor();

process.on('SIGINT', () => {
  console.log('\n🛑 Received interrupt signal...');
  monitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received terminate signal...');
  monitor.stop();
  process.exit(0);
});

// Start monitoring
monitor.start();