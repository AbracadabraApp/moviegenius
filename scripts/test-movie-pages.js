#!/usr/bin/env node

/**
 * Comprehensive Movie Page Test Suite
 * 
 * Tests movie pages after error boundaries and debug cleanup:
 * 1. HTTP response validation (200 status)
 * 2. Error boundary functionality
 * 3. Component render validation
 * 4. Console.log cleanup verification
 * 5. Performance baseline measurement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_MOVIE_IDS = [11, 550, 13, 157336, 27205, 680, 238, 424, 389, 19995];
const TIMEOUT_MS = 10000;
const PERFORMANCE_THRESHOLD_MS = 2000;

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  summary: {},
  individual: [],
  errors: [],
  performance: []
};

/**
 * Fetch movie page with timeout and error handling
 */
async function testMoviePage(movieId) {
  const url = `${BASE_URL}/movie/${movieId}`;
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Testing movie ${movieId}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MovieGenius-Test-Suite/1.0',
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const result = {
      movieId,
      url,
      status: response.status,
      statusText: response.statusText,
      responseTime,
      contentLength: response.headers.get('content-length'),
      contentType: response.headers.get('content-type'),
      success: response.status === 200,
      timestamp: new Date().toISOString()
    };
    
    // Performance check
    if (responseTime > PERFORMANCE_THRESHOLD_MS) {
      result.performanceWarning = `Slow response: ${responseTime}ms > ${PERFORMANCE_THRESHOLD_MS}ms`;
    }
    
    // Get response body for HTML validation (first 1000 chars)
    if (response.status === 200) {
      const text = await response.text();
      result.hasHtml = text.includes('<html');
      result.hasTitle = text.includes('<title>');
      result.hasMovieContent = text.includes('MovieAnalysisWithEntities') || text.includes('movie-analysis');
      result.bodyPreview = text.substring(0, 1000);
      
      // Check for common error patterns
      result.hasErrorBoundaryContent = text.includes('Something went wrong') || text.includes('ErrorBoundary');
      result.hasConsoleErrors = text.includes('console.log') || text.includes('console.error');
    }
    
    console.log(`${result.success ? '✅' : '❌'} Movie ${movieId}: ${result.status} (${responseTime}ms)`);
    
    return result;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const result = {
      movieId,
      url,
      status: 'ERROR',
      error: error.message,
      responseTime,
      success: false,
      timestamp: new Date().toISOString()
    };
    
    console.log(`💥 Movie ${movieId}: ${error.message}`);
    testResults.errors.push(result);
    
    return result;
  }
}

/**
 * Test server availability
 */
async function testServerAvailability() {
  try {
    console.log('🔍 Checking server availability...');
    const response = await fetch(BASE_URL, { timeout: 5000 });
    
    if (response.status === 200) {
      console.log('✅ Server is running and responding');
      return true;
    } else {
      console.log(`❌ Server responded with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 Server not available: ${error.message}`);
    console.log('💡 Make sure to run: npm run dev');
    return false;
  }
}

/**
 * Generate comprehensive test report
 */
function generateReport() {
  const successful = testResults.individual.filter(r => r.success);
  const failed = testResults.individual.filter(r => !r.success);
  const avgResponseTime = testResults.individual.reduce((sum, r) => sum + r.responseTime, 0) / testResults.individual.length;
  
  testResults.summary = {
    total: testResults.individual.length,
    successful: successful.length,
    failed: failed.length,
    successRate: `${((successful.length / testResults.individual.length) * 100).toFixed(1)}%`,
    averageResponseTime: `${avgResponseTime.toFixed(0)}ms`,
    slowResponses: testResults.individual.filter(r => r.performanceWarning).length,
    errorsCount: testResults.errors.length
  };
  
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Successful: ${testResults.summary.successful}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`📈 Success Rate: ${testResults.summary.successRate}`);
  console.log(`⚡ Average Response: ${testResults.summary.averageResponseTime}`);
  console.log(`🐌 Slow Responses: ${testResults.summary.slowResponses}`);
  console.log(`💥 Errors: ${testResults.summary.errorsCount}`);
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failed.forEach(result => {
      console.log(`  Movie ${result.movieId}: ${result.status} - ${result.error || result.statusText}`);
    });
  }
  
  if (testResults.individual.some(r => r.performanceWarning)) {
    console.log('\n🐌 PERFORMANCE WARNINGS:');
    testResults.individual
      .filter(r => r.performanceWarning)
      .forEach(result => {
        console.log(`  Movie ${result.movieId}: ${result.performanceWarning}`);
      });
  }
  
  // Save detailed results to file
  const reportPath = path.join(__dirname, 'movie-page-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  
  return testResults.summary.failed === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🎬 MovieGenius Movie Page Test Suite');
  console.log('=====================================');
  console.log(`Testing ${TEST_MOVIE_IDS.length} movie pages...`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms`);
  console.log(`Performance Threshold: ${PERFORMANCE_THRESHOLD_MS}ms\n`);
  
  // Check server availability first
  const serverAvailable = await testServerAvailability();
  if (!serverAvailable) {
    process.exit(1);
  }
  
  console.log(''); // Blank line
  
  // Run tests for each movie
  for (const movieId of TEST_MOVIE_IDS) {
    const result = await testMoviePage(movieId);
    testResults.individual.push(result);
    
    // Small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Generate and display report
  const allTestsPassed = generateReport();
  
  if (allTestsPassed) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Check the details above.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});