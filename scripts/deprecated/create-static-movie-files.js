#!/usr/bin/env node

/**
 * Static Movie File Generator - Phase 1 Proof of Concept
 * 
 * Creates static JSON files from backup data that can be served directly
 * by a simple component, bypassing all runtime complexity.
 * 
 * Output: /public/data/movies/{tmdb_id}.json files ready for direct serving
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_FILE = '/Users/josh.petersen/moviegenius/analyses-test-2025-08-18T23-14-16-947Z.json';
const OUTPUT_DIR = path.join(__dirname, 'public', 'data', 'movies');
const TEST_COUNT = 10; // Start with 10 for proof of concept

async function ensureOutputDirectory() {
  try {
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('❌ Failed to create output directory:', error.message);
    throw error;
  }
}

async function loadBackupData() {
  console.log('📂 Loading backup data...');
  
  try {
    const backupContent = fs.readFileSync(BACKUP_FILE, 'utf-8');
    const backupData = JSON.parse(backupContent);
    
    console.log(`✅ Loaded ${backupData.total_analyses} analyses from backup`);
    
    // Take first TEST_COUNT entries for proof of concept
    return backupData.analyses.slice(0, TEST_COUNT);
  } catch (error) {
    console.error('❌ Failed to load backup data:', error.message);
    throw error;
  }
}

function parseAnalysisContent(claudeResponse) {
  try {
    let parsedContent;
    
    if (typeof claudeResponse.raw_content === 'string') {
      parsedContent = JSON.parse(claudeResponse.raw_content);
    } else {
      parsedContent = claudeResponse.raw_content;
    }
    
    return parsedContent;
  } catch (error) {
    console.warn('⚠️  Failed to parse analysis content:', error.message);
    return null;
  }
}

function createSimpleMovieEntry(analysis, index) {
  const parsedContent = parseAnalysisContent(analysis.claude_response);
  
  if (!parsedContent) {
    return null;
  }
  
  // Extract movie metadata
  const metadata = parsedContent.metadata || {};
  const keyElements = parsedContent.keyElements || {};
  
  // Convert content sections to simple text sections
  const sections = [];
  
  if (parsedContent.content && Array.isArray(parsedContent.content)) {
    for (const section of parsedContent.content) {
      if (section.text) {
        sections.push({
          type: 'text',
          content: section.text
        });
      }
    }
  }
  
  // Create a simple movie entry structure
  const movieEntry = {
    // Movie basic info (use metadata and keyElements)
    title: metadata.title || keyElements.title || `Test Movie ${index + 1}`,
    year: metadata.year || keyElements.releaseYear || 2023,
    tmdbId: `test_${analysis.id.slice(0, 8)}`, // Create fake TMDB ID from analysis ID
    
    // Analysis content
    hasAnalysis: true,
    sections: sections,
    
    // Additional metadata
    director: keyElements.director || 'Unknown Director',
    genre: keyElements.genre || 'Drama',
    overview: sections[0]?.content?.substring(0, 200) + '...' || 'No overview available',
    
    // Processed metadata
    processedAt: new Date().toISOString(),
    source: 'backup_static_generation'
  };
  
  return movieEntry;
}

async function generateStaticFiles(analyses) {
  console.log(`\n🏭 Generating static files for ${analyses.length} movies...\n`);
  
  const results = {
    created: 0,
    failed: 0,
    files: []
  };
  
  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i];
    
    try {
      console.log(`📄 Processing analysis ${i + 1}/${analyses.length}`);
      
      const movieEntry = createSimpleMovieEntry(analysis, i);
      
      if (!movieEntry) {
        console.log(`   ⚠️  Skipped - no valid content`);
        results.failed++;
        continue;
      }
      
      console.log(`   🎬 "${movieEntry.title}" (${movieEntry.year})`);
      console.log(`   📝 ${movieEntry.sections.length} text section(s)`);
      
      // Create filename from tmdbId
      const filename = `${movieEntry.tmdbId}.json`;
      const filePath = path.join(OUTPUT_DIR, filename);
      
      // Write static file
      const jsonContent = JSON.stringify(movieEntry, null, 2);
      await fs.promises.writeFile(filePath, jsonContent);
      
      console.log(`   ✅ Created: ${filename}`);
      
      results.created++;
      results.files.push({
        filename,
        title: movieEntry.title,
        year: movieEntry.year,
        tmdbId: movieEntry.tmdbId,
        sections: movieEntry.sections.length
      });
      
    } catch (error) {
      console.error(`   ❌ Failed to process analysis ${i + 1}:`, error.message);
      results.failed++;
    }
  }
  
  return results;
}

function generateManifest(results) {
  const manifest = {
    generated: new Date().toISOString(),
    total_files: results.created,
    files: results.files,
    source: 'Phase 1 Proof of Concept - Static File Generator'
  };
  
  const manifestPath = path.join(OUTPUT_DIR, '_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`\n📋 Created manifest: ${manifestPath}`);
  return manifest;
}

async function main() {
  console.log('🚀 Static Movie File Generator - Phase 1 Proof of Concept');
  console.log('=========================================================\n');
  
  try {
    // Setup
    await ensureOutputDirectory();
    const analyses = await loadBackupData();
    
    // Generate static files
    const results = await generateStaticFiles(analyses);
    
    // Create manifest
    const manifest = generateManifest(results);
    
    // Summary
    console.log('\n📊 GENERATION COMPLETE');
    console.log('======================');
    console.log(`✅ Files created: ${results.created}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log(`📋 Manifest: _manifest.json`);
    
    if (results.created > 0) {
      console.log('\n🎯 PROOF OF CONCEPT SUCCESSFUL!');
      console.log('Static movie files are ready for serving.');
      console.log('\nNext steps:');
      console.log('1. Create simple MovieEntryRenderer component');
      console.log('2. Test serving these files via Next.js pages');
      console.log('3. Verify <100ms load times');
    } else {
      console.log('\n❌ No files were created. Check the analysis data.');
    }
    
  } catch (error) {
    console.error('\n💥 Generation failed:', error.message);
    process.exit(1);
  }
}

// Run the generator
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}