/**
 * Nuclear Static Generation Testing Framework
 * 
 * TESTING PHILOSOPHY: These tests are DESIGNED TO FAIL initially.
 * They validate the transformation from JSON props to static HTML files.
 * 
 * Based on lessons from:
 * - REPEATED-FLAWS-IN-RESOLVING-BROKEN-CODE.md: Focus on production reality
 * - SEARCH_INCIDENT_REPORT.md: "Implementation First" debugging
 * - NUCLEAR_STATIC_GENERATION_PROCESS.md: User-focused success metrics
 */

const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

describe('Nuclear Static Generation - Content Preservation', () => {
  
  describe('CRITICAL: Data Integrity Validation', () => {
    
    test('SHOULD FAIL: Star Wars analysis text preserved exactly', async () => {
      // Load current nuclear JSON for Star Wars (TMDB 11)
      const nuclearJsonPath = path.join(process.cwd(), 'public/nuclear-static/11.json');
      const nuclearData = JSON.parse(await fs.readFile(nuclearJsonPath, 'utf8'));
      
      // Load generated static HTML (this file won't exist yet)
      const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static/11.html');
      
      try {
        const staticHTML = await fs.readFile(staticHtmlPath, 'utf8');
        const dom = new JSDOM(staticHTML);
        const document = dom.window.document;
        
        // Extract original analysis content
        const originalContent = nuclearData.props.sections
          .filter(section => section.type === 'text')
          .map(section => section.content)
          .join(' ');
        
        // Verify key analysis phrases preserved
        expect(staticHTML).toContain('revolutionized blockbuster filmmaking');
        expect(staticHTML).toContain('Flash Gordon serials, Kurosawa samurai epics');
        expect(staticHTML).toContain('Industrial Light & Magic set new standards');
        
        // Verify movie links preserved with correct format
        expect(staticHTML).toContain('<a href="/movie/118340"');
        expect(staticHTML).toContain('Guardians of the Galaxy</a>');
        expect(staticHTML).toContain('<a href="/movie/11884"');
        expect(staticHTML).toContain('The Last Starfighter</a>');
        
        // Verify no content was lost in transformation
        const staticContent = document.querySelector('.analysis')?.textContent || '';
        const originalTextLength = originalContent.replace(/<[^>]*>/g, '').length;
        const staticTextLength = staticContent.length;
        
        // Allow for minor HTML transformation differences (±10%)
        expect(staticTextLength).toBeGreaterThan(originalTextLength * 0.9);
        expect(staticTextLength).toBeLessThan(originalTextLength * 1.1);
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`EXPECTED FAILURE: Static HTML file not found at ${staticHtmlPath}. This test should fail until nuclear static generation is implemented.`);
        }
        throw error;
      }
    });

    test('SHOULD FAIL: Fight Club analysis with movie links preserved', async () => {
      const nuclearJsonPath = path.join(process.cwd(), 'public/nuclear-static/550.json');
      const nuclearData = JSON.parse(await fs.readFile(nuclearJsonPath, 'utf8'));
      
      const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static/550.html');
      
      try {
        const staticHTML = await fs.readFile(staticHtmlPath, 'utf8');
        
        // Verify specific Fight Club analysis content
        expect(staticHTML).toContain('revolutionized psychological thrillers');
        expect(staticHTML).toContain('brutal nihilism with razor-sharp satire');
        
        // Verify specific movie links from the analysis
        expect(staticHTML).toContain('<a href="/movie/27205"');
        expect(staticHTML).toContain('Inception</a>');
        expect(staticHTML).toContain('<a href="/movie/1359"');
        expect(staticHTML).toContain('American Psycho</a>');
        
        // Verify featured films section preserved
        expect(staticHTML).toContain('Memento');
        expect(staticHTML).toContain('The Machinist');
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`EXPECTED FAILURE: Static HTML file for Fight Club not found. Nuclear static generation not implemented.`);
        }
        throw error;
      }
    });

    test('SHOULD FAIL: All 6000+ nuclear files converted without data loss', async () => {
      const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
      const jsonFiles = (await fs.readdir(nuclearDir))
        .filter(file => file.endsWith('.json') && !file.includes('-original'))
        .slice(0, 10); // Test first 10 files for speed
      
      let conversionFailures = [];
      
      for (const jsonFile of jsonFiles) {
        const tmdbId = jsonFile.replace('.json', '');
        const htmlFile = `${tmdbId}.html`;
        const htmlPath = path.join(nuclearDir, htmlFile);
        
        try {
          const jsonData = JSON.parse(await fs.readFile(path.join(nuclearDir, jsonFile), 'utf8'));
          const htmlContent = await fs.readFile(htmlPath, 'utf8');
          
          // Basic conversion validation
          if (jsonData.props.title) {
            if (!htmlContent.includes(jsonData.props.title)) {
              conversionFailures.push(`${tmdbId}: Title missing in HTML`);
            }
          }
          
          if (jsonData.props.hasAnalysis && jsonData.props.sections) {
            const hasAnalysisContent = jsonData.props.sections.some(section => 
              section.type === 'text' && section.content && section.content.length > 100
            );
            
            if (hasAnalysisContent && !htmlContent.includes('analysis')) {
              conversionFailures.push(`${tmdbId}: Analysis content missing`);
            }
          }
          
        } catch (error) {
          conversionFailures.push(`${tmdbId}: ${error.code === 'ENOENT' ? 'HTML file missing' : error.message}`);
        }
      }
      
      if (conversionFailures.length > 0) {
        throw new Error(`EXPECTED FAILURES: ${conversionFailures.length} conversion issues found:\n${conversionFailures.slice(0, 5).join('\n')}`);
      }
    });
  });

  describe('Movie Link Integrity', () => {
    
    test('SHOULD FAIL: All movie links use correct /movie/TMDB_ID format', async () => {
      const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static/11.html');
      
      try {
        const staticHTML = await fs.readFile(staticHtmlPath, 'utf8');
        const dom = new JSDOM(staticHTML);
        const document = dom.window.document;
        
        const movieLinks = Array.from(document.querySelectorAll('a[href*="/movie/"]'));
        
        expect(movieLinks.length).toBeGreaterThan(0);
        
        movieLinks.forEach(link => {
          const href = link.getAttribute('href');
          const tmdbIdMatch = href.match(/\/movie\/(\d+)$/);
          
          expect(tmdbIdMatch).toBeTruthy();
          expect(parseInt(tmdbIdMatch[1])).toBeGreaterThan(0);
          
          // Link should have proper class
          expect(link.className).toContain('movie-title');
          
          // Link should have data-tmdb-id attribute
          expect(link.hasAttribute('data-tmdb-id')).toBe(true);
        });
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: Cannot validate movie links - static HTML not generated');
        }
        throw error;
      }
    });

    test('SHOULD FAIL: Movie links navigate to correct pages', async () => {
      // This test will check that linked movies actually exist
      const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static/11.html');
      
      try {
        const staticHTML = await fs.readFile(staticHtmlPath, 'utf8');
        const dom = new JSDOM(staticHTML);
        const document = dom.window.document;
        
        const movieLinks = Array.from(document.querySelectorAll('a[href*="/movie/"]'))
          .slice(0, 3); // Test first 3 links only
        
        for (const link of movieLinks) {
          const href = link.getAttribute('href');
          const tmdbId = href.match(/\/movie\/(\d+)$/)[1];
          
          // Check if target movie has nuclear data
          const targetJsonPath = path.join(process.cwd(), 'public/nuclear-static', `${tmdbId}.json`);
          const targetHtmlPath = path.join(process.cwd(), 'public/nuclear-static', `${tmdbId}.html`);
          
          try {
            await fs.readFile(targetJsonPath, 'utf8');
            await fs.readFile(targetHtmlPath, 'utf8');
          } catch (targetError) {
            throw new Error(`Broken link: ${href} points to movie ${tmdbId} that has no static file`);
          }
        }
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: Cannot validate link targets - static HTML not generated');
        }
        throw error;
      }
    });
  });

  describe('HTML Structure Validation', () => {
    
    test('SHOULD FAIL: Generated HTML has proper document structure', async () => {
      const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static/11.html');
      
      try {
        const staticHTML = await fs.readFile(staticHtmlPath, 'utf8');
        const dom = new JSDOM(staticHTML);
        const document = dom.window.document;
        
        // Valid HTML document structure
        expect(document.doctype).toBeTruthy();
        expect(document.querySelector('html')).toBeTruthy();
        expect(document.querySelector('head')).toBeTruthy();
        expect(document.querySelector('body')).toBeTruthy();
        
        // Required meta tags for MovieGenius
        expect(document.querySelector('title')?.textContent).toMatch(/Star Wars.*MovieGenius/);
        expect(document.querySelector('meta[name="description"]')).toBeTruthy();
        
        // Required CSS and JS resources
        expect(document.querySelector('link[rel="stylesheet"]')).toBeTruthy();
        expect(document.querySelector('script[src*="movie-actions"]')).toBeTruthy();
        
        // Phone frame wrapper (current site structure)
        expect(document.querySelector('.phone-frame')).toBeTruthy();
        
        // Movie header section
        expect(document.querySelector('.movie-header, header')).toBeTruthy();
        
        // Analysis content section
        expect(document.querySelector('.analysis, .movie-content')).toBeTruthy();
        
        // Action bar placeholder with required data attributes
        const actionBar = document.querySelector('#action-bar');
        expect(actionBar).toBeTruthy();
        expect(actionBar.getAttribute('data-tmdb-id')).toBe('11');
        expect(actionBar.getAttribute('data-title')).toBe('Star Wars');
        expect(actionBar.getAttribute('data-year')).toBe('1977');
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: Cannot validate HTML structure - static HTML not generated');
        }
        throw error;
      }
    });

    test('SHOULD FAIL: HTML validates and is SEO-ready', async () => {
      const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static/11.html');
      
      try {
        const staticHTML = await fs.readFile(staticHtmlPath, 'utf8');
        
        // SEO requirements
        expect(staticHTML).toMatch(/<title>.*Star Wars.*<\/title>/);
        expect(staticHTML).toMatch(/<meta name="description" content=".+"/);
        
        // Content should be visible in view-source (not JavaScript-generated)
        expect(staticHTML).toContain('revolutionized blockbuster filmmaking');
        expect(staticHTML).toContain('Featured Films');
        expect(staticHTML).toContain('Related Films');
        
        // Structured data for movie
        expect(staticHTML).toMatch(/data-tmdb-id="11"/);
        
        // No broken HTML tags
        const openTags = (staticHTML.match(/<[^/][^>]*>/g) || []).length;
        const closeTags = (staticHTML.match(/<\/[^>]*>/g) || []).length;
        const selfClosingTags = (staticHTML.match(/<[^>]*\/>/g) || []).length;
        
        // Basic tag balance check (allowing for self-closing tags)
        expect(Math.abs(openTags - closeTags - selfClosingTags)).toBeLessThan(5);
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: Cannot validate SEO structure - static HTML not generated');
        }
        throw error;
      }
    });
  });
});

