#!/usr/bin/env node

// Performance monitoring script for MovieGenius
// Tracks Core Web Vitals and API response times

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://moviegenius.ai';

class PerformanceMonitor {
  constructor() {
    this.baseUrl = BASE_URL;
    this.metrics = {
      apiResponseTimes: [],
      pageLoadTimes: [],
      errors: []
    };
  }

  async measureApiResponseTime(endpoint, options = {}) {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest(endpoint, options);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.metrics.apiResponseTimes.push({
        endpoint,
        duration,
        status: response.status,
        timestamp: new Date().toISOString()
      });
      
      return { duration, status: response.status };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.metrics.errors.push({
        endpoint,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, {
        method: options.method || 'GET',
        timeout: 30000,
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async runPerformanceTests() {
    console.log('🚀 Starting performance monitoring...\n');

    const tests = [
      {
        name: 'Health Check API',
        endpoint: '/api/health',
        target: 500 // ms
      },
      {
        name: 'Movie Lookup API',
        endpoint: '/api/lookup-movie',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { title: 'Godfather', year: 1972 },
        target: 2000 // ms
      },
      {
        name: 'Home Page',
        endpoint: '/',
        target: 1000 // ms
      },
      {
        name: 'Recs Page',
        endpoint: '/recs',
        target: 1500 // ms
      },
      {
        name: 'Movie Page (Cached)',
        endpoint: '/movie/238',
        target: 800 // ms
      },
      {
        name: 'Movie Page (Different)',
        endpoint: '/movie/550', // Fight Club
        target: 800 // ms
      }
    ];

    const results = [];

    for (const test of tests) {
      console.log(`Testing ${test.name}...`);
      
      try {
        const { duration, status } = await this.measureApiResponseTime(
          test.endpoint,
          {
            method: test.method,
            headers: test.headers,
            body: test.body
          }
        );

        const passed = duration <= test.target;
        const statusIcon = passed ? '✅' : '⚠️';
        const statusText = passed ? 'PASS' : 'SLOW';
        
        console.log(`${statusIcon} ${test.name}: ${duration}ms (target: ${test.target}ms) - ${statusText}`);
        
        results.push({
          name: test.name,
          duration,
          target: test.target,
          passed,
          status
        });
        
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.message}`);
        results.push({
          name: test.name,
          duration: null,
          target: test.target,
          passed: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async runCacheEfficiencyTest() {
    console.log('\n🔄 Testing cache efficiency...');
    
    const testMovie = '/movie/238'; // The Godfather
    const iterations = 3;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`Cache test ${i + 1}/${iterations}...`);
      const { duration } = await this.measureApiResponseTime(testMovie);
      times.push(duration);
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const improvement = times[0] > times[times.length - 1];
    
    console.log(`📊 Cache test results:`);
    console.log(`   First request: ${times[0]}ms`);
    console.log(`   Last request: ${times[times.length - 1]}ms`);
    console.log(`   Average: ${Math.round(averageTime)}ms`);
    console.log(`   Cache working: ${improvement ? '✅ YES' : '⚠️ UNCLEAR'}`);

    return {
      times,
      averageTime,
      cacheWorking: improvement
    };
  }

  generateReport(performanceResults, cacheResults) {
    const passedTests = performanceResults.filter(r => r.passed).length;
    const totalTests = performanceResults.length;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log('\n📈 Performance Report Summary:');
    console.log(`✅ Tests passed: ${passedTests}/${totalTests} (${successRate}%)`);
    
    const slowTests = performanceResults.filter(r => !r.passed && !r.error);
    if (slowTests.length > 0) {
      console.log(`⚠️  Slow endpoints:`);
      slowTests.forEach(test => {
        console.log(`   ${test.name}: ${test.duration}ms (target: ${test.target}ms)`);
      });
    }

    const errorTests = performanceResults.filter(r => r.error);
    if (errorTests.length > 0) {
      console.log(`❌ Failed endpoints:`);
      errorTests.forEach(test => {
        console.log(`   ${test.name}: ${test.error}`);
      });
    }

    console.log(`\n🔄 Cache Performance:`);
    console.log(`   Average response time: ${Math.round(cacheResults.averageTime)}ms`);
    console.log(`   Cache efficiency: ${cacheResults.cacheWorking ? 'Working' : 'Needs investigation'}`);

    // Performance threshold check
    const criticalIssues = performanceResults.filter(r => 
      r.duration > (r.target * 2) || r.error
    ).length;

    if (criticalIssues > 0) {
      console.log(`\n🚨 Critical performance issues detected: ${criticalIssues}`);
      return false; // Indicate performance regression
    }

    console.log('\n🎉 Performance monitoring completed successfully!');
    return true; // Performance is acceptable
  }

  async run() {
    try {
      const performanceResults = await this.runPerformanceTests();
      const cacheResults = await this.runCacheEfficiencyTest();
      
      const success = this.generateReport(performanceResults, cacheResults);
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('\n❌ Performance monitoring failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.run();
}

module.exports = PerformanceMonitor;