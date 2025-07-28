// __tests__/e2e/moviePageJsonFlow.test.js
/**
 * End-to-End tests for complete JSON movie page flow
 * Tests real browser interaction with JSON movie analysis
 * ALL TESTS WILL FAIL until pure JSON implementation is complete
 */

const puppeteer = require('puppeteer');

describe('Movie Page JSON Analysis E2E', () => {
  let browser;
  let page;
  
  // Use movies from verified C3 JSON list
  const VERIFIED_JSON_MOVIES = [
    { id: 963, title: 'The Maltese Falcon', year: 1941 },
    { id: 996, title: 'Double Indemnity', year: 1944 },
    { id: 910, title: 'The Big Sleep', year: 1946 },
    { id: 678, title: 'Out of the Past', year: 1947 },
    { id: 599, title: 'Sunset Boulevard', year: 1950 }
  ];

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set up console error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    
    // Set up network monitoring
    await page.setRequestInterception(true);
    page.on('request', request => {
      request.continue();
    });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('JSON Analysis Loading and Rendering', () => {
    test('loads movie page with JSON analysis successfully', async () => {
      // ❌ WILL FAIL - JSON rendering not implemented
      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[0].id}`, {
        waitUntil: 'networkidle0'
      });

      // Wait for analysis content to load
      await page.waitForSelector('[data-testid="analysis-content"]', {
        timeout: 10000
      });

      const analysisContent = await page.$('[data-testid="analysis-content"]');
      expect(analysisContent).toBeTruthy();

      // Verify page title
      const title = await page.title();
      expect(title).toContain('The Maltese Falcon');
    });

    test('displays alternating layout pattern correctly', async () => {
      // ❌ WILL FAIL - alternating layout not implemented
      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[1].id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('[data-testid="analysis-content"]');

      // Get all section elements in order
      const sections = await page.$$eval('[data-testid^="section-"]', 
        elements => elements.map(el => el.dataset.testid)
      );

      // Verify alternating pattern
      expect(sections[0]).toMatch(/^section-text-/);
      expect(sections[1]).toMatch(/^section-text-/);
      expect(sections[2]).toBe('section-featured-movies-1');
      expect(sections[4]).toBe('section-featured-movies-2');
      expect(sections[sections.length - 1]).toBe('section-explore-topics');
    });

    test('renders featured movie cards with correct data', async () => {
      // ❌ WILL FAIL - featured movie cards not implemented
      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[2].id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('[data-testid="featured-movie-card"]');

      const movieCards = await page.$$('[data-testid="featured-movie-card"]');
      expect(movieCards.length).toBeGreaterThan(3);

      // Verify first movie card has proper structure
      const firstCard = movieCards[0];
      const movieTitle = await firstCard.$eval('[data-testid="movie-title"]', 
        el => el.textContent
      );
      const movieYear = await firstCard.$eval('[data-testid="movie-year"]',
        el => el.textContent
      );
      const movieDescription = await firstCard.$eval('[data-testid="movie-description"]',
        el => el.textContent
      );

      expect(movieTitle).toBeTruthy();
      expect(movieYear).toMatch(/^\d{4}$/);
      expect(movieDescription.length).toBeGreaterThan(10);
    });

    test('renders explore topic cards with difficulty levels', async () => {
      // ❌ WILL FAIL - explore topic cards not implemented
      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[3].id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('[data-testid="explore-topic-card"]');

      const topicCards = await page.$$('[data-testid="explore-topic-card"]');
      expect(topicCards).toHaveLength(5);

      // Verify topic cards have required elements
      for (const card of topicCards) {
        const topic = await card.$eval('[data-testid="topic-title"]', 
          el => el.textContent
        );
        const category = await card.$eval('[data-testid="topic-category"]',
          el => el.textContent
        );
        const difficulty = await card.$eval('[data-testid="topic-difficulty"]',
          el => el.textContent
        );

        expect(topic.length).toBeGreaterThan(5);
        expect(category.length).toBeGreaterThan(3);
        expect(['Beginner', 'Intermediate', 'Advanced']).toContain(difficulty);
      }
    });
  });

  describe('Performance and User Experience', () => {
    test('loads analysis within 2 seconds', async () => {
      // ❌ WILL FAIL - performance benchmarks not met
      const startTime = Date.now();
      
      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[4].id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('[data-testid="analysis-content"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // Sub-2s load time
    });

    test('handles rapid navigation between JSON movies', async () => {
      // ❌ WILL FAIL - rapid navigation not optimized
      const navigationTimes = [];

      for (const movie of VERIFIED_JSON_MOVIES) {
        const startTime = Date.now();
        
        await page.goto(`http://localhost:3000/movie/${movie.id}`, {
          waitUntil: 'networkidle0'
        });

        await page.waitForSelector('[data-testid="analysis-content"]');
        
        const loadTime = Date.now() - startTime;
        navigationTimes.push(loadTime);
      }

      // All loads should be under 2s
      navigationTimes.forEach(time => {
        expect(time).toBeLessThan(2000);
      });

      // Average should be under 1.5s for good UX
      const avgTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
      expect(avgTime).toBeLessThan(1500);
    });

    test('displays no console errors during JSON processing', async () => {
      // ❌ WILL FAIL - console errors during JSON processing
      const consoleErrors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[0].id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('[data-testid="analysis-content"]');

      // Wait additional time to catch async errors
      await page.waitForTimeout(2000);

      expect(consoleErrors).toHaveLength(0);
    });

    test('maintains responsive design on mobile viewport', async () => {
      // ❌ WILL FAIL - mobile responsive design not tested
      await page.setViewport({ width: 375, height: 667 }); // iPhone SE

      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[1].id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('[data-testid="analysis-content"]');

      // Check that movie cards stack vertically on mobile
      const movieCards = await page.$$('[data-testid="featured-movie-card"]');
      if (movieCards.length > 1) {
        const firstCardRect = await movieCards[0].boundingBox();
        const secondCardRect = await movieCards[1].boundingBox();
        
        // Cards should stack vertically (second card below first)
        expect(secondCardRect.y).toBeGreaterThan(firstCardRect.y + firstCardRect.height);
      }
    });
  });

  describe('Interactive Elements and Accessibility', () => {
    test('movie cards are clickable and navigate correctly', async () => {
      // ❌ WILL FAIL - movie card navigation not implemented
      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[2].id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('[data-testid="featured-movie-card"]');

      const firstMovieCard = await page.$('[data-testid="featured-movie-card"]');
      await firstMovieCard.click();

      // Should navigate to the featured movie's page
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const newUrl = page.url();
      expect(newUrl).toMatch(/\/movie\/\d+/);
      expect(newUrl).not.toContain(VERIFIED_JSON_MOVIES[2].id.toString());
    });

    test('explore topic cards trigger search functionality', async () => {
      // ❌ WILL FAIL - explore topic interaction not implemented
      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[3].id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('[data-testid="explore-topic-card"]');

      const firstTopicCard = await page.$('[data-testid="explore-topic-card"]');
      await firstTopicCard.click();

      // Should trigger search or navigation
      await page.waitForTimeout(1000);
      
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(search|explore)/);
    });

    test('meets accessibility requirements', async () => {
      // ❌ WILL FAIL - accessibility not implemented
      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[4].id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('[data-testid="analysis-content"]');

      // Check for proper heading structure
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', 
        elements => elements.map(el => ({ tag: el.tagName, text: el.textContent }))
      );
      
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0].tag).toBe('H1'); // Should have main title

      // Check for alt text on images
      const images = await page.$$eval('img', 
        elements => elements.map(el => ({ src: el.src, alt: el.alt }))
      );
      
      images.forEach(img => {
        if (img.src) {
          expect(img.alt).toBeTruthy();
        }
      });

      // Check for proper link text
      const links = await page.$$eval('a', 
        elements => elements.map(el => ({ href: el.href, text: el.textContent.trim() }))
      );
      
      links.forEach(link => {
        if (link.href) {
          expect(link.text.length).toBeGreaterThan(0);
          expect(link.text).not.toBe('Read more'); // Should be descriptive
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles non-existent movie ID gracefully', async () => {
      // ❌ WILL FAIL - error handling not implemented
      const response = await page.goto('http://localhost:3000/movie/999999', {
        waitUntil: 'networkidle0'
      });

      expect(response.status()).toBe(404);
      
      const errorMessage = await page.$('[data-testid="movie-not-found"]');
      expect(errorMessage).toBeTruthy();
    });

    test('recovers from temporary API failures', async () => {
      // ❌ WILL FAIL - API failure recovery not implemented
      
      // Intercept and fail the analysis API call
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (request.url().includes('/api/movie-analysis')) {
          request.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Temporary server error' })
          });
        } else {
          request.continue();
        }
      });

      await page.goto(`http://localhost:3000/movie/${VERIFIED_JSON_MOVIES[0].id}`, {
        waitUntil: 'networkidle0'
      });

      // Should show error state, not break the page
      const errorState = await page.$('[data-testid="analysis-error"]');
      expect(errorState).toBeTruthy();
      
      const retryButton = await page.$('[data-testid="retry-analysis"]');
      expect(retryButton).toBeTruthy();
    });
  });

  describe('17K Scale Validation', () => {
    test('batch tests multiple JSON movies for consistency', async () => {
      // ❌ WILL FAIL - batch validation not implemented
      const results = [];

      for (const movie of VERIFIED_JSON_MOVIES) {
        const startTime = Date.now();
        
        await page.goto(`http://localhost:3000/movie/${movie.id}`, {
          waitUntil: 'networkidle0'
        });

        try {
          await page.waitForSelector('[data-testid="analysis-content"]', {
            timeout: 5000
          });
          
          const loadTime = Date.now() - startTime;
          const hasMovieCards = await page.$('[data-testid="featured-movie-card"]') !== null;
          const hasTopicCards = await page.$('[data-testid="explore-topic-card"]') !== null;
          
          results.push({
            movieId: movie.id,
            loadTime,
            hasMovieCards,
            hasTopicCards,
            success: true
          });
        } catch (error) {
          results.push({
            movieId: movie.id,
            loadTime: Date.now() - startTime,
            hasMovieCards: false,
            hasTopicCards: false,
            success: false,
            error: error.message
          });
        }
      }

      // All movies should load successfully
      const failures = results.filter(r => !r.success);
      expect(failures).toHaveLength(0);

      // All should have consistent structure
      results.forEach(result => {
        expect(result.hasMovieCards).toBe(true);
        expect(result.hasTopicCards).toBe(true);
        expect(result.loadTime).toBeLessThan(3000);
      });
    });
  });
});