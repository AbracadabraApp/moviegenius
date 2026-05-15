#!/usr/bin/env node
/**
 * UseOnce Policy Compliance Audit Script
 *
 * Scans codebase for TMDB API calls and checks UseOnce compliance:
 * - Part 1: Does it save fetched data? (useOnce or ensureMovieInDb)
 * - Part 2: Does it check database before fetching?
 *
 * Usage: node scripts/audit-useonce-compliance.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Find all files that call TMDB API
function findTMDBFiles() {
  console.log(`${colors.blue}🔍 Searching for TMDB API calls...${colors.reset}\n`);

  try {
    const output = execSync(
      'grep -rl "api.themoviedb.org" pages/ lib/ --include="*.js" --include="*.ts" 2>/dev/null || true',
      { encoding: 'utf8', cwd: path.join(__dirname, '..') }
    );

    return output
      .split('\n')
      .filter(f => f.trim() && !f.includes('node_modules'))
      .map(f => f.trim());
  } catch (err) {
    console.error('Error searching for files:', err.message);
    return [];
  }
}

// Analyze a single file for UseOnce compliance
function analyzeFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  const content = fs.readFileSync(fullPath, 'utf8');

  const result = {
    file: filePath,
    hasTMDBCall: /api\.themoviedb\.org/i.test(content),
    part1: { compliant: false, method: null },
    part2: { compliant: false, method: null },
    notes: [],
  };

  // Check Part 1: Does it save data?
  if (/useOnce\(/.test(content)) {
    result.part1.compliant = true;
    result.part1.method = 'useOnce';
  } else if (/ensureMovieInDb\(/.test(content)) {
    result.part1.compliant = 'partial';
    result.part1.method = 'ensureMovieInDb';
    result.notes.push('Uses ensureMovieInDb instead of useOnce (no enrichment trigger)');
  } else {
    result.part1.compliant = false;
    result.notes.push('Does not save TMDB data to database');
  }

  // Check Part 2: Does it check DB first?
  const hasPoolQuery = /pool\.query\(/.test(content) || /client\.query\(/.test(content);
  const tmdbCallIndex = content.indexOf('api.themoviedb.org');

  if (hasPoolQuery) {
    // Find first DB query
    const poolQueryMatch = content.match(/(?:pool|client)\.query\(/);
    if (poolQueryMatch && poolQueryMatch.index < tmdbCallIndex) {
      result.part2.compliant = true;
      result.part2.method = 'Database query before TMDB';
    } else {
      result.part2.compliant = false;
      result.notes.push('Has DB queries but not before TMDB call');
    }
  } else {
    result.part2.compliant = false;
    result.notes.push('No database check before TMDB call');
  }

  // Special case: Search endpoints don't need Part 2
  if (filePath.includes('search') || filePath.includes('multi-search')) {
    result.part2.compliant = 'n/a';
    result.part2.method = 'Search endpoint (DB-first not applicable)';
  }

  return result;
}

// Format compliance status with color
function formatStatus(compliant) {
  if (compliant === true) {
    return `${colors.green}✅ PASS${colors.reset}`;
  } else if (compliant === 'partial') {
    return `${colors.yellow}⚠️  PARTIAL${colors.reset}`;
  } else if (compliant === 'n/a') {
    return `${colors.blue}N/A${colors.reset}`;
  } else {
    return `${colors.red}❌ FAIL${colors.reset}`;
  }
}

// Generate report
function generateReport(results) {
  console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}           UseOnce Policy Compliance Report${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const violations = [];
  const partial = [];
  const compliant = [];

  results.forEach(r => {
    const part1Fail = r.part1.compliant === false;
    const part2Fail = r.part2.compliant === false;
    const part1Partial = r.part1.compliant === 'partial';

    if (part1Fail || part2Fail) {
      violations.push(r);
    } else if (part1Partial) {
      partial.push(r);
    } else {
      compliant.push(r);
    }
  });

  // Report violations
  if (violations.length > 0) {
    console.log(`${colors.red}${colors.bold}🚨 VIOLATIONS (${violations.length})${colors.reset}\n`);
    violations.forEach(r => {
      console.log(`${colors.bold}${r.file}${colors.reset}`);
      console.log(`  Part 1 (Save): ${formatStatus(r.part1.compliant)} ${r.part1.method || ''}`);
      console.log(`  Part 2 (Check DB): ${formatStatus(r.part2.compliant)} ${r.part2.method || ''}`);
      if (r.notes.length > 0) {
        r.notes.forEach(note => console.log(`  📝 ${note}`));
      }
      console.log();
    });
  }

  // Report partial compliance
  if (partial.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  PARTIAL COMPLIANCE (${partial.length})${colors.reset}\n`);
    partial.forEach(r => {
      console.log(`${colors.bold}${r.file}${colors.reset}`);
      console.log(`  Part 1 (Save): ${formatStatus(r.part1.compliant)} ${r.part1.method || ''}`);
      console.log(`  Part 2 (Check DB): ${formatStatus(r.part2.compliant)} ${r.part2.method || ''}`);
      if (r.notes.length > 0) {
        r.notes.forEach(note => console.log(`  📝 ${note}`));
      }
      console.log();
    });
  }

  // Report compliant endpoints
  if (compliant.length > 0) {
    console.log(`${colors.green}${colors.bold}✅ FULLY COMPLIANT (${compliant.length})${colors.reset}\n`);
    compliant.forEach(r => {
      console.log(`${colors.bold}${r.file}${colors.reset}`);
      console.log(`  Part 1 (Save): ${formatStatus(r.part1.compliant)} ${r.part1.method || ''}`);
      console.log(`  Part 2 (Check DB): ${formatStatus(r.part2.compliant)} ${r.part2.method || ''}`);
      console.log();
    });
  }

  // Summary
  console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✅ Compliant: ${compliant.length}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Partial: ${partial.length}${colors.reset}`);
  console.log(`  ${colors.red}❌ Violations: ${violations.length}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // Exit with error code if violations found
  if (violations.length > 0) {
    console.log(`${colors.red}${colors.bold}⚠️  Action required: Fix ${violations.length} violation(s)${colors.reset}\n`);
    process.exit(1);
  } else if (partial.length > 0) {
    console.log(`${colors.yellow}💡 Consider upgrading ${partial.length} partial compliance(s) to full compliance${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}${colors.bold}🎉 All endpoints are UseOnce compliant!${colors.reset}\n`);
    process.exit(0);
  }
}

// Main execution
function main() {
  console.log(`${colors.bold}UseOnce Policy Compliance Audit${colors.reset}\n`);

  const files = findTMDBFiles();

  if (files.length === 0) {
    console.log(`${colors.yellow}No files found with TMDB API calls${colors.reset}`);
    process.exit(0);
  }

  console.log(`Found ${files.length} file(s) with TMDB API calls\n`);

  const results = files.map(analyzeFile);
  generateReport(results);
}

main();
