const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // Get sample of records with 0 links that should have had name patterns
    const sample = await pool.query(`
      SELECT
        eww.reasons,
        m.title,
        m.year
      FROM enhanced_why_watch eww
      JOIN movies m ON m.tmdb_id = eww.tmdb_id
      WHERE eww.link_count = 0
      ORDER BY RANDOM()
      LIMIT 30
    `);

    console.log('Sample records with NO links:\n');

    let totalNamePatterns = 0;
    let recordsWithNames = 0;

    for (const row of sample.rows) {
      const reasons = typeof row.reasons === 'string' ? JSON.parse(row.reasons) : row.reasons;
      let hasNames = false;

      reasons.forEach(reason => {
        // Possessive pattern
        const possessivePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})'s\b/g;
        const possessiveMatches = [...reason.matchAll(possessivePattern)];

        // Full name pattern (only if no possessive)
        let fullNameMatches = [];
        if (!reason.includes("'s")) {
          const fullNamePattern = /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
          fullNameMatches = [...reason.matchAll(fullNamePattern)];
        }

        const totalMatches = possessiveMatches.length + fullNameMatches.length;

        if (totalMatches > 0) {
          if (!hasNames) {
            console.log(`${row.title} (${row.year})`);
            hasNames = true;
            recordsWithNames++;
          }
          console.log(`  ❌ ${reason}`);
          possessiveMatches.forEach(m => {
            console.log(`     Possessive: "${m[1]}"`);
            totalNamePatterns++;
          });
          fullNameMatches.forEach(m => {
            console.log(`     Full name: "${m[1]}"`);
            totalNamePatterns++;
          });
        }
      });

      if (hasNames) console.log('');
    }

    console.log(`\nSummary:`);
    console.log(`  Records with name patterns: ${recordsWithNames}/${sample.rows.length}`);
    console.log(`  Total name patterns found: ${totalNamePatterns}`);
    console.log(`  Expected pattern: Mostly adjectives/descriptors, not real names\n`);

    // Check how many truly have no capitalizations at all
    let noCapitals = 0;
    for (const row of sample.rows) {
      const reasons = typeof row.reasons === 'string' ? JSON.parse(row.reasons) : row.reasons;
      const allText = reasons.join(' ');
      const hasCapital = /[A-Z][a-z]+/.test(allText);
      if (!hasCapital) noCapitals++;
    }

    console.log(`Records with zero capitalized words: ${noCapitals}/${sample.rows.length}`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
})();
