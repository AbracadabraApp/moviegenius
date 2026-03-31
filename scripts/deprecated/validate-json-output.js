#!/usr/bin/env node

/**
 * JSON Output Validation Script
 * Validates batch processing JSON output quality and standards compliance
 */

import { readFileSync } from 'fs';

console.log('🔍 JSON OUTPUT VALIDATION REPORT');
console.log('================================');
console.log('');

try {
  const results = JSON.parse(readFileSync('./batch-results.json', 'utf8'));

  let validationResults = {
    total: results.successful.length,
    passed: 0,
    failed: 0,
    details: []
  };

  console.log(`📊 Analyzing ${results.successful.length} JSON analyses from batch processing...`);
  console.log('');

  // Process each movie
  for (const movie of results.successful) {
    console.log(`🎬 ${movie.title} (${movie.year}) - TMDB ${movie.tmdbId}`);
    
    const analysis = {
      tmdbId: movie.tmdbId,
      title: movie.title,
      checks: {},
      passed: true
    };
    
    // Check 1: Format is JSON
    analysis.checks.format = movie.format === 'json' ? '✅' : '❌';
    if (movie.format !== 'json') analysis.passed = false;
    
    // Check 2: Preview indicates valid JSON parsing
    analysis.checks.parsePreview = movie.preview.includes('JSON:') ? '✅' : '❌';
    if (!movie.preview.includes('JSON:')) analysis.passed = false;
    
    // Check 3: Word count in target range (from preview)
    const wordMatch = movie.preview.match(/(\d+) words/);
    const wordCount = wordMatch ? parseInt(wordMatch[1]) : 0;
    analysis.checks.wordCount = (wordCount >= 800 && wordCount <= 1000) ? '✅' : '❌';
    analysis.wordCount = wordCount;
    if (wordCount < 800 || wordCount > 1000) analysis.passed = false;
    
    // Check 4: Token usage reasonable
    const tokens = movie.tokens.split('+');
    const outputTokens = parseInt(tokens[1]);
    analysis.checks.tokenUsage = (outputTokens >= 2000 && outputTokens <= 3000) ? '✅' : '❌';
    analysis.outputTokens = outputTokens;
    if (outputTokens < 2000 || outputTokens > 3000) analysis.passed = false;
    
    // Check 5: Cost reasonable
    analysis.checks.cost = (movie.cost >= 0.03 && movie.cost <= 0.05) ? '✅' : '❌';
    if (movie.cost < 0.03 || movie.cost > 0.05) analysis.passed = false;
    
    // Summary
    console.log(`   Format: ${analysis.checks.format} | Parse: ${analysis.checks.parsePreview} | Words: ${analysis.checks.wordCount} (${wordCount}) | Tokens: ${analysis.checks.tokenUsage} (${outputTokens}) | Cost: ${analysis.checks.cost} ($${movie.cost.toFixed(4)})`);
    
    if (analysis.passed) {
      validationResults.passed++;
    } else {
      validationResults.failed++;
    }
    
    validationResults.details.push(analysis);
    console.log('');
  }

  console.log('📈 VALIDATION SUMMARY');
  console.log('====================');
  console.log(`✅ Passed: ${validationResults.passed}/${validationResults.total}`);
  console.log(`❌ Failed: ${validationResults.failed}/${validationResults.total}`);
  console.log(`📊 Success Rate: ${((validationResults.passed/validationResults.total)*100).toFixed(1)}%`);

  console.log('');
  console.log('📊 STATISTICS');
  console.log('=============');
  const wordCounts = validationResults.details.map(d => d.wordCount);
  const avgWords = wordCounts.reduce((a,b) => a+b, 0) / wordCounts.length;
  console.log(`📝 Average word count: ${avgWords.toFixed(0)} words`);
  console.log(`📝 Word count range: ${Math.min(...wordCounts)} - ${Math.max(...wordCounts)} words`);

  const outputTokens = validationResults.details.map(d => d.outputTokens);
  const avgTokens = outputTokens.reduce((a,b) => a+b, 0) / outputTokens.length;
  console.log(`🎯 Average output tokens: ${avgTokens.toFixed(0)} tokens`);

  const costs = results.successful.map(m => m.cost);
  const avgCost = costs.reduce((a,b) => a+b, 0) / costs.length;
  console.log(`💰 Average cost per analysis: $${avgCost.toFixed(4)}`);
  
  console.log('');
  console.log('⚡ PROMPT CACHING VERIFICATION');
  console.log('=============================');
  
  // Check if prompt caching is configured
  try {
    const builderContent = readFileSync('./lib/prompts/builder.js', 'utf8');
    const coreContent = readFileSync('./lib/prompts/core.js', 'utf8');
    
    const hasCacheConfig = coreContent.includes('cache_control: { type:');
    const builderUsesCaching = builderContent.includes('...CACHE_CONFIG');
    
    console.log(`📋 Cache config defined: ${hasCacheConfig ? '✅' : '❌'}`);
    console.log(`📋 Builder uses caching: ${builderUsesCaching ? '✅' : '❌'}`);
    
    if (hasCacheConfig && builderUsesCaching) {
      console.log(`💡 Estimated cache savings: ~90% cost reduction on repeated prompts`);
      console.log(`💡 Expected cost without caching: ~$${(avgCost * 10).toFixed(4)} per analysis`);
    } else {
      console.log(`⚠️  Prompt caching not fully configured - missing cost savings`);
    }
    
  } catch (error) {
    console.log(`❌ Could not verify prompt caching: ${error.message}`);
  }

  if (validationResults.failed > 0) {
    console.log('');
    console.log('❌ FAILED VALIDATIONS');
    console.log('====================');
    validationResults.details.filter(d => !d.passed).forEach(d => {
      const failedChecks = Object.entries(d.checks).filter(([k,v]) => v === '❌').map(([k]) => k);
      console.log(`${d.title}: ${failedChecks.join(', ')}`);
    });
  }

  console.log('');
  console.log('✅ Validation complete - no code modifications made');

} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}