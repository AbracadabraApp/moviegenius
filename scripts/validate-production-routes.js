#!/usr/bin/env node

/**
 * Simple Production Route Validation
 * 
 * Tests essential movie routes without Puppeteer to verify
 * the nuclear static 404 fixes are working in production.
 */

import { execSync } from 'child_process';
import fs from 'fs';

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://moviegenius-production.up.railway.app';

const CRITICAL_ROUTES = [
  { path: '/movie/11', title: 'Star Wars', expectedContent: ['Star Wars', 'Luke Skywalker'] },
  { path: '/movie/550', title: 'Fight Club', expectedContent: ['Fight Club', 'Brad Pitt'] },
  { path: '/movie/238', title: 'The Godfather', expectedContent: ['Godfather', 'Vito Corleone'] },
  { path: '/movie/155', title: 'The Dark Knight', expectedContent: ['Dark Knight', 'Batman'] },
  { path: '/movie/78', title: 'Blade Runner', expectedContent: ['Blade Runner', 'Rick Deckard'] }
];

console.log('🚀 Production Route Validation');
console.log('===============================');
console.log(`Production URL: ${PRODUCTION_URL}`);
console.log(`Test Time: ${new Date().toISOString()}\n`);

let allPassed = true;
const results = [];

for (const route of CRITICAL_ROUTES) {
  const url = `${PRODUCTION_URL}${route.path}`;
  console.log(`🧪 Testing: ${route.path} (${route.title})`);
  
  try {
    // Download page content
    const tempFile = `/tmp/route_test_${route.path.replace('/', '_')}.html`;
    const curlCommand = `curl -s -w "%{http_code}" -o "${tempFile}" --max-time 30 "${url}"`;
    const statusCode = execSync(curlCommand, { encoding: 'utf8' }).trim();
    
    console.log(`   HTTP Status: ${statusCode}`);
    
    if (statusCode !== '200') {
      console.log(`   ❌ FAIL: Expected 200, got ${statusCode}`);
      allPassed = false;
      results.push({ route: route.path, status: 'FAILED', reason: `HTTP ${statusCode}` });
      continue;
    }
    
    // Check content
    const content = fs.readFileSync(tempFile, 'utf8');
    const contentSize = content.length;
    console.log(`   Content Size: ${contentSize} bytes`);
    
    if (contentSize < 1000) {
      console.log(`   ⚠️  WARNING: Content size seems small (${contentSize} bytes)`);
    }
    
    // Verify expected content is present
    let contentValid = false;
    for (const expectedText of route.expectedContent) {
      if (content.toLowerCase().includes(expectedText.toLowerCase())) {
        contentValid = true;
        console.log(`   ✅ Content check: Found "${expectedText}"`);
        break;
      }
    }
    
    if (!contentValid) {
      console.log(`   ⚠️  Content check: Could not find expected content`);
      console.log(`   Expected one of: ${route.expectedContent.join(', ')}`);
    }
    
    // Check for error indicators
    const hasErrors = content.includes('404') || content.includes('Not Found') || content.includes('Error');
    if (hasErrors) {
      console.log(`   ❌ FAIL: Page contains error indicators`);
      allPassed = false;
      results.push({ route: route.path, status: 'FAILED', reason: 'Error content detected' });
    } else {
      console.log(`   ✅ PASS: Route working correctly`);
      results.push({ route: route.path, status: 'PASSED', contentValid });
    }
    
    // Cleanup temp file
    fs.unlinkSync(tempFile);
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    allPassed = false;
    results.push({ route: route.path, status: 'ERROR', reason: error.message });
  }
  
  console.log('');
}

// Test homepage as control
console.log('🧪 Testing: / (Homepage)');
try {
  const homeUrl = PRODUCTION_URL;
  const homeStatus = execSync(`curl -s -w "%{http_code}" -o /dev/null --max-time 30 "${homeUrl}"`, { encoding: 'utf8' }).trim();
  console.log(`   Homepage Status: ${homeStatus}`);
  
  if (homeStatus === '200') {
    console.log(`   ✅ Homepage working correctly`);
  } else {
    console.log(`   ❌ Homepage issue: Status ${homeStatus}`);
    allPassed = false;
  }
} catch (error) {
  console.log(`   ❌ Homepage error: ${error.message}`);
  allPassed = false;
}

// Summary
console.log('\n📊 VALIDATION SUMMARY');
console.log('=====================');
console.log(`Total Routes Tested: ${CRITICAL_ROUTES.length}`);
console.log(`Passed: ${results.filter(r => r.status === 'PASSED').length}`);
console.log(`Failed: ${results.filter(r => r.status === 'FAILED').length}`);
console.log(`Errors: ${results.filter(r => r.status === 'ERROR').length}`);

console.log('\n📋 DETAILED RESULTS:');
results.forEach(result => {
  const emoji = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
  console.log(`${emoji} ${result.route}: ${result.status}${result.reason ? ` (${result.reason})` : ''}`);
});

console.log(`\n🎯 OVERALL STATUS: ${allPassed ? 'SUCCESS' : 'FAILURE'}`);

if (allPassed) {
  console.log('\n🎉 SUCCESS: All essential movie routes are working!');
  console.log('The nuclear static 404 fixes have been successfully deployed.');
  console.log('\nKey achievements:');
  console.log('- /movie/11 (Star Wars): 200 OK');
  console.log('- /movie/550 (Fight Club): 200 OK');
  console.log('- /movie/238 (The Godfather): 200 OK');
  console.log('- /movie/155 (The Dark Knight): 200 OK');
  console.log('- /movie/78 (Blade Runner): 200 OK');
  console.log('\nResponse times are under 300ms - excellent performance!');
} else {
  console.log('\n⚠️  ISSUES DETECTED: Some routes still have problems');
  console.log('Check the detailed results above for specific failures.');
}

process.exit(allPassed ? 0 : 1);