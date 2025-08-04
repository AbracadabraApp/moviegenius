#!/usr/bin/env node
/**
 * Instant Nuclear Build - Use existing 5,300 analyses to build nuclear pages
 *
 * Instead of generating new analyses, this leverages all the existing
 * Claude analyses already stored in the database for immediate nuclear builds.
 */

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

async function buildNuclearFromExistingData() {
  console.log('🚀 Building nuclear pages from existing analyses...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Get movies that already have analyses
  console.log('📊 Finding movies with existing analyses...');
  const { data: moviesWithAnalyses } = await supabase
    .from('movies')
    .select(
      `
      id, title, year, tmdb_id, created_at,
      movie_analyses!inner(id, created_at)
    `
    )
    .eq('movie_analyses.analysis_type', 'page_analysis')
    .not('tmdb_id', 'is', null)
    .order('created_at', { ascending: false });

  console.log(`✅ Found ${moviesWithAnalyses?.length || 0} movies with existing analyses`);

  // 2. Pick top 5,000 for nuclear treatment
  const nuclearCandidates = moviesWithAnalyses?.slice(0, 5000) || [];
  console.log(`🚀 Selected ${nuclearCandidates.length} movies for nuclear treatment`);

  // 3. Show what we could build immediately
  console.log('\n📋 INSTANT NUCLEAR BUILD PLAN:');
  console.log(`   🎬 Movies ready for nuclear: ${nuclearCandidates.length}`);
  console.log(`   💰 Claude API calls needed: 0 (using existing data)`);
  console.log(`   ⚡ Cost to build: $0.00`);
  console.log(`   🕐 Build time estimate: ~5 minutes`);

  // 4. Show sample of what would be built
  console.log('\n🎯 SAMPLE NUCLEAR CANDIDATES:');
  nuclearCandidates.slice(0, 10).forEach((movie, i) => {
    console.log(`   ${i + 1}. ${movie.title} (${movie.year}) - TMDB: ${movie.tmdb_id}`);
  });

  // 5. Instructions
  console.log('\n🛠️  TO BUILD NUCLEAR PAGES:');
  console.log('   1. Run: npm run build');
  console.log('   2. Wait ~15-20 minutes for static generation');
  console.log('   3. Deploy: All 5,000 pages will be instant-loading');

  // 6. Show what autonomous system would cost vs this
  console.log('\n💡 EFFICIENCY COMPARISON:');
  console.log('   🤖 Autonomous approach: Generate 1,000 new analyses (~$15-30)');
  console.log('   ⚡ Nuclear approach: Use existing data ($0.00)');
  console.log('   📈 Speedup: Instant vs 2-3 hours');

  return {
    totalAnalyses: moviesWithAnalyses?.length || 0,
    nuclearReady: nuclearCandidates.length,
    costSavings: 15.0, // Estimated
    buildTimeMinutes: 5,
  };
}

// Run if called directly
if (require.main === module) {
  buildNuclearFromExistingData()
    .then(result => {
      console.log('\n✅ Nuclear build plan complete!');
      console.log(`💎 Ready to build ${result.nuclearReady} nuclear pages for $0`);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { buildNuclearFromExistingData };
