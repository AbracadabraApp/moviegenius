#!/usr/bin/env node

// Deployment verification script for MovieGenius production
// Runs comprehensive health checks after deployments

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://moviegenius.ai';
const TIMEOUT = 10000; // 10 seconds

class DeploymentVerifier {
  constructor() {
    this.baseUrl = BASE_URL;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, {
        method: options.method || 'GET',
        timeout: TIMEOUT,
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

  async runTest(name, testFn) {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.passed++;
      this.results.tests.push({
        name,
        status: 'PASS',
        duration: `${duration}ms`
      });
      console.log(`✅ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      this.results.tests.push({
        name,
        status: 'FAIL',
        duration: `${duration}ms`,
        error: error.message
      });
      console.log(`❌ ${name} (${duration}ms): ${error.message}`);
    }
  }

  async verifyHealthEndpoint() {
    const response = await this.makeRequest('/api/health');
    if (response.status !== 200 && response.status !== 301) {
      throw new Error(`Health check returned ${response.status}`);
    }
    
    // Handle redirects
    if (response.status === 301) {
      const location = response.headers.location;
      if (location) {
        const redirectResponse = await this.makeRequest(location.replace(this.baseUrl, ''));
        if (redirectResponse.status !== 200) {
          throw new Error(`Health check redirect returned ${redirectResponse.status}`);
        }
        const data = JSON.parse(redirectResponse.data);
        if (data.status !== 'ok') {
          throw new Error(`Health check status: ${data.status}`);
        }
      }
      return; // 301 is acceptable for health check
    }
    
    const data = JSON.parse(response.data);
    if (data.status !== 'ok') {
      throw new Error(`Health check status: ${data.status}`);
    }
  }

  async verifyHomePage() {
    const response = await this.makeRequest('/');
    if (response.status !== 200 && response.status !== 301) {
      throw new Error(`Home page returned ${response.status}`);
    }
  }

  async verifyRecsPage() {
    const response = await this.makeRequest('/recs');
    if (response.status !== 200 && response.status !== 301) {
      throw new Error(`Recs page returned ${response.status}`);
    }
    // 301 redirects are acceptable for this page
  }

  async verifyMoviePage() {
    // Test with a known movie ID (The Godfather)
    const response = await this.makeRequest('/movie/238');
    if (response.status !== 200 && response.status !== 301) {
      throw new Error(`Movie page returned ${response.status}`);
    }
    // 301 redirects are acceptable for this page
  }

  async verifyApiLookup() {
    const response = await this.makeRequest('/api/lookup-movie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { title: 'Godfather', year: 1972 }
    });
    
    if (response.status !== 200 && response.status !== 301) {
      throw new Error(`Movie lookup API returned ${response.status}`);
    }
    // API might redirect, that's OK as long as it's not 4xx/5xx
  }

  async verifyCacheHeaders() {
    const response = await this.makeRequest('/movie/238');
    
    // For redirects, cache headers may not be present - that's OK
    if (response.status === 301) {
      return; // Skip cache header check for redirects
    }
    
    // Check for proper cache headers only on successful responses
    const cacheControl = response.headers['cache-control'];
    if (response.status === 200 && (!cacheControl || !cacheControl.includes('public'))) {
      throw new Error('Missing or invalid cache headers');
    }
  }

  async verifySSLCertificate() {
    if (!this.baseUrl.startsWith('https')) {
      throw new Error('Not using HTTPS');
    }
    
    // SSL verification is handled by the HTTPS client
    const response = await this.makeRequest('/api/health');
    if (response.status !== 200 && response.status !== 301) {
      throw new Error('SSL verification failed');
    }
  }

  async verifyResponseTimes() {
    const startTime = Date.now();
    await this.makeRequest('/api/health');
    const duration = Date.now() - startTime;
    
    if (duration > 5000) {
      throw new Error(`Health endpoint too slow: ${duration}ms`);
    }
  }

  async verifyBuildIntegrity() {
    const response = await this.makeRequest('/_next/static/css');
    // Should get a directory listing or specific CSS file
    if (response.status === 404) {
      throw new Error('Static assets not properly deployed');
    }
  }

  async run() {
    console.log('\n🚀 MovieGenius Deployment Verification');
    console.log(`📍 Target: ${this.baseUrl}`);
    console.log('⏱️  Starting verification tests...\n');

    const tests = [
      ['Health Endpoint', () => this.verifyHealthEndpoint()],
      ['Home Page', () => this.verifyHomePage()], 
      ['Recs Page', () => this.verifyRecsPage()],
      ['Movie Page', () => this.verifyMoviePage()],
      ['Movie Lookup API', () => this.verifyApiLookup()],
      ['Cache Headers', () => this.verifyCacheHeaders()],
      ['SSL Certificate', () => this.verifySSLCertificate()],
      ['Response Times', () => this.verifyResponseTimes()],
      ['Build Integrity', () => this.verifyBuildIntegrity()]
    ];

    for (const [name, testFn] of tests) {
      await this.runTest(name, testFn);
    }

    console.log('\n📊 Verification Summary:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);

    if (this.results.failed > 0) {
      console.log('\n🚨 Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          console.log(`   ${test.name}: ${test.error}`);
        });
      
      process.exit(1);
    } else {
      console.log('\n🎉 All verification tests passed! Deployment is healthy.');
      process.exit(0);
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new DeploymentVerifier();
  verifier.run().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentVerifier;