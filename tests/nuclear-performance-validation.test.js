/**
 * Nuclear Static Generation - Performance & Edge Case Testing
 * 
 * CRITICAL: These tests validate the performance claims and edge cases
 * that typically break during static generation implementations.
 * 
 * Based on NUCLEAR_STATIC_GENERATION_PROCESS.md performance requirements:
 * - Page loads <200ms (vs current 2-3s) 
 * - HTML files <50KB each
 * - Bundle size <75KB total per page
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

describe('Nuclear Static Performance Validation', () => {
  
  describe('File Size Requirements', () => {
    
    test('SHOULD FAIL: Static HTML files under 50KB target', async () => {
      const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
      
      try {
        const files = await fs.readdir(nuclearDir);
        const htmlFiles = files.filter(f => f.endsWith('.html')).slice(0, 20);
        
        if (htmlFiles.length === 0) {
          throw new Error('EXPECTED FAILURE: No HTML files found - nuclear static generation not implemented');
        }
        
        const sizingResults = [];
        let totalFiles = 0;
        let oversizedFiles = 0;
        
        for (const htmlFile of htmlFiles) {
          const htmlPath = path.join(nuclearDir, htmlFile);
          const stats = await fs.stat(htmlPath);
          const sizeKB = stats.size / 1024;
          
          totalFiles++;
          
          if (sizeKB > 50) {
            oversizedFiles++;
            sizingResults.push(`${htmlFile}: ${sizeKB.toFixed(1)}KB`);
          }
        }
        
        const oversizedPercentage = (oversizedFiles / totalFiles) * 100;
        
        if (oversizedFiles > 0) {
          throw new Error(
            `FILE SIZE FAILURES: ${oversizedFiles}/${totalFiles} files (${oversizedPercentage.toFixed(1)}%) exceed 50KB limit:\n` +
            `${sizingResults.slice(0, 5).join('\n')}\n` +
            `Target: <50KB per static HTML file`
          );
        }
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: Cannot validate file sizes - nuclear static directory missing');
        }
        throw error;
      }
    });

    test('SHOULD FAIL: Client JavaScript bundle under 15KB', async () => {
      const jsPath = path.join(process.cwd(), 'public/js/movie-actions.js');
      
      try {
        const stats = await fs.stat(jsPath);
        const sizeKB = stats.size / 1024;
        
        if (sizeKB > 15) {
          throw new Error(`JavaScript bundle too large: ${sizeKB.toFixed(1)}KB (target: <15KB)`);
        }
        
        // Verify it contains expected functionality
        const jsContent = await fs.readFile(jsPath, 'utf8');
        expect(jsContent).toContain('MovieActions');
        expect(jsContent).toContain('initActionBar');
        expect(jsContent).toContain('seen-toggle');
        expect(jsContent).toContain('add-toggle');
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: movie-actions.js not found - client JavaScript not created');
        }
        throw error;
      }
    });

    test('SHOULD FAIL: CSS bundle under 10KB', async () => {
      const cssPath = path.join(process.cwd(), 'public/css/movie-page.css');
      
      try {
        const stats = await fs.stat(cssPath);
        const sizeKB = stats.size / 1024;
        
        if (sizeKB > 10) {
          throw new Error(`CSS bundle too large: ${sizeKB.toFixed(1)}KB (target: <10KB)`);
        }
        
        // Verify it contains expected styles
        const cssContent = await fs.readFile(cssPath, 'utf8');
        expect(cssContent).toContain('.phone-frame');
        expect(cssContent).toContain('.movie-header');
        expect(cssContent).toContain('.analysis');
        expect(cssContent).toContain('#action-bar');
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: movie-page.css not found - CSS bundle not created');
        }
        throw error;
      }
    });
  });

  describe('Load Time Performance', () => {
    
    test('SHOULD FAIL: Pages load in under 200ms', async () => {
      const testUrls = [
        'http://localhost:3000/movie/11',    // Star Wars
        'http://localhost:3000/movie/550',   // Fight Club  
        'http://localhost:3000/movie/238',   // The Godfather
        'http://localhost:3000/movie/424',   // Schindlers List
        'http://localhost:3000/movie/155'    // The Dark Knight
      ];
      
      const performanceResults = [];
      let totalTests = 0;
      let slowTests = 0;
      
      for (const url of testUrls) {
        try {
          // Measure multiple loads for accuracy
          const loadTimes = [];
          
          for (let i = 0; i < 3; i++) {
            const startTime = performance.now();
            const response = await fetch(url, { 
              timeout: 5000,
              headers: { 'Cache-Control': 'no-cache' }
            });
            const loadTime = performance.now() - startTime;
            
            if (response.ok) {
              loadTimes.push(loadTime);
            }
          }
          
          if (loadTimes.length > 0) {
            const avgLoadTime = loadTimes.reduce((a, b) => a + b) / loadTimes.length;
            totalTests++;
            
            if (avgLoadTime > 200) {
              slowTests++;
              performanceResults.push(`${url}: ${avgLoadTime.toFixed(0)}ms (target: <200ms)`);
            }
          }
          
        } catch (error) {
          performanceResults.push(`${url}: ${error.message}`);
        }
      }
      
      if (performanceResults.length > 0) {
        const slowPercentage = totalTests > 0 ? (slowTests / totalTests) * 100 : 100;
        throw new Error(
          `PERFORMANCE FAILURES: ${slowTests}/${totalTests} pages (${slowPercentage.toFixed(1)}%) exceed 200ms target:\n` +
          `${performanceResults.join('\n')}\n` +
          `CRITICAL: Pages must load faster than current 2-3s system`
        );
      }
    });

    test('SHOULD FAIL: Static files load faster than current JSON system', async () => {
      const testMovieId = '11';
      const staticUrl = `http://localhost:3000/movie/${testMovieId}`;
      
      try {
        // Benchmark current system performance baseline
        const currentSystemBaseline = 2500; // ms (from documentation)
        const minimumImprovement = 0.7; // Must be at least 70% faster
        const targetMaxTime = currentSystemBaseline * (1 - minimumImprovement);
        
        // Test static system performance
        const loadTimes = [];
        
        for (let i = 0; i < 5; i++) {
          const startTime = performance.now();
          const response = await fetch(staticUrl, {
            headers: { 'Cache-Control': 'no-cache' }
          });
          const loadTime = performance.now() - startTime;
          
          if (response.ok) {
            const content = await response.text();
            
            // Verify content is immediately available (not loading state)
            if (!content.includes('Loading...') && content.includes('Star Wars')) {
              loadTimes.push(loadTime);
            }
          }
        }
        
        if (loadTimes.length === 0) {
          throw new Error('No successful loads recorded');
        }
        
        const avgLoadTime = loadTimes.reduce((a, b) => a + b) / loadTimes.length;
        const improvementPercent = ((currentSystemBaseline - avgLoadTime) / currentSystemBaseline) * 100;
        
        if (avgLoadTime > targetMaxTime) {
          throw new Error(
            `Insufficient performance improvement: ${avgLoadTime.toFixed(0)}ms average\n` +
            `Target: <${targetMaxTime.toFixed(0)}ms (${(minimumImprovement * 100)}% faster than ${currentSystemBaseline}ms baseline)\n` +
            `Actual improvement: ${improvementPercent.toFixed(1)}%`
          );
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Performance benchmark failed - ${error.message}`);
      }
    });

    test('SHOULD FAIL: Time to First Contentful Paint under 100ms', async () => {
      // This test simulates measuring FCP metrics
      const testUrl = 'http://localhost:3000/movie/11';
      
      try {
        const startTime = performance.now();
        const response = await fetch(testUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const contentReceiveTime = performance.now() - startTime;
        
        // Verify content is in the HTML (not requiring JavaScript)
        const hasImmedateContent = html.includes('Star Wars') && 
                                 html.includes('revolutionized') &&
                                 !html.includes('Loading...');
        
        if (!hasImmedateContent) {
          throw new Error('Content not immediately available in HTML - requires JavaScript rendering');
        }
        
        if (contentReceiveTime > 100) {
          throw new Error(`First Contentful Paint too slow: ${contentReceiveTime.toFixed(0)}ms (target: <100ms)`);
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: FCP measurement failed - ${error.message}`);
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    
    test('SHOULD FAIL: Static generation process memory efficient', async () => {
      // This would test the build process memory usage
      const buildLogPath = path.join(process.cwd(), 'build-nuclear-static.log');
      
      try {
        const buildLog = await fs.readFile(buildLogPath, 'utf8');
        
        // Look for memory usage indicators
        const memoryUsageMatch = buildLog.match(/Memory usage: (\d+)MB/);
        const peakMemoryMatch = buildLog.match(/Peak memory: (\d+)MB/);
        
        if (memoryUsageMatch) {
          const memoryMB = parseInt(memoryUsageMatch[1]);
          if (memoryMB > 1024) { // 1GB limit
            throw new Error(`Build process uses too much memory: ${memoryMB}MB (limit: 1024MB)`);
          }
        }
        
        // Check for out-of-memory errors
        if (buildLog.includes('out of memory') || buildLog.includes('heap out of memory')) {
          throw new Error('Build process ran out of memory');
        }
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: Cannot validate memory usage - build log not found');
        }
        throw error;
      }
    });

    test('SHOULD FAIL: Concurrent static file serving', async () => {
      // Test multiple simultaneous requests
      const testUrl = 'http://localhost:3000/movie/11';
      const concurrentRequests = 10;
      
      try {
        const promises = Array(concurrentRequests).fill().map(async (_, index) => {
          const startTime = performance.now();
          const response = await fetch(testUrl, {
            headers: { 'User-Agent': `Test-${index}` }
          });
          const loadTime = performance.now() - startTime;
          
          return {
            success: response.ok,
            loadTime,
            status: response.status,
            index
          };
        });
        
        const results = await Promise.all(promises);
        const failures = results.filter(r => !r.success);
        const slowRequests = results.filter(r => r.success && r.loadTime > 500);
        
        if (failures.length > 0) {
          throw new Error(`${failures.length}/${concurrentRequests} concurrent requests failed`);
        }
        
        if (slowRequests.length > concurrentRequests * 0.2) { // Allow 20% to be slower
          throw new Error(
            `Too many slow responses: ${slowRequests.length}/${concurrentRequests} over 500ms\n` +
            `Average slow time: ${(slowRequests.reduce((a, b) => a + b.loadTime, 0) / slowRequests.length).toFixed(0)}ms`
          );
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Concurrent serving test failed - ${error.message}`);
      }
    });
  });
});

describe('Nuclear Static Edge Cases & Error Handling', () => {
  
  describe('Content Edge Cases', () => {
    
    test('SHOULD FAIL: Movies with missing data handled gracefully', async () => {
      // Test movies that might have incomplete nuclear data
      const edgeCaseIds = ['999999', '000001', 'invalid'];
      
      const edgeCaseFailures = [];
      
      for (const testId of edgeCaseIds) {
        try {
          const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static', `${testId}.html`);
          
          try {
            const html = await fs.readFile(staticHtmlPath, 'utf8');
            
            // Should have graceful error handling, not broken HTML
            if (html.includes('undefined') || html.includes('null') || html.includes('[object Object]')) {
              edgeCaseFailures.push(`${testId}: Contains undefined/null values in HTML`);
            }
            
            // Should have proper error message structure
            if (!html.includes('Movie not found') && !html.includes('movie-header')) {
              edgeCaseFailures.push(`${testId}: No proper error handling or content structure`);
            }
            
          } catch (fileError) {
            // Not finding the file is acceptable for invalid IDs
            if (testId !== 'invalid' && fileError.code === 'ENOENT') {
              edgeCaseFailures.push(`${testId}: Missing HTML file for edge case`);
            }
          }
          
        } catch (error) {
          edgeCaseFailures.push(`${testId}: ${error.message}`);
        }
      }
      
      if (edgeCaseFailures.length > 0) {
        throw new Error(`EXPECTED FAILURES: Edge case handling issues:\n${edgeCaseFailures.join('\n')}`);
      }
    });

    test('SHOULD FAIL: Movies with special characters in titles', async () => {
      // Test titles with special characters that might break HTML
      const specialCharIds = [
        '11842', // Amélie (accented characters)
        '11324', // Shutter Island (might have quotes)
        '129',   // Spirited Away (international title)
      ];
      
      const specialCharFailures = [];
      
      for (const tmdbId of specialCharIds) {
        try {
          const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static', `${tmdbId}.html`);
          const html = await fs.readFile(staticHtmlPath, 'utf8');
          
          // Check for HTML escaping issues
          if (html.includes('&amp;amp;') || html.includes('&quot;&quot;')) {
            specialCharFailures.push(`${tmdbId}: Double-encoded HTML entities`);
          }
          
          // Check for broken quotes
          if (html.match(/title="[^"]*"[^>]*"/) || html.match(/alt="[^"]*"[^>]*"/)) {
            specialCharFailures.push(`${tmdbId}: Broken attribute quotes`);
          }
          
          // Verify valid HTML structure
          const dom = new JSDOM(html);
          const document = dom.window.document;
          
          if (!document.title || document.title.includes('undefined')) {
            specialCharFailures.push(`${tmdbId}: Invalid document title`);
          }
          
        } catch (error) {
          if (error.code !== 'ENOENT') {
            specialCharFailures.push(`${tmdbId}: ${error.message}`);
          }
        }
      }
      
      if (specialCharFailures.length > 0) {
        throw new Error(`EXPECTED FAILURES: Special character handling:\n${specialCharFailures.join('\n')}`);
      }
    });

    test('SHOULD FAIL: Movies with very long analysis content', async () => {
      // Test movies that might have unusually long analysis
      const longContentIds = ['11', '550', '238']; // Popular movies likely to have long analysis
      
      const longContentFailures = [];
      
      for (const tmdbId of longContentIds) {
        try {
          const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static', `${tmdbId}.html`);
          const html = await fs.readFile(staticHtmlPath, 'utf8');
          
          // Check if content is properly truncated or handled
          const analysisMatch = html.match(/<section[^>]*class="[^"]*analysis[^"]*"[^>]*>(.*?)<\/section>/s);
          
          if (analysisMatch) {
            const analysisLength = analysisMatch[1].length;
            
            // Arbitrary large size check (50KB of analysis content)
            if (analysisLength > 50000) {
              longContentFailures.push(`${tmdbId}: Analysis section extremely large (${analysisLength} chars)`);
            }
            
            // Check for performance impact
            const dom = new JSDOM(html);
            const startTime = performance.now();
            const document = dom.window.document;
            const analysisSection = document.querySelector('.analysis');
            const parseTime = performance.now() - startTime;
            
            if (parseTime > 100) { // 100ms parse time limit
              longContentFailures.push(`${tmdbId}: Slow DOM parsing (${parseTime.toFixed(0)}ms)`);
            }
          }
          
        } catch (error) {
          if (error.code !== 'ENOENT') {
            longContentFailures.push(`${tmdbId}: ${error.message}`);
          }
        }
      }
      
      if (longContentFailures.length > 0) {
        throw new Error(`EXPECTED FAILURES: Long content handling:\n${longContentFailures.join('\n')}`);
      }
    });
  });

  describe('Build Process Resilience', () => {
    
    test('SHOULD FAIL: Build handles corrupt nuclear JSON files', async () => {
      // Test what happens when nuclear JSON files are corrupted
      const testCorruptFile = path.join(process.cwd(), 'public/nuclear-static', 'test-corrupt.json');
      const testCorruptHtml = path.join(process.cwd(), 'public/nuclear-static', 'test-corrupt.html');
      
      try {
        // Create a corrupt JSON file
        await fs.writeFile(testCorruptFile, '{"props": {"title": "Test", "invalid": json}');
        
        // Build process should handle this gracefully
        // Check if corresponding HTML file exists and is valid
        try {
          const html = await fs.readFile(testCorruptHtml, 'utf8');
          
          // Should have error handling, not broken HTML
          if (html.includes('undefined') || html.includes('NaN') || html.includes('[object')) {
            throw new Error('Corrupt JSON produced broken HTML output');
          }
          
        } catch (htmlError) {
          if (htmlError.code === 'ENOENT') {
            // This is acceptable - build should skip corrupt files
            console.log('Build correctly skipped corrupt JSON file');
          } else {
            throw htmlError;
          }
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Corrupt JSON handling failed - ${error.message}`);
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testCorruptFile);
          await fs.unlink(testCorruptHtml);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    });

    test('SHOULD FAIL: Build process handles missing dependencies gracefully', async () => {
      const buildLogPath = path.join(process.cwd(), 'build-nuclear-static.log');
      
      try {
        const buildLog = await fs.readFile(buildLogPath, 'utf8');
        
        // Check for graceful error handling
        const errorPatterns = [
          /ENOENT.*node_modules/,  // Missing dependencies
          /Cannot resolve module/,   // Import errors
          /Unexpected token/,        // Syntax errors
          /ReferenceError/          // Undefined variables
        ];
        
        const foundErrors = errorPatterns.filter(pattern => pattern.test(buildLog));
        
        if (foundErrors.length > 0) {
          throw new Error(`Build log contains unhandled errors: ${foundErrors.length} error patterns found`);
        }
        
        // Verify build completed despite potential issues
        if (!buildLog.includes('Build completed') && !buildLog.includes('Generation finished')) {
          throw new Error('Build process did not complete successfully');
        }
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: Cannot validate build resilience - build log not found');
        }
        throw error;
      }
    });
  });

  describe('Production Environment Edge Cases', () => {
    
    test('SHOULD FAIL: Static files work without JavaScript', async () => {
      // Test that content is visible even when JavaScript is disabled
      const testUrl = 'http://localhost:3000/movie/11';
      
      try {
        const response = await fetch(testUrl);
        const html = await response.text();
        
        // Create DOM without JavaScript execution
        const dom = new JSDOM(html, { runScripts: "never" });
        const document = dom.window.document;
        
        // Verify core content is visible without JavaScript
        expect(document.querySelector('title')?.textContent).toContain('Star Wars');
        
        const analysisSection = document.querySelector('.analysis, .movie-content');
        expect(analysisSection).toBeTruthy();
        expect(analysisSection.textContent).toContain('revolutionized');
        
        // Movie links should be present
        const movieLinks = document.querySelectorAll('a[href*="/movie/"]');
        expect(movieLinks.length).toBeGreaterThan(0);
        
        // Featured films should be visible
        const featuredSection = document.querySelector('.featured-films, [class*="featured"]');
        expect(featuredSection).toBeTruthy();
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: JavaScript-free functionality failed - ${error.message}`);
      }
    });

    test('SHOULD FAIL: Static files handle mobile viewport correctly', async () => {
      const testUrl = 'http://localhost:3000/movie/11';
      
      try {
        const response = await fetch(testUrl);
        const html = await response.text();
        
        // Check viewport meta tag
        expect(html).toMatch(/<meta name="viewport" content="width=device-width/);
        
        // Check for mobile-optimized structure
        expect(html).toContain('phone-frame');
        
        // Verify responsive CSS is included
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        const styleSheets = document.querySelectorAll('link[rel="stylesheet"], style');
        let hasResponsiveCSS = false;
        
        for (const sheet of styleSheets) {
          if (sheet.textContent && sheet.textContent.includes('@media')) {
            hasResponsiveCSS = true;
            break;
          }
        }
        
        if (!hasResponsiveCSS) {
          throw new Error('No responsive CSS detected in static HTML');
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Mobile viewport handling failed - ${error.message}`);
      }
    });
  });
});