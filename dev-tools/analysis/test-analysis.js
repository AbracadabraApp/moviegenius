#!/usr/bin/env node
/**
 * Test Movie Analysis process with timing and validation
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMovieAnalysis(tmdbId) {
  console.log(`🎬 Testing Movie Analysis for TMDB ID: ${tmdbId}`);
  console.log(`⏰ Start time: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  
  try {
    // Step 1: Get movie record
    console.log('\n📝 Step 1: Getting movie record...');
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single();

    if (movieError || !movie) {
      console.error('❌ Movie not found:', movieError);
      return;
    }

    console.log(`✅ Found movie: "${movie.title}" (${movie.year})`);
    console.log(`   has_analysis: ${movie.has_analysis}`);
    
    // Step 2: Check existing analysis
    console.log('\n📝 Step 2: Checking existing analysis...');
    const { data: existingAnalysis, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('*')
      .eq('movie_id', movie.id);

    console.log(`   Existing analyses: ${existingAnalysis?.length || 0}`);
    
    // Step 3: Call the analysis API
    console.log('\n📝 Step 3: Calling Movie Analysis API...');
    const apiStartTime = Date.now();
    
    const response = await fetch(`http://localhost:3000/api/movie-analysis?tmdbId=${tmdbId}`);
    const apiEndTime = Date.now();
    const apiDuration = apiEndTime - apiStartTime;
    
    console.log(`   API response status: ${response.status}`);
    console.log(`   API call duration: ${apiDuration}ms`);
    
    if (!response.ok) {
      console.error('❌ API call failed:', await response.text());
      return;
    }
    
    const analysisData = await response.json();
    console.log(`✅ Analysis received:`);
    console.log(`   hasAnalysis: ${analysisData.hasAnalysis}`);
    console.log(`   sections: ${analysisData.sections?.length || 0}`);
    console.log(`   exploreFurther: ${analysisData.exploreFurther?.length || 0}`);
    console.log(`   moreIdeas: ${analysisData.moreIdeas?.movies?.length || 0} movies`);
    
    // Step 4: Validate content structure
    console.log('\n📝 Step 4: Validating content structure...');
    let validationErrors = [];
    
    if (!analysisData.sections || analysisData.sections.length === 0) {
      validationErrors.push('No sections found');
    }
    
    let textSections = 0;
    let movieSections = 0;
    
    analysisData.sections?.forEach((section, i) => {
      if (section.type === 'text') {
        textSections++;
        if (!section.content || section.content.length < 100) {
          validationErrors.push(`Text section ${i} too short or empty`);
        }
      } else if (section.type === 'movies') {
        movieSections++;
        if (!section.movies || section.movies.length === 0) {
          validationErrors.push(`Movie section ${i} has no movies`);
        }
      }
    });
    
    console.log(`   Text sections: ${textSections}`);
    console.log(`   Movie sections: ${movieSections}`);
    console.log(`   Validation errors: ${validationErrors.length}`);
    
    if (validationErrors.length > 0) {
      console.log('⚠️  Validation issues:');
      validationErrors.forEach(error => console.log(`     - ${error}`));
    } else {
      console.log('✅ Content validation passed');
    }
    
    // Step 5: Check database after analysis
    console.log('\n📝 Step 5: Rechecking database...');
    const { data: updatedMovie, error: updateError } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single();

    const { data: newAnalysis, error: newAnalysisError } = await supabase
      .from('movie_analyses')
      .select('*')
      .eq('movie_id', movie.id);

    console.log(`   has_analysis flag: ${updatedMovie?.has_analysis}`);
    console.log(`   Analysis entries: ${newAnalysis?.length || 0}`);
    
    if (newAnalysis && newAnalysis.length > 0) {
      console.log('✅ Analysis saved to database');
      newAnalysis.forEach((analysis, i) => {
        console.log(`     ${i + 1}. Type: ${analysis.analysis_type}, Created: ${analysis.created_at}`);
      });
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    console.log('\n🎯 Summary:');
    console.log(`   Total time: ${totalDuration}ms`);
    console.log(`   API time: ${apiDuration}ms`);
    console.log(`   Database time: ${totalDuration - apiDuration}ms`);
    console.log(`   Content valid: ${validationErrors.length === 0 ? 'Yes' : 'No'}`);
    console.log(`   Database updated: ${newAnalysis?.length > 0 ? 'Yes' : 'No'}`);
    console.log(`⏰ End time: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Get TMDB ID from command line argument
const tmdbId = process.argv[2];
if (!tmdbId) {
  console.error('Usage: node test-analysis.js <tmdb_id>');
  process.exit(1);
}

testMovieAnalysis(parseInt(tmdbId));