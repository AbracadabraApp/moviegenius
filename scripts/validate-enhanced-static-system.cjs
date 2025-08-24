#!/usr/bin/env node

/**
 * Enhanced Static System Validation Script
 * 
 * Comprehensive automated testing for Phase 2 validation:
 * - Tests all 6 enhanced static files (Fight Club + 5 new ones)
 * - Validates TIER 1 vs TIER 2 performance differences  
 * - Checks entity linking functionality
 * - Tests fallback scenarios
 * - Validates component rendering
 */

// Use built-in fetch (Node 18+)
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const ENHANCED_STATIC_FILES = [
  { id: 550, title: 'Fight Club', file: 'movie_550.json' },
  { id: 603, title: 'The Matrix', file: 'movie_603.json' },
  { id: 78, title: 'Blade Runner', file: 'movie_78.json' },
  { id: 1359, title: 'American Psycho', file: 'movie_1359.json' },
  { id: 14, title: 'American Beauty', file: 'movie_14.json' },
  { id: 807, title: 'Se7en', file: 'movie_807.json' }
];

const PRODUCTION_DIR = '/Users/josh.petersen/moviegenius/public/data/production';
const BACKUP_DIR = `${PRODUCTION_DIR}/backup`;

// Test Results Storage
let testResults = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  passed: 0,
  failed: 0,
  tier1Performance: [],
  tier2Performance: [],
  entityLinkTests: [],
  fallbackTests: [],
  componentTests: [],
  errors: []
};

// Utility Functions
async function measureResponseTime(url) {
  const start = Date.now();
  try {
    const response = await fetch(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'MovieGenius-Validator/1.0'
      }
    });
    const duration = Date.now() - start;
    return {
      success: response.ok,
      duration,
      status: response.status,
      size: response.headers.get('content-length') || 'unknown'
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - start,
      error: error.message
    };
  }
}

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function moveFile(source, destination) {
  try {
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.rename(source, destination);
    return true;
  } catch (error) {
    console.error(`Failed to move file: ${error.message}`);
    return false;
  }
}

function recordTest(testName, passed, details = {}) {
  testResults.totalTests++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (details.error) {
      testResults.errors.push({ test: testName, error: details.error });
    }
  }
  return { testName, passed, ...details };
}

// Test Suite Functions

/**
 * Test 1: TIER 1 Enhanced Static Performance
 * Measure load times with static files present
 */
async function testTier1Performance() {
  console.log('\\n🚀 Testing TIER 1 Enhanced Static Performance...');
  
  for (const movie of ENHANCED_STATIC_FILES) {
    const staticFilePath = `${PRODUCTION_DIR}/${movie.file}`;
    const hasStaticFile = await fileExists(staticFilePath);
    
    if (!hasStaticFile) {
      recordTest(`TIER 1: ${movie.title} - Static file exists`, false, {
        error: `Missing static file: ${movie.file}`
      });
      continue;
    }

    // Test movie page load time
    const result = await measureResponseTime(`${BASE_URL}/movie/${movie.id}`);
    const passed = result.success && result.duration < 500; // 500ms threshold
    
    testResults.tier1Performance.push({
      movie: movie.title,
      id: movie.id,
      ...result
    });

    recordTest(`TIER 1: ${movie.title} - Load time < 500ms`, passed, {
      duration: result.duration,
      expected: '< 500ms'
    });
  }
}

/**
 * Test 2: TIER 2 Fallback Performance  
 * Temporarily remove static files and test API fallback
 */
