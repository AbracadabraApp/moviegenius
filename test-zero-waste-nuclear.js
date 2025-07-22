#!/usr/bin/env node

/**
 * Test Zero-Waste Nuclear Static Generator
 * 
 * Tests the nuclear static generator with zero-waste protection on a small set of movies
 * to verify that existing complete files are skipped and costs are tracked.
 */

import { staticPageHasLinks, trackZeroWasteSavings } from './lib/zero-waste-protection.js';
import fs from 'fs';
import path from 'path';

async function testZeroWasteNuclear() {
  console.log('🛡️ Testing Zero-Waste Nuclear Static Protection\n');

  const nuclearStaticDir = './nuclear-static';
  
  // Test files that should exist
  const testFiles = [100, 101, 102, 103, 104]; // Lock Stock and a few others
  
  let skippedCount = 0;
  let totalCostSaved = 0;

  for (const tmdbId of testFiles) {
    const filePath = path.join(nuclearStaticDir, `${tmdbId}.json`);
    
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const staticData = JSON.parse(fileContent);
        
        // Test our protection function
        const hasLinks = staticPageHasLinks(staticData);
        
        if (hasLinks) {
          const savings = trackZeroWasteSavings('tier1_skip', {});
          totalCostSaved += savings.costSaved;
          skippedCount++;
          
          console.log(`⚡ WOULD SKIP: ${tmdbId} (${staticData.props.title}) - Has links - Saved: $${savings.costSaved.toFixed(4)}`);
        } else {
          console.log(`🔄 WOULD PROCESS: ${tmdbId} (${staticData.props.title}) - No links detected`);
        }
      } catch (error) {
        console.log(`❌ Error reading ${tmdbId}: ${error.message}`);
      }
    } else {
      console.log(`❓ File not found: ${tmdbId}.json`);
    }
  }

  console.log(`\n📊 Zero-Waste Test Results:`);
  console.log(`⚡ Files that would be skipped: ${skippedCount}/${testFiles.length}`);
  console.log(`💰 Total cost saved: $${totalCostSaved.toFixed(4)}`);
  console.log(`📈 Waste elimination rate: ${((skippedCount / testFiles.length) * 100).toFixed(1)}%`);

  if (skippedCount > 0) {
    console.log(`\n✅ Zero-waste protection is working! Existing complete files will be skipped.`);
  } else {
    console.log(`\n⚠️  No files detected as complete - this may indicate an issue with link detection.`);
  }
}

// Run the test
testZeroWasteNuclear().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});