#!/usr/bin/env node
// Quick test script for movie page validation

const MoviePageFlashValidator = require('./tests/puppeteer-movie-page-validator.cjs');

async function runTest() {
  console.log('🧪 Testing current movie page implementation...');
  
  const validator = new MoviePageFlashValidator({
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    testMovieIds: ['11', '550', '238'],
    headless: process.env.HEADLESS !== 'false',
    captureScreenshots: true,
    outputDir: './puppeteer-results'
  });

  try {
    const report = await validator.runAllTests();
    
    console.log('\n🎯 TEST SUMMARY:');
    console.log(`Success Rate: ${report.summary.passed}/${report.summary.totalTests}`);
    console.log(`Flash Issues: ${report.summary.flashDetected}`);
    console.log(`404 Redirects: ${report.summary.redirectsDetected}`);
    console.log(`Avg Load Time: ${report.summary.avgLoadTime}ms`);
    
    if (report.summary.failed === 0) {
      console.log('\n✅ All tests PASSED - NavBar fix appears successful!');
      process.exit(0);
    } else {
      console.log('\n❌ Tests FAILED - fix needs more work');
      console.log('\nError patterns:');
      report.errorPatterns.forEach(pattern => {
        console.log(`- ${pattern.type}: ${pattern.count}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

runTest();