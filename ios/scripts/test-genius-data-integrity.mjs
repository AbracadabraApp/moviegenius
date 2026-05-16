#!/usr/bin/env node
/**
 * Genius System Data Integrity Validator
 *
 * Validates all 110 category × 3 tier combinations for:
 * - Missing TMDB IDs (films in tier files but not in lookup)
 * - Empty lists (categories with no films)
 * - Duplicate entries
 * - Structural issues
 * - Coverage statistics
 *
 * Run: node ios/scripts/test-genius-data-integrity.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const TIER_LOOKUP_PATH = path.join(__dirname, '../moviegenius/moviegenius/Data/TierTmdbLookup.swift');
const DATA_DIR = path.join(__dirname, '../moviegenius/moviegenius/Data');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Results tracking
const results = {
  totalCategories: 0,
  totalTiers: 0,
  totalFilms: 0,
  emptyTiers: [],
  missingTmdbIds: [],
  duplicateEntries: [],
  structuralIssues: [],
  categoriesWithIssues: new Set(),
};

/**
 * Parse TierTmdbLookup.swift to extract TMDB ID mappings
 */
function parseTierLookup() {
  console.log(`${BLUE}📖 Parsing TierTmdbLookup.swift...${RESET}`);

  const content = fs.readFileSync(TIER_LOOKUP_PATH, 'utf-8');
  const lookupMap = new Map();

  // Extract entries like: "After Hours (1985)": 1178,
  const entryRegex = /"([^"]+)":\s*(\d+),?/g;
  let match;
  let count = 0;

  while ((match = entryRegex.exec(content)) !== null) {
    const [_, filmKey, tmdbId] = match;
    lookupMap.set(filmKey, parseInt(tmdbId, 10));
    count++;
  }

  console.log(`${GREEN}✓${RESET} Found ${count} TMDB ID mappings\n`);
  return lookupMap;
}

/**
 * Get all category tier files
 */
function getTierFiles() {
  const files = fs.readdirSync(DATA_DIR);

  // Match pattern: CategoryName-essential.json, CategoryName-connoisseur.json, CategoryName-mystery.json
  const tierFiles = files.filter(f =>
    f.endsWith('-essential.json') ||
    f.endsWith('-connoisseur.json') ||
    f.endsWith('-mystery.json')
  );

  return tierFiles;
}

/**
 * Validate a single tier file
 */
function validateTierFile(filename, tmdbLookup) {
  const filepath = path.join(DATA_DIR, filename);
  const [categoryName, tier] = filename.replace('.json', '').split(/-(?=[^-]+$)/);

  // Read and parse file
  let data;
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    data = JSON.parse(content);
  } catch (err) {
    results.structuralIssues.push({
      category: categoryName,
      tier,
      error: `Failed to parse JSON: ${err.message}`
    });
    results.categoriesWithIssues.add(categoryName);
    return;
  }

  // Validate structure
  if (!Array.isArray(data)) {
    results.structuralIssues.push({
      category: categoryName,
      tier,
      error: 'File is not an array'
    });
    results.categoriesWithIssues.add(categoryName);
    return;
  }

  results.totalTiers++;

  // Check if empty
  if (data.length === 0) {
    results.emptyTiers.push({
      category: categoryName,
      tier
    });
    results.categoriesWithIssues.add(categoryName);
    return;
  }

  results.totalFilms += data.length;

  // Track films for duplicate detection
  const seenFilms = new Set();

  // Validate each film entry
  data.forEach((film, index) => {
    // Check structure
    if (!film.title || !film.year) {
      results.structuralIssues.push({
        category: categoryName,
        tier,
        error: `Film at index ${index} missing title or year`,
        film
      });
      results.categoriesWithIssues.add(categoryName);
      return;
    }

    const filmKey = `${film.title} (${film.year})`;

    // Check for duplicates within this tier
    if (seenFilms.has(filmKey)) {
      results.duplicateEntries.push({
        category: categoryName,
        tier,
        film: filmKey
      });
      results.categoriesWithIssues.add(categoryName);
    }
    seenFilms.add(filmKey);

    // Check if TMDB ID exists in lookup
    if (!tmdbLookup.has(filmKey)) {
      results.missingTmdbIds.push({
        category: categoryName,
        tier,
        film: filmKey
      });
      results.categoriesWithIssues.add(categoryName);
    }
  });
}