describe('Nuclear Static Generation - Performance Validation', () => {
  
  test('SHOULD FAIL: Static HTML files are under 50KB each', async () => {
    const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
    const htmlFiles = (await fs.readdir(nuclearDir).catch(() => []))
      .filter(file => file.endsWith('.html'))
      .slice(0, 10); // Test sample
    
    if (htmlFiles.length === 0) {
      throw new Error('EXPECTED FAILURE: No HTML files found - nuclear static generation not implemented');
    }
    
    const oversizedFiles = [];
    
    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(nuclearDir, htmlFile);
      const stats = await fs.stat(htmlPath);
      const sizeKB = stats.size / 1024;
      
      if (sizeKB > 50) {
        oversizedFiles.push(`${htmlFile}: ${sizeKB.toFixed(1)}KB`);
      }
    }
    
    if (oversizedFiles.length > 0) {
      throw new Error(`File size failures:\n${oversizedFiles.join('\n')}\nTarget: <50KB per file`);
    }
  });

  test('SHOULD FAIL: Page load times under 200ms', async () => {
    // Note: This would typically require a running server
    // For now, we'll simulate the test structure
    
    const testUrls = [
      'http://localhost:3000/movie/11',
      'http://localhost:3000/movie/550',
      'http://localhost:3000/movie/238'
    ];
    
    const performanceResults = [];
    
    for (const url of testUrls) {
      try {
        const startTime = Date.now();
        const response = await fetch(url, { timeout: 5000 });
        const loadTime = Date.now() - startTime;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        if (loadTime > 200) {
          performanceResults.push(`${url}: ${loadTime}ms (target: <200ms)`);
        }
        
      } catch (error) {
        performanceResults.push(`${url}: ${error.message}`);
      }
    }
    
    if (performanceResults.length > 0) {
      throw new Error(`EXPECTED FAILURES: Performance issues:\n${performanceResults.join('\n')}`);
    }
  });

  test('SHOULD FAIL: Static files load faster than current JSON system', async () => {
    // Benchmark comparison test
    const testMovieId = '11';
    const staticUrl = `http://localhost:3000/movie/${testMovieId}`;
    
    try {
      // Measure static HTML load time
      const staticStart = Date.now();
      const staticResponse = await fetch(staticUrl);
      const staticLoadTime = Date.now() - staticStart;
      
      // Expected improvement: at least 50% faster than current ~2-3s load times
      const currentSystemAverage = 2500; // ms
      const expectedImprovement = 0.5;
      const targetTime = currentSystemAverage * expectedImprovement;
      
      expect(staticResponse.ok).toBe(true);
      expect(staticLoadTime).toBeLessThan(targetTime);
      
      // Verify content is immediately available (not loading state)
      const content = await staticResponse.text();
      expect(content).toContain('Star Wars');
      expect(content).not.toContain('Loading...');
      
    } catch (error) {
      throw new Error(`EXPECTED FAILURE: Cannot benchmark static performance - ${error.message}`);
    }
  });
});

