#!/usr/bin/env node

/**
 * Build Environment Validation Script
 * 
 * CRITICAL: This script validates the build environment before Next.js build
 * to catch issues that prevent proper SSG route generation, specifically
 * for nuclear static file access and the 404 regression caused by commit 16366148.
 * 
 * Run this BEFORE every build to ensure:
 * - Nuclear static files are accessible
 * - No file duplication issues
 * - Railway environment compatibility
 * - Key movie files exist for prebuild paths
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  nuclearDir: path.join(PROJECT_ROOT, 'nuclear-static'),
  duplicateDir: path.join(PROJECT_ROOT, 'public', 'nuclear-static'),
  keyMovieIds: ['11', '550', '238', '155', '78'],  // Must exist for prebuild paths
  maxBuildTime: 300000, // 5 minutes max build time expectation
  environment: process.env.NODE_ENV || 'development',
  isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
  isProduction: process.env.NODE_ENV === 'production'
};

console.log('🔍 Build Environment Validation');
console.log('===============================');
console.log(`Environment: ${CONFIG.environment}`);
console.log(`Railway: ${CONFIG.isRailway ? 'Yes' : 'No'}`);
console.log(`Working Directory: ${process.cwd()}`);
console.log(`Project Root: ${PROJECT_ROOT}`);
console.log(`Timestamp: ${new Date().toISOString()}\n`);

const validationResults = {
  passed: [],
  failed: [],
  warnings: [],
  startTime: Date.now()
};

function logResult(type, test, message, details = {}) {
  const result = { test, message, details, timestamp: new Date().toISOString() };
  validationResults[type].push(result);
  
  const emoji = type === 'passed' ? '✅' : type === 'failed' ? '❌' : '⚠️';
  console.log(`${emoji} ${test}: ${message}`);
  if (Object.keys(details).length > 0) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

/**
 * Test 1: Nuclear Static Directory Access
 */
async function validateNuclearDirectory() {
  try {
    // Check if primary nuclear-static directory exists
    const stats = await fs.stat(CONFIG.nuclearDir);
    const files = await fs.readdir(CONFIG.nuclearDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    if (!stats.isDirectory()) {
      logResult('failed', 'Nuclear Directory', 'nuclear-static is not a directory');
      return false;
    }
    
    if (jsonFiles.length === 0) {
      logResult('failed', 'Nuclear Files', 'No JSON files found in nuclear-static directory');
      return false;
    }
    
    logResult('passed', 'Nuclear Directory', `Found ${jsonFiles.length} nuclear static files`, {
      directory: CONFIG.nuclearDir,
      fileCount: jsonFiles.length,
      totalSize: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
      sampleFiles: jsonFiles.slice(0, 5)
    });
    
    return true;
    
  } catch (error) {
    logResult('failed', 'Nuclear Directory', `Cannot access nuclear-static directory: ${error.message}`, {
      directory: CONFIG.nuclearDir,
      error: error.code
    });
    return false;
  }
}

/**
 * Test 2: Detect File Duplication (Commit 16366148 regression)
 */
async function detectFileDuplication() {
  try {
    await fs.access(CONFIG.duplicateDir);
    const duplicateFiles = await fs.readdir(CONFIG.duplicateDir);
    const duplicateJsonFiles = duplicateFiles.filter(f => f.endsWith('.json'));
    
    if (duplicateJsonFiles.length > 0) {
      logResult('failed', 'File Duplication', `Found ${duplicateJsonFiles.length} duplicate files in public/nuclear-static`, {
        duplicateDirectory: CONFIG.duplicateDir,
        duplicateCount: duplicateJsonFiles.length,
        issue: 'Commit 16366148 regression - dual-path logic causing build conflicts',
        solution: 'Remove public/nuclear-static directory: git rm -r public/nuclear-static'
      });
      return false;
    }
    
  } catch (error) {
    // No duplication found - this is good
    logResult('passed', 'File Duplication', 'No duplicate nuclear-static files found');
    return true;
  }
  
  logResult('failed', 'File Duplication', 'Duplicate directory exists but is accessible - potential conflict');
  return false;
}

/**
 * Test 3: Key Movie Files Access
 */
async function validateKeyMovieFiles() {
  const missingFiles = [];
  const accessibleFiles = [];
  
  for (const movieId of CONFIG.keyMovieIds) {
    const filePath = path.join(CONFIG.nuclearDir, `${movieId}.json`);
    
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (!data.title) {
        missingFiles.push({ movieId, issue: 'Invalid JSON structure - missing title' });
      } else {
        accessibleFiles.push({ movieId, title: data.title, size: stats.size });
      }
      
    } catch (error) {
      missingFiles.push({ movieId, issue: error.message, code: error.code });
    }
  }
  
  if (missingFiles.length > 0) {
    logResult('failed', 'Key Movie Files', `${missingFiles.length} key movie files missing or invalid`, {
      missingFiles,
      impact: 'getStaticPaths prebuild will fail for these routes',
      keyRoutes: CONFIG.keyMovieIds.map(id => `/movie/${id}`)
    });
    return false;
  }
  
  logResult('passed', 'Key Movie Files', `All ${CONFIG.keyMovieIds.length} key movie files accessible`, {
    accessibleFiles: accessibleFiles.map(f => ({ id: f.movieId, title: f.title }))
  });
  
  return true;
}

