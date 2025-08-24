#!/usr/bin/env node

/**
 * Create Static Files with Real Movie Links
 * 
 * Uses backup data but processes it through the linking system
 * to create HTML links for movies that exist in the database.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processAnalysisContent } from './lib/movie-analysis-linker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_FILE = '/Users/josh.petersen/moviegenius/analyses-test-2025-08-18T23-14-16-947Z.json';
const OUTPUT_DIR = path.join(__dirname, 'public', 'data', 'movies');

async function loadBackupData() {
  console.log('📂 Loading backup data...');
  
  const backupContent = fs.readFileSync(BACKUP_FILE, 'utf-8');
  const backupData = JSON.parse(backupContent);
  
  // Look for entries that are likely to have movie references that exist in our database
  // Focus on popular/classic movies that are more likely to be in the database
  const goodCandidates = backupData.analyses.filter(analysis => {
    try {
      const content = JSON.parse(analysis.claude_response.raw_content);
      const title = content.metadata?.title || '';
      
      // Look for classic/popular movies more likely to be in database
      const popularTitles = [
        'Star Wars', 'The Matrix', 'Casablanca', 'The Godfather', 
        'Citizen Kane', 'Apocalypse Now', 'Taxi Driver', 'Goodfellas',
        'Pulp Fiction', 'The Shining', 'Vertigo', 'Psycho'
      ];
      
      return popularTitles.some(popular => 
        title.toLowerCase().includes(popular.toLowerCase())
      );
    } catch (e) {
      return false;
    }
  });
  
  console.log(`✅ Found ${goodCandidates.length} analyses of popular movies`);
  
  // If no popular movies found, take first 10
  const finalSelection = goodCandidates.length > 0 
    ? goodCandidates.slice(0, 5)
    : backupData.analyses.slice(0, 10);
    
  console.log(`📽️  Selected ${finalSelection.length} analyses for processing`);
  
  return finalSelection;
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

async function createStaticMovieEntryWithLinks(analysis, index) {
  const parsedContent = parseAnalysisContent(analysis.claude_response);
  
  if (!parsedContent) {
    return null;
  }
  
  // Extract movie metadata
  const metadata = parsedContent.metadata || {};
  const keyElements = parsedContent.keyElements || {};
  
  const movieTitle = metadata.title || keyElements.title || `Test Movie ${index + 1}`;
  
  console.log(`🎬 Processing: ${movieTitle} (${metadata.year || keyElements.releaseYear || '????'})`);
  
  // Process content sections with linking
  const sections = [];
  
  if (parsedContent.content && Array.isArray(parsedContent.content)) {
    for (let i = 0; i < parsedContent.content.length; i++) {
      const section = parsedContent.content[i];
      
      if (section.text) {
        console.log(`   📝 Processing section ${i + 1}: ${section.text.substring(0, 60)}...`);
        
        // Process this section through the linking system
        const processedText = await processAnalysisContent(
          section.text,
          movieTitle, // Current movie to avoid self-references
          `${movieTitle} section ${i + 1}`
        );
        
        sections.push({
          type: 'text',
          content: processedText // This should now contain HTML links if matches found
        });
        
        // Check if links were created
        const hasLinks = processedText.includes('<a href=');
        const linkCount = hasLinks ? (processedText.match(/<a href=/g) || []).length : 0;
        
        console.log(`   🔗 Section ${i + 1}: ${linkCount} link(s) created`);
      }
    }
  }
  
  // Create movie entry
  const movieEntry = {
    title: movieTitle,
    year: metadata.year || keyElements.releaseYear || 2023,
    tmdbId: `linked_${analysis.id.slice(0, 8)}`,
    hasAnalysis: true,
    sections: sections,
    director: keyElements.director || 'Unknown Director',
    genre: keyElements.genre || 'Drama',
    overview: sections[0]?.content?.replace(/<[^>]*>/g, '').substring(0, 200) + '...' || 'No overview available',
    processedAt: new Date().toISOString(),
    source: 'backup_with_linking_processing'
  };
  
  // Check total links across all sections
  const totalLinks = sections.reduce((count, section) => {
    return count + (section.content.match(/<a href=/g) || []).length;
  }, 0);
  
  console.log(`   ✅ Total links in movie: ${totalLinks}`);
  
  return { movieEntry, linkCount: totalLinks };
}

async function generateStaticFiles(analyses) {
  console.log(`\n🏭 Generating static files with linking for ${analyses.length} movies...\n`);
  
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  
  const results = {
    created: 0,
    failed: 0,
    totalLinks: 0,
    files: []
  };
  
  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i];
    
    try {
      const result = await createStaticMovieEntryWithLinks(analysis, i);
      
      if (!result) {
        console.log(`   ⚠️  Skipped - no valid content`);
        results.failed++;
        continue;
      }
      
      const { movieEntry, linkCount } = result;
      
      // Create filename
      const filename = `${movieEntry.tmdbId}.json`;
      const filePath = path.join(OUTPUT_DIR, filename);
      
      // Write static file
      const jsonContent = JSON.stringify(movieEntry, null, 2);
      await fs.promises.writeFile(filePath, jsonContent);
      
      console.log(`   📄 Created: ${filename} (${linkCount} links)`);
      
      results.created++;
      results.totalLinks += linkCount;
      results.files.push({
        filename,
        title: movieEntry.title,
        year: movieEntry.year,
        tmdbId: movieEntry.tmdbId,
        sections: movieEntry.sections.length,
        linkCount
      });
      
    } catch (error) {
      console.error(`   ❌ Failed to process analysis ${i + 1}:`, error.message);
      results.failed++;
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 Static File Generator with Real Movie Links');
  console.log('===============================================\n');
  
  try {
    // Load backup data
    const analyses = await loadBackupData();
    
    // Generate static files with linking
    const results = await generateStaticFiles(analyses);
    
    // Summary
    console.log('\n📊 GENERATION COMPLETE');
    console.log('======================');
    console.log(`✅ Files created: ${results.created}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`🔗 Total links created: ${results.totalLinks}`);
    console.log(`📊 Average links per file: ${(results.totalLinks / results.created).toFixed(1)}`);
    
    const filesWithLinks = results.files.filter(f => f.linkCount > 0);
    console.log(`🎯 Files with links: ${filesWithLinks.length}/${results.created}`);
    
    if (results.totalLinks > 0) {
      console.log('\n🎉 SUCCESS! Generated static files with HTML links!');
      console.log('These files should now render clickable movie references.');
      console.log('\nTest at: http://localhost:3000/test-static');
      
      // Show sample files with most links
      const topFiles = results.files
        .sort((a, b) => b.linkCount - a.linkCount)
        .slice(0, 3);
        
      console.log('\n🏆 Top files with links:');
      topFiles.forEach(file => {
        console.log(`   ${file.filename}: ${file.linkCount} links`);
      });
    } else {
      console.log('\n⚠️  No links were created - movies may not exist in database yet.');
    }
    
  } catch (error) {
    console.error('\n💥 Generation failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);