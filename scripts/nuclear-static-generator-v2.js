#!/usr/bin/env node
/**
 * Nuclear Static Generator V2
 * 
 * Simple approach: Use the proven dynamic page render path,
 * then save the result as static files.
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

// Command line arguments
const args = process.argv.slice(2);
const startFrom = parseInt(args.find(arg => arg.startsWith('--start='))?.split('=')[1] || '0');

/**
 * Get all movies that need nuclear generation
 */
async function getMoviesForNuclear() {
  let allMovies = [];
  let currentOffset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: moviePage, error } = await supabase
      .from('movies')
      .select(`
        tmdb_id, 
        title, 
        year,
        movie_analyses!inner(analysis_type)
      `)
      .not('tmdb_id', 'is', null)
      .eq('movie_analyses.analysis_type', 'page_analysis')
      .order('tmdb_id')
      .range(currentOffset, currentOffset + pageSize - 1);
      
    if (error || !moviePage || moviePage.length === 0) {
      break;
    }
    
    allMovies.push(...moviePage);
    console.log(`📄 Found ${allMovies.length} movies with analysis so far...`);
    
    if (moviePage.length < pageSize) {
      break;
    }
    
    currentOffset += pageSize;
  }
  
  return allMovies.map(movie => movie.tmdb_id).slice(startFrom);
}

/**
 * Generate nuclear static data by using the dynamic page render path
 */
async function generateNuclearFromRender(tmdbId) {
  try {
    console.log(`🎬 Processing movie ${tmdbId}...`);
    
    // Import the actual page render function
    const { getServerSideProps } = await import('../pages/movie/[id].js');
    
    // Use the proven render path to get all page data
    const renderResult = await getServerSideProps({
      params: { id: tmdbId.toString() },
      req: { headers: {} },
      res: {}
    });
    
    if (!renderResult.props) {
      throw new Error('No props returned from render');
    }
    
    // Convert to nuclear static format
    const nuclearData = {
      props: renderResult.props,
      __N_SSG: true
    };
    
    // Write to nuclear static file
    const outputDir = path.join(PROJECT_ROOT, 'nuclear-static');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `${tmdbId}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(nuclearData, null, 2));
    
    console.log(`  ✅ ${renderResult.props.title} (${renderResult.props.year}) → ${filename}`);
    return { success: true, tmdbId, title: renderResult.props.title };
    
  } catch (error) {
    console.log(`  ❌ Movie ${tmdbId} failed: ${error.message}`);
    return { success: false, tmdbId, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();
  console.log('🚀 Nuclear Static Generator V2 - Starting...\n');
  
  // Get movies to process
  const movieIds = await getMoviesForNuclear();
  console.log(`🎯 Target: ${movieIds.length} movies for nuclear generation\n`);
  
  if (movieIds.length === 0) {
    console.log('✅ No movies to process!');
    return;
  }
  
  // Process movies sequentially using proven render path
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < movieIds.length; i++) {
    const tmdbId = movieIds[i];
    const result = await generateNuclearFromRender(tmdbId);
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Progress update every 50 movies
    if ((i + 1) % 50 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const remaining = movieIds.length - (i + 1);
      const eta = remaining / rate;
      
      console.log(`\n📊 Progress: ${i + 1}/${movieIds.length} (${Math.round((i + 1) / movieIds.length * 100)}%)`);
      console.log(`⏱️  ${elapsed.toFixed(0)}s elapsed, ${eta.toFixed(0)}s remaining, ${rate.toFixed(1)} movies/sec\n`);
    }
  }
  
  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n🎉 Nuclear Generation Complete!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏱️  Total time: ${totalTime.toFixed(0)}s (${(successCount / totalTime).toFixed(1)} movies/sec)`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Generator failed:', error);
    process.exit(1);
  });
}