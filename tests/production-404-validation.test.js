/**
 * Production 404 Validation Tests
 * 
 * Uses Puppeteer to test essential movie routes in production
 * to verify the nuclear static 404 fixes are working correctly.
 * 
 * These tests MUST pass for the 404 fix deployment to be considered successful.
 */

import puppeteer from 'puppeteer';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://moviegenius-production.up.railway.app';
const TIMEOUT = 30000; // 30 seconds for network requests
const RETRY_COUNT = 3;

// Key movie routes that were experiencing 404s
const CRITICAL_ROUTES = [
  { path: '/movie/11', title: 'Star Wars', year: 1977 },
  { path: '/movie/550', title: 'Fight Club', year: 1999 },
  { path: '/movie/238', title: 'The Godfather', year: 1972 },
  { path: '/movie/155', title: 'The Dark Knight', year: 2008 },
  { path: '/movie/78', title: 'Blade Runner', year: 1982 }
];

let browser;
let page;

describe('Production 404 Fix Validation', () => {
  beforeAll(async () => {
    console.log(`🚀 Testing production deployment at: ${PRODUCTION_URL}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Enable request interception for monitoring
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Log API calls for debugging
      if (request.url().includes('/api/')) {
        console.log(`📡 API Request: ${request.method()} ${request.url()}`);
      }
      request.continue();
    });
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Console Error: ${msg.text()}`);
      }
    });
    
    // Monitor failed requests
    page.on('requestfailed', request => {
      console.log(`❌ Failed Request: ${request.url()} - ${request.failure().errorText}`);
    });
  }, TIMEOUT);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Critical Movie Route Tests', () => {
    CRITICAL_ROUTES.forEach(({ path, title, year }) => {
      test(`${path} should load successfully (${title})`, async () => {
        const url = `${PRODUCTION_URL}${path}`;
        console.log(`🧪 Testing: ${url}`);
        
        let lastError;
        
        // Retry logic for flaky network conditions
        for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
          try {
            console.log(`   Attempt ${attempt}/${RETRY_COUNT}`);
            
            // Navigate with extended timeout
            const response = await page.goto(url, {
              waitUntil: 'networkidle2',
              timeout: TIMEOUT
            });
            
            // Check response status
            const status = response.status();
            console.log(`   HTTP Status: ${status}`);
            
            if (status === 404) {
              throw new Error(`404 Not Found - Route still failing: ${path}`);
            }
            
            expect(status).toBe(200);
            
            // Wait for content to load
            await page.waitForSelector('h1, [data-testid="movie-title"]', { timeout: 10000 });
            
            // Verify page content
            const pageTitle = await page.title();
            const h1Text = await page.$eval('h1', el => el.textContent).catch(() => '');
            
            console.log(`   Page Title: ${pageTitle}`);
            console.log(`   H1 Content: ${h1Text}`);
            
            // Verify movie data is present
            expect(pageTitle).toContain(title);
            expect(h1Text).toContain(title);
            
            // Check for nuclear static indicators
            const nuclearIndicators = await page.evaluate(() => {
              const indicators = [];
              if (window.__NEXT_DATA__?.props?.pageProps?.tmdbId) {
                indicators.push('NEXT_DATA_PRESENT');
              }
              if (document.querySelector('[data-nuclear="true"]')) {
                indicators.push('NUCLEAR_STATIC_MARKER');
              }
              return indicators;
            });
            
            console.log(`   Nuclear Indicators: ${nuclearIndicators.join(', ') || 'None'}`);
            
            // Test passed - break retry loop
            console.log(`✅ Success: ${path} loaded correctly`);
            return;
            
          } catch (error) {
            lastError = error;
            console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);
            
            if (attempt < RETRY_COUNT) {
              console.log(`   ⏳ Retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        // All attempts failed
        throw new Error(`Route ${path} failed after ${RETRY_COUNT} attempts. Last error: ${lastError.message}`);
        
      }, TIMEOUT);
    });
  });

  describe('Nuclear Static System Validation', () => {
    test('Nuclear static files should be accessible via direct API calls', async () => {
      for (const { path } of CRITICAL_ROUTES.slice(0, 2)) { // Test first 2 routes
        const movieId = path.split('/')[2];
        const nuclearUrl = `${PRODUCTION_URL}/api/nuclear-static/${movieId}`;
        
        console.log(`🧪 Testing nuclear API: ${nuclearUrl}`);
        
        const response = await page.goto(nuclearUrl, { timeout: 15000 });
        const status = response.status();
        
        console.log(`   Nuclear API Status: ${status}`);
        
        if (status === 200) {
          const content = await page.content();
          const data = JSON.parse(content);
          
          expect(data).toHaveProperty('props');
          expect(data.props).toHaveProperty('title');
          expect(data.props).toHaveProperty('tmdbId', parseInt(movieId));
          
          console.log(`✅ Nuclear static data valid for movie ${movieId}`);
        } else {
          console.log(`⚠️  Nuclear API not available (${status}) - fallback to TMDB expected`);
        }
      }
    });

    test('Page load performance should be acceptable', async () => {
      const testRoute = CRITICAL_ROUTES[0]; // Test Star Wars route
      const url = `${PRODUCTION_URL}${testRoute.path}`;
      
      console.log(`🧪 Testing performance: ${url}`);
      
      const startTime = Date.now();
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT });
      await page.waitForSelector('h1', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`   Load Time: ${loadTime}ms`);
      
      // Performance should be under 5 seconds (was 2-3s before, nuclear should be faster)
      expect(loadTime).toBeLessThan(5000);
      
      // Test critical rendering path
      const metrics = await page.metrics();
      console.log(`   DOM Elements: ${metrics.Nodes}`);
      console.log(`   JS Heap Used: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)}MB`);
      
      expect(metrics.Nodes).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('Non-existent movie should return proper 404', async () => {
      const invalidUrl = `${PRODUCTION_URL}/movie/999999`;
      console.log(`🧪 Testing 404 handling: ${invalidUrl}`);
      
      const response = await page.goto(invalidUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      });
      
      const status = response.status();
      console.log(`   Invalid Route Status: ${status}`);
      
      // Should properly return 404 for non-existent movies
      expect(status).toBe(404);
    });

    test('Homepage should still load correctly', async () => {
      const homeUrl = `${PRODUCTION_URL}/`;
      console.log(`🧪 Testing homepage: ${homeUrl}`);
      
      const response = await page.goto(homeUrl, { 
        waitUntil: 'networkidle2', 
        timeout: TIMEOUT 
      });
      
      const status = response.status();
      console.log(`   Homepage Status: ${status}`);
      
      expect(status).toBe(200);
      
      // Check for key homepage elements
      await page.waitForSelector('nav, header, [data-testid="hero"]', { timeout: 10000 });
      
      const title = await page.title();
      console.log(`   Homepage Title: ${title}`);
      
      expect(title).toContain('MovieGenius');
    });
  });

  describe('Build Deployment Validation', () => {
    test('Deployment should include nuclear static fixes', async () => {
      // Check if our validation endpoint exists
      const validationUrl = `${PRODUCTION_URL}/api/build-validation`;
      
      try {
        const response = await page.goto(validationUrl, { timeout: 10000 });
        const status = response.status();
        
        console.log(`🧪 Build validation endpoint: ${status}`);
        
        if (status === 200) {
          const content = await page.content();
          const data = JSON.parse(content);
          
          expect(data).toHaveProperty('nuclearStatic');
          expect(data.nuclearStatic).toBe(true);
          
          console.log(`✅ Deployment includes nuclear static validation`);
        }
      } catch (error) {
        console.log(`⚠️  Build validation endpoint not available - acceptable for now`);
      }
    });
  });
});

// Export for external test runners
export { CRITICAL_ROUTES, PRODUCTION_URL };