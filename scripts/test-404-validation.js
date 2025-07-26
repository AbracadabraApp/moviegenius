#!/usr/bin/env node

// Test script to validate 404 fixes using production testing framework
import { launch } from 'puppeteer';

async function test404Validation() {
  console.log('🧪 Starting 404 validation tests...');
  
  const browser = await launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('[PROD-MOVIE-TEST]')) {
        console.log('Test Framework:', msg.text());
      }
    });
    
    // Test movie page 11
    console.log('\n🎬 Testing /movie/11...');
    await page.goto('http://localhost:3000/movie/11', { waitUntil: 'networkidle2' });
    
    // Load and run testing framework
    await page.addScriptTag({ path: 'public/js/prod-movie-test-framework.js' });
    
    const result11 = await page.evaluate(() => {
      const framework = new ProdMovieTestFramework();
      framework.interceptErrors();
      framework.interceptNetwork();
      
      const is404Page = window.location.pathname.includes('/404') || 
                       document.title.includes('404') ||
                       document.body.textContent.includes('page could not be found');
      
      return {
        url: window.location.href,
        is404Page,
        hasContent: document.body.textContent.length > 1000,
        title: document.title,
        hydrationStatus: framework.hydrationStatus,
        networkErrors: framework.networkErrors.length
      };
    });
    
    console.log('Movie 11 Results:', result11);
    
    // Test movie page 550
    console.log('\n🎬 Testing /movie/550...');
    await page.goto('http://localhost:3000/movie/550', { waitUntil: 'networkidle2' });
    
    // Load testing framework again for new page
    await page.addScriptTag({ path: 'public/js/prod-movie-test-framework.js' });
    
    const result550 = await page.evaluate(() => {
      const framework = new ProdMovieTestFramework();
      framework.interceptErrors();
      framework.interceptNetwork();
      
      const is404Page = window.location.pathname.includes('/404') || 
                       document.title.includes('404') ||
                       document.body.textContent.includes('page could not be found');
      
      return {
        url: window.location.href,
        is404Page,
        hasContent: document.body.textContent.length > 1000,
        title: document.title,
        hydrationStatus: framework.hydrationStatus,
        networkErrors: framework.networkErrors.length
      };
    });
    
    console.log('Movie 550 Results:', result550);
    
    // Validation results
    const validation = {
      no404Errors: !result11.is404Page && !result550.is404Page,
      routesSuccess: result11.hasContent && result550.hasContent,
      movie11_success: !result11.is404Page && result11.hasContent,
      movie550_success: !result550.is404Page && result550.hasContent
    };
    
    console.log('\n✅ Validation Results:');
    console.log('no404Errors:', validation.no404Errors);
    console.log('routesSuccess:', validation.routesSuccess);
    console.log('movie11_success:', validation.movie11_success);
    console.log('movie550_success:', validation.movie550_success);
    
    return validation;
    
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  test404Validation()
    .then(results => {
      if (results.no404Errors && results.routesSuccess) {
        console.log('\n🎉 All validation tests PASSED!');
        process.exit(0);
      } else {
        console.log('\n❌ Validation tests FAILED!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export default test404Validation;