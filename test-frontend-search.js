/**
 * Quick test to check if frontend search is working after SimpleSearch fix
 */

import puppeteer from 'puppeteer';

async function testFrontendSearch() {
  console.log('🚀 Testing frontend search with simple-search endpoint...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor API calls
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log('📤 API Request:', request.method(), request.url().split('/').pop());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/simple-search')) {
        console.log('📥 simple-search Response:', response.status());
      }
      if (response.url().includes('/api/multi-search')) {
        console.log('📥 multi-search Response:', response.status(), '(should not be called anymore)');
      }
    });
    
    // Navigate to production
    await page.goto('https://moviegenius-production.up.railway.app/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Find search input
    const searchInput = await page.$('input');
    if (!searchInput) {
      console.log('❌ No search input found');
      return;
    }
    
    console.log('✅ Found search input, testing search...');
    
    // Test search
    await searchInput.type('batman');
    await page.keyboard.press('Enter');
    
    // Wait for API response
    await page.waitForTimeout(3000);
    
    console.log('✅ Search test completed - check API calls above');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testFrontendSearch().catch(console.error);