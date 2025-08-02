#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function processEssentialMovies() {
  console.log('🎬 Processing 49 essential movies with new JSON prompt...');

  // Read the test list
  const testList = readFileSync(resolve(__dirname, '../PROMPT_C3_Test_LIST.txt'), 'utf-8')
    .split('\n')
    .map(id => id.trim())
    .filter(id => id && id !== '996'); // Skip Double Indemnity (already processed)

  console.log(`📋 Found ${testList.length} movies to process (excluding 996)`);

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (let i = 0; i < testList.length; i++) {
    const tmdbId = testList[i];
    const progress = `[${i + 1}/${testList.length}]`;
    
    try {
      console.log(`\n${progress} Processing TMDB ID: ${tmdbId}`);
      
      // Check if movie exists in database
      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id')
        .eq('tmdb_id', tmdbId)
        .single();

      if (!movie) {
        console.log(`⚠️  Movie ${tmdbId} not found in database`);
        results.skipped.push({ tmdbId, reason: 'Not in database' });
        continue;
      }

      console.log(`✅ Found: "${movie.title}" (${movie.year})`);

      // Check if already has JSON analysis
      const { data: existingAnalysis } = await supabase
        .from('movie_analyses')
        .select('id, analysis_type, claude_response')
        .eq('movie_id', movie.id)
        .eq('analysis_type', 'comprehensive');

      if (existingAnalysis && existingAnalysis.length > 0) {
        // Check if it's already JSON format
        try {
          const rawContent = existingAnalysis[0].claude_response?.raw_content;
          if (rawContent) {
            JSON.parse(rawContent);
            console.log(`📄 Already has JSON analysis, skipping`);
            results.skipped.push({ tmdbId, title: movie.title, reason: 'Already has JSON analysis' });
            continue;
          }
        } catch (e) {
          console.log(`🔄 Has old text analysis, will regenerate`);
          // Delete old analysis
          await supabase
            .from('movie_analyses')
            .delete()
            .eq('movie_id', movie.id);
        }
      }

      // Generate new analysis via API
      const response = await fetch(`http://localhost:3000/api/movie-analysis?tmdbId=${tmdbId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const apiResult = await response.json();
      
      if (apiResult.error) {
        throw new Error(apiResult.error);
      }

      // Extract and verify JSON format (handle thought_process prefix issue)
      let jsonContent = apiResult.analysis;
      
      // If analysis contains thought_process tags, extract just the JSON portion
      if (jsonContent.includes('<thought_process>')) {
        const jsonStart = jsonContent.indexOf('{');
        const jsonEnd = jsonContent.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
          console.log(`🔧 Extracted JSON from response with thought_process tags`);
        }
      }
      
      try {
        const parsedJson = JSON.parse(jsonContent);
        console.log(`✅ Successfully generated JSON analysis (${parsedJson.metadata?.wordCount || 'unknown'} words)`);
        results.success.push({ 
          tmdbId, 
          title: movie.title, 
          timing: apiResult.timing,
          wordCount: parsedJson.metadata?.wordCount,
          hasThoughtProcess: apiResult.analysis.includes('<thought_process>')
        });
      } catch (e) {
        throw new Error(`Analysis is not valid JSON format: ${e.message}`);
      }

      // Brief pause to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to process ${tmdbId}:`, error.message);
      results.failed.push({ 
        tmdbId, 
        title: testList.find(id => id === tmdbId), 
        error: error.message 
      });
    }
  }

  // Print summary
  console.log('\n🎯 BATCH PROCESSING SUMMARY');
  console.log('================================');
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Skipped: ${results.skipped.length}`);
  console.log(`📊 Total: ${testList.length}`);

  if (results.success.length > 0) {
    console.log('\n✅ SUCCESSFUL MOVIES:');
    results.success.forEach(movie => {
      const timing = movie.timing ? `${movie.timing.total?.toFixed(1)}s` : 'N/A';
      console.log(`   ${movie.title} (${movie.tmdbId}) - ${timing}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED MOVIES:');
    results.failed.forEach(movie => {
      console.log(`   ${movie.tmdbId}: ${movie.error}`);
    });
  }

  if (results.skipped.length > 0) {
    console.log('\n⚠️  SKIPPED MOVIES:');
    results.skipped.forEach(movie => {
      console.log(`   ${movie.tmdbId}: ${movie.reason}`);
    });
  }

  console.log('\n🎬 Batch processing complete!');
}

processEssentialMovies().catch(console.error);