/**
 * Test 4: Railway Environment Compatibility
 */
async function validateRailwayCompatibility() {
  if (!CONFIG.isRailway) {
    logResult('passed', 'Railway Compatibility', 'Not in Railway environment - skipping railway-specific checks');
    return true;
  }
  
  const railwayIssues = [];
  
  // Check working directory (should be /app in Railway)
  const cwd = process.cwd();
  if (!cwd.includes('/app') && CONFIG.isProduction) {
    railwayIssues.push('Working directory may not be correct for Railway container');
  }
  
  // Check if nuclear-static is at expected path relative to cwd
  const expectedNuclearPath = path.join(cwd, 'nuclear-static');
  try {
    await fs.access(expectedNuclearPath);
  } catch (error) {
    railwayIssues.push(`Nuclear static not accessible at expected Railway path: ${expectedNuclearPath}`);
  }
  
  // Check environment variables
  const requiredEnvVars = ['NEXT_PUBLIC_TMDB_API_KEY'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      railwayIssues.push(`Missing environment variable: ${envVar}`);
    }
  }
  
  if (railwayIssues.length > 0) {
    logResult('failed', 'Railway Compatibility', `${railwayIssues.length} Railway environment issues`, {
      issues: railwayIssues,
      cwd,
      environment: CONFIG.environment,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT_NAME
    });
    return false;
  }
  
  logResult('passed', 'Railway Compatibility', 'Railway environment checks passed', {
    cwd,
    railwayEnv: process.env.RAILWAY_ENVIRONMENT_NAME
  });
  
  return true;
}

/**
 * Test 5: File System Permissions
 */
async function validateFilePermissions() {
  const permissionTests = [];
  
  // Test read access to nuclear directory
  try {
    await fs.access(CONFIG.nuclearDir, fs.constants.R_OK);
    permissionTests.push({ test: 'Nuclear directory read', passed: true });
  } catch (error) {
    permissionTests.push({ test: 'Nuclear directory read', passed: false, error: error.message });
  }
  
  // Test individual file read access
  for (const movieId of CONFIG.keyMovieIds.slice(0, 2)) { // Test first 2 key files
    const filePath = path.join(CONFIG.nuclearDir, `${movieId}.json`);
    try {
      await fs.access(filePath, fs.constants.R_OK);
      permissionTests.push({ test: `File read ${movieId}`, passed: true });
    } catch (error) {
      permissionTests.push({ test: `File read ${movieId}`, passed: false, error: error.message });
    }
  }
  
  const failedPermissions = permissionTests.filter(t => !t.passed);
  
  if (failedPermissions.length > 0) {
    logResult('failed', 'File Permissions', `${failedPermissions.length} permission tests failed`, {
      failedTests: failedPermissions,
      environment: CONFIG.environment,
      platform: process.platform
    });
    return false;
  }
  
  logResult('passed', 'File Permissions', `All ${permissionTests.length} permission tests passed`);
  return true;
}

/**
 * Test 6: Build Prerequisites
 */
async function validateBuildPrerequisites() {
  const prerequisites = [];
  
  // Check package.json
  try {
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    if (!packageJson.scripts?.build) {
      prerequisites.push({ check: 'Build script', passed: false, issue: 'No build script in package.json' });
    } else {
      prerequisites.push({ check: 'Build script', passed: true, script: packageJson.scripts.build });
    }
    
    if (!packageJson.scripts?.start) {
      prerequisites.push({ check: 'Start script', passed: false, issue: 'No start script in package.json' });
    } else {
      prerequisites.push({ check: 'Start script', passed: true, script: packageJson.scripts.start });
    }
    
  } catch (error) {
    prerequisites.push({ check: 'Package.json', passed: false, error: error.message });
  }
  
  // Check next.config.js
  try {
    await fs.access(path.join(PROJECT_ROOT, 'next.config.js'));
    prerequisites.push({ check: 'Next.js config', passed: true });
  } catch (error) {
    prerequisites.push({ check: 'Next.js config', passed: false, issue: 'next.config.js not found' });
  }
  
  const failedPrereqs = prerequisites.filter(p => !p.passed);
  
  if (failedPrereqs.length > 0) {
    logResult('failed', 'Build Prerequisites', `${failedPrereqs.length} prerequisite checks failed`, {
      failedChecks: failedPrereqs
    });
    return false;
  }
  
  logResult('passed', 'Build Prerequisites', `All ${prerequisites.length} prerequisite checks passed`);
  return true;
}

/**
 * Run All Validations
 */
async function runAllValidations() {
  console.log('Running validation tests...\n');
  
  const tests = [
    { name: 'Nuclear Directory', fn: validateNuclearDirectory },
    { name: 'File Duplication', fn: detectFileDuplication },
    { name: 'Key Movie Files', fn: validateKeyMovieFiles },
    { name: 'Railway Compatibility', fn: validateRailwayCompatibility },
    { name: 'File Permissions', fn: validateFilePermissions },
    { name: 'Build Prerequisites', fn: validateBuildPrerequisites }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    try {
      const result = await test.fn();
      if (!result) allPassed = false;
    } catch (error) {
      logResult('failed', test.name, `Test execution failed: ${error.message}`, {
        stack: error.stack
      });
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Generate Final Report
 */
function generateReport(allPassed) {
  const duration = Date.now() - validationResults.startTime;
  
  console.log('\n📊 BUILD VALIDATION REPORT');
  console.log('==========================');
  console.log(`✅ Passed: ${validationResults.passed.length}`);
  console.log(`❌ Failed: ${validationResults.failed.length}`);
  console.log(`⚠️  Warnings: ${validationResults.warnings.length}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`🏗️  Ready for build: ${allPassed ? 'YES' : 'NO'}`);
  
  if (validationResults.failed.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES TO FIX:');
    validationResults.failed.forEach((failure, index) => {
      console.log(`\n${index + 1}. ${failure.test}: ${failure.message}`);
      if (failure.details.solution) {
        console.log(`   💡 Solution: ${failure.details.solution}`);
      }
      if (failure.details.issue) {
        console.log(`   🔍 Issue: ${failure.details.issue}`);
      }
    });
  }
  
  if (validationResults.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    validationResults.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning.test}: ${warning.message}`);
    });
  }
  
  // Railway-specific recommendations
  if (CONFIG.isRailway && validationResults.failed.length > 0) {
    console.log('\n🚂 RAILWAY SPECIFIC ACTIONS:');
    console.log('1. Clear Railway cache: railway build --clear-cache');
    console.log('2. Check Railway environment variables in dashboard');
    console.log('3. Verify GitHub integration is working');
    console.log('4. Review Railway build logs for specific errors');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  if (allPassed) {
    console.log('✅ Validation passed - proceed with build');
    console.log('   Run: npm run build');
  } else {
    console.log('❌ Fix critical issues before building');
    console.log('   1. Address failed validation tests above');
    console.log('   2. Re-run: npm run validate:build-env');
    console.log('   3. Only proceed to build after all tests pass');
  }
  
  return allPassed;
}

/**
 * Main Execution
 */
async function main() {
  try {
    const allPassed = await runAllValidations();
    const success = generateReport(allPassed);
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 VALIDATION FRAMEWORK ERROR:');
    console.error('================================');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('\nThis indicates a problem with the validation script itself.');
    console.error('Please check the script and try again.');
    
    process.exit(2);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runAllValidations, generateReport, CONFIG };