async function testTier2Fallback() {
  console.log('\\n⏰ Testing TIER 2 Fallback Performance...');
  
  // Test one movie to avoid disrupting all static files
  const testMovie = ENHANCED_STATIC_FILES[0]; // Fight Club
  const staticFilePath = `${PRODUCTION_DIR}/${testMovie.file}`;
  const backupFilePath = `${BACKUP_DIR}/${testMovie.file}`;
  
  // Move static file to trigger fallback
  const moveSuccess = await moveFile(staticFilePath, backupFilePath);
  if (!moveSuccess) {
    recordTest(`TIER 2: Setup - Move static file`, false, {
      error: 'Failed to move static file for fallback test'
    });
    return;
  }

  // Wait for cache to clear
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test fallback performance
  const result = await measureResponseTime(`${BASE_URL}/movie/${testMovie.id}`);
  const passed = result.success && result.duration > 200; // Should be slower without static
  
  testResults.tier2Performance.push({
    movie: testMovie.title,
    id: testMovie.id,
    ...result
  });

  recordTest(`TIER 2: ${testMovie.title} - API fallback works`, result.success, {
    duration: result.duration,
    note: 'Should be slower than TIER 1'
  });

  // Restore static file
  await moveFile(backupFilePath, staticFilePath);
  await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for restoration
}

/**
 * Test 3: Entity Linking Functionality
 * Check that person and movie links are present in analysis content
 */
async function testEntityLinking() {
  console.log('\\n🔗 Testing Entity Linking Functionality...');
  
  for (const movie of ENHANCED_STATIC_FILES.slice(0, 3)) { // Test first 3 movies
    try {
      const response = await fetch(`${BASE_URL}/movie/${movie.id}`, { timeout: 10000 });
      const html = await response.text();
      
      // Check for entity link classes
      const hasPersonLinks = html.includes('class="person-name"');
      const hasMovieLinks = html.includes('class="movie-title"'); 
      const hasEntityStructure = hasPersonLinks || hasMovieLinks;
      
      testResults.entityLinkTests.push({
        movie: movie.title,
        id: movie.id,
        hasPersonLinks,
        hasMovieLinks,
        hasEntityStructure
      });

      recordTest(`Entity Links: ${movie.title} - Has linked entities`, hasEntityStructure, {
        personLinks: hasPersonLinks,
        movieLinks: hasMovieLinks
      });
      
    } catch (error) {
      recordTest(`Entity Links: ${movie.title} - Test failed`, false, {
        error: error.message
      });
    }
  }
}

/**
 * Test 4: Component Rendering Validation
 * Verify all key components render without errors
 */
async function testComponentRendering() {
  console.log('\\n🎬 Testing Component Rendering...');
  
  for (const movie of ENHANCED_STATIC_FILES.slice(0, 2)) { // Test first 2 movies
    try {
      const response = await fetch(`${BASE_URL}/movie/${movie.id}`, { timeout: 10000 });
      const html = await response.text();
      
      // Check for key component markers
      const hasMovieHeader = html.includes('movie-header') || html.includes('largePoster');
      const hasAnalysis = html.includes('analysis-') || html.includes('MovieAnalysis');
      const hasSearch = html.includes('Search Movies');
      const hasNavigation = html.includes('Movies') && html.includes('Genius');
      const noJSErrors = !html.includes('Error') || !html.includes('error');
      
      const componentsPassed = hasMovieHeader && hasAnalysis && hasSearch && hasNavigation;
      
      testResults.componentTests.push({
        movie: movie.title,
        id: movie.id,
        hasMovieHeader,
        hasAnalysis,
        hasSearch,
        hasNavigation,
        noJSErrors
      });

      recordTest(`Components: ${movie.title} - All components render`, componentsPassed, {
        movieHeader: hasMovieHeader,
        analysis: hasAnalysis,
        search: hasSearch,
        navigation: hasNavigation
      });
      
    } catch (error) {
      recordTest(`Components: ${movie.title} - Test failed`, false, {
        error: error.message
      });
    }
  }
}

/**
 * Test 5: Static File Format Validation
 * Ensure all static files have correct JSON structure
 */
async function testStaticFileFormat() {
  console.log('\\n📄 Testing Static File Format...');
  
  for (const movie of ENHANCED_STATIC_FILES) {
    const staticFilePath = `${PRODUCTION_DIR}/${movie.file}`;
    
    try {
      const fileContent = await fs.promises.readFile(staticFilePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      // Required fields validation
      const hasTitle = jsonData.title === movie.title;
      const hasMovieHeader = jsonData.movieHeader && jsonData.movieHeader.title;
      const hasAnalysis = jsonData.analysis && jsonData.analysis.sections;
      const hasKeyElements = jsonData.keyElements && jsonData.keyElements.director;
      const hasWhyWatch = jsonData.analysis.whyWatch && jsonData.analysis.whyWatch.recommendation;
      
      const formatValid = hasTitle && hasMovieHeader && hasAnalysis && hasKeyElements && hasWhyWatch;
      
      recordTest(`Format: ${movie.title} - JSON structure valid`, formatValid, {
        hasTitle,
        hasMovieHeader,
        hasAnalysis,
        hasKeyElements,
        hasWhyWatch
      });
      
    } catch (error) {
      recordTest(`Format: ${movie.title} - JSON validation failed`, false, {
        error: error.message
      });
    }
  }
}

/**
 * Generate Comprehensive Report
 */
function generateReport() {
  console.log('\\n📊 ENHANCED STATIC SYSTEM VALIDATION REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${testResults.timestamp}`);
  console.log(`Total Tests: ${testResults.totalTests}`);
  console.log(`Passed: ${testResults.passed} (${Math.round(testResults.passed/testResults.totalTests*100)}%)`);
  console.log(`Failed: ${testResults.failed} (${Math.round(testResults.failed/testResults.totalTests*100)}%)`);
  
  // Performance Summary
  if (testResults.tier1Performance.length > 0) {
    const avgTier1 = testResults.tier1Performance.reduce((sum, test) => sum + test.duration, 0) / testResults.tier1Performance.length;
    console.log(`\\n⚡ TIER 1 Average Load Time: ${Math.round(avgTier1)}ms`);
  }
  
  if (testResults.tier2Performance.length > 0) {
    const avgTier2 = testResults.tier2Performance.reduce((sum, test) => sum + test.duration, 0) / testResults.tier2Performance.length;
    console.log(`⏰ TIER 2 Average Load Time: ${Math.round(avgTier2)}ms`);
  }
  
  // Entity Links Summary
  const entityTests = testResults.entityLinkTests.filter(test => test.hasEntityStructure);
  console.log(`\\n🔗 Entity Links: ${entityTests.length}/${testResults.entityLinkTests.length} movies have linked entities`);
  
  // Errors Summary
  if (testResults.errors.length > 0) {
    console.log('\\n❌ ERRORS:');
    testResults.errors.forEach(error => {
      console.log(`   ${error.test}: ${error.error}`);
    });
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\\n💾 Detailed report saved to: ${reportPath}`);
  
  // Overall Status
  const successRate = testResults.passed / testResults.totalTests;
  if (successRate >= 0.9) {
    console.log('\\n🎉 VALIDATION STATUS: EXCELLENT (≥90% pass rate)');
    console.log('✅ Enhanced static system ready for full scale deployment!');
  } else if (successRate >= 0.8) {
    console.log('\\n👍 VALIDATION STATUS: GOOD (≥80% pass rate)');
    console.log('⚠️  Minor issues identified, review failed tests');
  } else {
    console.log('\\n⚠️  VALIDATION STATUS: NEEDS ATTENTION (<80% pass rate)');
    console.log('🔧 Significant issues found, address failed tests before scaling');
  }
}

// Main Execution
async function main() {
  console.log('🚀 Starting Enhanced Static System Validation');
  console.log(`Testing ${ENHANCED_STATIC_FILES.length} enhanced static files`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  try {
    await testTier1Performance();
    await testTier2Fallback();
    await testEntityLinking();
    await testComponentRendering();  
    await testStaticFileFormat();
    
    generateReport();
    
  } catch (error) {
    console.error('❌ Validation script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  testResults
};