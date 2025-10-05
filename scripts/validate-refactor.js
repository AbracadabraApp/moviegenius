#!/usr/bin/env node
/**
 * Validate Refactored Movie Page Code
 *
 * Validates the code structure and types without needing a running server
 */

import { validateMoviePageData, emptyMoviePageData, safeString, safeNumber } from '../lib/types/movie-page-data.js';

console.log('\n🧪 MOVIE PAGE REFACTOR VALIDATION\n');

// Test 1: Type validation functions
console.log('='.repeat(60));
console.log('Test 1: Data Type Validation Functions');
console.log('='.repeat(60));

try {
  const testData = {
    header: {
      tmdbId: 550,
      title: 'Fight Club',
      year: 1999,
      tagline: 'Mischief. Mayhem. Soap.',
      posterUrl: 'https://example.com/poster.jpg',
      trailerVideoId: 'SUXWAEX2jlg',
      overview: 'An insomniac office worker...'
    },
    analysis: {
      sections: [
        { text: 'Analysis text here', subhead: null }
      ],
      featuredMovies: [],
      whyWatch: null,
      moreIdeas: [],
      exploreTopics: []
    },
    contributors: [],
    streaming: null,
    source: {
      type: 'static',
      loadTimeMs: 100,
      cached: true
    }
  };

  validateMoviePageData(testData);
  console.log('✅ Valid data structure accepted');
} catch (error) {
  console.log(`❌ Validation failed: ${error.message}`);
  process.exit(1);
}

// Test 2: Invalid data rejection
try {
  const invalidData = {
    header: { tmdbId: 550 }, // Missing required fields
    analysis: null // Invalid
  };

  validateMoviePageData(invalidData);
  console.log('❌ Invalid data was accepted (should have failed)');
  process.exit(1);
} catch (error) {
  console.log('✅ Invalid data correctly rejected');
}

// Test 3: Empty state generation
try {
  const emptyData = emptyMoviePageData(550);
  validateMoviePageData(emptyData);
  console.log('✅ Empty data structure is valid');
} catch (error) {
  console.log(`❌ Empty data is invalid: ${error.message}`);
  process.exit(1);
}

// Test 4: Safe extraction helpers
console.log('\n' + '='.repeat(60));
console.log('Test 2: Safe Data Extraction Helpers');
console.log('='.repeat(60));

const tests = [
  { fn: () => safeString('hello', 'fallback'), expected: 'hello', name: 'safeString with valid string' },
  { fn: () => safeString(null, 'fallback'), expected: 'fallback', name: 'safeString with null' },
  { fn: () => safeString(undefined, 'fallback'), expected: 'fallback', name: 'safeString with undefined' },
  { fn: () => safeNumber(42, null), expected: 42, name: 'safeNumber with valid number' },
  { fn: () => safeNumber('42', null), expected: 42, name: 'safeNumber with string number' },
  { fn: () => safeNumber('invalid', 99), expected: 99, name: 'safeNumber with invalid string' },
  { fn: () => safeNumber(null, 99), expected: 99, name: 'safeNumber with null' }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    const result = test.fn();
    if (result === test.expected) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: expected ${test.expected}, got ${result}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${test.name}: ${error.message}`);
    failed++;
  }
}

// Test 5: File existence
console.log('\n' + '='.repeat(60));
console.log('Test 3: Required Files Exist');
console.log('='.repeat(60));

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const requiredFiles = [
  'lib/types/movie-page-data.js',
  'lib/movie-page-loader.js',
  'pages/movie/[id]-refactored.js',
  'MOVIE_PAGE_REFACTOR.md'
];

for (const file of requiredFiles) {
  const fullPath = join(projectRoot, file);
  if (existsSync(fullPath)) {
    console.log(`✅ ${file}`);
    passed++;
  } else {
    console.log(`❌ ${file} not found`);
    failed++;
  }
}

// Test 6: Code structure validation
console.log('\n' + '='.repeat(60));
console.log('Test 4: Code Structure Validation');
console.log('='.repeat(60));

import { readFileSync } from 'fs';

// Check movie-page-loader exports
try {
  const loaderPath = join(projectRoot, 'lib/movie-page-loader.js');
  const loaderCode = readFileSync(loaderPath, 'utf-8');

  const requiredExports = [
    'export async function loadMoviePageData',
    'export async function hasEnhancedStatic',
    'export async function getDataSourceType'
  ];

  for (const exportCheck of requiredExports) {
    if (loaderCode.includes(exportCheck)) {
      console.log(`✅ Found: ${exportCheck}`);
      passed++;
    } else {
      console.log(`❌ Missing: ${exportCheck}`);
      failed++;
    }
  }
} catch (error) {
  console.log(`❌ Could not validate loader: ${error.message}`);
  failed++;
}

// Check refactored page imports
try {
  const pagePath = join(projectRoot, 'pages/movie/[id]-refactored.js');
  const pageCode = readFileSync(pagePath, 'utf-8');

  const requiredImports = [
    "from '../../lib/movie-page-loader'",
    'loadMoviePageData',
    'MovieHeaderLarge',
    'WhyWatchContainer',
    'MoreIdeasContainer'
  ];

  for (const importCheck of requiredImports) {
    if (pageCode.includes(importCheck)) {
      console.log(`✅ Found: ${importCheck}`);
      passed++;
    } else {
      console.log(`❌ Missing: ${importCheck}`);
      failed++;
    }
  }
} catch (error) {
  console.log(`❌ Could not validate page: ${error.message}`);
  failed++;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(60));

console.log(`\nTotal Checks: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
  console.log(`\n🎉 All validation checks passed!`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Start dev server: npm run dev`);
  console.log(`   2. Visit: http://localhost:3000/movie/550-refactored`);
  console.log(`   3. Compare with: http://localhost:3000/movie/550`);
  console.log(`   4. Check console for "🔍 Loading movie" logs`);
  console.log(`   5. Verify page loads and displays correctly\n`);
  process.exit(0);
} else {
  console.log(`\n⚠️  Some validation checks failed.`);
  console.log(`   Please fix the issues above before deploying.\n`);
  process.exit(1);
}