/**
 * Print results summary
 */
function printResults() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${BOLD}GENIUS SYSTEM DATA INTEGRITY REPORT${RESET}`);
  console.log(`${'='.repeat(60)}\n`);

  // Overview
  console.log(`${BOLD}Overview:${RESET}`);
  console.log(`  Total tiers validated: ${results.totalTiers}`);
  console.log(`  Total films: ${results.totalFilms}`);
  console.log(`  Categories with issues: ${results.categoriesWithIssues.size}\n`);

  // Empty tiers
  if (results.emptyTiers.length > 0) {
    console.log(`${YELLOW}${BOLD}⚠ Empty Tiers (${results.emptyTiers.length}):${RESET}`);
    results.emptyTiers.forEach(({ category, tier }) => {
      console.log(`  ${RED}✗${RESET} ${category} › ${tier}`);
    });
    console.log();
  } else {
    console.log(`${GREEN}✓ No empty tiers${RESET}\n`);
  }

  // Missing TMDB IDs
  if (results.missingTmdbIds.length > 0) {
    console.log(`${YELLOW}${BOLD}⚠ Missing TMDB IDs (${results.missingTmdbIds.length}):${RESET}`);

    // Group by category
    const byCategory = {};
    results.missingTmdbIds.forEach(({ category, tier, film }) => {
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push({ tier, film });
    });

    Object.entries(byCategory).forEach(([category, issues]) => {
      console.log(`  ${RED}✗${RESET} ${category} (${issues.length} films):`);
      issues.slice(0, 5).forEach(({ tier, film }) => {
        console.log(`      ${tier}: ${film}`);
      });
      if (issues.length > 5) {
        console.log(`      ... and ${issues.length - 5} more`);
      }
    });
    console.log();
  } else {
    console.log(`${GREEN}✓ All films have TMDB IDs${RESET}\n`);
  }

  // Duplicates
  if (results.duplicateEntries.length > 0) {
    console.log(`${YELLOW}${BOLD}⚠ Duplicate Entries (${results.duplicateEntries.length}):${RESET}`);
    results.duplicateEntries.forEach(({ category, tier, film }) => {
      console.log(`  ${RED}✗${RESET} ${category} › ${tier}: ${film}`);
    });
    console.log();
  } else {
    console.log(`${GREEN}✓ No duplicate entries${RESET}\n`);
  }

  // Structural issues
  if (results.structuralIssues.length > 0) {
    console.log(`${YELLOW}${BOLD}⚠ Structural Issues (${results.structuralIssues.length}):${RESET}`);
    results.structuralIssues.forEach(({ category, tier, error }) => {
      console.log(`  ${RED}✗${RESET} ${category} › ${tier}: ${error}`);
    });
    console.log();
  } else {
    console.log(`${GREEN}✓ No structural issues${RESET}\n`);
  }

  // Final verdict
  console.log(`${'='.repeat(60)}\n`);
  const totalIssues =
    results.emptyTiers.length +
    results.missingTmdbIds.length +
    results.duplicateEntries.length +
    results.structuralIssues.length;

  if (totalIssues === 0) {
    console.log(`${GREEN}${BOLD}✓ ALL CHECKS PASSED${RESET} - Genius system data is valid!\n`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}✗ ${totalIssues} ISSUES FOUND${RESET} - Please fix before deploying\n`);
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  console.log(`${BOLD}Genius System Data Integrity Validator${RESET}\n`);

  // Parse lookup table
  const tmdbLookup = parseTierLookup();

  // Get all tier files
  console.log(`${BLUE}📂 Scanning tier files...${RESET}`);
  const tierFiles = getTierFiles();
  console.log(`${GREEN}✓${RESET} Found ${tierFiles.length} tier files\n`);

  // Validate each tier file
  console.log(`${BLUE}🔍 Validating tier data...${RESET}\n`);
  tierFiles.forEach(filename => {
    validateTierFile(filename, tmdbLookup);
  });

  // Print results
  printResults();
}

main();