describe('Nuclear Static Generation - User Experience', () => {
  
  test('SHOULD FAIL: Action bar initializes correctly', async () => {
    const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static/11.html');
    
    try {
      const staticHTML = await fs.readFile(staticHtmlPath, 'utf8');
      const dom = new JSDOM(staticHTML, {
        runScripts: "dangerously",
        resources: "usable",
        pretendToBeVisual: true
      });
      
      const document = dom.window.document;
      
      // Verify action bar placeholder exists with correct data
      const actionBar = document.querySelector('#action-bar');
      expect(actionBar).toBeTruthy();
      expect(actionBar.dataset.tmdbId).toBe('11');
      expect(actionBar.dataset.title).toBe('Star Wars');
      expect(actionBar.dataset.year).toBe('1977');
      
      // Verify JavaScript file is included
      const scriptTag = document.querySelector('script[src*="movie-actions"]');
      expect(scriptTag).toBeTruthy();
      
      // Note: Full JavaScript testing would require jsdom with proper script execution
      // or browser-based testing framework
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('EXPECTED FAILURE: Cannot test action bar - static HTML not generated');
      }
      throw error;
    }
  });

  test('SHOULD FAIL: Featured Films section renders correctly', async () => {
    const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static/11.html');
    
    try {
      const staticHTML = await fs.readFile(staticHtmlPath, 'utf8');
      const dom = new JSDOM(staticHTML);
      const document = dom.window.document;
      
      // Find featured films section
      const featuredSection = document.querySelector('.featured-films, [class*="featured"]');
      expect(featuredSection).toBeTruthy();
      
      // Verify movie cards are pre-rendered
      const movieCards = document.querySelectorAll('.movie-card');
      expect(movieCards.length).toBeGreaterThan(0);
      
      // Check first movie card structure
      const firstCard = movieCards[0];
      expect(firstCard.querySelector('img')).toBeTruthy(); // Poster image
      expect(firstCard.querySelector('h3, .title')).toBeTruthy(); // Title
      expect(firstCard.textContent).toMatch(/\d{4}/); // Year
      
      // Verify TMDB IDs are present for navigation
      expect(firstCard.hasAttribute('data-tmdb-id')).toBe(true);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('EXPECTED FAILURE: Cannot validate featured films - static HTML not generated');
      }
      throw error;
    }
  });

  test('SHOULD FAIL: Mobile experience matches desktop functionality', async () => {
    const staticHtmlPath = path.join(process.cwd(), 'public/nuclear-static/11.html');
    
    try {
      const staticHTML = await fs.readFile(staticHtmlPath, 'utf8');
      
      // Check for responsive design elements
      expect(staticHTML).toMatch(/viewport.*width=device-width/);
      
      // Verify phone frame structure (current mobile design)
      expect(staticHTML).toContain('phone-frame');
      
      // Check CSS includes responsive styles
      expect(staticHTML).toMatch(/max-width.*768px|@media/);
      
      // Verify touch-friendly elements
      const dom = new JSDOM(staticHTML);
      const document = dom.window.document;
      
      const actionButtons = document.querySelectorAll('#action-bar button, .action-btn');
      actionButtons.forEach(button => {
        const buttonText = button.textContent || '';
        expect(['Seen', 'Add', 'Play'].some(text => buttonText.includes(text))).toBe(true);
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('EXPECTED FAILURE: Cannot validate mobile experience - static HTML not generated');
      }
      throw error;
    }
  });
});

