// tests/puppeteer-movie-page-validator.js
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class MoviePageFlashValidator {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://moviegenius.ai',
      testMovieIds: config.testMovieIds || ['11', '550', '238'],
      headless: config.headless !== false,
      slowMo: config.slowMo || 50,
      timeout: config.timeout || 15000,
      captureScreenshots: config.captureScreenshots !== false,
      captureNetworkLogs: config.captureNetworkLogs !== false,
      outputDir: config.outputDir || './puppeteer-results',
    };
    this.results = [];
  }

  async init() {
    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async testMoviePage(tmdbId) {
    const page = await this.browser.newPage();
    const result = {
      tmdbId,
      timestamp: new Date().toISOString(),
      url: `${this.config.baseUrl}/movie/${tmdbId}`,
      success: false,
      flashDetected: false,
      redirectDetected: false,
      finalUrl: null,
      loadTime: null,
      errors: [],
      console: [],
      network: [],
      screenshots: []
    };

    try {
      // Setup error capture
      page.on('error', error => {
        result.errors.push({ type: 'page_error', message: error.message, timestamp: Date.now() });
      });

      page.on('pageerror', error => {
        result.errors.push({ type: 'page_error', message: error.message, timestamp: Date.now() });
      });

      // Setup console capture
      page.on('console', msg => {
        const entry = {
          type: msg.type(),
          text: msg.text(),
          timestamp: Date.now()
        };
        result.console.push(entry);

        // Detect specific error patterns
        if (msg.text().includes('require') && msg.text().includes('NavBar')) {
          result.errors.push({ type: 'navbar_require_error', message: msg.text(), timestamp: Date.now() });
        }
        if (msg.text().includes('Minified React error #418') || msg.text().includes('#423')) {
          result.errors.push({ type: 'hydration_error', message: msg.text(), timestamp: Date.now() });
        }
        if (msg.text().includes("Can't find variable: require")) {
          result.errors.push({ type: 'client_require_error', message: msg.text(), timestamp: Date.now() });
        }
      });

      // Setup network monitoring
      if (this.config.captureNetworkLogs) {
        await page.setRequestInterception(true);
        
        page.on('request', request => {
          result.network.push({
            type: 'request',
            url: request.url(),
            method: request.method(),
            timestamp: Date.now()
          });
          request.continue();
        });

        page.on('response', response => {
          result.network.push({
            type: 'response',
            url: response.url(),
            status: response.status(),
            timestamp: Date.now()
          });

          // Detect 404s
          if (response.status() === 404 && response.url().includes('/movie/')) {
            result.redirectDetected = true;
          }
        });
      }

      // Navigate and capture initial state
      const startTime = Date.now();
      console.log(`🔍 Testing movie page: ${result.url}`);
      
      // Take screenshot before navigation
      if (this.config.captureScreenshots) {
        const beforePath = path.join(this.config.outputDir, `movie-${tmdbId}-before.png`);
        result.screenshots.push({
          name: 'before_navigation',
          path: beforePath,
          timestamp: Date.now()
        });
      }

      // Navigate with network idle waiting
      const response = await page.goto(result.url, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: this.config.timeout 
      });

      result.loadTime = Date.now() - startTime;
      result.finalUrl = page.url();

      // Check if we were redirected to 404
      if (result.finalUrl.includes('404') || response.status() === 404) {
        result.redirectDetected = true;
        console.log(`🚨 Immediate 404 redirect detected for movie ${tmdbId}`);
      }

      // Wait for React hydration and capture flash behavior
      await this.detectFlashBehavior(page, result);

      // Take screenshot after load
      if (this.config.captureScreenshots) {
        const afterPath = path.join(this.config.outputDir, `movie-${tmdbId}-after.png`);
        await page.screenshot({ path: afterPath, fullPage: true });
        result.screenshots.push({
          name: 'after_load',
          path: afterPath,
          timestamp: Date.now()
        });
      }

      // Validate final page state
      await this.validatePageContent(page, result);

      result.success = !result.redirectDetected && !result.flashDetected && result.errors.length === 0;

    } catch (error) {
      result.errors.push({
        type: 'test_error',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    } finally {
      await page.close();
    }

    return result;
  }

  async detectFlashBehavior(page, result) {
    // Monitor for rapid content changes (flash behavior)
    let contentChanges = 0;
    let lastContent = '';
    const contentHistory = [];

    const monitorContent = async () => {
      try {
        const content = await page.evaluate(() => {
          return {
            title: document.title,
            hasMovieContent: !!document.querySelector('h1'),
            hasNavBar: !!document.querySelector('nav'),
            hasErrorContent: !!document.querySelector('[class*="error"]'),
            url: window.location.href,
            bodyText: document.body?.textContent?.substring(0, 200),
            nextData: !!window.__NEXT_DATA__,
            hydrated: document.querySelector('#__next')?.children?.length > 0
          };
        });

        const currentContent = JSON.stringify(content);
        if (currentContent !== lastContent) {
          contentChanges++;
          contentHistory.push({
            change: contentChanges,
            timestamp: Date.now(),
            content: content
          });
          lastContent = currentContent;

          // Detect flash pattern: content appears then disappears
          if (contentChanges > 2 && content.url.includes('404')) {
            result.flashDetected = true;
            result.errors.push({
              type: 'flash_redirect',
              message: `Content flashed then redirected to 404. Changes: ${contentChanges}`,
              timestamp: Date.now(),
              contentState: content,
              history: contentHistory
            });
          }
        }
      } catch (error) {
        // Ignore evaluation errors during rapid changes
      }
    };

    // Monitor for 3 seconds to catch flash behavior
    const monitorInterval = setInterval(monitorContent, 100);
    await new Promise(resolve => setTimeout(resolve, 3000));
    clearInterval(monitorInterval);

    console.log(`📊 Content changes detected: ${contentChanges} for movie ${result.tmdbId}`);
    result.contentHistory = contentHistory;
  }

  async validatePageContent(page, result) {
    try {
      const validation = await page.evaluate((tmdbId) => {
        return {
          hasTitle: !!document.querySelector('h1'),
          hasNavBar: !!document.querySelector('nav'),
          hasMovieContent: !!document.querySelector('[data-tmdb-id]') || 
                          document.body.textContent.includes('Star Wars') || 
                          document.body.textContent.includes('Fight Club') ||
                          document.body.textContent.includes('The Godfather'),
          hasErrors: !!document.querySelector('[class*="error"]'),
          is404Page: document.body.textContent.includes('404') || 
                     document.body.textContent.includes('Not Found') ||
                     document.title.includes('404'),
          currentUrl: window.location.href,
          hasRequireErrors: Array.from(document.querySelectorAll('*')).some(el => 
            el.textContent && el.textContent.includes('require')),
          hasHydrationErrors: !!window.__NEXT_DATA__ && 
                             document.querySelector('#__next')?.children?.length === 0,
          pageTitle: document.title,
          metaStatus: document.querySelector('meta[name="status"]')?.content
        };
      }, result.tmdbId);

      result.validation = validation;

      if (validation.is404Page) {
        result.redirectDetected = true;
        result.errors.push({
          type: 'final_404_state',
          message: 'Page ended in 404 state',
          timestamp: Date.now(),
          pageTitle: validation.pageTitle,
          metaStatus: validation.metaStatus
        });
      }

      if (validation.hasRequireErrors) {
        result.errors.push({
          type: 'require_error_in_dom',
          message: 'require errors detected in DOM',
          timestamp: Date.now()
        });
      }

    } catch (error) {
      result.errors.push({
        type: 'validation_error',
        message: error.message,
        timestamp: Date.now()
      });
    }
  }

  async runAllTests() {
    console.log(`🚀 Starting Puppeteer movie page validation...`);
    console.log(`🔍 Testing URLs: ${this.config.testMovieIds.map(id => `${this.config.baseUrl}/movie/${id}`).join(', ')}`);
    
    await this.init();

    try {
      for (const tmdbId of this.config.testMovieIds) {
        const result = await this.testMoviePage(tmdbId);
        this.results.push(result);
        
        console.log(`📊 Movie ${tmdbId}: ${result.success ? '✅ PASS' : '❌ FAIL'} (${result.loadTime}ms)`);
        if (!result.success) {
          console.log(`   Errors: ${result.errors.map(e => e.type).join(', ')}`);
          if (result.flashDetected) {
            console.log(`   🚨 Flash detected with ${result.contentHistory?.length || 0} content changes`);
          }
        }
      }

      const report = await this.generateReport();
      await this.saveReport(report);
      return report;
    } finally {
      await this.browser.close();
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        flashDetected: this.results.filter(r => r.flashDetected).length,
        redirectsDetected: this.results.filter(r => r.redirectDetected).length,
        avgLoadTime: Math.round(this.results.reduce((sum, r) => sum + (r.loadTime || 0), 0) / this.results.length)
      },
      results: this.results,
      errorPatterns: this.analyzeErrorPatterns(),
      recommendations: this.generateRecommendations()
    };

    console.log('\n📊 PUPPETEER VALIDATION REPORT');
    console.log('=====================================');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Flash Behavior Detected: ${report.summary.flashDetected}`);
    console.log(`404 Redirects: ${report.summary.redirectsDetected}`);
    console.log(`Average Load Time: ${report.summary.avgLoadTime}ms`);
    
    if (report.errorPatterns.length > 0) {
      console.log('\n🚨 ERROR PATTERNS:');
      report.errorPatterns.forEach(pattern => {
        console.log(`- ${pattern.type}: ${pattern.count} occurrences`);
      });
    }

    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`- ${rec}`);
    });

    return report;
  }

  async saveReport(report) {
    const reportPath = path.join(this.config.outputDir, `validation-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }

  analyzeErrorPatterns() {
    const patterns = {};
    
    this.results.forEach(result => {
      result.errors.forEach(error => {
        patterns[error.type] = (patterns[error.type] || 0) + 1;
      });
    });

    return Object.entries(patterns).map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  generateRecommendations() {
    const recommendations = [];
    const errorTypes = this.analyzeErrorPatterns().map(p => p.type);
    
    if (errorTypes.includes('navbar_require_error') || errorTypes.includes('client_require_error')) {
      recommendations.push('🔧 Fix NavBar require() calls - replace with server-side imports via getStaticProps');
    }
    
    if (errorTypes.includes('hydration_error')) {
      recommendations.push('⚡ Resolve React hydration mismatches - ensure server/client state consistency');
    }
    
    if (errorTypes.includes('flash_redirect')) {
      recommendations.push('🔍 Investigate client-side routing logic causing content flash before 404');
    }
    
    if (this.results.some(r => r.loadTime > 3000)) {
      recommendations.push('🚀 Optimize page load performance - current load times exceed 3 seconds');
    }

    if (this.results.some(r => r.redirectDetected)) {
      recommendations.push('🚨 Critical: Movie pages are redirecting to 404 - immediate fix required');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All tests passed - no immediate action required');
    }

    return recommendations;
  }
}

module.exports = MoviePageFlashValidator;

// CLI usage
if (require.main === module) {
  const validator = new MoviePageFlashValidator({
    baseUrl: process.env.TEST_BASE_URL || 'https://moviegenius.ai',
    testMovieIds: process.env.TEST_MOVIE_IDS?.split(',') || ['11', '550', '238'],
    headless: process.env.HEADLESS !== 'false',
    captureScreenshots: process.env.SCREENSHOTS !== 'false',
    outputDir: './puppeteer-results'
  });

  validator.runAllTests()
    .then(report => {
      console.log('\n✅ Validation complete');
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}