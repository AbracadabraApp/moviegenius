#!/usr/bin/env node

/**
 * Static File Generator with Processed Links
 * 
 * Creates static files from the Railway database AFTER linking has been processed.
 * This will include actual HTML links instead of raw **Movie Title** (Year) text.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const OUTPUT_DIR = path.join(__dirname, 'public', 'data', 'movies');
const TEST_COUNT = 5; // Generate 5 files with processed links

// Railway PostgreSQL connection
function getRailwayPool() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Pool({
    connectionString: dbUrl,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
}

async function fetchProcessedAnalyses(limit = TEST_COUNT) {
  const pool = getRailwayPool();
  
  try {
    console.log('🔍 Fetching processed analyses from Railway database...');
    
    // Query for analyses that have been processed with links
    const query = `
      SELECT 
        ma.id as analysis_id,
        m.title,
        m.year,
        m.tmdb_id,
        ma.claude_response
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.analysis_type = 'page_analysis'
        AND m.tmdb_id IS NOT NULL
        AND ma.claude_response->>'processed_content' IS NOT NULL
      ORDER BY ma.updated_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    console.log(`✅ Found ${result.rows.length} processed analyses`);
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

function extractProcessedContent(claudeResponse) {
  try {
    // The processed_content should contain HTML links
    if (claudeResponse.processed_content) {
      return claudeResponse.processed_content;
    }
    
    // Fallback to raw_content if processed_content doesn't exist
    if (claudeResponse.raw_content) {
      let parsedContent;
      
      if (typeof claudeResponse.raw_content === 'string') {
        parsedContent = JSON.parse(claudeResponse.raw_content);
      } else {
        parsedContent = claudeResponse.raw_content;
      }
      
      return parsedContent;
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️  Failed to parse content:', error.message);
    return null;
  }
}

function createStaticMovieEntry(row) {
  const processedContent = extractProcessedContent(row.claude_response);
  
  if (!processedContent) {
    return null;
  }
  
  // Create sections from processed content
  const sections = [];
  
  if (processedContent.content && Array.isArray(processedContent.content)) {
    for (const section of processedContent.content) {
      if (section.text) {
        sections.push({
          type: 'text',
          content: section.text // This should now contain HTML links!
        });
      }
    }
  }
  
  // Create movie entry
  const movieEntry = {
    title: row.title,
    year: row.year,
    tmdbId: row.tmdb_id,
    hasAnalysis: true,
    sections: sections,
    
    // Additional metadata
    director: processedContent.keyElements?.director || 'Unknown Director',
    genre: processedContent.keyElements?.genre || 'Drama',
    overview: sections[0]?.content?.replace(/<[^>]*>/g, '').substring(0, 200) + '...' || 'No overview available',
    
    // Processing metadata
    processedAt: new Date().toISOString(),
    source: 'railway_database_with_links',
    hasLinks: true
  };
  
  return movieEntry;
}

async function generateStaticFiles(analyses) {
  console.log(`\n🏭 Generating static files with links for ${analyses.length} movies...\n`);
  
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  
  const results = {
    created: 0,
    failed: 0,
    files: []
  };
  
  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i];
    
    try {
      console.log(`📄 Processing ${i + 1}/${analyses.length}: ${analysis.title} (${analysis.year})`);
      
      const movieEntry = createStaticMovieEntry(analysis);
      
      if (!movieEntry) {
        console.log(`   ⚠️  Skipped - no valid processed content`);
        results.failed++;
        continue;
      }
      
      console.log(`   📝 ${movieEntry.sections.length} text section(s)`);
      
      // Check if content has HTML links
      const hasHtmlLinks = movieEntry.sections.some(section => 
        section.content && section.content.includes('<a href=')
      );
      
      console.log(`   🔗 Contains HTML links: ${hasHtmlLinks ? '✅' : '❌'}`);
      
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
        sections: movieEntry.sections.length,
        hasLinks: hasHtmlLinks
      });
      
    } catch (error) {
      console.error(`   ❌ Failed to process ${analysis.title}:`, error.message);
      results.failed++;
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 Static File Generator with Processed Links');
  console.log('===============================================\n');
  
  try {
    // Fetch processed analyses from database
    const analyses = await fetchProcessedAnalyses(TEST_COUNT);
    
    if (analyses.length === 0) {
      console.log('❌ No processed analyses found. Run linking script first.');
      process.exit(1);
    }
    
    // Generate static files
    const results = await generateStaticFiles(analyses);
    
    // Summary
    console.log('\n📊 GENERATION COMPLETE');
    console.log('======================');
    console.log(`✅ Files created: ${results.created}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    
    const withLinks = results.files.filter(f => f.hasLinks).length;
    console.log(`🔗 Files with HTML links: ${withLinks}/${results.created}`);
    
    if (withLinks > 0) {
      console.log('\n🎯 SUCCESS! Generated static files with HTML links.');
      console.log('These files should now render clickable movie references.');
      console.log('\nTest at: http://localhost:3000/test-static');
    } else {
      console.log('\n⚠️  No HTML links found. May need more linking processing.');
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