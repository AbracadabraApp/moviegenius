#!/usr/bin/env node
/**
 * MoreIdeas Matching Failure Audit
 *
 * Analyzes MoreIdeas recommendations generated before 2026-05-09 to determine:
 * - How many recommended movies matched exactly (title + year)
 * - How many required fuzzy matching (±2 years, punctuation normalization)
 * - How many failed to match (wasted TMDB calls / duplicate rows)
 * - Common failure patterns (punctuation, diacritics, year drift)
 *
 * Usage:
 *   node scripts/audit-moreideas-matching.cjs [sample_size]
 *   node scripts/audit-moreideas-matching.cjs 5000  (default: 5000)
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
    // Remove common punctuation
    .replace(/[:\-,\.!?']/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove diacritics (basic)
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

  // Title differences
  if (recTitle !== dbTitle) {
    // Check for punctuation differences
    const recNoPunct = recommended.title.replace(/[^\w\s]/g, '');
    const dbNoPunct = dbMovie.title.replace(/[^\w\s]/g, '');
    if (recNoPunct.toLowerCase() === dbNoPunct.toLowerCase()) {
      reasons.push('punctuation');
    } else {
      reasons.push('title_mismatch');
    }
  }

  // Year differences
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
  // Parse command line arguments
  const sampleSize = parseInt(process.argv[2]) || 1000;

  console.log(`${colors.bold}${colors.blue}MoreIdeas Matching Failure Audit${colors.reset}`);
  console.log(`${colors.cyan}Date range: Created before 2026-05-09${colors.reset}`);
  console.log(`${colors.cyan}Sample size: ${sampleSize} source movies with MoreIdeas${colors.reset}\n`);

  try {
    // Step 1: Get all MoreIdeas records before 2026-05-09
    console.log(`${colors.blue}📊 Fetching MoreIdeas records...${colors.reset}`);

    const moreIdeasResult = await pool.query(
      `SELECT
        tmdb_id,
        ideas,
        created_at
       FROM more_ideas
       WHERE created_at < '2026-05-09'
       ORDER BY created_at DESC`
    );

    const records = moreIdeasResult.rows;
    console.log(`Found ${colors.bold}${records.length}${colors.reset} MoreIdeas records\n`);

    if (records.length === 0) {
      console.log(`${colors.yellow}No MoreIdeas records found before 2026-05-09${colors.reset}`);
      return;
    }

    // Sample records (source movies) if needed
    let sampledRecords = records;
    if (records.length > sampleSize) {
      // Fisher-Yates shuffle and take first sampleSize items
      const shuffled = [...records];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      sampledRecords = shuffled.slice(0, sampleSize);
      console.log(`${colors.yellow}📊 Sampling ${colors.bold}${sampleSize}${colors.reset}${colors.yellow} of ${records.length} source movies${colors.reset}\n`);
    }

    // Step 2: Parse all recommendations from sampled records
    const recommendations = [];
    let totalRecommendations = 0;

    for (const record of sampledRecords) {
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

    console.log(`${colors.blue}🎬 Extracted ${colors.bold}${totalRecommendations}${colors.reset}${colors.blue} movie recommendations (${(totalRecommendations / sampledRecords.length).toFixed(1)} per movie)${colors.reset}\n`);

    // Step 3: Attempt matching for each recommendation
    console.log(`${colors.blue}🔍 Attempting to match recommendations...${colors.reset}\n`);

    const results = {
      exactMatch: 0,
      fuzzyMatch: 0,
      noMatch: 0,
      failures: [],
      failureReasons: {},
    };

    const analyzedCount = totalRecommendations;

    for (const rec of recommendations) {
      // Try exact match first
      const exactResult = await pool.query(
        'SELECT title, year, tmdb_id FROM movies WHERE title = $1 AND year = $2',
        [rec.title, rec.year]
      );

      if (exactResult.rows.length > 0) {
        results.exactMatch++;
        continue;
      }

      // Try fuzzy match (±2 years, case-insensitive)
      const fuzzyResult = await pool.query(
        'SELECT title, year, tmdb_id FROM movies WHERE LOWER(title) = LOWER($1) AND year BETWEEN $2 AND $3',
        [rec.title, rec.year - 2, rec.year + 2]
      );

      if (fuzzyResult.rows.length > 0) {
        results.fuzzyMatch++;

        // Record the failure reason
        const reasons = categorizeFailure(rec, fuzzyResult.rows[0]);
        reasons.forEach(reason => {
          results.failureReasons[reason] = (results.failureReasons[reason] || 0) + 1;
        });

        continue;
      }

      // No match found
      results.noMatch++;
      results.failures.push({
        title: rec.title,
        year: rec.year,
        sourceMovie: rec.sourceMovie,
      });

      results.failureReasons['not_in_database'] = (results.failureReasons['not_in_database'] || 0) + 1;
    }

    // Step 4: Generate report
    console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}                     Results Summary${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.cyan}Source movies analyzed: ${colors.bold}${sampledRecords.length}${colors.reset}${colors.cyan} of ${records.length}${colors.reset}`);
    console.log(`${colors.cyan}Total recommendations checked: ${colors.bold}${analyzedCount}${colors.reset}\n`);

    const exactPct = ((results.exactMatch / analyzedCount) * 100).toFixed(1);
    const fuzzyPct = ((results.fuzzyMatch / analyzedCount) * 100).toFixed(1);
    const noMatchPct = ((results.noMatch / analyzedCount) * 100).toFixed(1);

    console.log(`${colors.green}✅ Exact matches: ${colors.bold}${results.exactMatch}${colors.reset}${colors.green} (${exactPct}%)${colors.reset}`);
    console.log(`   → Perfect match: title + year exact`);
    console.log();

    console.log(`${colors.yellow}⚠️  Fuzzy matches: ${colors.bold}${results.fuzzyMatch}${colors.reset}${colors.yellow} (${fuzzyPct}%)${colors.reset}`);
    console.log(`   → Required normalization (punctuation/year drift)`);
    console.log();

    console.log(`${colors.red}❌ No matches: ${colors.bold}${results.noMatch}${colors.reset}${colors.red} (${noMatchPct}%)${colors.reset}`);
    console.log(`   → Failed to find in database → Potential UseOnce violation`);
    console.log();

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
    const wastedTMDBCalls = results.noMatch; // Movies not in DB likely fetched again
    const estimatedCost = wastedTMDBCalls * 0.003; // $0.003 per TMDB call (rough estimate)

    console.log(`  Recommendations needing fuzzy logic: ${colors.bold}${potentialDuplicates}${colors.reset}`);
    console.log(`  Potential wasted TMDB calls: ${colors.bold}${wastedTMDBCalls}${colors.reset}`);
    console.log(`  Estimated wasted cost: ${colors.bold}$${estimatedCost.toFixed(2)}${colors.reset}`);
    console.log();

    // Sample failures
    if (results.failures.length > 0) {
      console.log(`${colors.bold}${colors.red}Top 20 Failed Matches:${colors.reset}`);
      results.failures.slice(0, 20).forEach((failure, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. "${failure.title}" (${failure.year})`);
      });
      console.log();
    }

    // Success criteria
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
