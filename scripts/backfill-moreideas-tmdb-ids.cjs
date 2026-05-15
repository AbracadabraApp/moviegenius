#!/usr/bin/env node
/**
 * Backfill missing tmdb_id values in more_ideas JSONB array
 *
 * Problem: more_ideas.ideas[] entries have tmdb_id: null, causing:
 * - Missing posters in iOS app
 * - Non-clickable cards (no navigation)
 *
 * Solution: Match by title + year to movies table and populate tmdb_id
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function backfillMoreIdeasTmdbIds() {
  console.log('🔍 Starting backfill of more_ideas tmdb_id values...\n');

  try {
    // Get all more_ideas entries
    const { rows: moreIdeasRows } = await pool.query(`
      SELECT id, tmdb_id, ideas
      FROM more_ideas
      ORDER BY id
    `);

    console.log(`📊 Found ${moreIdeasRows.length} more_ideas entries to process\n`);

    let totalIdeas = 0;
    let updatedIdeas = 0;
    let matchedIdeas = 0;
    let unmatchedIdeas = 0;

    for (const row of moreIdeasRows) {
      const ideas = row.ideas;
      let modified = false;

      for (const idea of ideas) {
        totalIdeas++;

        // Skip if already has tmdb_id
        if (idea.tmdb_id) {
          continue;
        }

        // Try to find matching movie by title and year
        const { rows: matches } = await pool.query(`
          SELECT tmdb_id, poster_url
          FROM movies
          WHERE title = $1 AND year = $2
          LIMIT 1
        `, [idea.title, idea.year]);

        if (matches.length > 0) {
          const match = matches[0];
          idea.tmdb_id = match.tmdb_id;

          // Also update poster_url if missing
          if (!idea.poster_url && match.poster_url) {
            idea.poster_url = match.poster_url;
          }

          matchedIdeas++;
          modified = true;
          console.log(`✅ Matched: "${idea.title}" (${idea.year}) -> tmdb_id=${match.tmdb_id}`);
        } else {
          unmatchedIdeas++;
          console.log(`❌ No match: "${idea.title}" (${idea.year})`);
        }
      }

      // Update the row if any ideas were modified
      if (modified) {
        await pool.query(`
          UPDATE more_ideas
          SET ideas = $1, updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(ideas), row.id]);

        updatedIdeas++;
      }
    }

    console.log('\n📈 Backfill Summary:');
    console.log(`   Total ideas processed: ${totalIdeas}`);
    console.log(`   Ideas matched: ${matchedIdeas}`);
    console.log(`   Ideas unmatched: ${unmatchedIdeas}`);
    console.log(`   Entries updated: ${updatedIdeas}`);

    if (unmatchedIdeas > 0) {
      console.log('\n⚠️  Some ideas could not be matched. Common reasons:');
      console.log('   - Title spelling differences');
      console.log('   - Movie not in movies table');
      console.log('   - Year mismatch');
    }

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the backfill
backfillMoreIdeasTmdbIds()
  .then(() => {
    console.log('\n✅ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });
