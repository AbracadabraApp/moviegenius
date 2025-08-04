#!/usr/bin/env node

// Script to run comprehensive validation tests using the testing framework
import { launch } from 'puppeteer';

async function runComprehensiveTests() {
  console.log('🚀 Starting comprehensive validation tests...');
  
  const browser = await launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('[COMPREHENSIVE-TEST]')) {
        console.log('Framework:', msg.text());
      }
    });
    
    const testResults = {};
    
    // Test critical routes
    const routes = ['/movie/11', '/movie/550'];
    
    for (const route of routes) {
      console.log(`\n🎬 Testing ${route}...`);
      
      await page.goto(`http://localhost:3000${route}`, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Load comprehensive testing framework
      await page.addScriptTag({ path: 'public/js/comprehensive-test-framework.js' });
      
      // Wait for framework to initialize and run tests
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get test results
      const result = await page.evaluate(() => {
        // Initialize framework if not already done
        if (!window.comprehensiveTestFramework) {
          window.comprehensiveTestFramework = new window.ComprehensiveTestFramework({
            hydrationTimeout: 8000,
            testRoutes: ['/movie/11', '/movie/550', '/'],
            testMovieIds: ['11', '550']
          });
          window.comprehensiveTestFramework.init();
        }
        
        // Generate report
        return window.comprehensiveTestFramework.generateValidationReport();
      });
      
      testResults[route] = await result;
      
      console.log(`Results for ${route}:`, {
        validationPassed: testResults[route].validationPassed,
        hydrationStatus: testResults[route].hydrationStatus,
        is404Page: testResults[route].is404Page,
        nuclearStaticSuccess: testResults[route].nuclearStaticSuccess,
        tmdbFallbackSuccess: testResults[route].tmdbFallbackSuccess,
        errorCount: testResults[route].errorCount
      });
    }
    
    // Generate master report
    console.log('\n📊 MASTER VALIDATION REPORT:');
    console.log('================================');
    
    const allPassed = Object.values(testResults).every(result => result.validationPassed);
    
    console.log(`Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    for (const [route, result] of Object.entries(testResults)) {
      console.log(`\n${route}:`);
      console.log(`  - Validation Passed: ${result.validationPassed ? '✅' : '❌'}`);
      console.log(`  - Hydration: ${result.hydrationStatus}`);
      console.log(`  - 404 Page: ${result.is404Page ? '❌' : '✅'}`);
      console.log(`  - Nuclear Static: ${result.nuclearStaticSuccess ? '✅' : '❌'}`);
      console.log(`  - TMDB Fallback: ${result.tmdbFallbackSuccess ? '✅' : '❌'}`);
      console.log(`  - Errors: ${result.errorCount}`);
      
      if (result.errorCount > 0) {
        console.log(`  - Error Details:`, result.errors.slice(0, 3));
      }
    }
    
    return { allPassed, testResults };
    
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTests()
    .then(({ allPassed, testResults }) => {
      if (allPassed) {
        console.log('\n🎉 All comprehensive tests PASSED!');
        process.exit(0);
      } else {
        console.log('\n❌ Some comprehensive tests FAILED!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export default runComprehensiveTests;