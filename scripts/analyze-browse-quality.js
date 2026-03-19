#!/usr/bin/env node

/**
 * Browse Collection Quality Analysis (Mock Mode)
 *
 * Analyzes browse collections for quality issues WITHOUT modifying database.
 * Shows impact of each quality rule before applying.
 *
 * SAFE: Read-only analysis, no deletions, only suppression flags when approved.
 */

import { getRailwayClient } from '../lib/railway-db.js';

// Stop words - generic terms that reduce title meaningfulness
const STOP_WORDS = new Set([
  'movie', 'movies', 'film', 'films', 'cinema',
  'best', 'top', 'great', 'greatest', 'must', 'essential',
  'watch', 'see', 'collection', 'list',
  'action', 'comedy', 'drama', 'thriller', 'horror', 'romance', 'scifi', 'fantasy'
]);

// Problematic ending words
const BAD_ENDINGS = new Set([
  'movies', 'films', 'collection', 'list',
  'favorites', 'essentials', 'must-see'
]);

/**
 * Calculate title meaningfulness score
 */
function analyzeTitleQuality(title) {
  const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;
  const meaningfulWords = words.filter(w => !STOP_WORDS.has(w));
  const stopWordCount = totalWords - meaningfulWords.length;

  const stopWordRatio = totalWords > 0 ? stopWordCount / totalWords : 1;
  const lastWord = words[words.length - 1];

  let score = (1 - stopWordRatio) * 100; // Base score from meaningful words

  // Word count modifiers
  if (totalWords <= 2) {
    score -= 15;
  } else if (totalWords >= 3 && totalWords <= 4) {
    score += 10;
  } else if (totalWords >= 7) {
    score -= 10;
  }

  // Cap at 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    totalWords,
    meaningfulWords: meaningfulWords.length,
    stopWordCount,
    stopWordRatio: Math.round(stopWordRatio * 100),
    hasBadEnding: BAD_ENDINGS.has(lastWord),
    issues: []
  };
}

/**
 * Apply quality rules (without modifying database)
 */
function applyQualityRules(collection) {
  const titleAnalysis = analyzeTitleQuality(collection.title);
  const issues = [];
  let shouldSuppress = false;
  let reason = null;

  // Rule 1: Size threshold (already handled by API, but analyze)
  if (collection.total_movies < 4) {
    issues.push('Too small for display (< 4 movies)');
    shouldSuppress = true;
    reason = 'size_threshold';
  }

  // Rule 2: Title score too low
  if (titleAnalysis.score < 20) {
    issues.push(`Generic title (score: ${titleAnalysis.score}/100)`);
    shouldSuppress = true;
    reason = reason || 'generic_title';
  }

  // Rule 3: Stop word dominance
  if (titleAnalysis.stopWordRatio > 80) {
    issues.push(`Stop word dominance (${titleAnalysis.stopWordRatio}%)`);
    shouldSuppress = true;
    reason = reason || 'stop_words';
  }

  // Rule 4: Oversized collections
  if (collection.total_movies > 50) {
    issues.push('Too broad (> 50 movies)');
    shouldSuppress = true;
    reason = reason || 'oversized';
  }

  // Rule 5: Bad ending words
  if (titleAnalysis.hasBadEnding) {
    issues.push('Generic ending word');
    shouldSuppress = true;
    reason = reason || 'bad_ending';
  }

  return {
    ...titleAnalysis,
    issues,
    shouldSuppress,
    reason,
    currentStatus: collection.status
  };
}

/**
 * Main analysis function
 */
async function analyzeQuality() {
  console.log('🔍 Browse Collection Quality Analysis (Mock Mode)\n');
  console.log('SAFE MODE: Read-only, no database modifications\n');

  const client = getRailwayClient();

  try {
    await client.connect();

    // Get all active collections
    const result = await client.query(`
      SELECT id, title, total_movies, status
      FROM browse_lists
      WHERE status = 'active'
      ORDER BY total_movies DESC
    `);

    const collections = result.rows;
    console.log(`📊 Analyzing ${collections.length} active collections...\n`);

    // Analyze each collection
    const analysis = collections.map(col => ({
      id: col.id,
      title: col.title,
      total_movies: col.total_movies,
      quality: applyQualityRules(col)
    }));

    // Categorize results
    const wouldKeep = analysis.filter(a => !a.quality.shouldSuppress);
    const wouldSuppress = analysis.filter(a => a.quality.shouldSuppress);

    // Group suppressions by reason
    const suppressionReasons = {};
    wouldSuppress.forEach(item => {
      const reason = item.quality.reason || 'other';
      if (!suppressionReasons[reason]) {
        suppressionReasons[reason] = [];
      }
      suppressionReasons[reason].push(item);
    });

    // Print summary
    console.log('=' .repeat(80));
    console.log('IMPACT SUMMARY');
    console.log('=' .repeat(80));
    console.log(`\nCurrent active collections: ${collections.length}`);
    console.log(`Would keep (display):       ${wouldKeep.length} (${((wouldKeep.length/collections.length)*100).toFixed(1)}%)`);
    console.log(`Would suppress (hide):      ${wouldSuppress.length} (${((wouldSuppress.length/collections.length)*100).toFixed(1)}%)`);

    console.log('\n' + '-'.repeat(80));
    console.log('SUPPRESSION BREAKDOWN BY REASON');
    console.log('-'.repeat(80));

    Object.entries(suppressionReasons).forEach(([reason, items]) => {
      const reasonLabels = {
        size_threshold: 'Size < 4 movies',
        generic_title: 'Generic title (score < 20)',
        stop_words: 'Stop word dominance (> 80%)',
        oversized: 'Oversized (> 50 movies)',
        bad_ending: 'Generic ending word'
      };

      console.log(`\n${reasonLabels[reason] || reason}: ${items.length} collections`);
    });

    // Show examples from each category
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE COLLECTIONS TO SUPPRESS');
    console.log('='.repeat(80));

    Object.entries(suppressionReasons).forEach(([reason, items]) => {
      console.log(`\n--- ${reason.toUpperCase()} (showing first 10) ---\n`);
      items.slice(0, 10).forEach((item, i) => {
        console.log(`${i+1}. "${item.title}" (${item.total_movies} movies)`);
        console.log(`   Score: ${item.quality.score}/100 | Stop words: ${item.quality.stopWordRatio}%`);
        console.log(`   Issues: ${item.quality.issues.join(', ')}`);
      });

      if (items.length > 10) {
        console.log(`   ... and ${items.length - 10} more`);
      }
    });

    // Show examples of what we'd keep
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE COLLECTIONS TO KEEP (showing first 20)');
    console.log('='.repeat(80) + '\n');

    wouldKeep.slice(0, 20).forEach((item, i) => {
      console.log(`${i+1}. "${item.title}" (${item.total_movies} movies)`);
      console.log(`   Score: ${item.quality.score}/100 | Stop words: ${item.quality.stopWordRatio}%`);
    });

    if (wouldKeep.length > 20) {
      console.log(`   ... and ${wouldKeep.length - 20} more`);
    }

    // Size distribution analysis
    console.log('\n' + '='.repeat(80));
    console.log('SIZE DISTRIBUTION (what we would keep)');
    console.log('='.repeat(80) + '\n');

    const sizeCategories = {
      '4-10': wouldKeep.filter(a => a.total_movies >= 4 && a.total_movies <= 10).length,
      '11-20': wouldKeep.filter(a => a.total_movies >= 11 && a.total_movies <= 20).length,
      '21-30': wouldKeep.filter(a => a.total_movies >= 21 && a.total_movies <= 30).length,
      '31-50': wouldKeep.filter(a => a.total_movies >= 31 && a.total_movies <= 50).length,
      '51+': wouldKeep.filter(a => a.total_movies > 50).length
    };

    Object.entries(sizeCategories).forEach(([range, count]) => {
      const pct = ((count / wouldKeep.length) * 100).toFixed(1);
      console.log(`  ${range.padEnd(10)}: ${count.toString().padStart(5)} (${pct}%)`);
    });

    // Movie coverage impact
    console.log('\n' + '='.repeat(80));
    console.log('MOVIE COVERAGE IMPACT');
    console.log('='.repeat(80) + '\n');

    const totalMovieSlots = collections.reduce((sum, c) => sum + c.total_movies, 0);
    const keptMovieSlots = wouldKeep.reduce((sum, a) => sum + a.total_movies, 0);
    const suppressedMovieSlots = wouldSuppress.reduce((sum, a) => sum + a.total_movies, 0);

    console.log(`Total movie assignments:      ${totalMovieSlots.toLocaleString()}`);
    console.log(`Would keep (displayed):       ${keptMovieSlots.toLocaleString()} (${((keptMovieSlots/totalMovieSlots)*100).toFixed(1)}%)`);
    console.log(`Would suppress (hidden):      ${suppressedMovieSlots.toLocaleString()} (${((suppressedMovieSlots/totalMovieSlots)*100).toFixed(1)}%)`);

    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATION');
    console.log('='.repeat(80) + '\n');

    console.log('This analysis shows what WOULD happen if quality rules were applied.');
    console.log('No database changes have been made.\n');
    console.log('Next steps:');
    console.log('  1. Review the sample collections above');
    console.log('  2. Adjust quality thresholds if needed (edit this script)');
    console.log('  3. Run apply script to add display_priority field and set suppression flags');
    console.log('  4. Update API to filter by display_priority\n');

    console.log('To apply these changes:');
    console.log('  node scripts/apply-browse-quality.js\n');

    await client.end();

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

// Run analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeQuality();
}

export { analyzeQuality, analyzeTitleQuality, applyQualityRules };
