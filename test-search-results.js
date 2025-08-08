/**
 * Quick test to verify search results display issue
 */

import puppeteer from 'puppeteer';

async function testSearchResults() {
  console.log('🔍 Testing search results display...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console logs to see if React is logging search results
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Rendering search results') || text.includes('movies')) {
        console.log('🎬 Console:', text);
      }
    });
    
    // Navigate to search with query
    await page.goto('https://moviegenius-production.up.railway.app/search?q=batman', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('✅ Search page loaded with query');
    
    // Wait for any async operations
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check different selectors for results
    const selectors = [
      '[class*="movieGrid"]',
      '[class*="MovieHeaderCompact"]', 
      'h1, h2, h3', // Movie titles
      'img[src*="tmdb"]', // TMDB posters
      '[style*="movieGrid"]'
    ];
    
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements with: ${selector}`);
        
        // Get text content of first few elements
        const texts = await page.evaluate((sel) => {
          const items = document.querySelectorAll(sel);
          return Array.from(items).slice(0, 3).map(item => 
            item.textContent?.trim() || item.src || item.alt || 'No text'
          );
        }, selector);
        
        console.log(`📝 Content: ${texts.join(', ')}`);
      }
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'search-results-debug.png', fullPage: true });
    console.log('📸 Screenshot saved: search-results-debug.png');
    
    // Check page source for any movie titles
    const pageContent = await page.content();
    const movieTitles = ['Batman', 'The Batman', 'Dark Knight'];
    const foundTitles = movieTitles.filter(title => pageContent.includes(title));
    
    if (foundTitles.length > 0) {
      console.log('🎬 Found movie titles in page:', foundTitles.join(', '));
    } else {
      console.log('❌ No movie titles found in page source');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testSearchResults().catch(console.error);