describe('Nuclear Static Generation - Build Process', () => {
  
  test('SHOULD FAIL: Build process completes without errors', async () => {
    // This test would verify the build system itself
    const buildLogPath = path.join(process.cwd(), 'build-nuclear-static.log');
    
    try {
      const buildLog = await fs.readFile(buildLogPath, 'utf8');
      
      // Check for successful completion
      expect(buildLog).toContain('Nuclear static generation completed');
      expect(buildLog).not.toContain('ERROR');
      expect(buildLog).not.toContain('FATAL');
      
      // Verify file counts
      const fileCountMatch = buildLog.match(/Generated (\d+) static HTML files/);
      expect(fileCountMatch).toBeTruthy();
      expect(parseInt(fileCountMatch[1])).toBeGreaterThan(100);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('EXPECTED FAILURE: Build log not found - nuclear static build not implemented');
      }
      throw error;
    }
  });

  test('SHOULD FAIL: All required HTML files are created', async () => {
    const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
    
    try {
      const files = await fs.readdir(nuclearDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('-original'));
      const htmlFiles = files.filter(f => f.endsWith('.html'));
      
      // Every JSON file should have corresponding HTML file
      const missingHtmlFiles = [];
      
      for (const jsonFile of jsonFiles.slice(0, 50)) { // Test first 50
        const tmdbId = jsonFile.replace('.json', '');
        const expectedHtmlFile = `${tmdbId}.html`;
        
        if (!htmlFiles.includes(expectedHtmlFile)) {
          missingHtmlFiles.push(expectedHtmlFile);
        }
      }
      
      if (missingHtmlFiles.length > 0) {
        throw new Error(`Missing HTML files: ${missingHtmlFiles.slice(0, 10).join(', ')}`);
      }
      
    } catch (error) {
      throw new Error(`EXPECTED FAILURE: Build verification failed - ${error.message}`);
    }
  });
});

