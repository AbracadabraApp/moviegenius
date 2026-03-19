#!/usr/bin/env node

/**
 * Expand Small Browse Collections Using More Ideas
 *
 * Strategy:
 * 1. Find collections with 4-9 movies
 * 2. For each collection, get More Ideas suggestions from existing movies
 * 3. Rank suggestions by frequency (how many collection movies suggest them)
 * 4. Add top suggestions until collection reaches 10 movies
 * 5. Preview changes before committing
 */

import { getRailwayClient } from '../lib/railway-db.js';

async function expandCollections(options = {}) {
  const {
    dryRun = true,
    targetSize = 10,
    minSize = 4,
    maxSize = 9,
    sampleSize = 10
  } = options;

  console.log('🔍 Expanding Browse Collections with More Ideas\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE (will commit changes)'}\n`);
  console.log(`Target: Collections with ${minSize}-${maxSize} movies → ${targetSize}+ movies\n`);
  console.log('='.repeat(80));

  const client = getRailwayClient();

  try {
    await client.connect();

    // Step 1: Get small collections
    const collectionsQuery = await client.query(`
      SELECT id, title, total_movies
      FROM browse_lists
      WHERE status = 'active'
        AND total_movies >= $1
        AND total_movies <= $2
      ORDER BY total_movies DESC, title
      LIMIT $3
    `, [minSize, maxSize, sampleSize]);

    const collections = collectionsQuery.rows;
    console.log(`\n📊 Found ${collections.length} collections to process\n`);

    let totalAdded = 0;
    let collectionsExpanded = 0;

    for (const collection of collections) {
      console.log(`\n--- "${collection.title}" (${collection.total_movies} movies) ---\n`);

      // Step 2: Get existing movies in collection
      const existingMoviesQuery = await client.query(`
        SELECT m.id, m.title, m.year, m.tmdb_id
        FROM movies m
        JOIN list_movies lm ON m.id = lm.movie_id
        WHERE lm.list_id = $1
        ORDER BY lm.display_order
      `, [collection.id]);

      const existingMovies = existingMoviesQuery.rows;
      const existingMovieIds = new Set(existingMovies.map(m => m.id));

      console.log(`Current movies (${existingMovies.length}):`);
      existingMovies.forEach((m, i) => {
        console.log(`  ${i+1}. ${m.title} (${m.year})`);
      });

      // Step 3: Get More Ideas suggestions from existing movies
      // Note: more_ideas uses tmdb_id, need to join with movies table
      const suggestionsQuery = await client.query(`
        SELECT
          m.id as movie_id,
          m.title,
          m.year,
          mi.ideas,
          COUNT(*) OVER () as total_source_movies
        FROM more_ideas mi
        JOIN movies m ON mi.tmdb_id = m.tmdb_id
        WHERE mi.tmdb_id IN (
          SELECT tmdb_id FROM movies WHERE id = ANY($1::uuid[])
        )
      `, [existingMovies.map(m => m.id)]);

      // Extract all suggested movies from More Ideas JSONB
      const suggestionCounts = new Map();

      suggestionsQuery.rows.forEach(row => {
        const ideas = row.ideas || [];
        ideas.forEach(idea => {
          const key = `${idea.title}|${idea.year}`;
          if (!suggestionCounts.has(key)) {
            suggestionCounts.set(key, {
              title: idea.title,
              year: idea.year,
              reason: idea.reason,
              count: 0,
              sources: []
            });
          }
          const suggestion = suggestionCounts.get(key);
          suggestion.count++;
          suggestion.sources.push(row.title);
        });
      });

      // Step 4: Find suggested movies in database and filter out existing
      const candidatesQuery = await client.query(`
        SELECT id, title, year
        FROM movies
        WHERE (title, year) IN (
          ${Array.from(suggestionCounts.keys()).map((_, i) =>
            `($${i*2 + 1}, $${i*2 + 2})`
          ).join(', ')}
        )
      `, Array.from(suggestionCounts.keys()).flatMap(key => key.split('|')));

      const candidates = candidatesQuery.rows
        .filter(m => !existingMovieIds.has(m.id))
        .map(m => {
          const key = `${m.title}|${m.year}`;
          const suggestion = suggestionCounts.get(key);
          return {
            ...m,
            suggestionCount: suggestion.count,
            reason: suggestion.reason,
            sources: suggestion.sources.slice(0, 3) // Show top 3 sources
          };
        })
        .sort((a, b) => b.suggestionCount - a.suggestionCount);

      // Step 5: Select top candidates to reach target size
      const needed = targetSize - collection.total_movies;
      const toAdd = candidates.slice(0, needed);

      if (toAdd.length === 0) {
        console.log(`\n⚠️  No suitable suggestions found (might need broader More Ideas data)`);
        continue;
      }

      console.log(`\n✨ Suggested additions (${toAdd.length} movies):\n`);
      toAdd.forEach((movie, i) => {
        console.log(`  ${i+1}. ${movie.title} (${movie.year})`);
        console.log(`     Suggested by ${movie.suggestionCount} existing movie(s)`);
        console.log(`     Example sources: ${movie.sources.join(', ')}`);
        console.log(`     Reason: ${movie.reason?.substring(0, 100)}...`);
      });

      if (!dryRun) {
        // Step 6: Add movies to collection
        const nextOrder = collection.total_movies + 1;
        for (let i = 0; i < toAdd.length; i++) {
          await client.query(`
            INSERT INTO list_movies (list_id, movie_id, relevance_score, display_order, added_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (list_id, movie_id) DO NOTHING
          `, [collection.id, toAdd[i].id, 0.75, nextOrder + i]);
        }

        // Update total_movies count
        await client.query(`
          UPDATE browse_lists
          SET total_movies = total_movies + $1,
              updated_at = NOW()
          WHERE id = $2
        `, [toAdd.length, collection.id]);

        totalAdded += toAdd.length;
        collectionsExpanded++;
        console.log(`\n✅ Added ${toAdd.length} movies to collection`);
      } else {
        totalAdded += toAdd.length;
        collectionsExpanded++;
        console.log(`\n📝 Would add ${toAdd.length} movies (dry run mode)`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY\n');
    console.log(`Collections processed: ${collections.length}`);
    console.log(`Collections expanded: ${collectionsExpanded}`);
    console.log(`Total movies ${dryRun ? 'that would be' : ''} added: ${totalAdded}`);
    console.log(`Average per collection: ${(totalAdded / collectionsExpanded).toFixed(1)}`);

    if (dryRun) {
      console.log('\n💡 Run with --live flag to commit changes');
      console.log('   Example: node scripts/expand-collections-more-ideas.js --live');
    }

    await client.end();

  } catch (error) {
    console.error('\n❌ Expansion failed:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

// Parse command line args
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: !args.includes('--live'),
    sampleSize: args.includes('--full') ? 1335 : 10
  };

  expandCollections(options);
}

export { expandCollections };
