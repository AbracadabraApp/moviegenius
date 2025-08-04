/**
 * Puppeteer Test for Production Search Functionality
 * 
 * Tests the actual website search interface to see if there's a disconnect
 * between the working API and the frontend implementation
 */

import puppeteer from 'puppeteer';

async function testSearchFunctionality() {
  console.log('🚀 Starting Puppeteer search test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable request/response logging
    page.on('request', request => {
      if (request.url().includes('/api/search')) {
        console.log('🔍 API Request:', request.method(), request.url());
        console.log('📤 Request body:', request.postData());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/search')) {
        console.log('📥 API Response:', response.status(), response.url());
      }
    });
    
    // Capture console logs from the page
    page.on('console', msg => {
      if (msg.text().includes('search') || msg.text().includes('TMDB')) {
        console.log('🌐 Browser console:', msg.text());
      }
    });
    
    // Navigate to production site
    console.log('📍 Navigating to production site...');
    await page.goto('https://moviegenius-production.up.railway.app/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('✅ Page loaded successfully');
    
    // Look for search input - try multiple selectors
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="search"]',
      'input[placeholder*="Search"]',
      '.search-input',
      '#search',
      '[data-testid="search"]',
      'input'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        searchInput = await page.$(selector);
        if (searchInput) {
          console.log(`🔍 Found search input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!searchInput) {
      console.log('❌ No search input found, taking screenshot...');
      await page.screenshot({ path: 'no-search-input.png', fullPage: true });
      
      // List all input elements for debugging
      const inputs = await page.$$eval('input', inputs => 
        inputs.map(input => ({
          type: input.type,
          placeholder: input.placeholder,
          id: input.id,
          className: input.className
        }))
      );
      console.log('📝 All input elements found:', inputs);
      return;
    }
    
    // Test search functionality
    const testQueries = ['fight club', 'avengers', 'batman'];
    
    for (const query of testQueries) {
      console.log(`\n🔍 Testing search for: "${query}"`);
      
      try {
        // Clear and type in search input
        await searchInput.click({ clickCount: 3 }); // Select all
        await searchInput.type(query);
        
        console.log('⌨️ Typed query, waiting for results...');
        
        // Wait for search results or API call
        await page.waitForTimeout(2000);
        
        // Look for search results
        const resultsSelectors = [
          '.search-results',
          '.movie-results',
          '.results',
          '[data-testid="search-results"]',
          '.movie-card',
          '.search-result'
        ];
        
        let foundResults = false;
        for (const selector of resultsSelectors) {
          const results = await page.$(selector);
          if (results) {
            console.log(`✅ Found results with selector: ${selector}`);
            foundResults = true;
            
            // Get result count and titles
            const resultInfo = await page.evaluate((sel) => {
              const container = document.querySelector(sel);
              if (!container) return null;
              
              const items = container.querySelectorAll('[title], .title, h3, h2, .movie-title');
              return {
                count: items.length,
                titles: Array.from(items).slice(0, 3).map(item => item.textContent || item.title).filter(Boolean)
              };
            }, selector);
            
            console.log(`📊 Results: ${resultInfo?.count || 0} items`);
            if (resultInfo?.titles?.length > 0) {
              console.log(`🎬 First results: ${resultInfo.titles.join(', ')}`);
            }
            break;
          }
        }
        
        if (!foundResults) {
          console.log('❌ No search results found in DOM');
          await page.screenshot({ path: `search-${query.replace(' ', '-')}.png`, fullPage: true });
        }
        
        // Check for error messages
        const errorSelectors = ['.error', '.error-message', '[role="alert"]'];
        for (const selector of errorSelectors) {
          const error = await page.$(selector);
          if (error) {
            const errorText = await page.evaluate(el => el.textContent, error);
            console.log(`⚠️ Error found: ${errorText}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error testing "${query}":`, error.message);
      }
    }
    
    // Test direct navigation to search page if it exists
    const searchUrls = [
      '/search',
      '/search?q=test',
      '/?search=test'
    ];
    
    for (const url of searchUrls) {
      try {
        console.log(`\n🔗 Testing search URL: ${url}`);
        await page.goto(`https://moviegenius-production.up.railway.app${url}`, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        const title = await page.title();
        console.log(`📄 Page title: ${title}`);
        
        if (!title.includes('404')) {
          console.log('✅ Search page exists');
          await page.screenshot({ path: `search-page${url.replace(/[^a-zA-Z0-9]/g, '-')}.png` });
        }
      } catch (error) {
        console.log(`❌ Search URL ${url} failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Puppeteer test failed:', error);
  } finally {
    await browser.close();
    console.log('🏁 Puppeteer test completed');
  }
}

// Run the test
testSearchFunctionality().catch(console.error);