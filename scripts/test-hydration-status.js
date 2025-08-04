#!/usr/bin/env node

/**
 * Hydration Status Test for /movie/11
 * 
 * Tests if the React app properly hydrates on the client side
 * by checking for key DOM elements and React behavior
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://moviegenius-production.up.railway.app';
const TEST_ROUTE = '/movie/11';
const HYDRATION_TIMEOUT = 5000;

console.log('🧪 Testing Hydration Status on /movie/11');
console.log('==========================================');

async function testHydration() {
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Monitor console messages
    const consoleLogs = [];
    const consoleErrors = [];
    
    page.on('console', msg => {
      const logEntry = { type: msg.type(), text: msg.text() };
      consoleLogs.push(logEntry);
      
      if (msg.type() === 'error') {
        consoleErrors.push(logEntry);
        console.log(`🔴 Console Error: ${msg.text()}`);
      }
    });
    
    const url = `${PRODUCTION_URL}${TEST_ROUTE}`;
    console.log(`\n📍 Testing URL: ${url}`);
    
    // Navigate to page
    console.log('⏳ Loading page...');
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`📡 HTTP Status: ${response.status()}`);
    
    if (response.status() !== 200) {
      throw new Error(`Page returned ${response.status()}, expected 200`);
    }
    
    // Test for Next.js root element
    console.log('\n🔍 Checking for #__next root element...');
    const hasNextRoot = await page.$('#__next');
    console.log(`   #__next element: ${hasNextRoot ? '✅ Found' : '❌ Missing'}`);
    
    // Test for React hydration indicators
    console.log('\n🔍 Checking React hydration indicators...');
    
    // Wait a moment for hydration to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for interactive elements that indicate hydration
    const hydrationTests = await page.evaluate(() => {
      const tests = {
        hasNextRoot: !!document.querySelector('#__next'),
        hasReactRoot: !!document.querySelector('[data-reactroot]') || !!document.querySelector('#__next > *'),
        hasNavigation: !!document.querySelector('nav'),
        hasClickableLinks: document.querySelectorAll('a[href]').length > 0,
        hasMovieTitle: !!document.querySelector('h1'),
        hasMetaData: !!document.querySelector('title'),
        bodyHasContent: document.body.children.length > 0,
        scriptTagsLoaded: document.querySelectorAll('script').length > 0,
        stylesLoaded: document.querySelectorAll('link[rel="stylesheet"], style').length > 0
      };
      
      return tests;
    });
    
    console.log('\n📊 Hydration Test Results:');
    Object.entries(hydrationTests).forEach(([test, result]) => {
      const emoji = result ? '✅' : '❌';
      console.log(`   ${emoji} ${test}: ${result}`);
    });
    
    // Test for specific movie content
    console.log('\n🎬 Checking for Star Wars content...');
    const movieContent = await page.evaluate(() => {
      const pageText = document.body.textContent.toLowerCase();
      return {
        hasStarWars: pageText.includes('star wars'),
        hasLuke: pageText.includes('luke'),
        hasMovieYear: pageText.includes('1977'),
        titleElement: document.querySelector('title')?.textContent || '',
        h1Element: document.querySelector('h1')?.textContent || ''
      };
    });
    
    console.log(`   ${movieContent.hasStarWars ? '✅' : '❌'} Contains "Star Wars": ${movieContent.hasStarWars}`);
    console.log(`   ${movieContent.hasLuke ? '✅' : '❌'} Contains "Luke": ${movieContent.hasLuke}`);
    console.log(`   ${movieContent.hasMovieYear ? '✅' : '❌'} Contains "1977": ${movieContent.hasMovieYear}`);
    console.log(`   📄 Page Title: "${movieContent.titleElement}"`);
    console.log(`   📝 H1 Content: "${movieContent.h1Element}"`);
    
    // Check for hydration timing
    console.log('\n⏱️  Testing hydration timing...');
    const startTime = Date.now();
    
    try {
      await page.waitForSelector('h1', { timeout: HYDRATION_TIMEOUT });
      const hydrationTime = Date.now() - startTime;
      console.log(`   ✅ H1 rendered in ${hydrationTime}ms`);
      
      if (hydrationTime > HYDRATION_TIMEOUT) {
        console.log(`   ⚠️  Hydration took longer than ${HYDRATION_TIMEOUT}ms`);
      }
    } catch (error) {
      console.log(`   ❌ H1 element not found within ${HYDRATION_TIMEOUT}ms`);
    }
    
    // Summary
    const allBasicTests = Object.values(hydrationTests).every(result => result);
    const hasEssentialContent = movieContent.hasStarWars && movieContent.titleElement.length > 0;
    const noConsoleErrors = consoleErrors.length === 0;
    
    console.log('\n🎯 HYDRATION STATUS SUMMARY');
    console.log('===========================');
    console.log(`${allBasicTests ? '✅' : '❌'} Basic hydration tests: ${allBasicTests ? 'PASSED' : 'FAILED'}`);
    console.log(`${hasEssentialContent ? '✅' : '❌'} Essential content: ${hasEssentialContent ? 'PRESENT' : 'MISSING'}`);
    console.log(`${noConsoleErrors ? '✅' : '❌'} Console errors: ${consoleErrors.length} found`);
    
    if (consoleErrors.length > 0) {
      console.log('\n🚨 Console Errors Found:');
      consoleErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.text}`);
      });
    }
    
    const overallSuccess = allBasicTests && hasEssentialContent && noConsoleErrors;
    console.log(`\n🏆 OVERALL HYDRATION STATUS: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
    
    return {
      success: overallSuccess,
      hydrationTests,
      movieContent,
      consoleErrors,
      url
    };
    
  } catch (error) {
    console.error('\n💥 Hydration test failed:', error.message);
    return {
      success: false,
      error: error.message,
      url: `${PRODUCTION_URL}${TEST_ROUTE}`
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testHydration()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Hydration test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Hydration test detected issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });