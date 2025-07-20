#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getTestMovies() {
  console.log('🔍 Getting 10 test movies with analysis and slugs...');

  // Get first 10 movies with analysis that have slugs
  const { data: analysisMovies } = await supabase
    .from('movie_analyses')
    .select('movie_id')
    .eq('analysis_type', 'page_analysis')
    .limit(20); // Get 20 to ensure we find 10 with slugs

  const testMovies = [];

  for (const analysis of analysisMovies || []) {
    const { data: movie } = await supabase
      .from('movies')
      .select(
        `
        id,
        title,
        year,
        slug,
        poster_url,
        trailer_url,
        tmdb_id,
        movie_analyses!inner(claude_response)
      `
      )
      .eq('id', analysis.movie_id)
      .eq('movie_analyses.analysis_type', 'page_analysis')
      .single();

    if (movie?.slug && movie.slug.trim() !== '') {
      testMovies.push(movie);

      if (testMovies.length === 10) {
        break;
      }
    }
  }

  return testMovies;
}

async function generateStaticTestPages() {
  console.log('🚀 Testing Static Page Generation (10 movies)\n');

  try {
    const testMovies = await getTestMovies();
    console.log(`✅ Found ${testMovies.length} test movies ready for static generation:\n`);

    // Create test output directory
    const outputDir = path.join(__dirname, 'static-test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const manifestData = {
      generated_at: new Date().toISOString(),
      movies: [],
      stats: {
        total_generated: 0,
        with_trailers: 0,
        without_trailers: 0,
      },
    };

    // Generate static data for each movie
    for (let i = 0; i < testMovies.length; i++) {
      const movie = testMovies[i];
      const analysis = movie.movie_analyses[0];

      console.log(`[${i + 1}/10] ${movie.title} (${movie.year})`);
      console.log(`  Slug: ${movie.slug}`);
      console.log(`  Trailer: ${movie.trailer_url ? 'YES' : 'NO'}`);
      console.log(`  Analysis: ${analysis?.claude_response ? 'YES' : 'NO'}`);

      // Create static page data structure
      const staticPageData = {
        // Basic movie info
        id: movie.id,
        title: movie.title,
        year: movie.year,
        slug: movie.slug,
        tmdb_id: movie.tmdb_id,
        poster_url: movie.poster_url,
        trailer_url: movie.trailer_url,

        // Analysis data
        analysis: analysis?.claude_response || null,

        // Static generation metadata
        generated_at: new Date().toISOString(),
        static_url: `/movie/${movie.slug}`,
        has_trailer: !!movie.trailer_url,
        has_analysis: !!analysis?.claude_response,
      };

      // Save individual movie static data
      const movieFileName = `${movie.slug.replace(/[^a-zA-Z0-9-]/g, '-')}.json`;
      const movieFilePath = path.join(outputDir, movieFileName);
      fs.writeFileSync(movieFilePath, JSON.stringify(staticPageData, null, 2));

      // Add to manifest
      manifestData.movies.push({
        title: movie.title,
        year: movie.year,
        slug: movie.slug,
        file: movieFileName,
        has_trailer: !!movie.trailer_url,
        has_analysis: !!analysis?.claude_response,
      });

      manifestData.stats.total_generated++;
      if (movie.trailer_url) {
        manifestData.stats.with_trailers++;
      } else {
        manifestData.stats.without_trailers++;
      }

      console.log(`  ✅ Generated: ${movieFileName}\n`);
    }

    // Save manifest
    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));

    console.log(`🎉 Static Generation Test Complete!`);
    console.log(`📊 Results:`);
    console.log(`  Generated files: ${manifestData.stats.total_generated}`);
    console.log(`  With trailers: ${manifestData.stats.with_trailers}`);
    console.log(`  Without trailers: ${manifestData.stats.without_trailers}`);
    console.log(`  Output directory: ${outputDir}`);
    console.log(`  Manifest: ${manifestPath}`);

    // Show file listing
    console.log(`\n📁 Generated files:`);
    const files = fs.readdirSync(outputDir);
    files.forEach(file => {
      console.log(`  - ${file}`);
    });
  } catch (error) {
    console.error('❌ Error generating static test pages:', error.message);
    process.exit(1);
  }
}

// Run test generation
generateStaticTestPages();
