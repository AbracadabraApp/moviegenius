/**
 * TMDB Resolver Usage Examples
 *
 * Demonstrates how to use the authoritative TMDB resolver for various scenarios
 */

import TMDBResolver from '../../lib/tmdb-resolver.js';

// ===== Example 1: Single Resolution =====
async function example1_simpleResolution() {
  console.log('\n=== Example 1: Simple Resolution ===\n');

  const resolver = new TMDBResolver();

  try {
    const result = await resolver.resolve('The Matrix', 1999, { debug: true });

    console.log('\nResult:');
    console.log(`  Found: ${result.found}`);
    console.log(`  TMDB ID: ${result.tmdbId}`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Year: ${result.year}`);
    console.log(`  Strategy: ${result.strategy}`);
    console.log(`  Confidence: ${result.confidence}`);
  } finally {
    await resolver.close();
  }
}

// ===== Example 2: Batch Processing =====
async function example2_batchProcessing() {
  console.log('\n=== Example 2: Batch Processing ===\n');

  const resolver = new TMDBResolver();

  const movies = [
    { title: 'Inception', year: 2010 },
    { title: 'The Shawshank Redemption', year: 1994 },
    { title: 'Pulp Fiction', year: 1994 },
    'The Dark Knight (2008)',  // String with embedded year
    { title: 'Fight Club', year: 1999 }
  ];

  try {
    const results = await resolver.resolveBatch(movies);

    console.log('\nResults:');
    results.forEach((result, i) => {
      console.log(`\n${i + 1}. ${result.query.title || movies[i]}`);
      console.log(`   Found: ${result.found ? '✅' : '❌'}`);
      if (result.found) {
        console.log(`   TMDB ID: ${result.tmdbId}`);
        console.log(`   Strategy: ${result.strategy}`);
        console.log(`   Confidence: ${result.confidence}`);
      }
    });

    console.log('\nStatistics:');
    console.log(resolver.getStats());
  } finally {
    await resolver.close();
  }
}

// ===== Example 3: Fuzzy Matching =====
async function example3_fuzzyMatching() {
  console.log('\n=== Example 3: Fuzzy Matching ===\n');

  const resolver = new TMDBResolver();

  const testCases = [
    // Missing article
    { title: 'Matrix', year: 1999 },
    // Punctuation difference
    { title: 'Mr and Mrs Smith', year: 2005 },
    // Year drift (festival vs release)
    { title: 'Ex Machina', year: 2014 },  // DB has 2015
    // Diacritics
    { title: 'Amelie', year: 2001 },  // Amélie
  ];

  try {
    for (const test of testCases) {
      console.log(`\nResolving: "${test.title}" (${test.year})`);
      const result = await resolver.resolve(test.title, test.year);

      if (result.found) {
        console.log(`  ✅ Matched: "${result.title}" (${result.year})`);
        console.log(`     Strategy: ${result.strategy}`);
        console.log(`     Confidence: ${result.confidence}`);
      } else {
        console.log(`  ❌ Not found`);
      }
    }
  } finally {
    await resolver.close();
  }
}

// ===== Example 4: Confidence Thresholds =====
async function example4_confidenceThresholds() {
  console.log('\n=== Example 4: Confidence Thresholds ===\n');

  const resolver = new TMDBResolver();

  const ambiguousTitle = 'It';  // Multiple movies with this title

  try {
    // High confidence only (exact/normalized matches)
    console.log('\nHigh confidence threshold (0.9):');
    let result = await resolver.resolve(ambiguousTitle, 2017, {
      minConfidence: 0.9,
      debug: true
    });
    console.log(`Found: ${result.found}, Confidence: ${result.confidence}`);

    // Medium confidence (allow fuzzy year)
    console.log('\nMedium confidence threshold (0.7):');
    result = await resolver.resolve(ambiguousTitle, 2017, {
      minConfidence: 0.7,
      debug: true
    });
    console.log(`Found: ${result.found}, Confidence: ${result.confidence}`);

    // Low confidence (allow trigram similarity)
    console.log('\nLow confidence threshold (0.5):');
    result = await resolver.resolve(ambiguousTitle, null, {
      minConfidence: 0.5,
      debug: true
    });
    console.log(`Found: ${result.found}, Confidence: ${result.confidence}`);
  } finally {
    await resolver.close();
  }
}

// ===== Example 5: TMDB API Fallback =====
async function example5_tmdbFallback() {
  console.log('\n=== Example 5: TMDB API Fallback ===\n');

  const resolver = new TMDBResolver();

  // Movie likely not in 35K database
  const obscureMovie = { title: 'The Fall', year: 2006 };

  try {
    console.log(`\nResolving (with TMDB API): "${obscureMovie.title}" (${obscureMovie.year})`);
    let result = await resolver.resolve(obscureMovie.title, obscureMovie.year, {
      skipTMDB: false,
      debug: true
    });

    if (result.found) {
      console.log(`\n✅ Found via: ${result.strategy}`);
      console.log(`   TMDB ID: ${result.tmdbId}`);
      console.log(`   In Database: ${result.inDatabase}`);
      console.log(`   Needs Insertion: ${result.needsInsertion}`);
    }

    console.log(`\nResolving (without TMDB API):`);
    result = await resolver.resolve(obscureMovie.title, obscureMovie.year, {
      skipTMDB: true,
      debug: true
    });
    console.log(`Found: ${result.found}`);
  } finally {
    await resolver.close();
  }
}

// ===== Example 6: Statistics and Reporting =====
async function example6_statistics() {
  console.log('\n=== Example 6: Statistics and Reporting ===\n');

  const resolver = new TMDBResolver();

  const testSet = [
    { title: 'The Godfather', year: 1972 },          // Exact match
    { title: 'Godfather', year: 1972 },              // Normalized match
    { title: 'Pulp Fiction', year: 1993 },           // Year fuzzy (1994)
    { title: 'Some Obscure Film', year: 2025 },      // Not found
    { title: 'The Dark Knight', year: 2008 },        // Exact match
    { title: 'Shawshank Redemption', year: 1994 },   // Normalized match
    { title: 'Matrix', year: 1999 },                 // Normalized match
  ];

  try {
    await resolver.resolveBatch(testSet);

    console.log('\nResolution Statistics:');
    const stats = resolver.getStats();

    console.log(`\nTotal Queries: ${stats.total}`);
    console.log(`Success Rate: ${stats.successRate}`);
    console.log(`Not Found: ${stats.notFound}`);
    console.log(`Errors: ${stats.errors}`);

    console.log('\nBy Strategy:');
    Object.entries(stats.byStrategy).forEach(([strategy, count]) => {
      const pct = (count / stats.total * 100).toFixed(1);
      console.log(`  ${strategy}: ${count} (${pct}%)`);
    });

    console.log('\nBy Confidence:');
    Object.entries(stats.byConfidence).forEach(([level, count]) => {
      const pct = (count / stats.total * 100).toFixed(1);
      console.log(`  ${level}: ${count} (${pct}%)`);
    });
  } finally {
    await resolver.close();
  }
}

// ===== Example 7: CSV Processing =====
async function example7_csvProcessing() {
  console.log('\n=== Example 7: CSV File Processing ===\n');

  const resolver = new TMDBResolver();

  // Simulated CSV data (in real use, parse from fs.readFileSync)
  const csvData = [
    'title,year',
    'The Matrix,1999',
    'Inception,2010',
    'Interstellar,2014',
    'The Prestige,2006',
  ];

  const movies = csvData.slice(1).map(line => {
    const [title, year] = line.split(',');
    return { title, year: parseInt(year) };
  });

  try {
    console.log(`Processing ${movies.length} movies from CSV...\n`);

    const results = await resolver.resolveBatch(movies);

    // Generate output CSV
    console.log('Output CSV:');
    console.log('title,year,tmdb_id,strategy,confidence,found');

    results.forEach(result => {
      console.log([
        result.query.title || result.title,
        result.query.year || result.year,
        result.tmdbId || '',
        result.strategy,
        result.confidence,
        result.found
      ].join(','));
    });

    console.log(`\nSuccess rate: ${resolver.getStats().successRate}`);
  } finally {
    await resolver.close();
  }
}

// ===== Run All Examples =====
async function runAllExamples() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║  TMDB Resolver Usage Examples        ║');
  console.log('╚═══════════════════════════════════════╝');

  await example1_simpleResolution();
  await example2_batchProcessing();
  await example3_fuzzyMatching();
  await example4_confidenceThresholds();
  await example5_tmdbFallback();
  await example6_statistics();
  await example7_csvProcessing();

  console.log('\n✅ All examples completed');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples()
    .catch(error => {
      console.error('Error running examples:', error);
      process.exit(1);
    });
}

export {
  example1_simpleResolution,
  example2_batchProcessing,
  example3_fuzzyMatching,
  example4_confidenceThresholds,
  example5_tmdbFallback,
  example6_statistics,
  example7_csvProcessing
};
