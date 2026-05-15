#!/usr/bin/env node
/**
 * MoreIdeas Matching Failure Audit (OPTIMIZED)
 *
 * Analyzes MoreIdeas recommendations to determine matching success rates
 * FIXED: Batched queries, SQL-based sampling, progress indicators
 *
 * Usage:
 *   node scripts/audit-moreideas-matching-fixed.cjs [sample_size]
 *   node scripts/audit-moreideas-matching-fixed.cjs 100  (default: 100)
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ANSI colors
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Normalize title for fuzzy matching
function normalizeTitle(title) {
  if (!title) return '';

  return title
    .toLowerCase()
    .trim()
    .replace(/[:\-,\.!?']/g, '')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Categorize why a match failed
function categorizeFailure(recommended, dbMovie) {
  const reasons = [];

  if (!dbMovie) {
    return ['not_in_database'];
  }

  const recTitle = normalizeTitle(recommended.title);
  const dbTitle = normalizeTitle(dbMovie.title);

  if (recTitle !== dbTitle) {
    const recNoPunct = recommended.title.replace(/[^\w\s]/g, '');
    const dbNoPunct = dbMovie.title.replace(/[^\w\s]/g, '');
    if (recNoPunct.toLowerCase() === dbNoPunct.toLowerCase()) {
      reasons.push('punctuation');
    } else {
      reasons.push('title_mismatch');
    }
  }

  if (recommended.year !== dbMovie.year) {
    const yearDiff = Math.abs(recommended.year - dbMovie.year);
    if (yearDiff <= 2) {
      reasons.push(`year_drift_${yearDiff}`);
    } else {
      reasons.push('year_mismatch');
    }
  }

  return reasons.length > 0 ? reasons : ['unknown'];
}

async function auditMoreIdeasMatching() {
  const sampleSize = parseInt(process.argv[2]) || 100;

  console.log(`${colors.bold}${colors.blue}MoreIdeas Matching Failure Audit (OPTIMIZED)${colors.reset}`);
  console.log(`${colors.cyan}Date range: Created before 2026-05-09${colors.reset}`);
  console.log(`${colors.cyan}Sample size: ${sampleSize} source movies${colors.reset}\n`);

  try {
    // Step 1: Get sampled MoreIdeas records using SQL RANDOM()
    console.log(`${colors.blue}📊 Fetching sampled MoreIdeas records...${colors.reset}`);

    const moreIdeasResult = await pool.query(
      `SELECT
        tmdb_id,
        ideas,
        created_at
       FROM more_ideas
       WHERE created_at < '2026-05-09'
       ORDER BY RANDOM()
       LIMIT $1`,
      [sampleSize]
    );

    const records = moreIdeasResult.rows;
    console.log(`Sampled ${colors.bold}${records.length}${colors.reset} MoreIdeas records\n`);

    if (records.length === 0) {
      console.log(`${colors.yellow}No MoreIdeas records found before 2026-05-09${colors.reset}`);
      return;
    }

    // Step 2: Parse all recommendations from sampled records
    const recommendations = [];
    let totalRecommendations = 0;

    for (const record of records) {
      if (!record.ideas || !Array.isArray(record.ideas)) {
        continue;
      }

      record.ideas.forEach((idea, index) => {
        if (idea.title && idea.year) {
          recommendations.push({
            sourceMovie: record.tmdb_id,
            title: idea.title,
            year: parseInt(idea.year),
            createdAt: record.created_at,
            position: index,
          });
          totalRecommendations++;
        }
      });
    }

    console.log(`${colors.blue}🎬 Extracted ${colors.bold}${totalRecommendations}${colors.reset}${colors.blue} recommendations (${(totalRecommendations / records.length).toFixed(1)} per movie)${colors.reset}\n`);

    // Step 3: BATCHED exact match lookup (1 query instead of N queries)
    console.log(`${colors.blue}🔍 Batch matching recommendations...${colors.reset}`);

    const batchSize = 1000; // PostgreSQL parameter limit
    const results = {
      exactMatch: 0,
      fuzzyMatch: 0,
      noMatch: 0,
      failures: [],
      failureReasons: {},
    };

    const exactMatchMap = new Map();
    const fuzzyMatchMap = new Map();

    // Process in batches to avoid parameter limit
    for (let i = 0; i < recommendations.length; i += batchSize) {
      const batch = recommendations.slice(i, i + batchSize);

      console.log(`  Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(recommendations.length/batchSize)}...`);

      // Batch exact matches with explicit type casting
      const exactValues = batch.map((_, idx) => `($${idx * 2 + 1}::text, $${idx * 2 + 2}::integer)`).join(',');
      const exactParams = batch.flatMap(r => [r.title, r.year]);

      const exactResult = await pool.query(
        `SELECT title, year, tmdb_id
         FROM movies
         WHERE (title, year) IN (VALUES ${exactValues})`,
        exactParams
      );

      exactResult.rows.forEach(row => {
        const key = `${row.title}|${row.year}`;
        exactMatchMap.set(key, row);
      });

      // Batch fuzzy matches (for items not exact matched)
      const fuzzyBatch = batch.filter(r => !exactMatchMap.has(`${r.title}|${r.year}`));

      if (fuzzyBatch.length > 0) {
        // Build OR conditions for fuzzy matching (title ILIKE and year within ±2)
        const fuzzyConditions = fuzzyBatch.map((_, idx) => {
          const titleParam = idx * 3 + 1;
          const yearMinParam = idx * 3 + 2;
          const yearMaxParam = idx * 3 + 3;
          return `(LOWER(title) = LOWER($${titleParam}) AND year BETWEEN $${yearMinParam} AND $${yearMaxParam})`;
        }).join(' OR ');

        const fuzzyParams = fuzzyBatch.flatMap(r => [r.title, r.year - 2, r.year + 2]);

        const fuzzyResult = await pool.query(
          `SELECT title, year, tmdb_id
           FROM movies
           WHERE ${fuzzyConditions}`,
          fuzzyParams
        );

        fuzzyResult.rows.forEach(row => {
          const key = `${row.title.toLowerCase()}|${row.year}`;
          fuzzyMatchMap.set(key, row);
        });
      }
    }

    console.log(`${colors.green}✅ Batch matching complete${colors.reset}\n`);

    // Step 4: Categorize results
    for (const rec of recommendations) {
      const exactKey = `${rec.title}|${rec.year}`;

      if (exactMatchMap.has(exactKey)) {
        results.exactMatch++;
        continue;
      }

      // Check fuzzy matches - look for movies with same title (case-insensitive) within ±2 years
      let foundFuzzy = false;
      const recTitleLower = rec.title.toLowerCase();

      for (const [key, movie] of fuzzyMatchMap) {
        const [mapTitle, mapYear] = key.split('|');
        if (mapTitle === recTitleLower && Math.abs(parseInt(mapYear) - rec.year) <= 2) {
          results.fuzzyMatch++;
          foundFuzzy = true;

          const reasons = categorizeFailure(rec, movie);
          reasons.forEach(reason => {
            results.failureReasons[reason] = (results.failureReasons[reason] || 0) + 1;
          });
          break;
        }
      }

      if (!foundFuzzy) {
        results.noMatch++;
        results.failures.push({
          title: rec.title,
          year: rec.year,
          sourceMovie: rec.sourceMovie,
        });
        results.failureReasons['not_in_database'] = (results.failureReasons['not_in_database'] || 0) + 1;
      }
    }

    // Step 5: Generate report
    const analyzedCount = totalRecommendations;
    console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}                     Results Summary${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.cyan}Source movies analyzed: ${colors.bold}${records.length}${colors.reset}`);
    console.log(`${colors.cyan}Total recommendations checked: ${colors.bold}${analyzedCount}${colors.reset}\n`);

    const exactPct = ((results.exactMatch / analyzedCount) * 100).toFixed(1);
    const fuzzyPct = ((results.fuzzyMatch / analyzedCount) * 100).toFixed(1);
    const noMatchPct = ((results.noMatch / analyzedCount) * 100).toFixed(1);

    console.log(`${colors.green}✅ Exact matches: ${colors.bold}${results.exactMatch}${colors.reset}${colors.green} (${exactPct}%)${colors.reset}`);
    console.log(`   → Perfect match: title + year exact\n`);

    console.log(`${colors.yellow}⚠️  Fuzzy matches: ${colors.bold}${results.fuzzyMatch}${colors.reset}${colors.yellow} (${fuzzyPct}%)${colors.reset}`);
    console.log(`   → Required normalization (punctuation/year drift)\n`);

    console.log(`${colors.red}❌ No matches: ${colors.bold}${results.noMatch}${colors.reset}${colors.red} (${noMatchPct}%)${colors.reset}`);
    console.log(`   → Failed to find in database → Potential UseOnce violation\n`);

    // Failure breakdown
    if (Object.keys(results.failureReasons).length > 0) {
      console.log(`${colors.bold}${colors.yellow}Failure Reasons:${colors.reset}`);
      Object.entries(results.failureReasons)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count]) => {
          const pct = ((count / (results.fuzzyMatch + results.noMatch)) * 100).toFixed(1);
          console.log(`  ${reason.padEnd(25)} ${count.toString().padStart(5)} (${pct}%)`);
        });
      console.log();
    }

    // Impact analysis
    console.log(`${colors.bold}${colors.cyan}Impact Analysis:${colors.reset}`);
    const potentialDuplicates = results.fuzzyMatch + results.noMatch;
    const wastedTMDBCalls = results.noMatch;
    const estimatedCost = wastedTMDBCalls * 0.003;

    console.log(`  Recommendations needing fuzzy logic: ${colors.bold}${potentialDuplicates}${colors.reset}`);
    console.log(`  Potential wasted TMDB calls: ${colors.bold}${wastedTMDBCalls}${colors.reset}`);
    console.log(`  Estimated wasted cost: ${colors.bold}$${estimatedCost.toFixed(2)}${colors.reset}\n`);

    // Sample failures
    if (results.failures.length > 0) {
      console.log(`${colors.bold}${colors.red}Top 20 Failed Matches:${colors.reset}`);
      results.failures.slice(0, 20).forEach((failure, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. "${failure.title}" (${failure.year})`);
      });
      console.log();
    }

    // Recommendations
    console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}Recommendation:${colors.reset}`);

    if (results.fuzzyMatch > analyzedCount * 0.1) {
      console.log(`  ${colors.yellow}⚠️  ${fuzzyPct}% of matches required fuzzy logic${colors.reset}`);
      console.log(`  ${colors.yellow}→ Consider implementing fuzzy matching for lookups${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✅ Fuzzy match rate is low (${fuzzyPct}%)${colors.reset}`);
    }

    if (results.noMatch > analyzedCount * 0.2) {
      console.log(`  ${colors.red}🚨 ${noMatchPct}% failed to match (UseOnce violation risk)${colors.reset}`);
      console.log(`  ${colors.red}→ HIGH PRIORITY: Implement better matching logic${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✅ No-match rate is acceptable (${noMatchPct}%)${colors.reset}`);
    }

    console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}Error during audit:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run audit
auditMoreIdeasMatching();
