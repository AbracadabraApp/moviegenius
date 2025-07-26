#!/usr/bin/env node

/**
 * Production 404 Fix Testing Script
 * 
 * Monitors Railway deployment and runs comprehensive Puppeteer tests
 * to verify the nuclear static 404 fixes are working in production.
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://moviegenius-production.up.railway.app';
const MAX_WAIT_TIME = 600000; // 10 minutes max wait for deployment
const CHECK_INTERVAL = 30000; // Check every 30 seconds

console.log('🚀 Production 404 Fix Testing');
console.log('=============================');
console.log(`Production URL: ${PRODUCTION_URL}`);
console.log(`Start Time: ${new Date().toISOString()}\n`);

/**
 * Check if deployment is ready
 */
async function checkDeploymentStatus() {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/health`, {
      method: 'GET',
      timeout: 10000
    });
    
    return {
      ready: response.ok,
      status: response.status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Wait for deployment to be ready
 */
async function waitForDeployment() {
  console.log('⏳ Waiting for Railway deployment to be ready...');
  
  const startTime = Date.now();
  let attempts = 0;
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    attempts++;
    console.log(`\n🔍 Deployment Check #${attempts}`);
    
    const status = await checkDeploymentStatus();
    console.log(`   Status: ${status.ready ? 'READY' : 'NOT_READY'}`);
    console.log(`   Timestamp: ${status.timestamp}`);
    
    if (status.error) {
      console.log(`   Error: ${status.error}`);
    } else if (status.status) {
      console.log(`   HTTP Status: ${status.status}`);
    }
    
    if (status.ready) {
      console.log(`\n✅ Deployment ready after ${attempts} attempts`);
      console.log(`   Total wait time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      return true;
    }
    
    const remainingTime = MAX_WAIT_TIME - (Date.now() - startTime);
    if (remainingTime > CHECK_INTERVAL) {
      console.log(`   ⏳ Waiting ${CHECK_INTERVAL/1000}s before next check...`);
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
  }
  
  console.log(`\n❌ Deployment not ready after ${MAX_WAIT_TIME/1000}s`);
  return false;
}

/**
 * Run Puppeteer tests
 */
function runProductionTests() {
  console.log('\n🧪 Running Production 404 Tests');
  console.log('================================');
  
  try {
    // Set environment variables for tests
    const env = {
      ...process.env,
      PRODUCTION_URL,
      NODE_ENV: 'test'
    };
    
    // Run Jest with our production test file
    const jestCommand = [
      'npx', 'jest',
      'tests/production-404-validation.test.js',
      '--verbose',
      '--no-cache',
      '--detectOpenHandles',
      '--forceExit',
      '--testTimeout=60000'
    ];
    
    console.log(`Running: ${jestCommand.join(' ')}\n`);
    
    const result = execSync(jestCommand.join(' '), {
      encoding: 'utf8',
      stdio: 'inherit',
      env,
      cwd: path.resolve(__dirname, '..')
    });
    
    console.log('\n✅ All production tests passed!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Production tests failed:');
    console.error(error.message);
    
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
    
    return false;
  }
}

/**
 * Quick smoke test using curl
 */
async function runSmokeTests() {
  console.log('\n🔥 Running Quick Smoke Tests');
  console.log('============================');
  
  const criticalRoutes = [
    '/movie/11',   // Star Wars
    '/movie/550',  // Fight Club
    '/movie/238'   // The Godfather
  ];
  
  let allPassed = true;
  
  for (const route of criticalRoutes) {
    const url = `${PRODUCTION_URL}${route}`;
    console.log(`\n🧪 Testing: ${url}`);
    
    try {
      const curlCommand = `curl -s -o /dev/null -w "%{http_code}" --max-time 30 "${url}"`;
      const statusCode = execSync(curlCommand, { encoding: 'utf8' }).trim();
      
      console.log(`   HTTP Status: ${statusCode}`);
      
      if (statusCode === '200') {
        console.log(`   ✅ PASS: ${route}`);
      } else if (statusCode === '404') {
        console.log(`   ❌ FAIL: ${route} - Still returning 404!`);
        allPassed = false;
      } else {
        console.log(`   ⚠️  UNEXPECTED: ${route} - Status ${statusCode}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${route} - ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log(`\n📊 Smoke Test Summary: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
  return allPassed;
}

/**
 * Generate test report
 */
function generateTestReport(deploymentReady, smokeTestsPassed, fullTestsPassed) {
  const report = {
    timestamp: new Date().toISOString(),
    productionUrl: PRODUCTION_URL,
    results: {
      deploymentReady,
      smokeTestsPassed,
      fullTestsPassed,
      overallStatus: deploymentReady && smokeTestsPassed && fullTestsPassed ? 'SUCCESS' : 'FAILURE'
    },
    summary: {
      criticalRoutes: ['/movie/11', '/movie/550', '/movie/238', '/movie/155', '/movie/78'],
      expectedBehavior: 'All routes should return 200 status with proper movie content',
      nuclearStaticFixes: 'Deployment includes populated nuclear-static directory and validation'
    }
  };
  
  const reportPath = path.join(__dirname, '..', 'test-reports', 'production-404-fix-results.json');
  
  // Ensure reports directory exists
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Test report saved: ${reportPath}`);
  return report;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Wait for deployment
    const deploymentReady = await waitForDeployment();
    
    // Step 2: Run smoke tests
    const smokeTestsPassed = deploymentReady ? await runSmokeTests() : false;
    
    // Step 3: Run full Puppeteer tests if smoke tests pass
    const fullTestsPassed = smokeTestsPassed ? runProductionTests() : false;
    
    // Step 4: Generate report
    const report = generateTestReport(deploymentReady, smokeTestsPassed, fullTestsPassed);
    
    // Step 5: Summary
    console.log('\n🎯 FINAL RESULTS');
    console.log('================');
    console.log(`Deployment Ready: ${deploymentReady ? '✅' : '❌'}`);
    console.log(`Smoke Tests: ${smokeTestsPassed ? '✅' : '❌'}`);
    console.log(`Full Tests: ${fullTestsPassed ? '✅' : '❌'}`);
    console.log(`Overall Status: ${report.results.overallStatus}`);
    
    if (report.results.overallStatus === 'SUCCESS') {
      console.log('\n🎉 SUCCESS: 404 fixes deployed and verified in production!');
      console.log('Essential movie routes are now working correctly.');
      process.exit(0);
    } else {
      console.log('\n⚠️  ISSUES DETECTED: Production deployment needs attention');
      console.log('Check the test results above for specific failures.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 TESTING FRAMEWORK ERROR:');
    console.error('============================');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    process.exit(2);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Testing interrupted by user');
  process.exit(130);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}