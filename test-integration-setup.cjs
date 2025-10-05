#!/usr/bin/env node
/**
 * Quick integration test to validate database connectivity and key test data
 * Run: node --env-file=.env.local test-integration-setup.js
 */

const { Pool } = require('pg');

async function validateIntegration() {
  console.log('🔧 Starting integration validation...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10000
  });

  try {
    // Test 1: Basic database connectivity
    console.log('📊 Testing database connectivity...');
    const client = await pool.connect();
    const timeResult = await client.query('SELECT NOW()');
    console.log(`   ✅ Connected at ${timeResult.rows[0].now}`);

    // Test 2: Key test movies exist
    console.log('🎬 Checking test movies...');
    const movieResult = await client.query(`
      SELECT tmdb_id, title, year
      FROM movies
      WHERE tmdb_id IN (550, 18, 78)
      ORDER BY tmdb_id
    `);

    console.log(`   Found ${movieResult.rows.length} test movies:`);
    movieResult.rows.forEach(row => {
      console.log(`   ✅ ${row.title} (${row.year}) - TMDB: ${row.tmdb_id}`);
    });

    // Test 3: Trailer data integrity (no mass duplication)
    console.log('🎭 Checking trailer data integrity...');
    const trailerResult = await client.query(`
      SELECT trailer_url, COUNT(*) as count
      FROM movies
      WHERE trailer_url IS NOT NULL
      GROUP BY trailer_url
      HAVING COUNT(*) > 50
      ORDER BY count DESC
      LIMIT 5
    `);

    if (trailerResult.rows.length === 0) {
      console.log('   ✅ No mass trailer duplication detected');
    } else {
      console.log('   ⚠️  Potential trailer duplicates:');
      trailerResult.rows.forEach(row => {
        console.log(`      ${row.trailer_url}: ${row.count} movies`);
      });
    }

    // Test 4: Analysis data availability
    console.log('📝 Checking analysis data...');
    const analysisResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE enhanced_format = true) as enhanced
      FROM movie_analyses
      WHERE analysis_type = 'general'
    `);

    const stats = analysisResult.rows[0];
    console.log(`   ✅ ${stats.total} total analyses, ${stats.enhanced} enhanced`);

    client.release();
    console.log('🎉 Integration validation completed successfully!');

    return {
      database: 'connected',
      testMovies: movieResult.rows.length,
      analyses: parseInt(stats.total),
      trailerIntegrity: trailerResult.rows.length === 0 ? 'good' : 'issues'
    };

  } finally {
    await pool.end();
  }
}

// Run validation
if (require.main === module) {
  validateIntegration()
    .then(results => {
      console.log('\n📋 Validation Summary:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Integration validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { validateIntegration };