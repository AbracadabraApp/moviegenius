const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDataCompleteness() {
  console.log('🔍 Checking data completeness for nuclear scale-up to 5,000 movies...\n');

  // Get top 5,000 movies with analyses
  const { data: moviesWithAnalyses } = await supabase
    .from('movies')
    .select(
      `
      id, title, year, tmdb_id, slug, poster_url, streaming_data,
      movie_analyses!inner(id, claude_response, created_at)
    `
    )
    .eq('movie_analyses.analysis_type', 'page_analysis')
    .not('tmdb_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5000);

  console.log(`✅ Found ${moviesWithAnalyses?.length || 0} movies with analyses`);

  if (!moviesWithAnalyses || moviesWithAnalyses.length === 0) {
    console.log('❌ No movies with analyses found');
    return;
  }

  // Check data completeness
  let goodPosters = 0;
  let goodSlugs = 0;
  let hasStreaming = 0;
  let hasExploreFurther = 0;
  let hasMoreIdeas = 0;
  let missingData = [];

  moviesWithAnalyses.forEach((movie, index) => {
    const issues = [];

    // Check poster
    if (
      movie.poster_url &&
      movie.poster_url !== '/images/placeholder-poster.jpg' &&
      movie.poster_url.includes('image.tmdb.org')
    ) {
      goodPosters++;
    } else {
      issues.push('poster');
    }

    // Check slug
    if (movie.slug && movie.slug.length > 10 && movie.slug.length <= 50) {
      goodSlugs++;
    } else {
      issues.push('slug');
    }

    // Check streaming data
    if (movie.streaming_data) {
      hasStreaming++;
    } else {
      issues.push('streaming');
    }

    // Parse Claude analysis for explore further and more ideas
    try {
      const analysis = JSON.parse(movie.movie_analyses[0].claude_response);

      if (analysis.exploreFurther && analysis.exploreFurther.length > 0) {
        hasExploreFurther++;
      } else {
        issues.push('explore_further');
      }

      if (analysis.moreIdeas && analysis.moreIdeas.movies && analysis.moreIdeas.movies.length > 0) {
        hasMoreIdeas++;
      } else {
        issues.push('more_ideas');
      }
    } catch (e) {
      issues.push('analysis_parsing');
    }

    if (issues.length > 0 && index < 10) {
      missingData.push({
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id,
        issues: issues.join(', '),
      });
    }
  });

  const total = moviesWithAnalyses.length;

  console.log(`\n📊 DATA COMPLETENESS ANALYSIS:`);
  console.log(
    `   📸 Good Posters: ${goodPosters}/${total} (${((goodPosters / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `   📝 Good Slugs: ${goodSlugs}/${total} (${((goodSlugs / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `   📺 Streaming Data: ${hasStreaming}/${total} (${((hasStreaming / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `   🔍 Explore Further: ${hasExploreFurther}/${total} (${((hasExploreFurther / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `   🎬 More Ideas: ${hasMoreIdeas}/${total} (${((hasMoreIdeas / total) * 100).toFixed(1)}%)`
  );

  console.log(`\n🚨 SAMPLE MISSING DATA (first 10):`);
  missingData.forEach((movie, index) => {
    console.log(`   ${index + 1}. ${movie.title} (${movie.year}) - Missing: ${movie.issues}`);
  });

  const readyForNuclear = Math.min(goodPosters, goodSlugs, hasExploreFurther);

  console.log(`\n✅ NUCLEAR READINESS:`);
  console.log(`   🎯 Movies ready for immediate nuclear: ${readyForNuclear}`);
  console.log(`   🔧 Movies needing data enhancement: ${total - readyForNuclear}`);

  console.log(`\n🚀 NUCLEAR SCALE-UP PLAN:`);
  console.log(`   📈 Current nuclear count: 1,000`);
  console.log(`   🎯 Target nuclear count: 5,000`);
  console.log(`   ✅ Available with complete data: ${readyForNuclear}`);

  if (readyForNuclear >= 5000) {
    console.log(`   ✅ READY: Can immediately scale to 5,000 nuclear movies`);
  } else {
    console.log(
      `   ⚠️  PARTIAL: ${readyForNuclear} movies ready, ${5000 - readyForNuclear} need enhancement`
    );
  }
}

checkDataCompleteness().catch(console.error);
