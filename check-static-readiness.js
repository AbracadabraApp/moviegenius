#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStaticReadiness() {
  console.log('🔍 Static Page Build Readiness Assessment\n');

  try {
    // Get ALL analysis movie IDs by chunking through batches
    let allMovieIds = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    console.log('Retrieving all analysis records...');
    while (hasMore) {
      const { data: batch } = await supabase
        .from('movie_analyses')
        .select('movie_id')
        .eq('analysis_type', 'page_analysis')
        .range(offset, offset + limit - 1);

      if (batch && batch.length > 0) {
        allMovieIds = allMovieIds.concat(batch.map(a => a.movie_id));
        offset += limit;

        if (batch.length < limit) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    const uniqueMovieIds = [...new Set(allMovieIds)];
    console.log(`📊 Total movies with analysis: ${uniqueMovieIds.length}`);

    // Sample check first 200 movies to estimate
    const sampleSize = Math.min(200, uniqueMovieIds.length);
    let readyCount = 0;
    let missingSlugCount = 0;
    const missingSlugMovies = [];

    console.log(`\n🔍 Checking sample of ${sampleSize} movies...`);

    for (let i = 0; i < sampleSize; i++) {
      const { data: movie } = await supabase
        .from('movies')
        .select('id, title, slug')
        .eq('id', uniqueMovieIds[i])
        .single();

      if (movie?.slug && movie.slug.trim() !== '') {
        readyCount++;
      } else {
        missingSlugCount++;
        if (missingSlugMovies.length < 10) {
          missingSlugMovies.push(movie?.title || 'Unknown');
        }
      }

      if ((i + 1) % 50 === 0) {
        console.log(`  Checked ${i + 1}/${sampleSize} movies...`);
      }
    }

    // Calculate estimates
    const readyPercentage = (readyCount / sampleSize) * 100;
    const estimatedReady = Math.round((readyCount / sampleSize) * uniqueMovieIds.length);
    const estimatedMissing = uniqueMovieIds.length - estimatedReady;

    console.log(`\n📈 Readiness Assessment:`);
    console.log(
      `Sample results: ${readyCount}/${sampleSize} ready (${Math.round(readyPercentage)}%)`
    );
    console.log(`Estimated movies ready for static generation: ${estimatedReady}`);
    console.log(`Estimated movies needing slug generation: ${estimatedMissing}`);

    if (readyPercentage >= 95) {
      console.log(`\n🚀 EXCELLENT! Ready for static page generation`);
    } else if (readyPercentage >= 80) {
      console.log(`\n✅ GOOD! Can proceed with static generation for ready movies`);
    } else if (readyPercentage >= 50) {
      console.log(`\n⚠️  MODERATE! Consider generating slugs for remaining movies first`);
    } else {
      console.log(`\n❌ LOW readiness - need to generate slugs for most movies`);
    }

    if (missingSlugMovies.length > 0) {
      console.log(`\n📝 Sample movies missing slugs:`);
      missingSlugMovies.forEach(title => console.log(`  - ${title}`));
    }

    // Additional stats
    const { count: totalTrailers } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .not('trailer_url', 'is', null);

    console.log(`\n🎬 Additional info:`);
    console.log(`Total movies with trailers: ${totalTrailers}`);
    console.log(`(Trailers are not required for static generation)`);
  } catch (error) {
    console.error('❌ Error checking readiness:', error.message);
  }
}

// Run the check
checkStaticReadiness();
