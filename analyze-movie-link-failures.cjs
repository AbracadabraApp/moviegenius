#!/usr/bin/env node

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // Get NO recommendations that still have <link> tags (failed to link)
    const result = await pool.query(`
      SELECT
        eww.reasons,
        eww.tmdb_id,
        m.title,
        m.year
      FROM enhanced_why_watch eww
      JOIN movies m ON m.tmdb_id = eww.tmdb_id
      WHERE eww.recommendation = 'NO'
        AND eww.reasons::text LIKE '%<link>%'
      ORDER BY RANDOM()
      LIMIT 50
    `);

    console.log(`Found ${result.rows.length} records with failed movie links\n`);
    console.log('Failed movie title links:\n');

    const failedTitles = new Map();

    result.rows.forEach((row, i) => {
      row.reasons.forEach(reason => {
        const linkMatch = reason.match(/<link>([^<]+)<\/link>/g);
        if (linkMatch) {
          linkMatch.forEach(match => {
            const title = match.replace(/<\/?link>/g, '');
            failedTitles.set(title, (failedTitles.get(title) || 0) + 1);

            if (i < 20) {
              console.log(`${i + 1}. ${row.title} (${row.year})`);
              console.log(`   Failed to link: "${title}"`);
              console.log(`   Full reason: ${reason}\n`);
            }
          });
        }
      });
    });

    // Summary of most common failures
    console.log('\n=== MOST COMMON FAILED TITLES ===\n');
    const sorted = Array.from(failedTitles.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    sorted.forEach(([title, count]) => {
      console.log(`${count}x - "${title}"`);
    });

    // Try to find these titles with fuzzy matching
    console.log('\n\n=== CHECKING IF TITLES EXIST IN DATABASE ===\n');
    for (const [title, count] of sorted.slice(0, 10)) {
      const exactMatch = await pool.query(
        'SELECT id, title, year FROM movies WHERE title = $1 LIMIT 1',
        [title]
      );

      const fuzzyMatch = await pool.query(
        'SELECT id, title, year FROM movies WHERE LOWER(title) LIKE LOWER($1) LIMIT 3',
        [`%${title}%`]
      );

      console.log(`"${title}" (${count} occurrences)`);
      console.log(`  Exact match: ${exactMatch.rows.length > 0 ? 'YES' : 'NO'}`);
      if (exactMatch.rows.length > 0) {
        console.log(`    → ${exactMatch.rows[0].title} (${exactMatch.rows[0].year}) [ID: ${exactMatch.rows[0].id}]`);
      }
      if (fuzzyMatch.rows.length > 0) {
        console.log(`  Fuzzy matches:`);
        fuzzyMatch.rows.forEach(m => {
          console.log(`    → ${m.title} (${m.year}) [ID: ${m.id}]`);
        });
      } else {
        console.log(`  Fuzzy matches: NONE - title not in database`);
      }
      console.log('');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
})();
