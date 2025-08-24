#!/usr/bin/env node

/**
 * Generate Test Movies with Links
 * 
 * Scalable script to generate 5, 50, 100, or 500 movies with links
 * Uses test linking system (no database required)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  processAnalysisContent, 
  getAnalysesFromBackup,
  initializeIndexes,
  getMovieIndex,
  getPersonIndex
} from '../lib/test-linking-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'test-movies');

async function parseAnalysisContent(claudeResponse) {
  try {
    let parsedContent;
    
    if (typeof claudeResponse.raw_content === 'string') {
      parsedContent = JSON.parse(claudeResponse.raw_content);
    } else {
      parsedContent = claudeResponse.raw_content;
    }
    
    return parsedContent;
  } catch (error) {
    console.warn('⚠️ Failed to parse analysis content:', error.message);
    return null;
  }
}

async function createTestMovieEntry(analysis, index) {
  const parsedContent = await parseAnalysisContent(analysis.claude_response);
  
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
        
        // Process this section through the test linking system
        const processedText = await processAnalysisContent(
          section.text,
          movieTitle, // Current movie to avoid self-references
          `${movieTitle} section ${i + 1}`,
          analysis.claude_response.raw_content // For contributor extraction
        );
        
        sections.push({
          type: 'text',
          content: processedText
        });
        
        // Check if links were created
        const hasLinks = processedText.includes('<a href=');
        const linkCount = hasLinks ? (processedText.match(/<a href=/g) || []).length : 0;
        
        console.log(`   🔗 Section ${i + 1}: ${linkCount} link(s) created`);
      } else if (section.type === 'subhead' && section.content) {
        // Handle subheads
        sections.push({
          type: 'subhead',
          content: section.content
        });
      }
    }
  }
  
  // Extract featured movies and explore topics
  const featuredMovies = parsedContent.featuredMovies || [];
  const exploreTopics = parsedContent.exploreTopics || [];
  const moreIdeas = parsedContent.moreIdeas || [];
  const whyWatch = parsedContent.whyWatch || [];
  
  // Create movie entry
  const movieEntry = {
    title: movieTitle,
    year: metadata.year || keyElements.releaseYear || 2023,
    tmdbId: `test_${analysis.id.slice(0, 8)}`,
    hasAnalysis: true,
    sections: sections,
    featuredMovies: featuredMovies,
    exploreTopics: exploreTopics,
    moreIdeas: moreIdeas,
    whyWatch: whyWatch,
    director: keyElements.director || 'Unknown Director',
    genre: keyElements.genre || 'Drama',
    overview: sections[0]?.content?.replace(/<[^>]*>/g, '').substring(0, 200) + '...' || 'No overview available',
    poster_url: metadata.poster_url || '/images/placeholder-poster.jpg',
    keyElements: keyElements,
    processedAt: new Date().toISOString(),
    source: 'test_linking_system'
  };
  
  // Check total links across all sections
  const totalLinks = sections.reduce((count, section) => {
    return count + (section.content.match(/<a href=/g) || []).length;
  }, 0);
  
  console.log(`   ✅ Total links in movie: ${totalLinks}`);
  
  return { movieEntry, linkCount: totalLinks };
}

async function generateTestMovies(count = 5) {
  console.log(`\n🏭 Generating ${count} test movies with links...\n`);
  
  // Initialize the test linking system
  await initializeIndexes();
  
  // Get analyses from backup
  const analyses = await getAnalysesFromBackup(count);
  
  // Create output directory
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
      const result = await createTestMovieEntry(analysis, i);
      
      if (!result) {
        console.log(`   ⚠️ Skipped - no valid content`);
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
  const count = parseInt(process.argv[2]) || 5;
  
  console.log('🚀 Test Movie Generator with Links');
  console.log('==================================');
  console.log(`Generating: ${count} movies\n`);
  
  try {
    // Generate test movies
    const results = await generateTestMovies(count);
    
    // Get index stats
    const movieIndex = getMovieIndex();
    const personIndex = getPersonIndex();
    
    // Summary
    console.log('\n📊 GENERATION COMPLETE');
    console.log('======================');
    console.log(`✅ Files created: ${results.created}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`🔗 Total links created: ${results.totalLinks}`);
    console.log(`📊 Average links per file: ${(results.totalLinks / results.created).toFixed(1)}`);
    console.log(`🎬 Movie index size: ${movieIndex.length}`);
    console.log(`👥 Person index size: ${personIndex.length}`);
    
    const filesWithLinks = results.files.filter(f => f.linkCount > 0);
    console.log(`🎯 Files with links: ${filesWithLinks.length}/${results.created}`);
    
    if (results.totalLinks > 0) {
      console.log('\n🎉 SUCCESS! Generated test movies with HTML links!');
      console.log('These files can be used for complete end-to-end testing.');
      
      // Show sample files with most links
      const topFiles = results.files
        .sort((a, b) => b.linkCount - a.linkCount)
        .slice(0, Math.min(5, results.files.length));
        
      console.log('\n🏆 Top files with links:');
      topFiles.forEach(file => {
        console.log(`   ${file.filename}: ${file.title} (${file.year}) - ${file.linkCount} links`);
      });
      
      console.log(`\n📂 Files saved to: ${OUTPUT_DIR}`);
      console.log('\n🧪 Ready for end-to-end testing!');
    } else {
      console.log('\n⚠️ No links were created - check test linking system.');
    }
    
  } catch (error) {
    console.error('\n💥 Generation failed:', error.message);
    process.exit(1);
  }
}

// Allow different counts: node generate-test-movies.js [5|50|100|500]
main().catch(console.error);