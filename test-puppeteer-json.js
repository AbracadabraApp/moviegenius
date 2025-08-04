#!/usr/bin/env node
/**
 * Puppeteer Test for JSON Movie Analysis Implementation
 * Tests real movie pages with test IDs to validate complete functionality
 */

import puppeteer from 'puppeteer';

// Test movies from PROMPT_C3_Test_LIST.txt
const TEST_MOVIES = [
  { id: 963, title: 'The Maltese Falcon', year: 1941 },
  { id: 996, title: 'Double Indemnity', year: 1944 },
  { id: 539, title: 'Psycho', year: 1960 },
  { id: 78, title: 'Blade Runner', year: 1982 },
  { id: 238, title: 'The Godfather', year: 1972 }
];

async function testJsonMoviePages() {
  console.log('🚀 Starting Puppeteer JSON Movie Analysis Tests');
  
  const browser = await puppeteer.launch({
    headless: true, // Run headless for CI
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1200, height: 800 }
  });

  const page = await browser.newPage();
  
  // Monitor console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('JSON format analysis') || text.includes('ERROR')) {
      console.log(`📄 Browser: ${text}`);
    }
  });

  // Monitor network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ Network Error: ${response.url()} - ${response.status()}`);
    }
  });

  const results = [];

  for (const movie of TEST_MOVIES) {
    console.log(`\n🎬 Testing: ${movie.title} (${movie.year}) - ID: ${movie.id}`);
    
    try {
      const startTime = Date.now();
      
      // Navigate to movie page
      await page.goto(`http://localhost:3000/movie/${movie.id}`, {
        waitUntil: 'networkidle0',
        timeout: 15000
      });

      // Wait for analysis content to load
      await page.waitForSelector('[data-testid="analysis-content"]', {
        timeout: 10000
      });

      const loadTime = Date.now() - startTime;
      console.log(`⏱️  Page loaded in ${loadTime}ms`);

      // Test 1: Check if JSON analysis is detected
      const hasAnalysisContent = await page.$('[data-testid="analysis-content"]') !== null;
      
      // Test 2: Count content sections
      const contentSections = await page.$$('[data-testid^="section-"]');
      console.log(`📝 Content sections found: ${contentSections.length}`);

      // Test 3: Count featured movie cards
      const movieCards = await page.$$('[data-testid="featured-movie-card"]');
      console.log(`🎭 Featured movie cards: ${movieCards.length}`);

      // Test 4: Count explore topic cards
      const topicCards = await page.$$('[data-testid="explore-topic-card"]');
      console.log(`🔍 Explore topic cards: ${topicCards.length}`);

      // Test 5: Check for alternating sections
      const sectionOrder = await page.$$eval('[data-testid^="section-"]', 
        elements => elements.map(el => el.dataset.testid)
      );
      
      // Test 6: Verify page title contains movie title
      const pageTitle = await page.title();
      const titleMatches = pageTitle.includes(movie.title);

      // Test 7: Check for errors
      const errorElements = await page.$$('[data-testid*="error"]');
      const hasErrors = errorElements.length > 0;

      // Test 8: Check specific movie titles in featured cards
      const movieTitles = await page.$$eval('[data-testid="featured-movie-card"]',
        cards => cards.map(card => {
          const titleElement = card.querySelector('[style*="font-weight: 600"]');
          return titleElement ? titleElement.textContent.trim() : '';
        })
      );

      const testResult = {
        movieId: movie.id,
        title: movie.title,
        year: movie.year,
        loadTime,
        success: hasAnalysisContent && !hasErrors,
        details: {
          hasAnalysisContent,
          contentSections: contentSections.length,
          movieCards: movieCards.length,
          topicCards: topicCards.length,
          titleMatches,
          hasErrors,
          movieTitles,
          sectionOrder: sectionOrder.slice(0, 5) // First 5 sections
        }
      };

      results.push(testResult);

      if (testResult.success) {
        console.log(`✅ ${movie.title}: PASSED`);
        console.log(`   - ${contentSections.length} sections, ${movieCards.length} movies, ${topicCards.length} topics`);
        if (movieTitles.length > 0) {
          console.log(`   - Featured: ${movieTitles.slice(0, 2).join(', ')}...`);
        }
      } else {
        console.log(`❌ ${movie.title}: FAILED`);
        if (!hasAnalysisContent) console.log(`   - Missing analysis content`);
        if (hasErrors) console.log(`   - Has error elements`);
      }

    } catch (error) {
      console.log(`❌ ${movie.title}: ERROR - ${error.message}`);
      results.push({
        movieId: movie.id,
        title: movie.title,
        year: movie.year,
        success: false,
        error: error.message
      });
    }

    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await browser.close();

  // Summary Report
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (passed > 0) {
    const avgLoadTime = results
      .filter(r => r.loadTime)
      .reduce((sum, r) => sum + r.loadTime, 0) / passed;
    console.log(`⏱️  Average load time: ${Math.round(avgLoadTime)}ms`);
  }

  // Detailed Results
  console.log('\n📋 DETAILED RESULTS');
  console.log('===================');
  
  results.forEach(result => {
    console.log(`\n🎬 ${result.title} (${result.year})`);
    console.log(`   Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (result.details) {
      console.log(`   Load Time: ${result.loadTime}ms`);
      console.log(`   Content Sections: ${result.details.contentSections}`);
      console.log(`   Featured Movies: ${result.details.movieCards}`);
      console.log(`   Explore Topics: ${result.details.topicCards}`);
      console.log(`   Title Match: ${result.details.titleMatches ? '✅' : '❌'}`);
      
      if (result.details.movieTitles.length > 0) {
        console.log(`   Featured Films: ${result.details.movieTitles.join(', ')}`);
      }
    }
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  // Performance Analysis
  const successfulResults = results.filter(r => r.success && r.details);
  if (successfulResults.length > 0) {
    console.log('\n📈 PERFORMANCE ANALYSIS');
    console.log('=======================');
    
    const sectionCounts = successfulResults.map(r => r.details.contentSections);
    const movieCounts = successfulResults.map(r => r.details.movieCards);
    const topicCounts = successfulResults.map(r => r.details.topicCards);
    
    console.log(`Content Sections: ${Math.min(...sectionCounts)}-${Math.max(...sectionCounts)} (avg: ${(sectionCounts.reduce((a,b) => a+b, 0) / sectionCounts.length).toFixed(1)})`);
    console.log(`Featured Movies: ${Math.min(...movieCounts)}-${Math.max(...movieCounts)} (avg: ${(movieCounts.reduce((a,b) => a+b, 0) / movieCounts.length).toFixed(1)})`);
    console.log(`Explore Topics: ${Math.min(...topicCounts)}-${Math.max(...topicCounts)} (avg: ${(topicCounts.reduce((a,b) => a+b, 0) / topicCounts.length).toFixed(1)})`);
  }

  console.log('\n🎯 JSON Implementation Test Complete!');
  return results;
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testJsonMoviePages()
    .then(results => {
      const success = results.filter(r => r.success).length;
      process.exit(success === results.length ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testJsonMoviePages };