/**
 * Test TMDB API matching for 100 MoreIdeas entries with null tmdbId
 *
 * Simple pass 1: See if TMDB can find these movies
 */

const { Pool } = require('pg');
const https = require('https');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SAMPLE_SIZE = 100;

async function searchTMDB(title, year) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(title);
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}&year=${year}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function testSample() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TMDB API TEST - 100 MoreIdeas with null tmdbId');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get 100 random entries with null tmdbId
    const query = `
      SELECT title, year FROM (
        SELECT DISTINCT
          idea->>'title' as title,
          (idea->>'year')::int as year
        FROM more_ideas mi
        CROSS JOIN jsonb_array_elements(mi.ideas) as idea
        WHERE (idea->>'tmdbId')::text = 'null' OR idea->>'tmdbId' IS NULL
      ) subquery
      ORDER BY RANDOM()
      LIMIT ${SAMPLE_SIZE}
    `;

    const sample = await pool.query(query);
    console.log(`Sampled ${sample.rows.length} entries\n`);

    const results = {
      total: sample.rows.length,
      found: 0,
      notFound: 0,
      exactMatch: 0,
      yearDrift: 0,
      multipleMatches: 0,
      errors: 0
    };

    console.log('Title                                  | Year | TMDB Result');
    console.log('---------------------------------------|------|---------------------------');

    for (const row of sample.rows) {
      try {
        // Rate limit: 250 requests per second (4ms delay)
        await new Promise(resolve => setTimeout(resolve, 4));

        const response = await searchTMDB(row.title, row.year);

        if (response.results && response.results.length > 0) {
          results.found++;

          const firstMatch = response.results[0];
          const matchYear = firstMatch.release_date ? parseInt(firstMatch.release_date.split('-')[0]) : null;

          if (matchYear === row.year) {
            results.exactMatch++;
          } else if (matchYear && Math.abs(matchYear - row.year) <= 2) {
            results.yearDrift++;
          }

          if (response.results.length > 1) {
            results.multipleMatches++;
          }

          const titleTrunc = row.title.substring(0, 38).padEnd(38);
          const resultStr = `✅ Found (${firstMatch.id}) ${matchYear || '?'}`;
          console.log(`${titleTrunc} | ${row.year} | ${resultStr}`);
        } else {
          results.notFound++;
          const titleTrunc = row.title.substring(0, 38).padEnd(38);
          console.log(`${titleTrunc} | ${row.year} | ❌ Not found`);
        }
      } catch (err) {
        results.errors++;
        const titleTrunc = row.title.substring(0, 38).padEnd(38);
        console.log(`${titleTrunc} | ${row.year} | ⚠️  Error: ${err.message.substring(0, 20)}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Total sampled:        ${results.total}`);
    console.log(`Found by TMDB:        ${results.found} (${((results.found / results.total) * 100).toFixed(1)}%)`);
    console.log(`Not found:            ${results.notFound} (${((results.notFound / results.total) * 100).toFixed(1)}%)`);
    console.log(`Errors:               ${results.errors}`);
    console.log('');
    console.log('Of those found:');
    console.log(`  Exact year match:   ${results.exactMatch} (${results.found > 0 ? ((results.exactMatch / results.found) * 100).toFixed(1) : 0}%)`);
    console.log(`  Year drift (±1-2):  ${results.yearDrift} (${results.found > 0 ? ((results.yearDrift / results.found) * 100).toFixed(1) : 0}%)`);
    console.log(`  Multiple matches:   ${results.multipleMatches} (${results.found > 0 ? ((results.multipleMatches / results.found) * 100).toFixed(1) : 0}%)`);

    console.log('\n═══════════════════════════════════════════════════════════════');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

testSample();
