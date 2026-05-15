/**
 * Purge TV shows from MoreIdeas recommendations
 *
 * Strategy:
 * 1. Identify TV shows using keyword patterns
 * 2. Remove known TV shows from blocklist
 * 3. Update more_ideas JSONB arrays
 * 4. Report stats
 */

const { Pool } = require('pg');

// TV show detection patterns
const TV_SHOW_KEYWORDS = [
  /season \d+/i,
  /s\d{2}e\d{2}/i,
  /: the series/i,
  /: season/i,
  /- season/i,
  /tv special/i,
  /television special/i,
  /tv movie/i,
  /series finale/i,
  /pilot episode/i,
  /the complete series/i,
  /collection:/i  // Often used for TV box sets
];

// Movie exceptions (titles that match patterns but are actually movies)
const MOVIE_EXCEPTIONS = [
  { title: 'Halloween III: Season of the Witch', year: 1982 },
  // Add more exceptions as discovered
];

// Known TV shows identified from TMDB test
const KNOWN_TV_SHOWS = [
  { title: 'My Brilliant Friend', year: 2018 },
  { title: 'The Sinner', year: 2017 },
  { title: 'Gurren Lagann', year: 2007 },
  { title: 'SSSS.Gridman', year: 2018 },
  { title: 'Angie Tribeca', year: 2018 },
  { title: 'Mayberry R.F.D.', year: 1968 },
  { title: 'Ultraman Nexus', year: 2004 },
  { title: 'Tensou Sentai Goseiger', year: 2010 },
  { title: 'Beautiful People', year: 2000 },
  { title: 'Wicked City', year: 1992 },
  { title: 'The Department', year: 2007 },
  { title: 'WordGirl', year: 2006 },
  { title: 'Buck Rogers in the 25th Century', year: 1979 },
  { title: 'In Sickness and in Health', year: 1979 },
  { title: 'The Innocent Man', year: 2018 }
];

// Dry run mode (set to false to actually purge)
const DRY_RUN = process.argv.includes('--execute') ? false : true;

async function purgeTVShows() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TV SHOW PURGE SCRIPT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
    console.log('Run with --execute flag to actually purge\n');
  } else {
    console.log('🔴 LIVE MODE - Changes will be committed to database\n');
  }

  const stats = {
    totalRows: 0,
    totalIdeas: 0,
    removedByKeyword: 0,
    removedByKnownList: 0,
    rowsModified: 0,
    rowsDeleted: 0
  };

  const removedSamples = [];

  try {
    // Get all more_ideas entries
    const result = await pool.query('SELECT id, tmdb_id, ideas FROM more_ideas');
    stats.totalRows = result.rows.length;

    console.log(`Processing ${stats.totalRows} more_ideas entries...\n`);

    for (const row of result.rows) {
      const ideas = row.ideas;
      stats.totalIdeas += ideas.length;

      let modified = false;

      const filteredIdeas = ideas.filter(idea => {
        const title = idea.title;
        const year = idea.year;

        // Check movie exceptions first (don't remove these)
        const isException = MOVIE_EXCEPTIONS.some(
          movie => movie.title.toLowerCase() === title.toLowerCase() && movie.year === year
        );

        if (isException) {
          return true; // Keep exceptions
        }

        // Check keywords
        for (const pattern of TV_SHOW_KEYWORDS) {
          if (pattern.test(title)) {
            if (removedSamples.length < 20) {
              removedSamples.push({ title, year, reason: 'keyword', pattern: pattern.toString() });
            }
            stats.removedByKeyword++;
            modified = true;
            return false;
          }
        }

        // Check known TV shows
        const isKnownTV = KNOWN_TV_SHOWS.some(
          tv => tv.title.toLowerCase() === title.toLowerCase() && tv.year === year
        );

        if (isKnownTV) {
          if (removedSamples.length < 20) {
            removedSamples.push({ title, year, reason: 'known_tv' });
          }
          stats.removedByKnownList++;
          modified = true;
          return false;
        }

        return true; // Keep this idea
      });

      if (modified) {
        stats.rowsModified++;

        if (!DRY_RUN) {
          if (filteredIdeas.length === 0) {
            // Delete the row if no ideas remain
            await pool.query('DELETE FROM more_ideas WHERE id = $1', [row.id]);
            stats.rowsDeleted++;
          } else {
            // Update the row with filtered ideas
            await pool.query(
              'UPDATE more_ideas SET ideas = $1, updated_at = NOW() WHERE id = $2',
              [JSON.stringify(filteredIdeas), row.id]
            );
          }
        }
      }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('PURGE COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('STATISTICS:');
    console.log(`  Total more_ideas rows:        ${stats.totalRows}`);
    console.log(`  Total ideas (before):         ${stats.totalIdeas}`);
    console.log(`  Rows modified:                ${stats.rowsModified} (${((stats.rowsModified / stats.totalRows) * 100).toFixed(1)}%)`);
    console.log(`  Rows deleted (empty):         ${stats.rowsDeleted}`);
    console.log('');
    console.log('REMOVALS:');
    console.log(`  Removed by keyword:           ${stats.removedByKeyword}`);
    console.log(`  Removed by known list:        ${stats.removedByKnownList}`);
    console.log(`  Total removed:                ${stats.removedByKeyword + stats.removedByKnownList}`);
    console.log(`  Removal rate:                 ${((stats.removedByKeyword + stats.removedByKnownList) / stats.totalIdeas * 100).toFixed(2)}%`);

    if (removedSamples.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('SAMPLE REMOVALS (First 20)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      removedSamples.forEach((sample, idx) => {
        if (sample.reason === 'keyword') {
          console.log(`${idx + 1}. "${sample.title}" (${sample.year})`);
          console.log(`   Reason: Matched pattern ${sample.pattern}\n`);
        } else {
          console.log(`${idx + 1}. "${sample.title}" (${sample.year})`);
          console.log(`   Reason: Known TV show from blocklist\n`);
        }
      });
    }

    if (DRY_RUN) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('⚠️  DRY RUN - No changes were made to the database');
      console.log('Run with --execute flag to commit changes');
      console.log('═══════════════════════════════════════════════════════════════\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

purgeTVShows();
