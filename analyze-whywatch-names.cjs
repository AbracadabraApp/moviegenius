#!/usr/bin/env node

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const sample = await pool.query(`
      SELECT
        eww.reasons,
        m.title,
        m.year
      FROM enhanced_why_watch eww
      JOIN movies m ON m.tmdb_id = eww.tmdb_id
      ORDER BY RANDOM()
      LIMIT 100
    `);

    let totalReasons = 0;
    let reasonsWithPossessives = 0;
    let reasonsWithFullNames = 0;
    let potentialFalsePositives = 0;

    const falsePositiveKeywords = [
      'Best', 'Perfect', 'Pure', 'Dark', 'Deep', 'Great', 'True',
      'Bold', 'Brilliant', 'Classic', 'Modern', 'Rare', 'Real',
      'Wild', 'Raw', 'Fresh', 'Sharp', 'Smart', 'Clever', 'Unique',
      'Revolutionary', 'Groundbreaking', 'Essential', 'Intense'
    ];

    sample.rows.forEach(row => {
      const reasons = typeof row.reasons === 'string' ? JSON.parse(row.reasons) : row.reasons;

      reasons.forEach(reason => {
        totalReasons++;

        // Pattern 1: Name's (possessive - highly likely real name)
        if (reason.includes("'s ")) {
          reasonsWithPossessives++;
        }

        // Pattern 2: Full Name (First Last - likely real name)
        const fullNamePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+/;
        if (fullNamePattern.test(reason)) {
          reasonsWithFullNames++;
        }

        // Check for false positive keywords
        const capitalizedWords = reason.match(/\b[A-Z][a-z]+/g) || [];
        capitalizedWords.forEach(word => {
          if (falsePositiveKeywords.includes(word)) {
            potentialFalsePositives++;
          }
        });
      });
    });

    console.log('📊 Name Pattern Analysis (100 movie sample):\n');
    console.log(`Total reasons: ${totalReasons}`);
    console.log(`\nLikely REAL names:`);
    console.log(`  With possessive (Name's): ${reasonsWithPossessives} (${(reasonsWithPossessives/totalReasons*100).toFixed(1)}%)`);
    console.log(`  Full names (First Last): ${reasonsWithFullNames} (${(reasonsWithFullNames/totalReasons*100).toFixed(1)}%)`);
    console.log(`  Total real name patterns: ${reasonsWithPossessives + reasonsWithFullNames} (${((reasonsWithPossessives + reasonsWithFullNames)/totalReasons*100).toFixed(1)}%)`);
    console.log(`\nPotential FALSE positives:`);
    console.log(`  Adjective/keyword matches: ${potentialFalsePositives} (${(potentialFalsePositives/totalReasons*100).toFixed(1)}%)`);

    const totalReasonsAll = 19954 * 3;
    const estimatedRealNames = Math.round((reasonsWithPossessives + reasonsWithFullNames) / totalReasons * totalReasonsAll);
    const estimatedFalsePositives = Math.round(potentialFalsePositives / totalReasons * totalReasonsAll);

    console.log(`\n📈 Extrapolated to all 59,862 reasons:`);
    console.log(`  Real person names: ~${estimatedRealNames.toLocaleString()}`);
    console.log(`  False positive keywords: ~${estimatedFalsePositives.toLocaleString()}`);
    if (estimatedRealNames > 0) {
      console.log(`  False positive rate: ~${(estimatedFalsePositives/estimatedRealNames*100).toFixed(1)}%`);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
})();
