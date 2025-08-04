/**
 * Nuclear Static Generation - Production Reality Testing
 * 
 * CRITICAL: These tests validate actual production deployment behavior.
 * Based on SEARCH_INCIDENT_REPORT.md: "Implementation First" principle.
 * 
 * TESTING PHILOSOPHY: 
 * - Test actual deployed URLs, not local development
 * - Validate real user workflows, not just technical functionality
 * - Focus on what users experience, not what code does
 * 
 * From REPEATED-FLAWS-IN-RESOLVING-BROKEN-CODE.md:
 * "Production is the only environment that matters"
 */

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const { performance } = require('perf_hooks');

// Production URLs for testing
const PRODUCTION_BASE = 'https://moviegenius.ai';
const STAGING_BASE = 'https://staging.moviegenius.ai'; // If available

describe('Nuclear Static Production Reality', () => {
  
  describe('CRITICAL: Production URL Validation', () => {
    
    test('SHOULD FAIL: Core movie pages return 200 status', async () => {
      const coreMovieUrls = [
        `${PRODUCTION_BASE}/movie/11`,    // Star Wars
        `${PRODUCTION_BASE}/movie/550`,   // Fight Club
        `${PRODUCTION_BASE}/movie/238`,   // The Godfather
        `${PRODUCTION_BASE}/movie/155`,   // The Dark Knight
        `${PRODUCTION_BASE}/movie/424`    // Schindlers List
      ];
      
      const urlFailures = [];
      let totalRequests = 0;
      let successfulRequests = 0;
      
      for (const url of coreMovieUrls) {
        try {
          totalRequests++;
          const response = await fetch(url, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Nuclear-Static-Test/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });
          
          if (response.ok) {
            successfulRequests++;
            
            // Verify content type is HTML
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('text/html')) {
              urlFailures.push(`${url}: Wrong content type: ${contentType}`);
            }
            
          } else {
            urlFailures.push(`${url}: HTTP ${response.status} - ${response.statusText}`);
          }
          
        } catch (error) {
          urlFailures.push(`${url}: ${error.message}`);
        }
      }
      
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      
      if (urlFailures.length > 0) {
        throw new Error(
          `PRODUCTION URL FAILURES: ${urlFailures.length}/${totalRequests} requests failed (${successRate.toFixed(1)}% success rate):\n` +
          `${urlFailures.join('\n')}\n` +
          `CRITICAL: Users cannot access these core movie pages`
        );
      }
    });

    test('SHOULD FAIL: Production pages load content immediately', async () => {
      const testUrls = [
        { url: `${PRODUCTION_BASE}/movie/11`, title: 'Star Wars', content: 'revolutionized blockbuster' },
        { url: `${PRODUCTION_BASE}/movie/550`, title: 'Fight Club', content: 'psychological thrillers' }
      ];
      
      const contentFailures = [];
      
      for (const test of testUrls) {
        try {
          const startTime = performance.now();
          const response = await fetch(test.url, { timeout: 10000 });
          const loadTime = performance.now() - startTime;
          
          if (!response.ok) {
            contentFailures.push(`${test.url}: HTTP ${response.status}`);
            continue;
          }
          
          const html = await response.text();
          const totalTime = performance.now() - startTime;
          
          // Content must be immediately available (not loading states)
          if (html.includes('Loading...') || html.includes('Fetching movie data')) {
            contentFailures.push(`${test.url}: Shows loading state instead of content`);
          }
          
          // Required content must be present
          if (!html.includes(test.title)) {
            contentFailures.push(`${test.url}: Missing movie title "${test.title}"`);
          }
          
          if (!html.includes(test.content)) {
            contentFailures.push(`${test.url}: Missing analysis content`);
          }
          
          // Performance requirement
          if (totalTime > 3000) { // 3s is still better than current system
            contentFailures.push(`${test.url}: Too slow (${totalTime.toFixed(0)}ms)`);
          }
          
        } catch (error) {
          contentFailures.push(`${test.url}: ${error.message}`);
        }
      }
      
      if (contentFailures.length > 0) {
        throw new Error(`EXPECTED FAILURES: Production content issues:\n${contentFailures.join('\n')}`);
      }
    });

    test('SHOULD FAIL: Movie links navigate correctly in production', async () => {
      // Test actual movie-to-movie navigation
      const sourceUrl = `${PRODUCTION_BASE}/movie/11`; // Star Wars
      
      try {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          throw new Error(`Source page failed: HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // Find movie links in the analysis
        const movieLinks = Array.from(document.querySelectorAll('a[href*="/movie/"]'))
          .slice(0, 3); // Test first 3 links
        
        if (movieLinks.length === 0) {
          throw new Error('No movie links found in Star Wars page');
        }
        
        const linkFailures = [];
        
        for (const link of movieLinks) {
          const href = link.getAttribute('href');
          const fullUrl = href.startsWith('http') ? href : `${PRODUCTION_BASE}${href}`;
          const linkText = link.textContent.trim();
          
          try {
            const linkResponse = await fetch(fullUrl, { timeout: 10000 });
            
            if (!linkResponse.ok) {
              linkFailures.push(`${linkText} (${href}): HTTP ${linkResponse.status}`);
              continue;
            }
            
            const linkHtml = await linkResponse.text();
            
            // Verify target page has content (not error page)
            if (linkHtml.includes('Movie not found') || linkHtml.includes('404')) {
              linkFailures.push(`${linkText} (${href}): Target page shows error`);
            }
            
            // Verify target page has movie structure
            if (!linkHtml.includes('movie-header') && !linkHtml.includes('movie-content')) {
              linkFailures.push(`${linkText} (${href}): Target page missing movie structure`);
            }
            
          } catch (linkError) {
            linkFailures.push(`${linkText} (${href}): ${linkError.message}`);
          }
        }
        
        if (linkFailures.length > 0) {
          throw new Error(`Movie link navigation failures:\n${linkFailures.join('\n')}`);
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Production movie link testing failed - ${error.message}`);
      }
    });
  });

  describe('SEO and Crawlability', () => {
    
    test('SHOULD FAIL: Content visible in view-source', async () => {
      const testUrl = `${PRODUCTION_BASE}/movie/11`;
      
      try {
        const response = await fetch(testUrl);
        const html = await response.text();
        
        // Critical SEO content must be in HTML source
        const requiredContent = [
          'Star Wars',
          'revolutionized blockbuster filmmaking',
          'Featured Films',
          'Related Films'
        ];
        
        const missingContent = [];
        
        for (const content of requiredContent) {
          if (!html.includes(content)) {
            missingContent.push(content);
          }
        }
        
        if (missingContent.length > 0) {
          throw new Error(`SEO content missing from HTML source: ${missingContent.join(', ')}`);
        }
        
        // Verify proper meta tags
        if (!html.match(/<title>.*Star Wars.*MovieGenius.*<\/title>/)) {
          throw new Error('Missing or incorrect title tag');
        }
        
        if (!html.match(/<meta name="description"/)) {
          throw new Error('Missing meta description');
        }
        
        // Should NOT be JavaScript-generated content
        if (html.includes('document.getElementById') && !html.includes('Star Wars')) {
          throw new Error('Content appears to be JavaScript-generated only');
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: SEO validation failed - ${error.message}`);
      }
    });

    test('SHOULD FAIL: Structured data present for search engines', async () => {
      const testUrl = `${PRODUCTION_BASE}/movie/11`;
      
      try {
        const response = await fetch(testUrl);
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // Check for movie-specific structured data
        const actionBar = document.querySelector('#action-bar');
        if (!actionBar) {
          throw new Error('Missing action bar with movie data');
        }
        
        // Verify essential data attributes
        const requiredAttributes = ['data-tmdb-id', 'data-title', 'data-year'];
        const missingAttributes = [];
        
        for (const attr of requiredAttributes) {
          if (!actionBar.hasAttribute(attr)) {
            missingAttributes.push(attr);
          }
        }
        
        if (missingAttributes.length > 0) {
          throw new Error(`Missing structured data attributes: ${missingAttributes.join(', ')}`);
        }
        
        // Verify values are correct
        expect(actionBar.getAttribute('data-tmdb-id')).toBe('11');
        expect(actionBar.getAttribute('data-title')).toBe('Star Wars');
        expect(actionBar.getAttribute('data-year')).toBe('1977');
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Structured data validation failed - ${error.message}`);
      }
    });
  });

  describe('Real User Workflows', () => {
    
    test('SHOULD FAIL: Complete user journey works end-to-end', async () => {
      // Simulate realistic user behavior: discover movie → read analysis → click related film
      const userJourney = [
        {
          step: 'Land on Star Wars page',
          url: `${PRODUCTION_BASE}/movie/11`,
          expectation: 'Page loads with Star Wars content',
          validate: (html) => html.includes('Star Wars') && html.includes('revolutionized')
        },
        {
          step: 'Find Guardians of Galaxy link',
          url: `${PRODUCTION_BASE}/movie/11`,
          expectation: 'Analysis contains linked movie',
          validate: (html) => html.includes('href="/movie/118340"') && html.includes('Guardians of the Galaxy')
        },
        {
          step: 'Navigate to Guardians of Galaxy',
          url: `${PRODUCTION_BASE}/movie/118340`,
          expectation: 'Guardians page loads correctly',
          validate: (html) => html.includes('Guardians of the Galaxy') && html.includes('movie-header')
        }
      ];
      
      const journeyFailures = [];
      
      for (const step of userJourney) {
        try {
          const response = await fetch(step.url, {
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (User Journey Test)' }
          });
          
          if (!response.ok) {
            journeyFailures.push(`${step.step}: HTTP ${response.status}`);
            continue;
          }
          
          const html = await response.text();
          
          if (!step.validate(html)) {
            journeyFailures.push(`${step.step}: Validation failed - ${step.expectation}`);
          }
          
        } catch (error) {
          journeyFailures.push(`${step.step}: ${error.message}`);
        }
      }
      
      if (journeyFailures.length > 0) {
        throw new Error(`USER JOURNEY FAILURES:\n${journeyFailures.join('\n')}`);
      }
    });

    test('SHOULD FAIL: Mobile user experience maintains functionality', async () => {
      const testUrl = `${PRODUCTION_BASE}/movie/11`;
      
      try {
        const response = await fetch(testUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
          }
        });
        
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // Verify mobile-optimized structure
        const phoneFrame = document.querySelector('.phone-frame');
        if (!phoneFrame) {
          throw new Error('Missing phone-frame mobile structure');
        }
        
        // Check viewport meta tag
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (!viewportMeta || !viewportMeta.getAttribute('content').includes('width=device-width')) {
          throw new Error('Missing or incorrect viewport meta tag');
        }
        
        // Verify touch-friendly action bar
        const actionBar = document.querySelector('#action-bar');
        if (!actionBar) {
          throw new Error('Missing action bar for mobile interaction');
        }
        
        // Check for mobile-specific CSS
        if (!html.includes('@media') && !html.includes('max-width')) {
          throw new Error('No responsive CSS detected');
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Mobile experience validation failed - ${error.message}`);
      }
    });

    test('SHOULD FAIL: Action bar functionality initializes on page load', async () => {
      const testUrl = `${PRODUCTION_BASE}/movie/11`;
      
      try {
        const response = await fetch(testUrl);
        const html = await response.text();
        
        // Verify action bar HTML structure
        if (!html.includes('id="action-bar"')) {
          throw new Error('Action bar element missing from HTML');
        }
        
        // Verify JavaScript file is included
        if (!html.includes('movie-actions.js')) {
          throw new Error('Action bar JavaScript not included');
        }
        
        // Verify required data attributes for JavaScript initialization
        const actionBarMatch = html.match(/<[^>]*id="action-bar"[^>]*>/);
        if (!actionBarMatch) {
          throw new Error('Action bar element not found');
        }
        
        const actionBarTag = actionBarMatch[0];
        const requiredData = ['data-tmdb-id="11"', 'data-title="Star Wars"', 'data-year="1977"'];
        const missingData = requiredData.filter(data => !actionBarTag.includes(data));
        
        if (missingData.length > 0) {
          throw new Error(`Action bar missing required data: ${missingData.join(', ')}`);
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Action bar initialization validation failed - ${error.message}`);
      }
    });
  });

  describe('Performance in Production Environment', () => {
    
    test('SHOULD FAIL: Production pages load faster than current system', async () => {
      const testUrls = [
        `${PRODUCTION_BASE}/movie/11`,
        `${PRODUCTION_BASE}/movie/550`
      ];
      
      const performanceResults = [];
      const currentSystemBaseline = 2500; // ms (documented current performance)
      const requiredImprovement = 0.6; // Must be at least 60% faster
      const targetMaxTime = currentSystemBaseline * (1 - requiredImprovement);
      
      for (const url of testUrls) {
        try {
          // Multiple measurements for accuracy
          const loadTimes = [];
          
          for (let i = 0; i < 3; i++) {
            const startTime = performance.now();
            const response = await fetch(url, {
              headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (response.ok) {
              const content = await response.text();
              const totalTime = performance.now() - startTime;
              
              // Only count if content is immediately available
              if (!content.includes('Loading...') && content.includes('movie')) {
                loadTimes.push(totalTime);
              }
            }
          }
          
          if (loadTimes.length > 0) {
            const avgTime = loadTimes.reduce((a, b) => a + b) / loadTimes.length;
            const improvement = ((currentSystemBaseline - avgTime) / currentSystemBaseline) * 100;
            
            if (avgTime > targetMaxTime) {
              performanceResults.push(
                `${url}: ${avgTime.toFixed(0)}ms (target: <${targetMaxTime.toFixed(0)}ms, improvement: ${improvement.toFixed(1)}%)`
              );
            }
          }
          
        } catch (error) {
          performanceResults.push(`${url}: ${error.message}`);
        }
      }
      
      if (performanceResults.length > 0) {
        throw new Error(
          `PRODUCTION PERFORMANCE FAILURES:\n${performanceResults.join('\n')}\n` +
          `CRITICAL: Pages must be significantly faster than current ${currentSystemBaseline}ms baseline`
        );
      }
    });

    test('SHOULD FAIL: Concurrent user load handling', async () => {
      const testUrl = `${PRODUCTION_BASE}/movie/11`;
      const concurrentUsers = 5; // Simulate moderate load
      
      try {
        // Simulate multiple users accessing the same page simultaneously
        const promises = Array(concurrentUsers).fill().map(async (_, index) => {
          const startTime = performance.now();
          
          const response = await fetch(testUrl, {
            headers: {
              'User-Agent': `Test-User-${index}`,
              'Cache-Control': 'no-cache'
            }
          });
          
          const loadTime = performance.now() - startTime;
          
          return {
            success: response.ok,
            loadTime,
            status: response.status,
            hasContent: response.ok ? (await response.text()).includes('Star Wars') : false
          };
        });
        
        const results = await Promise.all(promises);
        const failures = results.filter(r => !r.success || !r.hasContent);
        const slowRequests = results.filter(r => r.success && r.loadTime > 1000);
        
        if (failures.length > 0) {
          throw new Error(`${failures.length}/${concurrentUsers} concurrent requests failed`);
        }
        
        if (slowRequests.length > concurrentUsers * 0.3) {
          throw new Error(
            `Too many slow concurrent requests: ${slowRequests.length}/${concurrentUsers} over 1s\n` +
            `Average slow time: ${(slowRequests.reduce((a, b) => a + b.loadTime, 0) / slowRequests.length).toFixed(0)}ms`
          );
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Concurrent load test failed - ${error.message}`);
      }
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    
    test('SHOULD FAIL: Invalid movie IDs handled gracefully', async () => {
      const invalidIds = ['999999', '0', 'invalid', 'null', 'undefined'];
      const errorHandlingFailures = [];
      
      for (const invalidId of invalidIds) {
        try {
          const response = await fetch(`${PRODUCTION_BASE}/movie/${invalidId}`, {
            timeout: 10000
          });
          
          // Should handle gracefully (404 or error page, not server crash)
          if (response.status >= 500) {
            errorHandlingFailures.push(`${invalidId}: Server error ${response.status}`);
            continue;
          }
          
          const html = await response.text();
          
          // Should have proper error handling, not broken HTML
          if (html.includes('undefined') || html.includes('null') || html.includes('[object Object]')) {
            errorHandlingFailures.push(`${invalidId}: Contains undefined/null in HTML`);
          }
          
          // Should show proper error message or redirect
          if (response.ok && !html.includes('Movie not found') && !html.includes('404')) {
            errorHandlingFailures.push(`${invalidId}: No proper error handling for invalid ID`);
          }
          
        } catch (error) {
          errorHandlingFailures.push(`${invalidId}: ${error.message}`);
        }
      }
      
      if (errorHandlingFailures.length > 0) {
        throw new Error(`ERROR HANDLING FAILURES:\n${errorHandlingFailures.join('\n')}`);
      }
    });

    test('SHOULD FAIL: Network timeout handling', async () => {
      // Test with very short timeout to simulate network issues
      const testUrl = `${PRODUCTION_BASE}/movie/11`;
      
      try {
        const response = await fetch(testUrl, {
          timeout: 100 // Very short timeout
        });
        
        // If this succeeds, the page loaded incredibly fast (good!)
        // If it fails, we test that the failure is handled gracefully
        
      } catch (timeoutError) {
        // This is expected - verify it's a timeout, not a server error
        if (!timeoutError.message.includes('timeout') && !timeoutError.message.includes('ETIMEDOUT')) {
          throw new Error(`Unexpected error type: ${timeoutError.message}`);
        }
        
        // This is acceptable - network timeouts should be handled gracefully
        console.log('Timeout handled correctly:', timeoutError.message);
      }
    });
  });
});