#!/usr/bin/env node
import puppeteer from 'puppeteer';

async function quickTest() {
  console.log('🚀 Quick Puppeteer Test - JSON Movie Analysis');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Monitor console for JSON detection
  page.on('console', msg => {
    if (msg.text().includes('JSON format analysis')) {
      console.log('✅ JSON Detection:', msg.text());
    }
  });

  try {
    console.log('📄 Testing The Maltese Falcon (963)...');
    
    await page.goto('http://localhost:3000/movie/963', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    // Wait for analysis content
    await page.waitForSelector('[data-testid="analysis-content"]', { timeout: 8000 });
    console.log('✅ Analysis content loaded');

    // Count test elements
    const contentSections = await page.$$('[data-testid^="section-"]');
    const movieCards = await page.$$('[data-testid="featured-movie-card"]');
    const topicCards = await page.$$('[data-testid="explore-topic-card"]');

    console.log(`📊 Results:`);
    console.log(`   Content Sections: ${contentSections.length}`);
    console.log(`   Featured Movies: ${movieCards.length}`);
    console.log(`   Explore Topics: ${topicCards.length}`);

    // Get some actual movie titles
    const movieTitles = await page.$$eval('[data-testid="featured-movie-card"]',
      cards => cards.slice(0, 3).map(card => {
        const titleEl = card.querySelector('[style*="font-weight: 600"]');
        return titleEl ? titleEl.textContent.trim() : 'Unknown';
      })
    );

    console.log(`🎬 Featured Movies: ${movieTitles.join(', ')}`);

    // Check page title
    const pageTitle = await page.title();
    console.log(`📋 Page Title: ${pageTitle}`);

    const success = contentSections.length >= 5 && movieCards.length >= 3;
    console.log(`\n${success ? '✅ SUCCESS' : '❌ FAILED'}: JSON implementation working!`);
    
    await browser.close();
    return success;

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    await browser.close();
    return false;
  }
}

quickTest().then(success => {
  process.exit(success ? 0 : 1);
});