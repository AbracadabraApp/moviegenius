/**
 * Cleanup Duplicate Analyses - Keep newest analysis per movie
 *
 * Deletes older duplicate analyses, keeping only the most recent one per movie.
 *
 * Usage:
 *   node scripts/cleanup-duplicate-analyses.js [--dry-run]
 *
 * Options:
 *   --dry-run  Show what would be deleted without actually deleting
 */

import { getPool } from '../lib/railway-db.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log('🧹 Duplicate Analysis Cleanup Script');
console.log('====================================\n');
if (dryRun) console.log('🧪 DRY RUN MODE - No deletions\n');

async function cleanupDuplicates() {
  const pool = getPool();

  try {
    // Find all duplicate analyses (keeping newest per movie)
    const query = `
      WITH ranked_analyses AS (
        SELECT
          ma.id,
          ma.movie_id,
          m.title,
          m.year,
          ma.created_at,
          ma.updated_at,
          ROW_NUMBER() OVER (
            PARTITION BY ma.movie_id
            ORDER BY COALESCE(ma.updated_at, ma.created_at) DESC
          ) as row_num
        FROM movie_analyses ma
        JOIN movies m ON ma.movie_id = m.id
        WHERE ma.claude_response->>'raw_content' LIKE '{%'
      )
      SELECT id, movie_id, title, year, created_at, updated_at
      FROM ranked_analyses
      WHERE row_num > 1
      ORDER BY title, year;
    `;

    const result = await pool.query(query);
    const duplicates = result.rows;

    console.log(`📊 Found ${duplicates.length} duplicate analyses to delete\n`);

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    // Show sample of what will be deleted
    console.log('Sample of analyses to be deleted (showing first 10):');
    duplicates.slice(0, 10).forEach((dup, idx) => {
      console.log(`${idx + 1}. ${dup.title} (${dup.year}) - Created: ${dup.created_at?.toISOString().substring(0, 10) || 'unknown'}`);
    });
    console.log('');

    if (dryRun) {
      console.log('🧪 DRY RUN - No deletions performed');
      console.log(`Would delete ${duplicates.length} duplicate analyses`);
    } else {
      // Delete duplicates
      console.log(`🗑️  Deleting ${duplicates.length} duplicate analyses...`);

      const deleteQuery = `
        DELETE FROM movie_analyses
        WHERE id = ANY($1::uuid[])
      `;

      const idsToDelete = duplicates.map(d => d.id);
      await pool.query(deleteQuery, [idsToDelete]);

      console.log(`✅ Deleted ${duplicates.length} duplicate analyses`);
    }

    // Show final count
    const countQuery = `
      SELECT COUNT(*) as total_analyses, COUNT(DISTINCT movie_id) as unique_movies
      FROM movie_analyses
      WHERE claude_response->>'raw_content' LIKE '{%'
    `;
    const countResult = await pool.query(countQuery);

    console.log('\n📊 Final Statistics:');
    console.log(`   Total analyses: ${countResult.rows[0].total_analyses}`);
    console.log(`   Unique movies: ${countResult.rows[0].unique_movies}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupDuplicates();