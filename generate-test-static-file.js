#!/usr/bin/env node

/**
 * Generate Test Static File with New Analysis Format
 * 
 * Creates a single enhanced static file using our new analysis format
 * for browser testing
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '.env.local') });

import { generateEnhancedMovieFile } from './scripts/multi-source-static-generator.js';

async function generateTestStaticFile() {
  console.log('🚀 Generating Test Static File with New Analysis Format');
  console.log('====================================================');
  
  // Use The Matrix from our new analysis results
  const newAnalysisResults = JSON.parse(readFileSync('./test-new-analysis-results-5.json', 'utf8'));
  const matrixResult = newAnalysisResults.find(r => r.movie === "The Matrix (1999)");
  
  if (!matrixResult || !matrixResult.success) {
    console.log('❌ Could not find successful Matrix analysis');
    return;
  }
  
  // Create mock movie object with new analysis format
  const mockMovie = {
    id: 99999, // Use high ID to avoid conflicts
    tmdb_id: 8888, // Use unique test ID to avoid conflicts
    title: "The Matrix",
    year: 1999,
    claude_response: {
      raw_content: JSON.stringify(matrixResult.analysis)
    }
  };
  
  try {
    console.log(`🎬 Generating static file for: ${mockMovie.title} (${mockMovie.year})`);
    console.log(`📋 TMDB ID: ${mockMovie.tmdb_id}`);
    
    const result = await generateEnhancedMovieFile(mockMovie);
    
    if (result.success) {
      console.log(`✅ SUCCESS: Generated ${result.file}`);
      console.log(`📊 Processing time: ${result.processingTime}ms`);
      console.log(`📁 Sources: ${Object.entries(result.sources).map(([k,v]) => `${k}:${v}`).join(', ')}`);
      console.log('\n🌟 Ready for browser testing!');
      console.log(`Visit: http://localhost:3000/movie/8888`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

generateTestStaticFile().catch(console.error);