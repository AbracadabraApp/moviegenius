/**
 * Comprehensive Puppeteer test for search functionality across the site
 * Tests /search page and search bar on /you page
 */

import puppeteer from 'puppeteer';

async function testSearchComprehensive() {
  console.log('🚀 Starting comprehensive search test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging if needed
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor API calls to see which endpoints are being used
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        const endpoint = request.url().split('/api/')[1].split('?')[0];
        apiCalls.push({
          endpoint,
          method: request.method(),
          url: request.url()
        });
        console.log(`📤 API Call: ${request.method()} /api/${endpoint}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const endpoint = response.url().split('/api/')[1].split('?')[0];
        console.log(`📥 API Response: ${endpoint} → ${response.status()}`);
      }
    });
    
    const testQueries = ['batman', 'matrix', 'avengers'];
    const results = {
      searchPage: {},
      youPage: {},
      apiCalls: []
    };
    
    // Test 1: /search page
    console.log('\n🔍 Testing /search page...');
    try {
      await page.goto('https://moviegenius-production.up.railway.app/search', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      console.log('✅ /search page loaded');
      
      // Look for search input on /search page
      const searchInput = await page.$('input[type="text"], input[type="search"], .search-input, input');
      
      if (searchInput) {
        console.log('✅ Found search input on /search page');
        
        for (const query of testQueries) {
          console.log(`\n🔍 Testing "${query}" on /search page...`);
          
          // Clear and type query
          await searchInput.click({ clickCount: 3 });
          await searchInput.type(query);
          
          // Submit search (try Enter key multiple times as suggested)
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 500));
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 500));
          await page.keyboard.press('Enter');
          
          // Wait for results
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Look for results with broader selectors
          const resultSelectors = [
            '.search-results', '.movie-results', '.results', '[data-testid="search-results"]',
            '.movie-card', '.search-result', '.movie', '[class*="movie"]', '[class*="result"]',
            '[class*="Media"]', '[class*="Card"]', 'img[src*="tmdb"]', 'img[alt*="poster"]',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // Any headings that might be movie titles
            '[class*="title"]', '[class*="Title"]'
          ];
          
          let foundResults = false;
          let resultCount = 0;
          
          for (const selector of resultSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
              foundResults = true;
              resultCount = elements.length;
              console.log(`✅ Found ${resultCount} results with selector: ${selector}`);
              
              // Get first few result titles
              const titles = await page.evaluate((sel) => {
                const items = document.querySelectorAll(sel);
                return Array.from(items).slice(0, 3).map(item => {
                  return item.textContent?.trim() || item.title || item.getAttribute('alt') || 'Unknown';
                }).filter(Boolean);
              }, selector);
              
              if (titles.length > 0) {
                console.log(`🎬 First results: ${titles.join(', ')}`);
              }
              break;
            }
          }
          
          results.searchPage[query] = {
            foundResults,
            resultCount,
            success: foundResults && resultCount > 0
          };
          
          if (!foundResults) {
            console.log('❌ No search results found on /search page');
            // Take screenshot for debugging
            await page.screenshot({ path: `search-page-${query}.png`, fullPage: true });
          }
        }
      } else {
        console.log('❌ No search input found on /search page');
        await page.screenshot({ path: 'search-page-no-input.png', fullPage: true });
      }
      
    } catch (error) {
      console.error('❌ Error testing /search page:', error.message);
      results.searchPage.error = error.message;
    }
    
    // Test 2: /you page search bar
    console.log('\n🔍 Testing search bar on /you page...');
    try {
      await page.goto('https://moviegenius-production.up.railway.app/you', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      console.log('✅ /you page loaded');
      
      // Look for search input on /you page
      const youSearchInput = await page.$('input[type="text"], input[type="search"], .search-input, input');
      
      if (youSearchInput) {
        console.log('✅ Found search input on /you page');
        
        for (const query of testQueries) {
          console.log(`\n🔍 Testing "${query}" on /you page search bar...`);
          
          // Clear and type query
          await youSearchInput.click({ clickCount: 3 });
          await youSearchInput.type(query);
          
          // Submit search (try multiple submits as suggested)
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 500));
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 500));
          await page.keyboard.press('Enter');
          
          // Wait for results
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Look for results (might be inline results or navigation)
          const currentUrl = page.url();
          console.log(`📍 URL after search: ${currentUrl}`);
          
          // Check if we navigated to search results or if results appeared inline
          let foundResults = false;
          let resultCount = 0;
          
          if (currentUrl.includes('/search') || currentUrl.includes('q=')) {
            console.log('✅ Navigated to search results page');
            foundResults = true;
            
            // Look for results on the new page
            const resultElements = await page.$$('.movie, .result, [class*="movie"], [class*="result"]');
            resultCount = resultElements.length;
            
            if (resultCount > 0) {
              console.log(`🎬 Found ${resultCount} results after navigation`);
            }
          } else {
            // Look for inline results
            const resultSelectors = [
              '.search-results', '.movie-results', '.results', '[data-testid="search-results"]',
              '.movie-card', '.search-result', '.movie', '[class*="movie"]', '[class*="result"]'
            ];
            
            for (const selector of resultSelectors) {
              const elements = await page.$$(selector);
              if (elements.length > 0) {
                foundResults = true;
                resultCount = elements.length;
                console.log(`✅ Found ${resultCount} inline results with selector: ${selector}`);
                break;
              }
            }
          }
          
          results.youPage[query] = {
            foundResults,
            resultCount,
            navigated: currentUrl !== 'https://moviegenius-production.up.railway.app/you',
            finalUrl: currentUrl,
            success: foundResults
          };
          
          if (!foundResults) {
            console.log('❌ No search results found on /you page');
            await page.screenshot({ path: `you-page-${query}.png`, fullPage: true });
          }
          
          // Navigate back to /you page for next test
          if (currentUrl !== 'https://moviegenius-production.up.railway.app/you') {
            await page.goto('https://moviegenius-production.up.railway.app/you', {
              waitUntil: 'networkidle0',
              timeout: 15000
            });
          }
        }
      } else {
        console.log('❌ No search input found on /you page');
        await page.screenshot({ path: 'you-page-no-input.png', fullPage: true });
      }
      
    } catch (error) {
      console.error('❌ Error testing /you page:', error.message);
      results.youPage.error = error.message;
    }
    
    // Collect API call summary
    results.apiCalls = [...new Set(apiCalls.map(call => call.endpoint))];
    
    // Final summary
    console.log('\n📊 TEST SUMMARY:');
    console.log('=================');
    
    console.log('\n/search page results:');
    Object.entries(results.searchPage).forEach(([query, result]) => {
      if (typeof result === 'object' && result.success !== undefined) {
        console.log(`  ${query}: ${result.success ? '✅' : '❌'} (${result.resultCount} results)`);
      }
    });
    
    console.log('\n/you page results:');
    Object.entries(results.youPage).forEach(([query, result]) => {
      if (typeof result === 'object' && result.success !== undefined) {
        const nav = result.navigated ? ' → navigated' : ' → inline';
        console.log(`  ${query}: ${result.success ? '✅' : '❌'} (${result.resultCount} results${nav})`);
      }
    });
    
    console.log('\nAPI endpoints called:');
    results.apiCalls.forEach(endpoint => {
      console.log(`  📡 /api/${endpoint}`);
    });
    
    console.log('\n🏁 Comprehensive search test completed!');
    return results;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testSearchComprehensive().catch(console.error);