describe('Nuclear Static Generation - Production Reality', () => {
  
  test('SHOULD FAIL: Production URLs return 200 status', async () => {
    // Test actual deployed URLs
    const productionUrls = [
      'https://moviegenius.ai/movie/11',
      'https://moviegenius.ai/movie/550',
      'https://moviegenius.ai/movie/238'
    ];
    
    const urlFailures = [];
    
    for (const url of productionUrls) {
      try {
        const response = await fetch(url, { 
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Test Framework)' }
        });
        
        if (!response.ok) {
          urlFailures.push(`${url}: HTTP ${response.status}`);
        }
        
      } catch (error) {
        urlFailures.push(`${url}: ${error.message}`);
      }
    }
    
    if (urlFailures.length > 0) {
      throw new Error(`EXPECTED FAILURES: Production URL issues:\n${urlFailures.join('\n')}`);
    }
  });

  test('SHOULD FAIL: Content appears in view-source (SEO test)', async () => {
    const productionUrl = 'https://moviegenius.ai/movie/11';
    
    try {
      const response = await fetch(productionUrl);
      const html = await response.text();
      
      // Verify content is in HTML source, not JavaScript-generated
      expect(html).toContain('Star Wars');
      expect(html).toContain('revolutionized blockbuster filmmaking');
      expect(html).toContain('Featured Films');
      
      // Should NOT be empty with loading states
      expect(html).not.toContain('Loading...');
      expect(html).not.toContain('Fetching movie data');
      
      // Should have proper meta tags
      expect(html).toMatch(/<title>.*Star Wars.*<\/title>/);
      expect(html).toMatch(/<meta name="description"/);
      
    } catch (error) {
      throw new Error(`EXPECTED FAILURE: Production content validation failed - ${error.message}`);
    }
  });

  test('SHOULD FAIL: Real user workflow completion', async () => {
    // Simulate complete user journey
    const userJourney = [
      { url: 'https://moviegenius.ai/movie/11', expectation: 'Star Wars page loads' },
      { url: 'https://moviegenius.ai/movie/118340', expectation: 'Guardians link works' },
      { url: 'https://moviegenius.ai/movie/550', expectation: 'Fight Club loads' }
    ];
    
    const journeyFailures = [];
    
    for (const step of userJourney) {
      try {
        const response = await fetch(step.url, { timeout: 10000 });
        
        if (!response.ok) {
          journeyFailures.push(`${step.expectation}: HTTP ${response.status}`);
          continue;
        }
        
        const content = await response.text();
        
        // Verify page loaded with content (not error page)
        if (content.includes('Movie not found') || content.includes('404')) {
          journeyFailures.push(`${step.expectation}: Movie not found`);
        }
        
        if (!content.includes('movie-header') && !content.includes('movie-content')) {
          journeyFailures.push(`${step.expectation}: Missing movie content structure`);
        }
        
      } catch (error) {
        journeyFailures.push(`${step.expectation}: ${error.message}`);
      }
    }
    
    if (journeyFailures.length > 0) {
      throw new Error(`EXPECTED FAILURES: User journey issues:\n${journeyFailures.join('\n')}`);
    }
  });
});