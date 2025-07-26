#!/usr/bin/env node

/**
 * JavaScript Error Monitoring for /movie/11
 * 
 * Monitors and captures detailed JavaScript errors during page load
 * to identify specific issues causing hydration failures
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://moviegenius-production.up.railway.app';
const TEST_ROUTE = '/movie/11';

console.log('🚨 Monitoring JavaScript Errors on /movie/11');
console.log('=============================================');

async function monitorJavaScriptErrors() {
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Comprehensive error monitoring
    const errors = {
      console: [],
      page: [],
      request: [],
      response: []
    };
    
    // Monitor console messages with full details
    page.on('console', msg => {
      const entry = {
        timestamp: new Date().toISOString(),
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };
      
      errors.console.push(entry);
      
      if (msg.type() === 'error') {
        console.log(`🔴 Console Error: ${msg.text()}`);
        if (msg.location()) {
          console.log(`   Location: ${msg.location().url}:${msg.location().lineNumber}`);
        }
      }
    });
    
    // Monitor page errors (uncaught exceptions)
    page.on('pageerror', error => {
      const entry = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        name: error.name
      };
      
      errors.page.push(entry);
      console.log(`💥 Page Error: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    });
    
    // Monitor failed requests
    page.on('requestfailed', request => {
      const entry = {
        timestamp: new Date().toISOString(),
        url: request.url(),
        method: request.method(),
        failure: request.failure()
      };
      
      errors.request.push(entry);
      console.log(`📡 Request Failed: ${request.url()}`);
      console.log(`   Failure: ${request.failure().errorText}`);
    });
    
    // Monitor response errors
    page.on('response', response => {
      if (response.status() >= 400) {
        const entry = {
          timestamp: new Date().toISOString(),
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        };
        
        errors.response.push(entry);
        console.log(`🔴 Response Error: ${response.status()} ${response.url()}`);
      }
    });
    
    const url = `${PRODUCTION_URL}${TEST_ROUTE}`;
    console.log(`\n📍 Testing URL: ${url}`);
    console.log('⏳ Loading page and monitoring errors...\n');
    
    // Navigate and capture initial load errors
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`📡 Initial Response: ${response.status()}`);
    
    // Wait for any delayed errors
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to interact with the page to trigger more errors
    console.log('\n🖱️  Testing page interactions...');
    
    try {
      // Try to click on navigation if it exists
      const navExists = await page.$('nav');
      if (navExists) {
        console.log('   Found navigation element');
      } else {
        console.log('   ❌ No navigation element found');
      }
      
      // Try to find movie-specific elements
      const movieElements = await page.evaluate(() => {
        return {
          h1: !!document.querySelector('h1'),
          movieTitle: !!document.querySelector('[data-testid="movie-title"]'),
          poster: !!document.querySelector('img[alt*="poster"]'),
          description: !!document.querySelector('p')
        };
      });
      
      console.log('   Movie elements check:', movieElements);
      
    } catch (interactionError) {
      console.log(`   ❌ Interaction error: ${interactionError.message}`);
    }
    
    // Generate error summary
    console.log('\n📊 ERROR MONITORING SUMMARY');
    console.log('===========================');
    console.log(`Console messages: ${errors.console.length}`);
    console.log(`Console errors: ${errors.console.filter(e => e.type === 'error').length}`);
    console.log(`Page errors: ${errors.page.length}`);
    console.log(`Request failures: ${errors.request.length}`);
    console.log(`Response errors: ${errors.response.length}`);
    
    // Detailed error breakdown
    if (errors.console.filter(e => e.type === 'error').length > 0) {
      console.log('\n🔍 CONSOLE ERRORS DETAIL:');
      errors.console
        .filter(e => e.type === 'error')
        .forEach((error, index) => {
          console.log(`\n${index + 1}. ${error.text}`);
          if (error.location) {
            console.log(`   File: ${error.location.url}`);
            console.log(`   Line: ${error.location.lineNumber}`);
          }
          console.log(`   Time: ${error.timestamp}`);
        });
    }
    
    if (errors.page.length > 0) {
      console.log('\n💥 PAGE ERRORS DETAIL:');
      errors.page.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.name}: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
        console.log(`   Time: ${error.timestamp}`);
      });
    }
    
    if (errors.request.length > 0) {
      console.log('\n📡 REQUEST FAILURES DETAIL:');
      errors.request.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.method} ${error.url}`);
        console.log(`   Error: ${error.failure.errorText}`);
        console.log(`   Time: ${error.timestamp}`);
      });
    }
    
    if (errors.response.length > 0) {
      console.log('\n🔴 RESPONSE ERRORS DETAIL:');
      errors.response.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.status} ${error.statusText}`);
        console.log(`   URL: ${error.url}`);
        console.log(`   Time: ${error.timestamp}`);
      });
    }
    
    const hasErrors = errors.page.length > 0 || 
                     errors.console.filter(e => e.type === 'error').length > 0 ||
                     errors.request.length > 0 ||
                     errors.response.length > 0;
    
    console.log(`\n🎯 MONITORING RESULT: ${hasErrors ? 'ERRORS DETECTED' : 'NO ERRORS'}`);
    
    return {
      success: !hasErrors,
      errors,
      url,
      summary: {
        consoleErrors: errors.console.filter(e => e.type === 'error').length,
        pageErrors: errors.page.length,
        requestFailures: errors.request.length,
        responseErrors: errors.response.length
      }
    };
    
  } catch (error) {
    console.error('\n💥 Monitoring failed:', error.message);
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

// Run the monitoring
monitorJavaScriptErrors()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Error monitoring completed - no errors detected');
      process.exit(0);
    } else {
      console.log('\n⚠️  Error monitoring detected issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Monitoring execution failed:', error);
    process.exit(1);
  });