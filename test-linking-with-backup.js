#!/usr/bin/env node

/**
 * Test Linking with Backup Data - Phase 1 Proof of Concept
 * 
 * This script tests the linking approach using the backup file instead of production database.
 * Processes a small number of entries to verify the approach works before scaling up.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processAnalysisContent } from './lib/movie-analysis-linker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_FILE = '/Users/josh.petersen/moviegenius/analyses-test-2025-08-18T23-14-16-947Z.json';
const TEST_COUNT = 10; // Start with just 10 entries for proof of concept

async function loadBackupData() {
  console.log('📂 Loading backup data...');
  
  try {
    const backupContent = fs.readFileSync(BACKUP_FILE, 'utf-8');
    const backupData = JSON.parse(backupContent);
    
    console.log(`✅ Loaded ${backupData.total_analyses} analyses from backup`);
    console.log(`📅 Backup created: ${backupData.created}`);
    
    return backupData.analyses.slice(0, TEST_COUNT);
  } catch (error) {
    console.error('❌ Failed to load backup data:', error.message);
    throw error;
  }
}

function extractTextFromAnalysis(claudeResponse) {
  // Extract text content from the various analysis formats
  const textSections = [];
  
  try {
    if (claudeResponse.raw_content) {
      let parsedContent;
      
      if (typeof claudeResponse.raw_content === 'string') {
        parsedContent = JSON.parse(claudeResponse.raw_content);
      } else {
        parsedContent = claudeResponse.raw_content;
      }
      
      // Extract text from content sections
      if (parsedContent.content && Array.isArray(parsedContent.content)) {
        for (const section of parsedContent.content) {
          if (section.text) {
            textSections.push(section.text);
          }
        }
      }
    }
    
    return textSections;
  } catch (error) {
    console.warn('⚠️  Failed to parse analysis content:', error.message);
    return [];
  }
}

async function testLinkingOnEntry(entry, index) {
  console.log(`\n🎬 Processing entry ${index + 1}/${TEST_COUNT}`);
  
  try {
    const textSections = extractTextFromAnalysis(entry.claude_response);
    
    if (textSections.length === 0) {
      console.log(`   ⚠️  No text content found in entry ${index + 1}`);
      return null;
    }
    
    console.log(`   📝 Found ${textSections.length} text section(s)`);
    
    // Find section with movie references (look for ** patterns)
    let sectionWithMovies = null;
    let sectionIndex = -1;
    
    for (let i = 0; i < textSections.length; i++) {
      const text = textSections[i];
      if (text.includes('**') && (text.includes('(19') || text.includes('(20'))) {
        sectionWithMovies = text;
        sectionIndex = i;
        break;
      }
    }
    
    if (!sectionWithMovies) {
      console.log(`   ℹ️  No movie references found in entry ${index + 1}`);
      return {
        original: textSections[0].substring(0, 300),
        processed: textSections[0].substring(0, 300),
        hasLinks: false,
        linkCount: 0
      };
    }
    
    console.log(`   🎬 Found movie references in section ${sectionIndex + 1}`);
    console.log(`   🔍 Sample text: "${sectionWithMovies.substring(0, 100)}..."`);
    
    // Use the movie analysis linker to process the content
    const processedContent = await processAnalysisContent(
      sectionWithMovies,
      'Test Movie', // We don't have the actual movie title in this context
      `Test entry ${index + 1} section ${sectionIndex + 1}`
    );
    
    // Check if any links were created
    const hasLinks = processedContent.includes('<a href=');
    
    console.log(`   ${hasLinks ? '✅' : '❌'} Links created: ${hasLinks}`);
    
    if (hasLinks) {
      // Count the number of links
      const linkCount = (processedContent.match(/<a href=/g) || []).length;
      console.log(`   🔗 Created ${linkCount} link(s)`);
      
      // Show a sample of the processed content
      const sampleProcessed = processedContent.substring(0, 200);
      console.log(`   💡 Sample processed: "${sampleProcessed}..."`);
    }
    
    return {
      original: sectionWithMovies,
      processed: processedContent,
      hasLinks,
      linkCount: hasLinks ? (processedContent.match(/<a href=/g) || []).length : 0
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to process entry ${index + 1}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Testing Movie Analysis Linking with Backup Data');
  console.log('==================================================\n');
  
  try {
    // Load test data
    const testEntries = await loadBackupData();
    
    console.log(`\n🧪 Testing linking on ${testEntries.length} entries...\n`);
    
    const results = [];
    
    // Process each test entry
    for (let i = 0; i < testEntries.length; i++) {
      const result = await testLinkingOnEntry(testEntries[i], i);
      if (result) {
        results.push(result);
      }
      
      // Small delay to avoid overwhelming any APIs
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    console.log('\n📊 RESULTS SUMMARY');
    console.log('==================');
    console.log(`📁 Processed: ${results.length} entries`);
    console.log(`🔗 With links: ${results.filter(r => r.hasLinks).length}`);
    console.log(`📈 Success rate: ${((results.filter(r => r.hasLinks).length / results.length) * 100).toFixed(1)}%`);
    
    const totalLinks = results.reduce((sum, r) => sum + r.linkCount, 0);
    console.log(`🎯 Total links created: ${totalLinks}`);
    console.log(`💰 Average links per entry: ${(totalLinks / results.length).toFixed(1)}`);
    
    if (results.filter(r => r.hasLinks).length > 0) {
      console.log('\n✅ PROOF OF CONCEPT SUCCESSFUL!');
      console.log('The linking system works with the backup data.');
      console.log('Ready to proceed with static file generation.');
    } else {
      console.log('\n❌ No links were created. Need to investigate further.');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}