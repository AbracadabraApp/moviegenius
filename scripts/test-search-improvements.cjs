#!/usr/bin/env node
/**
 * Test Search Improvements
 *
 * Demonstrates how multi-stage search handles edge cases from the MoreIdeas audit
 */

// Use native fetch (Node.js 18+)

const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Test cases from the audit failures
const testCases = [
  // Edge cases that failed in audit
  { query: "Some Kind of Monster", expected: "Metallica: Some Kind of Monster" },
  { query: "Paris je taime", expected: "Paris, je t'aime" },
  { query: "The Chronicles of Narnia", expected: "The Chronicles of Narnia" },
  { query: "fight club", expected: "Fight Club" },
  { query: "The Matrix", expected: "Matrix" },  // Article removal test
  { query: "inception 2010", expected: "Inception" },  // Year extraction test
  { query: "godfather", expected: "The Godfather" },
  { query: "lord of rings", expected: "The Lord of the Rings" },  // Partial match
];

async function testSearch(endpoint, query) {
  try {
    const response = await fetch(`http://localhost:3000/api/v1/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message, movies: [] };
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.blue}Search Improvement Comparison Test${colors.reset}\n`);
  console.log(`${colors.cyan}Testing ${testCases.length} edge cases from MoreIdeas audit${colors.reset}\n`);

  let basicSuccesses = 0;
  let improvedSuccesses = 0;

  for (const testCase of testCases) {
    console.log(`${colors.bold}Query: "${testCase.query}"${colors.reset}`);
    console.log(`  Expected: ${testCase.expected}\n`);

    // Test basic search
    const basicResult = await testSearch('search', testCase.query);
    const basicMatch = basicResult.movies?.[0];
    const basicFound = basicMatch?.title?.toLowerCase().includes(testCase.expected.toLowerCase().replace(/^(the|a|an)\s+/i, ''));

    console.log(`  ${colors.yellow}Basic Search:${colors.reset}`);
    if (basicFound) {
      console.log(`    ${colors.green}✓${colors.reset} Found: ${basicMatch.title} (${basicMatch.year})`);
      basicSuccesses++;
    } else if (basicMatch) {
      console.log(`    ${colors.red}✗${colors.reset} Wrong: ${basicMatch.title} (${basicMatch.year})`);
    } else {
      console.log(`    ${colors.red}✗${colors.reset} Not found`);
    }

    // Test improved search
    const improvedResult = await testSearch('search-improved', testCase.query);
    const improvedMatch = improvedResult.movies?.[0];
    const improvedFound = improvedMatch?.title?.toLowerCase().includes(testCase.expected.toLowerCase().replace(/^(the|a|an)\s+/i, ''));

    console.log(`  ${colors.cyan}Improved Search:${colors.reset}`);
    if (improvedFound) {
      console.log(`    ${colors.green}✓${colors.reset} Found: ${improvedMatch.title} (${improvedMatch.year})`);
      if (improvedMatch.matchType) {
        console.log(`    ${colors.blue}Match type: ${improvedMatch.matchType}${colors.reset}`);
      }
      improvedSuccesses++;
    } else if (improvedMatch) {
      console.log(`    ${colors.red}✗${colors.reset} Wrong: ${improvedMatch.title} (${improvedMatch.year})`);
    } else {
      console.log(`    ${colors.red}✗${colors.reset} Not found`);
    }

    console.log();
  }

  // Summary
  console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}Results Summary${colors.reset}\n`);

  const basicPct = ((basicSuccesses / testCases.length) * 100).toFixed(1);
  const improvedPct = ((improvedSuccesses / testCases.length) * 100).toFixed(1);

  console.log(`${colors.yellow}Basic Search:${colors.reset}`);
  console.log(`  Success: ${basicSuccesses}/${testCases.length} (${basicPct}%)\n`);

  console.log(`${colors.cyan}Improved Search:${colors.reset}`);
  console.log(`  Success: ${improvedSuccesses}/${testCases.length} (${improvedPct}%)`);

  const improvement = improvedSuccesses - basicSuccesses;
  if (improvement > 0) {
    console.log(`  ${colors.green}+${improvement} more matches found (+${((improvement / testCases.length) * 100).toFixed(1)}%)${colors.reset}`);
  } else if (improvement === 0) {
    console.log(`  ${colors.yellow}No difference${colors.reset}`);
  } else {
    console.log(`  ${colors.red}${improvement} fewer matches${colors.reset}`);
  }

  console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

// Check if server is running
(async () => {
  try {
    const healthCheck = await fetch('http://localhost:3000/api/health');
    if (!healthCheck.ok) {
      console.error(`${colors.red}Server not responding at localhost:3000${colors.reset}`);
      console.error(`${colors.yellow}Run: npm run dev${colors.reset}`);
      process.exit(1);
    }
    await runTests();
  } catch (error) {
    console.error(`${colors.red}Error: Cannot connect to localhost:3000${colors.reset}`);
    console.error(`${colors.yellow}Run: npm run dev${colors.reset}`);
    process.exit(1);
  }
})();
