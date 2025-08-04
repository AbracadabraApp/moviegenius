#!/usr/bin/env node

// Direct test of comprehensive framework without puppeteer navigation issues
import { launch } from 'puppeteer';

async function testFrameworkDirect() {
  console.log('🧪 Testing comprehensive framework directly...');
  
  const browser = await launch({ 
    headless: false, // Use visible browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      console.log('Browser:', msg.text());
    });
    
    // Navigate to movie page
    console.log('📍 Navigating to /movie/11...');
    await page.goto('http://localhost:3000/movie/11', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Wait for page to be ready
    await page.waitForSelector('#__next', { timeout: 10000 });
    
    console.log('✅ Page loaded, injecting test framework...');
    
    // Inject the framework code directly
    await page.addScriptTag({ url: 'http://localhost:3000/js/comprehensive-test-framework.js' });
    
    // Wait for framework to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('⚡ Running comprehensive tests...');
    
    // Execute tests and get results
    const result = await page.evaluate(async () => {
      // Wait a moment for any auto-initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create fresh framework instance
      const framework = new window.ComprehensiveTestFramework({
        hydrationTimeout: 5000,
        testRoutes: ['/movie/11', '/movie/550'],
        testMovieIds: ['11', '550']
      });
      
      // Initialize and run tests
      framework.init();
      
      // Wait for tests to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate report
      const report = await framework.generateValidationReport();
      
      return {
        validationPassed: report.validationPassed,
        hydrationStatus: report.hydrationStatus,
        is404Page: report.is404Page,
        nuclearStaticSuccess: report.nuclearStaticSuccess,
        tmdbFallbackSuccess: report.tmdbFallbackSuccess,
        routesSuccess: report.routesSuccess,
        navBarSuccess: report.navBarSuccess,
        performanceAcceptable: report.performanceAcceptable,
        errorCount: report.errorCount,
        errors: report.errors?.slice(0, 3) || [],
        testResults: report.testResults,
        logs: report.logs?.slice(-5) || []
      };
    });
    
    console.log('\n📊 COMPREHENSIVE TEST RESULTS:');
    console.log('================================');
    console.log(`✨ Overall Status: ${result.validationPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`🔧 Hydration: ${result.hydrationStatus}`);
    console.log(`🏠 404 Page: ${result.is404Page ? '❌' : '✅'}`);
    console.log(`⚡ Nuclear Static: ${result.nuclearStaticSuccess ? '✅' : '❌'}`);
    console.log(`🔄 TMDB Fallback: ${result.tmdbFallbackSuccess ? '✅' : '❌'}`);
    console.log(`🧭 Routes: ${result.routesSuccess ? '✅' : '❌'}`);
    console.log(`📱 NavBar: ${result.navBarSuccess ? '✅' : '❌'}`);
    console.log(`⚡ Performance: ${result.performanceAcceptable ? '✅' : '❌'}`);
    console.log(`🚨 Error Count: ${result.errorCount}`);
    
    if (result.errorCount > 0) {
      console.log('\n🚨 Recent Errors:');
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.message}`);
      });
    }
    
    console.log('\n📝 Test Results Detail:');
    Object.entries(result.testResults || {}).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });
    
    return result;
    
  } finally {
    await browser.close();
  }
}

// Run the test
testFrameworkDirect()
  .then(result => {
    console.log(`\n🎯 Final Result: ${result.validationPassed ? 'SUCCESS' : 'NEEDS FIXES'}`);
    process.exit(result.validationPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });