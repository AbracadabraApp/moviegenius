#!/usr/bin/env node

/**
 * Demo Performance Baseline Measurement Script
 * 
 * Measures current performance across all critical demo paths
 * to establish baseline before implementing ultra-aggressive optimizations.
 */

const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASELINE_URL || 'http://localhost:3000';
const OUTPUT_FILE = path.join(__dirname, '../demo-baseline-metrics.json');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Demo path definitions - critical user journeys for demos
 */
const DEMO_PATHS = [
  {
    name: 'Homepage Load',
    url: '/',
    actions: []
  },
  {
    name: 'Popular Movie Page',
    url: '/movie/550', // Fight Club - popular demo movie
    actions: []
  },
  {
    name: 'Classic Movie Page', 
    url: '/movie/603', // The Matrix - another demo favorite
    actions: [
      { type: 'waitForSelector', selector: '[data-testid="movie-analysis"]', timeout: 10000 }
    ]
  },
  {
    name: 'Genius Episode Page',
    url: '/genius/batman/the-dark-knight/analysis',
    actions: []
  },
  {
    name: 'Series Recommendations',
    url: '/recs/series/batman-nolan-trilogy',
    actions: []
  },
  {
    name: 'Ask Claude Page',
    url: '/ask?q=best noir films',
    actions: [
      { type: 'waitForSelector', selector: '[data-testid="claude-response"]', timeout: 15000 }
    ]
  }
];

/**
 * Measure page performance using Puppeteer
 */
async function measurePagePerformance(browser, demoPath) {
  const page = await browser.newPage();
  
  // Enable performance monitoring
  await page.setCacheEnabled(false); // Measure cold load performance
  
  const metrics = {
    path: demoPath.name,
    url: demoPath.url,
    timestamp: new Date().toISOString()
  };

  try {
    console.log(`📊 Measuring: ${demoPath.name} (${demoPath.url})`);
    
    // Start navigation timing
    const startTime = Date.now();
    
    const response = await page.goto(`${BASE_URL}${demoPath.url}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Basic timing metrics
    metrics.navigationTime = Date.now() - startTime;
    metrics.statusCode = response.status();
    metrics.responseHeaders = response.headers();
    
    // Execute demo-specific actions
    for (const action of demoPath.actions) {
      const actionStart = Date.now();
      
      if (action.type === 'waitForSelector') {
        await page.waitForSelector(action.selector, { timeout: action.timeout });
        metrics[`${action.selector}_load_time`] = Date.now() - actionStart;
      }
    }
    
    // Core Web Vitals measurement
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay would require actual interaction
        vitals.fid = 0; // Placeholder
        
        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Performance navigation metrics
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          vitals.ttfb = navigation.responseStart - navigation.requestStart;
          vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
          vitals.loadComplete = navigation.loadEventEnd - navigation.navigationStart;
        }
        
        // Resolve after a brief delay to capture CLS
        setTimeout(() => resolve(vitals), 1000);
      });
    });
    
    metrics.webVitals = webVitals;
    
    // Resource loading analysis
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const analysis = {
        totalResources: resources.length,
        totalSize: 0,
        byType: {}
      };
      
      resources.forEach(resource => {
        const type = resource.initiatorType || 'other';
        if (!analysis.byType[type]) {
          analysis.byType[type] = { count: 0, totalDuration: 0 };
        }
        analysis.byType[type].count++;
        analysis.byType[type].totalDuration += resource.duration;
        
        if (resource.transferSize) {
          analysis.totalSize += resource.transferSize;
        }
      });
      
      return analysis;
    });
    
    metrics.resources = resourceMetrics;
    
    // Memory usage
    const memoryInfo = await page.evaluate(() => {
      return performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null;
    });
    
    if (memoryInfo) {
      metrics.memory = memoryInfo;
    }
    
    console.log(`✅ ${demoPath.name}: ${metrics.navigationTime}ms (LCP: ${webVitals.lcp?.toFixed(0)}ms, TTFB: ${webVitals.ttfb?.toFixed(0)}ms)`);
    
  } catch (error) {
    console.error(`❌ Error measuring ${demoPath.name}:`, error.message);
    metrics.error = error.message;
  } finally {
    await page.close();
  }
  
  return metrics;
}

/**
 * Measure database performance
 */
async function measureDatabasePerformance() {
  console.log('📊 Measuring database performance...');
  
  const dbMetrics = {
    timestamp: new Date().toISOString()
  };
  
  try {
    // Movie query performance
    const movieQueryStart = Date.now();
    const { data: movies, error: movieError } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .limit(100);
      
    dbMetrics.movieQueryTime = Date.now() - movieQueryStart;
    dbMetrics.movieCount = movies?.length || 0;
    
    // Popular movie lookup (demo path)
    const lookupStart = Date.now();
    const { data: popularMovie } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', 550) // Fight Club
      .single();
      
    dbMetrics.popularMovieLookupTime = Date.now() - lookupStart;
    dbMetrics.popularMovieFound = !!popularMovie;
    
    // Genius content query
    const geniusStart = Date.now();
    const { data: geniusContent } = await supabase
      .from('genius_episodes')
      .select('*')
      .limit(10);
      
    dbMetrics.geniusQueryTime = Date.now() - geniusStart;
    dbMetrics.geniusCount = geniusContent?.length || 0;
    
    console.log(`✅ Database: Movies ${dbMetrics.movieQueryTime}ms, Lookup ${dbMetrics.popularMovieLookupTime}ms, Genius ${dbMetrics.geniusQueryTime}ms`);
    
  } catch (error) {
    console.error('❌ Database measurement error:', error);
    dbMetrics.error = error.message;
  }
  
  return dbMetrics;
}

/**
 * Test API endpoints performance
 */
async function measureAPIPerformance() {
  console.log('📊 Measuring API performance...');
  
  const apiMetrics = {};
  
  // Test critical API endpoints
  const apiTests = [
    { name: 'streaming-info', path: '/api/get-streaming-info', method: 'POST', body: { title: 'The Matrix', year: 1999 } },
    { name: 'movie-analysis', path: '/api/movie-analysis', method: 'POST', body: { movieId: 550 } },
    { name: 'ask-claude', path: '/api/ask-claude', method: 'POST', body: { question: 'best sci-fi movies' } }
  ];
  
  for (const test of apiTests) {
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${BASE_URL}${test.path}`, {
        method: test.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body)
      });
      
      const responseTime = Date.now() - startTime;
      const responseData = await response.json();
      
      apiMetrics[test.name] = {
        responseTime,
        statusCode: response.status,
        success: response.ok,
        cached: response.headers.get('x-cache-status') || 'unknown'
      };
      
      console.log(`✅ API ${test.name}: ${responseTime}ms (${response.status})`);
      
    } catch (error) {
      console.error(`❌ API ${test.name} error:`, error.message);
      apiMetrics[test.name] = { error: error.message };
    }
  }
  
  return apiMetrics;
}

/**
 * Main baseline measurement function
 */
async function measureBaseline() {
  console.log('🚀 Starting demo performance baseline measurement...');
  console.log(`📍 Target URL: ${BASE_URL}`);
  
  const baseline = {
    measurement_time: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      base_url: BASE_URL,
      demo_mode: process.env.DEMO_MODE || 'false'
    },
    pages: [],
    database: {},
    apis: {}
  };
  
  // Browser setup for page measurements
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Measure each demo path
    for (const demoPath of DEMO_PATHS) {
      const pageMetrics = await measurePagePerformance(browser, demoPath);
      baseline.pages.push(pageMetrics);
    }
    
    // Measure database performance
    baseline.database = await measureDatabasePerformance();
    
    // Measure API performance  
    baseline.apis = await measureAPIPerformance();
    
    // Calculate summary metrics
    const pageLoadTimes = baseline.pages
      .filter(p => p.navigationTime && !p.error)
      .map(p => p.navigationTime);
      
    baseline.summary = {
      total_pages_measured: baseline.pages.length,
      successful_measurements: pageLoadTimes.length,
      average_page_load: pageLoadTimes.length > 0 ? 
        Math.round(pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length) : 0,
      slowest_page_load: Math.max(...pageLoadTimes),
      fastest_page_load: Math.min(...pageLoadTimes)
    };
    
    // Save baseline to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(baseline, null, 2));
    
    console.log('🎯 Baseline Measurement Complete!');
    console.log(`📄 Results saved to: ${OUTPUT_FILE}`);
    console.log(`📊 Summary:`);
    console.log(`   • Pages measured: ${baseline.summary.total_pages_measured}`);
    console.log(`   • Average load time: ${baseline.summary.average_page_load}ms`);
    console.log(`   • Fastest page: ${baseline.summary.fastest_page_load}ms`);
    console.log(`   • Slowest page: ${baseline.summary.slowest_page_load}ms`);
    
  } catch (error) {
    console.error('💥 Baseline measurement failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run baseline measurement
if (require.main === module) {
  measureBaseline().catch(console.error);
}

module.exports = { measureBaseline };