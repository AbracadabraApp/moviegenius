#!/usr/bin/env node
/**
 * Direct Assembly Test
 * Tests assembleEnhancedMovieData() function directly for sample movies
 * Run: node --env-file=.env.local test-assembly-direct.cjs
 */

async function testAssemblyDirect() {
  console.log('🎬 Testing assembleEnhancedMovieData() directly...\n');

  // Test movies
  const testMovies = [
    { tmdbId: 550, title: 'Fight Club' },
    { tmdbId: 105, title: 'Back to the Future' },
    { tmdbId: 155, title: 'The Dark Knight' },
    { tmdbId: 278, title: 'The Shawshank Redemption' },
    { tmdbId: 238, title: 'The Godfather' },
    { tmdbId: 680, title: 'Pulp Fiction' },
    { tmdbId: 13, title: 'Forrest Gump' },
    { tmdbId: 129, title: 'Spirited Away' },
    { tmdbId: 346, title: 'Seven' },
    { tmdbId: 18, title: 'The Fifth Element' }
  ];

  for (const movie of testMovies) {
    try {
      console.log(`📋 Assembling: ${movie.title} (${movie.tmdbId})`);

      const startTime = Date.now();
      const { assembleEnhancedMovieData } = await import('./lib/enhanced-assembly.js');
      const result = await assembleEnhancedMovieData(movie.tmdbId);
      const assemblyTime = Date.now() - startTime;

      // Validate the assembled data structure
      const validation = validateAssembly(result, movie);

      console.log(`   ⚡ Assembled in ${assemblyTime}ms`);
      console.log(`   📊 Structure: ${validation.status}`);
      console.log(`   🧩 Components: ${validation.components}`);

      if (validation.issues.length > 0) {
        console.log(`   ⚠️  Issues: ${validation.issues.join(', ')}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log(''); // Empty line between movies
  }

  console.log('🎯 Direct assembly test complete!');
}

function validateAssembly(data, movie) {
  const issues = [];
  const components = [];

  // Check main structure
  if (!data.tmdbId) issues.push('Missing tmdbId');
  if (!data.title) issues.push('Missing title');
  if (!data.year) issues.push('Missing year');

  // Check movieHeader
  if (!data.movieHeader) {
    issues.push('Missing movieHeader');
  } else {
    components.push(`Header=🟢`);
    if (!data.movieHeader.posterUrl) issues.push('Missing posterUrl');
    if (!data.movieHeader.overview) issues.push('Missing overview');
    components.push(`Poster=${data.movieHeader.posterUrl ? '🟢' : '🔴'}`);
    components.push(`Trailer=${data.movieHeader.trailerVideoId ? '🟢' : '🟡'}`);
    components.push(`Streaming=${data.movieHeader.streaming ? '🟢' : '🟡'}`);
  }

  // Check analysis
  if (!data.analysis) {
    issues.push('Missing analysis');
    components.push('Analysis=🔴');
  } else {
    components.push('Analysis=🟢');
    components.push(`Sections=${data.analysis.sections?.length || 0}`);
    components.push(`WhyWatch=${data.analysis.whyWatch?.recommendation ? '🟢' : '🔴'}`);
    components.push(`MoreIdeas=${data.analysis.moreIdeas?.length || 0}`);
  }

  // Check keyElements
  if (!data.keyElements) {
    issues.push('Missing keyElements');
    components.push('Contributors=🔴');
  } else {
    components.push('Contributors=🟢');
    const contributorCount = [
      data.keyElements.director,
      ...(data.keyElements.writers || []),
      ...(data.keyElements.stars || [])
    ].filter(Boolean).length;
    components.push(`Count=${contributorCount}`);
  }

  // Check metadata
  components.push(`Enhanced=${data.enhancedFormat ? '🟢' : '🔴'}`);
  components.push(`Static=${data.staticGenerated ? '🟢' : '🔴'}`);
  components.push(`Links=${data.buildData?.linksProcessed ? '🟢' : '🔴'}`);

  return {
    status: issues.length === 0 ? '✅ Complete' : `⚠️ ${issues.length} issues`,
    components: components.join(' '),
    issues
  };
}

// Run test
testAssemblyDirect().catch(console.error);