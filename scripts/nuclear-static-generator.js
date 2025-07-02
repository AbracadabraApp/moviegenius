#!/usr/bin/env node
/**
 * Nuclear Static Generator
 * 
 * Generates completely static JSON data files for nuclear movie pages.
 * These files can be deployed as static assets for lightning-fast loading.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Nuclear test movie IDs (same as getStaticPaths)
const NUCLEAR_MOVIE_IDS = [901, 770, 72976, 11314, 44865, 44012, 631, 897661, 389, 76203];

/**
 * Generate static page data for a movie
 */
async function generateMovieStaticData(tmdbId) {
  console.log(`🎬 Generating static data for movie ${tmdbId}...`);
  
  try {
    // Get movie from database
    const { data: movieEntry, error } = await supabase
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();

    if (!movieEntry || error) {
      console.log(`❌ Movie ${tmdbId} not found in database`);
      return null;
    }

    // Import analysis service
    const { AnalysisService } = await import('../lib/services/analysis-service.js');
    
    // Get analysis data
    const analysisData = await AnalysisService.getOrGenerate(movieEntry);
    
    if (!analysisData || !analysisData.sections || analysisData.sections.length === 0) {
      console.log(`❌ Movie ${tmdbId} has no analysis data`);
      return null;
    }

    // Build static page props (matching getStaticProps structure)
    const staticData = {
      props: {
        title: movieEntry.title,
        year: movieEntry.year,
        initialSlug: movieEntry.slug,
        initialPoster: movieEntry.poster_url,
        initialStreaming: movieEntry.streaming_data,
        tmdbId: movieEntry.tmdb_id,
        error: null,
        hasAnalysis: true,
        sections: analysisData.sections,
        exploreFurther: analysisData.exploreFurther,
        moreIdeas: analysisData.moreIdeas
      },
      __N_SSG: true
    };

    console.log(`✅ Generated static data for "${movieEntry.title}" (${movieEntry.year})`);
    return staticData;

  } catch (error) {
    console.error(`❌ Error generating static data for movie ${tmdbId}:`, error.message);
    return null;
  }
}

/**
 * Main function to generate all nuclear static files
 */
async function generateNuclearStaticFiles() {
  console.log('🚀 Nuclear Static Generator - Starting...\n');
  
  // Create output directory
  const outputDir = path.join(PROJECT_ROOT, 'nuclear-static');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const successCount = [];
  const failedCount = [];

  // Generate static data for each nuclear movie
  for (const tmdbId of NUCLEAR_MOVIE_IDS) {
    const staticData = await generateMovieStaticData(tmdbId);
    
    if (staticData) {
      // Write static data file
      const filename = `${tmdbId}.json`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(staticData, null, 2));
      
      console.log(`📄 Saved static data: nuclear-static/${filename}`);
      successCount.push(tmdbId);
    } else {
      failedCount.push(tmdbId);
    }
  }

  // Generate manifest file
  const manifest = {
    generated: new Date().toISOString(),
    nuclearMovies: successCount,
    failedMovies: failedCount,
    totalCount: successCount.length,
    version: '1.0.0'
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Summary
  console.log('\n🎯 Nuclear Static Generation Complete!');
  console.log(`✅ Generated: ${successCount.length} movies`);
  console.log(`❌ Failed: ${failedCount.length} movies`);
  console.log(`📂 Output directory: nuclear-static/`);
  
  if (failedCount.length > 0) {
    console.log(`⚠️  Failed movies: ${failedCount.join(', ')}`);
  }
  
  console.log('\n🚀 These static files can now be deployed for lightning-fast loading!');
}

// Run the generator
generateNuclearStaticFiles().catch(error => {
  console.error('💥 Nuclear static generation failed:', error);
  process.exit(1);
});