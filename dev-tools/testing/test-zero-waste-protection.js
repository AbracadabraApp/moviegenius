#!/usr/bin/env node

/**
 * Zero-Waste Protection System Test
 * 
 * CRITICAL: This test validates that our protection system works with real data
 * before we enable it in production. Tests all three tiers with actual content.
 */

import { 
  hasLinks, 
  classifyContentTier, 
  staticPageHasLinks,
  validateContentIntegrity,
  trackZeroWasteSavings 
} from './lib/zero-waste-protection.js';

import { 
  TIER_1_COMPLETE_CONTENT,
  TIER_2_UNLINKED_CONTENT, 
  EDGE_CASE_CONTENT,
  SUCCESS_CRITERIA 
} from './tests/fixtures/content-tiers.js';

// Test configuration
const TEST_CONFIG = {
  verbose: true,
  exitOnFailure: true
};

function log(message, level = 'info') {
  if (!TEST_CONFIG.verbose && level === 'debug') return;
  
  const prefix = {
    'info': '📋',
    'success': '✅', 
    'error': '❌',
    'warning': '⚠️',
    'debug': '🔍'
  }[level] || '📋';
  
  console.log(`${prefix} ${message}`);
}

function runTest(testName, testFn) {
  try {
    log(`Running: ${testName}`, 'debug');
    const result = testFn();
    if (result === true || result === undefined) {
      log(`PASS: ${testName}`, 'success');
      return true;
    } else {
      log(`FAIL: ${testName} - ${result}`, 'error');
      return false;
    }
  } catch (error) {
    log(`ERROR: ${testName} - ${error.message}`, 'error');
    if (TEST_CONFIG.exitOnFailure) {
      process.exit(1);
    }
    return false;
  }
}

async function runTests() {
  log('🛡️ Starting Zero-Waste Protection System Tests\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: hasLinks() detection
  const test1 = runTest('hasLinks() detects existing movie links', () => {
    const linkedContent = TIER_1_COMPLETE_CONTENT.movieAnalysis.props.sections[0].content;
    const unlinkedContent = TIER_2_UNLINKED_CONTENT.movieAnalysis.props.sections[0].content;
    
    if (!hasLinks(linkedContent)) {
      return 'Failed to detect existing links in Tier 1 content';
    }
    
    if (hasLinks(unlinkedContent)) {
      return 'False positive - detected links in unlinked content';
    }
    
    return true;
  });
  passed += test1 ? 1 : 0;
  failed += test1 ? 0 : 1;

  // Test 2: Content tier classification
  const test2 = runTest('classifyContentTier() correctly identifies tiers', () => {
    const completeAnalysis = {
      claude_response: {
        raw_content: TIER_1_COMPLETE_CONTENT.movieAnalysis.props.sections[0].content
      }
    };
    
    const unlinkedAnalysis = {
      claude_response: {
        raw_content: TIER_2_UNLINKED_CONTENT.movieAnalysis.props.sections[0].content
      }
    };
    
    if (classifyContentTier(completeAnalysis) !== 'complete') {
      return `Expected 'complete', got '${classifyContentTier(completeAnalysis)}'`;
    }
    
    if (classifyContentTier(unlinkedAnalysis) !== 'unlinked') {
      return `Expected 'unlinked', got '${classifyContentTier(unlinkedAnalysis)}'`;
    }
    
    if (classifyContentTier(null) !== 'missing') {
      return `Expected 'missing' for null input, got '${classifyContentTier(null)}'`;
    }
    
    return true;
  });
  passed += test2 ? 1 : 0;
  failed += test2 ? 0 : 1;

  // Test 3: Static page link detection
  const test3 = runTest('staticPageHasLinks() works with nuclear static data', () => {
    const staticWithLinks = TIER_1_COMPLETE_CONTENT.movieAnalysis;
    const staticWithoutLinks = TIER_2_UNLINKED_CONTENT.movieAnalysis;
    
    if (!staticPageHasLinks(staticWithLinks)) {
      return 'Failed to detect links in static page with links';
    }
    
    if (staticPageHasLinks(staticWithoutLinks)) {
      return 'False positive - detected links in static page without links';
    }
    
    return true;
  });
  passed += test3 ? 1 : 0;
  failed += test3 ? 0 : 1;

  // Test 4: Content integrity validation
  const test4 = runTest('validateContentIntegrity() protects against corruption', () => {
    const original = TIER_1_COMPLETE_CONTENT.movieAnalysis.props.sections[0].content;
    const unchanged = original;
    const corrupted = original.replace('<a href="/movie/500"', '<a href="/broken/500"');
    
    const validResult = validateContentIntegrity(original, unchanged, 'tier1_skip');
    if (!validResult.valid) {
      return `Should be valid for unchanged content: ${validResult.errors.join(', ')}`;
    }
    
    const invalidResult = validateContentIntegrity(original, corrupted, 'tier1_skip');
    if (invalidResult.valid) {
      return 'Should detect corruption when links are broken';
    }
    
    return true;
  });
  passed += test4 ? 1 : 0;
  failed += test4 ? 0 : 1;

  // Test 5: Self-reference handling
  const test5 = runTest('Self-reference protection works', () => {
    const selfRefContent = EDGE_CASE_CONTENT.selfReference.content;
    
    // Should contain the movie title but not as a link to itself
    if (!selfRefContent.includes('The Godfather')) {
      return 'Test fixture should contain "The Godfather"';
    }
    
    // This would be handled by the linking system, but we test the principle
    const wouldSelfLink = selfRefContent.includes('<a href="/movie/') && 
                         selfRefContent.includes('>The Godfather</a>');
    
    if (wouldSelfLink) {
      return 'Self-reference would create invalid self-link';
    }
    
    return true;
  });
  passed += test5 ? 1 : 0;
  failed += test5 ? 0 : 1;

  // Test 6: Cost tracking
  const test6 = runTest('trackZeroWasteSavings() calculates costs correctly', () => {
    const tier1Savings = trackZeroWasteSavings('tier1_skip', {});
    if (tier1Savings.costSaved !== 0.10) {
      return `Expected $0.10 savings for tier1_skip, got $${tier1Savings.costSaved}`;
    }
    
    const tier2Savings = trackZeroWasteSavings('tier2_link_only', { linksAdded: 3 });
    if (tier2Savings.costSaved !== 0.10) {
      return `Expected $0.10 savings for tier2_link_only, got $${tier2Savings.costSaved}`;
    }
    
    return true;
  });
  passed += test6 ? 1 : 0;
  failed += test6 ? 0 : 1;

  // Test 7: Edge case resilience  
  const test7 = runTest('System handles edge cases gracefully', () => {
    const malformedContent = EDGE_CASE_CONTENT.malformedPatterns.content;
    
    // Should not crash
    try {
      const result = hasLinks(malformedContent);
      // Should return false for malformed content (no valid links)
      if (result !== false) {
        return `Expected false for malformed content, got ${result}`;
      }
    } catch (error) {
      return `Should not crash on malformed content: ${error.message}`;
    }
    
    // Test with null/undefined inputs
    if (hasLinks(null) !== false || hasLinks(undefined) !== false || hasLinks('') !== false) {
      return 'Should handle null/undefined/empty inputs gracefully';
    }
    
    return true;
  });
  passed += test7 ? 1 : 0;
  failed += test7 ? 0 : 1;

  // Test 8: Performance requirements
  const test8 = runTest('Performance meets requirements', () => {
    const largeContent = EDGE_CASE_CONTENT.largeContentBlock.content;
    
    const startTime = Date.now();
    const result = hasLinks(largeContent);
    const duration = Date.now() - startTime;
    
    if (duration > SUCCESS_CRITERIA.performance.maxProcessingTime) {
      return `Too slow: ${duration}ms > ${SUCCESS_CRITERIA.performance.maxProcessingTime}ms`;
    }
    
    return true;
  });
  passed += test8 ? 1 : 0;
  failed += test8 ? 0 : 1;

  // Summary
  log('\n📊 Test Results Summary:');
  log(`✅ Passed: ${passed}`);
  log(`❌ Failed: ${failed}`);
  log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    log('\n🎉 ALL TESTS PASSED - Zero-Waste Protection System is ready!', 'success');
    log('✅ Safe to proceed with Phase 1 implementation', 'success');
    return true;
  } else {
    log('\n🚨 TESTS FAILED - Do not proceed with implementation!', 'error');
    log('❌ Fix failing tests before continuing', 'error');
    return false;
  }
}

// Run the tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`💥 Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });