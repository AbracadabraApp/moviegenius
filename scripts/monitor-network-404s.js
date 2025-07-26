#!/usr/bin/env node

/**
 * Network Request 404 Monitoring
 * 
 * Intercepts and monitors all network requests to identify
 * 404 errors that may be causing application failures
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://moviegenius-production.up.railway.app';
const TEST_ROUTE = '/movie/11';

console.log('📡 Monitoring Network Requests for 404s on /movie/11');
console.log('===================================================');

async function monitorNetwork404s() {
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Network monitoring arrays
    const networkRequests = [];
    const failedRequests = [];
    const error404s = [];
    const criticalErrors = [];
    
    const url = `${PRODUCTION_URL}${TEST_ROUTE}`;
    console.log(`\n📍 Testing URL: ${url}`);
    console.log('⏳ Intercepting network requests...\n');
    
    // Enable request interception
    await page.setRequestInterception(true);
    
    // Monitor all requests
    page.on('request', request => {
      const requestInfo = {
        timestamp: new Date().toISOString(),
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        headers: request.headers(),
        postData: request.postData(),
        isNavigationRequest: request.isNavigationRequest()
      };
      
      networkRequests.push(requestInfo);
      
      console.log(`📤 ${request.method()} ${request.resourceType()}: ${request.url()}`);
      
      // Continue the request
      request.continue();
    });
    
    // Monitor responses
    page.on('response', response => {
      const responseInfo = {
        timestamp: new Date().toISOString(),
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        fromCache: response.fromCache(),
        fromServiceWorker: response.fromServiceWorker(),
        resourceType: response.request().resourceType()
      };
      
      console.log(`📥 ${response.status()} ${response.request().resourceType()}: ${response.url()}`);
      
      // Track 404s and other errors
      if (response.status() === 404) {
        error404s.push(responseInfo);
        console.log(`🔴 404 ERROR: ${response.url()}`);
        
        // Classify critical vs non-critical 404s
        if (isCritical404(response.url(), response.request().resourceType())) {
          criticalErrors.push(responseInfo);
          console.log(`💥 CRITICAL 404: ${response.url()}`);
        }
      } else if (response.status() >= 400) {
        failedRequests.push(responseInfo);
        console.log(`⚠️  ${response.status()} ERROR: ${response.url()}`);
      }
    });
    
    // Monitor failed requests
    page.on('requestfailed', request => {
      const failureInfo = {
        timestamp: new Date().toISOString(),
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        failure: request.failure(),
        errorText: request.failure().errorText
      };
      
      failedRequests.push(failureInfo);
      console.log(`💥 REQUEST FAILED: ${request.url()}`);
      console.log(`   Error: ${request.failure().errorText}`);
    });
    
    // Navigate and capture requests
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`\n📡 Page Response: ${response.status()} ${response.statusText()}`);
    
    // Wait for any delayed requests
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate comprehensive report
    console.log('\n📊 NETWORK MONITORING REPORT');
    console.log('============================');
    
    console.log(`\n📈 Request Summary:`);
    console.log(`   Total requests: ${networkRequests.length}`);
    console.log(`   Failed requests: ${failedRequests.length}`);
    console.log(`   404 errors: ${error404s.length}`);
    console.log(`   Critical 404s: ${criticalErrors.length}`);
    
    // Categorize requests by type
    const requestsByType = categorizeRequests(networkRequests);
    console.log(`\n📋 Requests by Type:`);
    Object.entries(requestsByType).forEach(([type, requests]) => {
      console.log(`   ${type}: ${requests.length}`);
    });
    
    // Detailed 404 analysis
    if (error404s.length > 0) {
      console.log(`\n🔍 404 ERRORS DETAIL:`);
      error404s.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.status} ${error.statusText}`);
        console.log(`   URL: ${error.url}`);
        console.log(`   Type: ${error.resourceType}`);
        console.log(`   Critical: ${isCritical404(error.url, error.resourceType) ? '💥 YES' : '⚠️  No'}`);
        console.log(`   Time: ${error.timestamp}`);
        
        // Analyze URL patterns
        if (error.url.includes('nuclear-static')) {
          console.log(`   🔬 Analysis: Nuclear static file missing`);
        } else if (error.url.includes('_next/static')) {
          console.log(`   🔬 Analysis: Next.js static asset missing`);
        } else if (error.url.includes('/api/')) {
          console.log(`   🔬 Analysis: API endpoint not found`);
        } else if (error.url.includes('/movie/')) {
          console.log(`   🔬 Analysis: Movie page route missing`);
        }
      });
    }
    
    // Failed request analysis
    if (failedRequests.length > 0) {
      console.log(`\n💥 FAILED REQUESTS DETAIL:`);
      failedRequests.forEach((failure, index) => {
        console.log(`\n${index + 1}. ${failure.method} ${failure.url}`);
        console.log(`   Type: ${failure.resourceType}`);
        console.log(`   Error: ${failure.errorText || failure.statusText || 'Unknown'}`);
        console.log(`   Time: ${failure.timestamp}`);
      });
    }
    
    // Critical path analysis
    const hasCriticalFailures = criticalErrors.length > 0;
    const hasPageRoute404 = error404s.some(e => e.url.includes('/movie/11'));
    const hasAPIFailures = error404s.some(e => e.url.includes('/api/'));
    const hasStaticAssetFailures = error404s.some(e => e.url.includes('_next/static'));
    
    console.log(`\n🎯 CRITICAL PATH ANALYSIS:`);
    console.log(`${hasCriticalFailures ? '❌' : '✅'} Critical failures: ${hasCriticalFailures}`);
    console.log(`${hasPageRoute404 ? '❌' : '✅'} Page route 404: ${hasPageRoute404}`);
    console.log(`${hasAPIFailures ? '❌' : '✅'} API failures: ${hasAPIFailures}`);
    console.log(`${hasStaticAssetFailures ? '❌' : '✅'} Static asset failures: ${hasStaticAssetFailures}`);
    
    const overallNetworkHealth = !hasCriticalFailures && !hasPageRoute404;
    console.log(`\n🏆 NETWORK HEALTH: ${overallNetworkHealth ? 'GOOD' : 'POOR'}`);
    
    return {
      success: overallNetworkHealth,
      summary: {
        totalRequests: networkRequests.length,
        failedRequests: failedRequests.length,
        error404s: error404s.length,
        criticalErrors: criticalErrors.length
      },
      details: {
        networkRequests,
        failedRequests,
        error404s,
        criticalErrors
      },
      analysis: {
        hasCriticalFailures,
        hasPageRoute404,
        hasAPIFailures,
        hasStaticAssetFailures
      },
      url
    };
    
  } catch (error) {
    console.error('\n💥 Network monitoring failed:', error.message);
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

/**
 * Determine if a 404 is critical to application functionality
 */
function isCritical404(url, resourceType) {
  // Critical: main page routes, API endpoints, essential scripts
  if (url.includes('/movie/') && !url.includes('static')) return true;
  if (url.includes('/api/')) return true;
  if (url.includes('nuclear-static') && resourceType === 'xhr') return true;
  if (resourceType === 'document') return true;
  if (url.includes('framework') && resourceType === 'script') return true;
  if (url.includes('main') && resourceType === 'script') return true;
  
  // Non-critical: images, fonts, optional assets
  if (resourceType === 'image') return false;
  if (resourceType === 'font') return false;
  if (url.includes('favicon')) return false;
  
  return false;
}

/**
 * Categorize requests by resource type
 */
function categorizeRequests(requests) {
  const categories = {};
  requests.forEach(request => {
    const type = request.resourceType;
    if (!categories[type]) categories[type] = [];
    categories[type].push(request);
  });
  return categories;
}

// Run the monitoring
monitorNetwork404s()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Network monitoring completed - no critical issues');
      process.exit(0);
    } else {
      console.log('\n⚠️  Network monitoring detected critical issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Monitoring execution failed:', error);
    process.exit(1);
  });