#!/usr/bin/env node

/**
 * Production vs Development Mismatch Debug Tool
 * 
 * Compares local development environment with production to identify discrepancies
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PRODUCTION_URL = 'https://moviegenius.ai';
const LOCAL_URL = 'http://localhost:3000';

class ProductionMismatchDebugger {
  constructor() {
    this.issues = [];
    this.comparisons = [];
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      const req = protocol.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'MovieGenius-Debug-Tool/1.0',
          ...options.headers
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            size: Buffer.byteLength(data)
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', reject);
    });
  }

  async compareEndpoint(path, name) {
    console.log(`🔍 Comparing ${name}...`);
    
    try {
      const [prodResponse, localResponse] = await Promise.allSettled([
        this.makeRequest(`${PRODUCTION_URL}${path}`),
        this.makeRequest(`${LOCAL_URL}${path}`)
      ]);

      const comparison = {
        path,
        name,
        production: prodResponse.status === 'fulfilled' ? prodResponse.value : { error: prodResponse.reason?.message },
        local: localResponse.status === 'fulfilled' ? localResponse.value : { error: localResponse.reason?.message }
      };

      this.comparisons.push(comparison);

      // Analyze differences
      if (prodResponse.status === 'rejected') {
        this.issues.push({
          severity: 'HIGH',
          type: 'PRODUCTION_ERROR',
          path,
          message: `Production ${name} failed: ${prodResponse.reason?.message}`
        });
      }

      if (localResponse.status === 'rejected') {
        this.issues.push({
          severity: 'MEDIUM',
          type: 'LOCAL_ERROR',
          path,
          message: `Local ${name} failed: ${localResponse.reason?.message}`
        });
      }

      if (prodResponse.status === 'fulfilled' && localResponse.status === 'fulfilled') {
        const prod = prodResponse.value;
        const local = localResponse.value;

        // Status code differences
        if (prod.statusCode !== local.statusCode) {
          this.issues.push({
            severity: 'HIGH',
            type: 'STATUS_MISMATCH',
            path,
            message: `Status code mismatch: Production ${prod.statusCode} vs Local ${local.statusCode}`
          });
        }

        // Content size differences (significant)
        const sizeDiff = Math.abs(prod.size - local.size);
        const sizeRatio = sizeDiff / Math.max(prod.size, local.size);
        
        if (sizeRatio > 0.1) { // More than 10% difference
          this.issues.push({
            severity: 'MEDIUM',
            type: 'CONTENT_SIZE_MISMATCH',
            path,
            message: `Content size mismatch: Production ${prod.size}B vs Local ${local.size}B (${Math.round(sizeRatio * 100)}% difference)`
          });
        }

        // Check for missing content indicators
        if (prod.body.includes('404') || prod.body.includes('Not Found')) {
          this.issues.push({
            severity: 'HIGH',
            type: 'MISSING_CONTENT',
            path,
            message: 'Production returns 404 or Not Found content'
          });
        }

        // Check for placeholder content
        if (prod.body.includes('placeholder') || prod.body.includes('PLACEHOLDER')) {
          this.issues.push({
            severity: 'MEDIUM',
            type: 'PLACEHOLDER_CONTENT',
            path,
            message: 'Production contains placeholder content'
          });
        }

        console.log(`  Production: ${prod.statusCode} (${prod.size}B)`);
        console.log(`  Local: ${local.statusCode} (${local.size}B)`);
      }

    } catch (error) {
      this.issues.push({
        severity: 'HIGH',
        type: 'COMPARISON_ERROR',
        path,
        message: `Failed to compare ${name}: ${error.message}`
      });
    }
  }

  async checkEnvironmentVariables() {
    console.log('\n🔧 Checking Environment Variables...');
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_TMDB_API_KEY',
      'ANTHROPIC_API_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      
      if (!value) {
        this.issues.push({
          severity: 'HIGH',
          type: 'MISSING_ENV_VAR',
          message: `Missing environment variable: ${envVar}`
        });
      } else if (value.includes('placeholder')) {
        this.issues.push({
          severity: 'HIGH',
          type: 'PLACEHOLDER_ENV_VAR',
          message: `Environment variable ${envVar} contains placeholder value`
        });
      } else {
        console.log(`  ✅ ${envVar}: Set (${value.substring(0, 10)}...)`);
      }
    }
  }

  async checkStaticAssets() {
    console.log('\n📁 Checking Static Assets...');
    
    const criticalAssets = [
      '/images/hero-rotation/hero-1.jpg',
      '/images/posters/the-godfather.jpg',
      '/favicon.ico'
    ];

    for (const asset of criticalAssets) {
      try {
        const prodResponse = await this.makeRequest(`${PRODUCTION_URL}${asset}`);
        const localPath = path.join(__dirname, '..', 'public', asset);
        
        if (prodResponse.statusCode === 404) {
          this.issues.push({
            severity: 'HIGH',
            type: 'MISSING_ASSET',
            message: `Missing asset in production: ${asset}`
          });
        }

        if (!fs.existsSync(localPath)) {
          this.issues.push({
            severity: 'MEDIUM',
            type: 'MISSING_LOCAL_ASSET',
            message: `Missing asset locally: ${asset}`
          });
        }

      } catch (error) {
        this.issues.push({
          severity: 'MEDIUM',
          type: 'ASSET_CHECK_ERROR',
          message: `Failed to check asset ${asset}: ${error.message}`
        });
      }
    }
  }

  async checkAPIEndpoints() {
    console.log('\n🔌 Checking API Endpoints...');
    
    // Test simple search API
    try {
      const prodResponse = await this.makeRequest(`${PRODUCTION_URL}/api/simple-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (prodResponse.statusCode === 500) {
        this.issues.push({
          severity: 'HIGH',
          type: 'API_ERROR',
          message: 'SimpleSearch API returning 500 error in production'
        });
      }
    } catch (error) {
      this.issues.push({
        severity: 'HIGH',
        type: 'API_UNREACHABLE',
        message: `SimpleSearch API unreachable: ${error.message}`
      });
    }
  }

  generateReport() {
    console.log('\n📊 PRODUCTION MISMATCH ANALYSIS REPORT');
    console.log('=====================================');
    
    const highIssues = this.issues.filter(i => i.severity === 'HIGH');
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM');
    
    console.log(`🔴 High Priority Issues: ${highIssues.length}`);
    console.log(`🟡 Medium Priority Issues: ${mediumIssues.length}`);
    console.log(`📈 Total Comparisons: ${this.comparisons.length}`);

    if (highIssues.length > 0) {
      console.log('\n🚨 HIGH PRIORITY ISSUES:');
      highIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.type}] ${issue.message}`);
        if (issue.path) console.log(`   Path: ${issue.path}`);
      });
    }

    if (mediumIssues.length > 0) {
      console.log('\n⚠️  MEDIUM PRIORITY ISSUES:');
      mediumIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.type}] ${issue.message}`);
        if (issue.path) console.log(`   Path: ${issue.path}`);
      });
    }

    // Generate action items
    console.log('\n🎯 RECOMMENDED ACTIONS:');
    
    if (this.issues.some(i => i.type === 'MISSING_ENV_VAR' || i.type === 'PLACEHOLDER_ENV_VAR')) {
      console.log('1. Check Railway environment variables - ensure all required keys are set');
    }
    
    if (this.issues.some(i => i.type === 'MISSING_ASSET')) {
      console.log('2. Verify static assets are being deployed - check Railway build logs');
    }
    
    if (this.issues.some(i => i.type === 'API_ERROR')) {
      console.log('3. Review API endpoint errors - may be environment-specific issues');
    }
    
    if (this.issues.some(i => i.type === 'STATUS_MISMATCH')) {
      console.log('4. Compare route configurations between dev and production');
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('- Run `railway logs` to check deployment logs');
    console.log('- Verify environment variables in Railway dashboard');
    console.log('- Test critical user flows in production');
    console.log('- Consider deploying a staging environment for testing');
  }

  async run() {
    console.log('🕵️  MovieGenius Production Mismatch Debugger');
    console.log(`🎯 Production: ${PRODUCTION_URL}`);
    console.log(`🏠 Local: ${LOCAL_URL}\n`);

    // Critical page comparisons
    await this.compareEndpoint('/', 'Homepage');
    await this.compareEndpoint('/api/health', 'Health Check');
    await this.compareEndpoint('/film-noir', 'Film Noir Theme Page');
    await this.compareEndpoint('/genius/1/1/1', 'Episode Page');
    await this.compareEndpoint('/movie/238', 'Movie Detail Page');

    // Additional checks
    await this.checkEnvironmentVariables();
    await this.checkStaticAssets();
    await this.checkAPIEndpoints();

    this.generateReport();

    // Exit code based on issues
    const criticalIssues = this.issues.filter(i => i.severity === 'HIGH');
    process.exit(criticalIssues.length > 0 ? 1 : 0);
  }
}

// Run debugger if called directly
if (require.main === module) {
  const debugTool = new ProductionMismatchDebugger();
  debugTool.run().catch(error => {
    console.error('🚨 Debug tool error:', error);
    process.exit(1);
  });
}

module.exports = ProductionMismatchDebugger;