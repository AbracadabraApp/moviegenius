#!/usr/bin/env node
/**
 * Fast backfill: Copy tmdbId from existing entries to missing ones
 *
 * Strategy: If "Mulholland Drive (2001)" has tmdbId in 158 lists,
 * copy that same tmdbId to the 677 lists where it's null.
 *
 * This is MUCH faster than title+year lookup per entry.
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function backfillFromExisting() {
  console.log('🔍 Starting fast backfill from existing tmdbId values...\n');

  try {
    // Step 1: Build lookup map of title+year → tmdbId from existing data
    console.log('📊 Building lookup map from existing entries...');

    const { rows: existingMappings } = await pool.query(`
      SELECT DISTINCT
        idea->>'title' as title,
        idea->>'year' as year,
        (idea->>'tmdbId')::integer as tmdb_id
      FROM more_ideas
      CROSS JOIN jsonb_array_elements(ideas) as idea
      WHERE idea->>'tmdbId' IS NOT NULL
        AND idea->>'title' IS NOT NULL
        AND idea->>'year' IS NOT NULL
    `);

    console.log(`✅ Found ${existingMappings.length} unique title+year → tmdbId mappings\n`);

    // Build lookup map
    const lookupMap = new Map();
    for (const row of existingMappings) {
      const key = `${row.title}|${row.year}`;
      lookupMap.set(key, row.tmdb_id);
    }

    // Step 2: Update entries with null tmdbId
    console.log('🔄 Updating entries with missing tmdbId...\n');

    const { rows: moreIdeasRows } = await pool.query(`
      SELECT id, tmdb_id, ideas
      FROM more_ideas
      ORDER BY id
    `);

    let totalUpdated = 0;
    let totalFixed = 0;
    let totalUnfixable = 0;

    for (const row of moreIdeasRows) {
      const ideas = row.ideas;
      let modified = false;

      for (const idea of ideas) {
        // Skip if already has tmdbId
        if (idea.tmdbId) continue;

        // Look up in our map
        const key = `${idea.title}|${idea.year}`;
        const foundId = lookupMap.get(key);

        if (foundId) {
          idea.tmdbId = foundId;
          totalFixed++;
          modified = true;
          console.log(`✅ Fixed: "${idea.title}" (${idea.year}) -> tmdbId=${foundId}`);
        } else {
          totalUnfixable++;
          console.log(`❌ No mapping: "${idea.title}" (${idea.year})`);
        }
      }

      // Update the row if modified
      if (modified) {
        await pool.query(`
          UPDATE more_ideas
          SET ideas = $1, updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(ideas), row.id]);

        totalUpdated++;
      }
    }

    console.log('\n📈 Backfill Summary:');
    console.log(`   Entries fixed: ${totalFixed}`);
    console.log(`   Entries unfixable: ${totalUnfixable}`);
    console.log(`   Rows updated: ${totalUpdated}`);

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the backfill
backfillFromExisting()
  .then(() => {
    console.log('\n✅ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });
