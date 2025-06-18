#!/usr/bin/env node

/**
 * Episode Migration Test Script
 * 
 * Tests the episode migration and database functionality to ensure
 * episodes can be properly stored and retrieved from the database.
 * 
 * Usage:
 *   node scripts/test-episode-migration.js
 */

import { EpisodeService } from '../lib/supabase.js';
import geniusConfig from '../data/genius-config.json' assert { type: 'json' };

/**
 * Test episode database operations
 */
async function testEpisodeOperations() {
  console.log('🧪 Testing Episode Database Operations');
  console.log('');
  
  try {
    // Test 1: Check if we can query episodes
    console.log('📋 Test 1: Querying existing episodes...');
    const allEpisodes = await EpisodeService.getAllEpisodes();
    console.log(`   Found ${allEpisodes.length} episodes in database`);
    
    if (allEpisodes.length > 0) {
      const sampleEpisode = allEpisodes[0];
      console.log(`   Sample episode: ${sampleEpisode.theme_id}-${sampleEpisode.series_id}-${sampleEpisode.episode_id} - "${sampleEpisode.title}"`);
      console.log(`   Content sections: ${sampleEpisode.content?.sections?.length || 0}`);
      console.log(`   Locked: ${sampleEpisode.locked}`);
    }
    console.log('   ✅ Episode querying works');
    console.log('');
    
    // Test 2: Test specific episode retrieval
    console.log('📋 Test 2: Retrieving specific episode (1-1-1)...');
    const specificEpisode = await EpisodeService.getEpisode(1, 1, 1);
    if (specificEpisode) {
      console.log(`   Found: "${specificEpisode.title}" - "${specificEpisode.subtitle}"`);
      console.log(`   Content opener: ${specificEpisode.content?.opener?.substring(0, 100)}...`);
      console.log('   ✅ Specific episode retrieval works');
    } else {
      console.log('   ⚠️  Episode 1-1-1 not found in database');
    }
    console.log('');
    
    // Test 3: Test series episodes retrieval
    console.log('📋 Test 3: Retrieving episodes for theme 1, series 1...');
    const seriesEpisodes = await EpisodeService.getEpisodesBySeries(1, 1);
    console.log(`   Found ${seriesEpisodes.length} episodes in series`);
    seriesEpisodes.slice(0, 3).forEach(ep => {
      console.log(`   - Episode ${ep.episode_id}: ${ep.title}`);
    });
    console.log('   ✅ Series episode retrieval works');
    console.log('');
    
    // Test 4: Test theme episodes retrieval
    console.log('📋 Test 4: Retrieving episodes for theme 1...');
    const themeEpisodes = await EpisodeService.getEpisodesByTheme(1);
    console.log(`   Found ${themeEpisodes.length} episodes in theme`);
    
    // Group by series
    const episodesBySeries = themeEpisodes.reduce((acc, ep) => {
      if (!acc[ep.series_id]) acc[ep.series_id] = [];
      acc[ep.series_id].push(ep);
      return acc;
    }, {});
    
    Object.keys(episodesBySeries).forEach(seriesId => {
      console.log(`   - Series ${seriesId}: ${episodesBySeries[seriesId].length} episodes`);
    });
    console.log('   ✅ Theme episode retrieval works');
    console.log('');
    
    // Test 5: Test episode search
    console.log('📋 Test 5: Searching episodes for "noir"...');
    const searchResults = await EpisodeService.searchEpisodes('noir');
    console.log(`   Found ${searchResults.length} episodes matching "noir"`);
    searchResults.slice(0, 3).forEach(ep => {
      console.log(`   - ${ep.theme_id}-${ep.series_id}-${ep.episode_id}: ${ep.title}`);
    });
    console.log('   ✅ Episode search works');
    console.log('');
    
    // Test 6: Test lock functionality (non-destructive)
    if (specificEpisode) {
      console.log('📋 Test 6: Testing lock functionality...');
      const isLocked = await EpisodeService.isEpisodeLocked(1, 1, 1);
      console.log(`   Episode 1-1-1 lock status: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
      console.log('   ✅ Lock status check works');
    }
    console.log('');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Validate episode content structure
 */
function validateEpisodeContent(episode) {
  const issues = [];
  
  if (!episode.content) {
    issues.push('Missing content');
    return issues;
  }
  
  if (!episode.content.sections || !Array.isArray(episode.content.sections)) {
    issues.push('Missing or invalid sections array');
  }
  
  if (episode.content.sections) {
    episode.content.sections.forEach((section, index) => {
      if (!section.type) {
        issues.push(`Section ${index}: missing type`);
      }
      
      if (section.type === 'text' && !section.content) {
        issues.push(`Section ${index}: text section missing content`);
      }
      
      if (section.type === 'movies' && (!section.movies || !Array.isArray(section.movies))) {
        issues.push(`Section ${index}: movies section missing movies array`);
      }
    });
  }
  
  return issues;
}

/**
 * Test episode content integrity
 */
async function testEpisodeContentIntegrity() {
  console.log('🔍 Testing Episode Content Integrity');
  console.log('');
  
  try {
    const allEpisodes = await EpisodeService.getAllEpisodes();
    
    if (allEpisodes.length === 0) {
      console.log('   ⚠️  No episodes found to test');
      return true;
    }
    
    let validEpisodes = 0;
    let totalIssues = 0;
    
    for (const episode of allEpisodes.slice(0, 10)) { // Test first 10 episodes
      const issues = validateEpisodeContent(episode);
      
      if (issues.length === 0) {
        validEpisodes++;
        console.log(`   ✅ ${episode.theme_id}-${episode.series_id}-${episode.episode_id}: Valid`);
      } else {
        totalIssues += issues.length;
        console.log(`   ⚠️  ${episode.theme_id}-${episode.series_id}-${episode.episode_id}: ${issues.length} issues`);
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
    }
    
    console.log('');
    console.log(`📊 Content Integrity Summary:`);
    console.log(`   Valid episodes: ${validEpisodes}/${Math.min(allEpisodes.length, 10)}`);
    console.log(`   Total issues: ${totalIssues}`);
    
    return totalIssues === 0;
    
  } catch (error) {
    console.error('❌ Content integrity test failed:', error);
    return false;
  }
}

/**
 * Compare episode count with config
 */
async function compareWithConfig() {
  console.log('📊 Comparing Database with Configuration');
  console.log('');
  
  try {
    // Count episodes in config
    let configEpisodeCount = 0;
    const configByTheme = {};
    
    Object.values(geniusConfig.themes).forEach(theme => {
      configByTheme[theme.id] = {};
      theme.series.forEach(series => {
        configByTheme[theme.id][series.id] = series.episodes.length;
        configEpisodeCount += series.episodes.length;
      });
    });
    
    // Count episodes in database
    const dbEpisodes = await EpisodeService.getAllEpisodes();
    const dbByTheme = {};
    
    dbEpisodes.forEach(ep => {
      if (!dbByTheme[ep.theme_id]) dbByTheme[ep.theme_id] = {};
      if (!dbByTheme[ep.theme_id][ep.series_id]) dbByTheme[ep.theme_id][ep.series_id] = 0;
      dbByTheme[ep.theme_id][ep.series_id]++;
    });
    
    console.log(`   Configuration episodes: ${configEpisodeCount}`);
    console.log(`   Database episodes: ${dbEpisodes.length}`);
    console.log('');
    
    // Compare by theme and series
    Object.keys(configByTheme).forEach(themeId => {
      console.log(`   Theme ${themeId}:`);
      Object.keys(configByTheme[themeId]).forEach(seriesId => {
        const configCount = configByTheme[themeId][seriesId];
        const dbCount = dbByTheme[themeId]?.[seriesId] || 0;
        const status = configCount === dbCount ? '✅' : '⚠️';
        console.log(`     Series ${seriesId}: Config(${configCount}) DB(${dbCount}) ${status}`);
      });
    });
    
    return dbEpisodes.length === configEpisodeCount;
    
  } catch (error) {
    console.error('❌ Config comparison failed:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Episode Migration Tests');
  console.log('');
  
  const tests = [
    { name: 'Database Operations', fn: testEpisodeOperations },
    { name: 'Content Integrity', fn: testEpisodeContentIntegrity },
    { name: 'Config Comparison', fn: compareWithConfig }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`🔬 Running ${test.name} Test...`);
    const passed = await test.fn();
    if (passed) {
      passedTests++;
      console.log(`✅ ${test.name} Test PASSED`);
    } else {
      console.log(`❌ ${test.name} Test FAILED`);
    }
    console.log('');
  }
  
  console.log('📋 Test Summary:');
  console.log(`   Passed: ${passedTests}/${tests.length}`);
  console.log(`   Status: ${passedTests === tests.length ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  
  return passedTests === tests.length;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

export { runTests, testEpisodeOperations, testEpisodeContentIntegrity, compareWithConfig };