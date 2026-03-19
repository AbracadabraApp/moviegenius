#!/usr/bin/env node

/**
 * Stop Word Analysis for Browse Collections
 *
 * Analyzes collection titles for stop word dominance (read-only).
 * Shows which collections would be suppressed based on generic titles.
 */

import { getRailwayClient } from '../lib/railway-db.js';

// Stop words - generic terms that reduce title meaningfulness
const STOP_WORDS = new Set([
  'movie', 'movies', 'film', 'films', 'cinema',
  'best', 'top', 'great', 'greatest', 'must', 'essential',
  'watch', 'see', 'collection', 'list',
  'action', 'comedy', 'drama', 'thriller', 'horror', 'romance', 'scifi', 'fantasy'
]);

function analyzeStopWords(title) {
  const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;
  const meaningfulWords = words.filter(w => !STOP_WORDS.has(w));
  const stopWordCount = totalWords - meaningfulWords.length;
  const stopWordRatio = totalWords > 0 ? (stopWordCount / totalWords) * 100 : 100;

  return {
    totalWords,
    meaningfulWords: meaningfulWords.length,
    stopWordCount,
    stopWordRatio: Math.round(stopWordRatio),
    words: words,
    stopWordsFound: words.filter(w => STOP_WORDS.has(w))
  };
}

async function analyzeCollections() {
  console.log('🔍 Stop Word Analysis for Browse Collections\n');
  console.log('SAFE MODE: Read-only, no database modifications\n');

  const client = getRailwayClient();

  try {
    await client.connect();

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
      ...col,
      stopWordAnalysis: analyzeStopWords(col.title)
    }));

    // Define thresholds to test
    const thresholds = [80, 70, 60, 50];

    console.log('='.repeat(80));
    console.log('STOP WORD THRESHOLD IMPACT ANALYSIS');
    console.log('='.repeat(80) + '\n');

    thresholds.forEach(threshold => {
      const wouldSuppress = analysis.filter(a => a.stopWordAnalysis.stopWordRatio > threshold);
      const wouldKeep = analysis.filter(a => a.stopWordAnalysis.stopWordRatio <= threshold);

      console.log(`\n--- THRESHOLD: >${threshold}% stop words ---`);
      console.log(`  Would suppress: ${wouldSuppress.length} (${((wouldSuppress.length/collections.length)*100).toFixed(1)}%)`);
      console.log(`  Would keep:     ${wouldKeep.length} (${((wouldKeep.length/collections.length)*100).toFixed(1)}%)`);
    });

    // Use 80% as recommended threshold
    const THRESHOLD = 80;
    const wouldSuppress = analysis.filter(a => a.stopWordAnalysis.stopWordRatio > THRESHOLD);
    const wouldKeep = analysis.filter(a => a.stopWordAnalysis.stopWordRatio <= THRESHOLD);

    console.log('\n' + '='.repeat(80));
    console.log(`RECOMMENDED THRESHOLD: >${THRESHOLD}% stop words`);
    console.log('='.repeat(80) + '\n');

    console.log(`Total collections:  ${collections.length}`);
    console.log(`Would suppress:     ${wouldSuppress.length} (${((wouldSuppress.length/collections.length)*100).toFixed(1)}%)`);
    console.log(`Would keep:         ${wouldKeep.length} (${((wouldKeep.length/collections.length)*100).toFixed(1)}%)`);

    // Show examples that would be suppressed
    console.log('\n' + '='.repeat(80));
    console.log('COLLECTIONS TO SUPPRESS (stop words > 80%)');
    console.log('='.repeat(80) + '\n');

    // Sort by stop word ratio descending
    const sortedSuppress = [...wouldSuppress].sort((a, b) =>
      b.stopWordAnalysis.stopWordRatio - a.stopWordAnalysis.stopWordRatio
    );

    sortedSuppress.slice(0, 30).forEach((item, i) => {
      const sw = item.stopWordAnalysis;
      console.log(`${i+1}. "${item.title}" (${item.total_movies} movies)`);
      console.log(`   Stop words: ${sw.stopWordRatio}% (${sw.stopWordCount}/${sw.totalWords})`);
      console.log(`   Words found: ${sw.stopWordsFound.join(', ')}`);
      console.log(`   Meaningful: [${sw.words.filter(w => !STOP_WORDS.has(w)).join(', ')}]`);
    });

    if (sortedSuppress.length > 30) {
      console.log(`\n   ... and ${sortedSuppress.length - 30} more`);
    }

    // Show examples that would be kept
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE COLLECTIONS TO KEEP (stop words ≤ 80%)');
    console.log('='.repeat(80) + '\n');

    // Show variety of kept collections
    const sortedKeep = [...wouldKeep].sort((a, b) =>
      a.stopWordAnalysis.stopWordRatio - b.stopWordAnalysis.stopWordRatio
    );

    sortedKeep.slice(0, 30).forEach((item, i) => {
      const sw = item.stopWordAnalysis;
      console.log(`${i+1}. "${item.title}" (${item.total_movies} movies)`);
      console.log(`   Stop words: ${sw.stopWordRatio}% (${sw.stopWordCount}/${sw.totalWords})`);
    });

    if (sortedKeep.length > 30) {
      console.log(`\n   ... and ${sortedKeep.length - 30} more`);
    }

    // Distribution by stop word percentage
    console.log('\n' + '='.repeat(80));
    console.log('STOP WORD DISTRIBUTION');
    console.log('='.repeat(80) + '\n');

    const distribution = {
      '0-20%': analysis.filter(a => a.stopWordAnalysis.stopWordRatio >= 0 && a.stopWordAnalysis.stopWordRatio <= 20).length,
      '21-40%': analysis.filter(a => a.stopWordAnalysis.stopWordRatio > 20 && a.stopWordAnalysis.stopWordRatio <= 40).length,
      '41-60%': analysis.filter(a => a.stopWordAnalysis.stopWordRatio > 40 && a.stopWordAnalysis.stopWordRatio <= 60).length,
      '61-80%': analysis.filter(a => a.stopWordAnalysis.stopWordRatio > 60 && a.stopWordAnalysis.stopWordRatio <= 80).length,
      '81-100%': analysis.filter(a => a.stopWordAnalysis.stopWordRatio > 80).length
    };

    Object.entries(distribution).forEach(([range, count]) => {
      const pct = ((count / collections.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(pct / 2));
      console.log(`  ${range.padEnd(10)}: ${count.toString().padStart(5)} (${pct.padStart(5)}%) ${bar}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATION');
    console.log('='.repeat(80) + '\n');

    console.log(`Using >${THRESHOLD}% threshold:`);
    console.log(`  - Suppresses ${wouldSuppress.length} low-quality generic titles`);
    console.log(`  - Keeps ${wouldKeep.length} meaningful collections`);
    console.log(`  - No data deleted, only display suppression\n`);

    console.log('Next steps:');
    console.log('  1. Review suppressed collections above');
    console.log('  2. Adjust THRESHOLD if needed');
    console.log('  3. Run: node scripts/apply-stopword-filter.js');

    await client.end();

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeCollections();
}

export { analyzeStopWords, analyzeCollections };
