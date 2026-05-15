/**
 * process-awards-to-db.mjs
 *
 * Process scraped award list JSON files and add to MovieGenius database:
 * 1. Resolve titles to TMDB IDs using TMDBResolver
 * 2. Ensure movies exist in database via ensureMovieInDb
 * 3. Create browse_lists entries with proper editorial_data structure
 *
 * Usage:
 *   node scripts/process-awards-to-db.mjs data/palme_dor.json
 *   node scripts/process-awards-to-db.mjs data/all_lists.json --all
 *
 * Input format (from scrape_awards.py WITHOUT --tmdb flag):
 * {
 *   "name": "Cannes Palme d'Or",
 *   "source_url": "https://...",
 *   "description": "...",
 *   "count": 78,
 *   "entries": [
 *     { "year": 2023, "title": "Anatomy of a Fall", "director": "Justine Triet", "country": "France" }
 *   ]
 * }
 */

import fs from 'fs';
import { Pool } from 'pg';
import { getTMDBMovieDetails } from '../lib/services/tmdb-search.js';
import { ensureMovieInDb } from '../lib/services/tmdb-persist.js';
import TMDBResolver from '../lib/tmdb-resolver.js';

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
});

/**
 * Process a single award list JSON file
 */
async function processAwardList(jsonPath, options = {}) {
  const { dryRun = false, debug = false } = options;

  console.log(`\n🏆 Processing: ${jsonPath}\n`);

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // Handle all_lists.json format
  const lists = data.lists ? data.lists : [data];

  const results = [];

  for (const list of lists) {
    console.log(`\n📋 List: ${list.name} (${list.count} entries)\n`);

    const resolver = new TMDBResolver();
    await resolver.init();

    const resolvedMovies = [];
    const notFound = [];

    // Phase 1: Resolve all titles to TMDB IDs
    for (const entry of list.entries) {
      const queryString = entry.year
        ? `${entry.title} (${entry.year})`
        : entry.title;

      if (debug) {
        console.log(`Resolving: "${queryString}"`);
      } else {
        process.stdout.write('.');
      }

      const matches = await resolver.resolve(queryString, { debug });

      if (matches.length > 0) {
        // Use first match (highest confidence)
        resolvedMovies.push({
          ...entry,
          tmdb_id: matches[0].tmdbId,
          matched_title: matches[0].title,
          matched_year: matches[0].year,
          strategy: matches[0].strategy
        });
      } else {
        notFound.push(entry);
      }
    }

    console.log(`\n\n✅ Resolved: ${resolvedMovies.length}/${list.count}`);
    console.log(`❌ Not found: ${notFound.length}/${list.count}\n`);

    if (notFound.length > 0 && debug) {
      console.log('Not found:');
      notFound.forEach(e => {
        console.log(`  - "${e.title}" (${e.year}) - ${e.director}`);
      });
      console.log();
    }

    await resolver.close();

    if (dryRun) {
      console.log('🔍 DRY RUN - Skipping database operations\n');
      results.push({
        listName: list.name,
        resolved: resolvedMovies.length,
        notFound: notFound.length,
        movies: resolvedMovies
      });
      continue;
    }

    // Phase 2: Ensure all movies exist in database
    console.log('💾 Adding movies to database...\n');
    let added = 0;
    let skipped = 0;

    for (const movie of resolvedMovies) {
      try {
        // Fetch full TMDB details
        const tmdbMovie = await getTMDBMovieDetails(movie.tmdb_id);

        if (tmdbMovie) {
          await ensureMovieInDb(tmdbMovie);
          added++;
          if (debug) {
            console.log(`  ✅ ${tmdbMovie.title} (${tmdbMovie.release_date?.substring(0, 4)})`);
          } else {
            process.stdout.write('.');
          }
        } else {
          skipped++;
          console.log(`  ⚠️  TMDB returned no data for ID ${movie.tmdb_id}`);
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (err) {
        console.error(`  ❌ Error adding TMDB ${movie.tmdb_id}: ${err.message}`);
        skipped++;
      }
    }

    console.log(`\n\n✅ Added: ${added}`);
    console.log(`⚠️  Skipped: ${skipped}\n`);

    // Phase 3: Create browse_lists entry
    console.log('📝 Creating browse_lists entry...\n');

    // Clean up list name for chip display (remove "Sight & Sound" prefix)
    const chipName = list.name
      .replace(/^Sight & Sound Greatest Films 2022 — /i, '')
      .replace(/'/g, "'"); // Normalize quotes

    const editorialData = {
      subcategories: [{
        name: chipName,
        full_name: list.name, // Preserve full name for reference
        movies: resolvedMovies.map(m => ({
          tmdb_id: m.tmdb_id,
          title: m.matched_title || m.title,
          year: m.matched_year || m.year,
          director: m.director,
          rank: m.rank || null,
          award_year: m.year
        }))
      }]
    };

    // Determine categories (map award types to MovieGenius categories)
    const categories = inferCategories(list.name);

    const insertQuery = `
      INSERT INTO browse_lists (
        title,
        description,
        source_url,
        categories,
        editorial_data,
        status,
        quality_score,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `;

    try {
      const result = await pool.query(insertQuery, [
        list.name,
        list.description,
        list.source_url,
        categories,
        JSON.stringify(editorialData),
        'active',
        95 // High quality score for curated award lists
      ]);

      console.log(`✅ Created browse_lists entry: ${result.rows[0].id}\n`);

      results.push({
        listName: list.name,
        browseListId: result.rows[0].id,
        resolved: resolvedMovies.length,
        notFound: notFound.length,
        addedToDb: added,
        categories
      });

    } catch (err) {
      console.error(`❌ Error creating browse_lists entry: ${err.message}\n`);
    }
  }

  return results;
}

/**
 * Infer MovieGenius categories from award list name
 */
function inferCategories(listName) {
  const name = listName.toLowerCase();

  // Awards-focused lists get Awards category
  const categories = ['Awards'];

  // Add specific genre if mentioned
  if (name.includes('documentary')) categories.push('Documentary');
  if (name.includes('animation')) categories.push('Animation');
  if (name.includes('foreign')) categories.push('International');

  return categories;
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage:
  node scripts/process-awards-to-db.mjs <json-file> [options]

Options:
  --dry-run     Resolve titles but don't write to database
  --debug       Verbose output with resolution details
  --all         Process all_lists.json (multiple lists)

Examples:
  node scripts/process-awards-to-db.mjs data/palme_dor.json
  node scripts/process-awards-to-db.mjs data/all_lists.json --all --dry-run
    `);
    process.exit(0);
  }

  const jsonPath = args[0];
  const options = {
    dryRun: args.includes('--dry-run'),
    debug: args.includes('--debug')
  };

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    process.exit(1);
  }

  const results = await processAwardList(jsonPath, options);

  console.log('\n=== SUMMARY ===\n');
  results.forEach(r => {
    console.log(`${r.listName}:`);
    console.log(`  Resolved: ${r.resolved}`);
    console.log(`  Not found: ${r.notFound}`);
    if (!options.dryRun) {
      console.log(`  Browse list ID: ${r.browseListId}`);
      console.log(`  Categories: ${r.categories.join(', ')}`);
    }
    console.log();
  });

  await pool.end();
  process.exit(0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { processAwardList };
