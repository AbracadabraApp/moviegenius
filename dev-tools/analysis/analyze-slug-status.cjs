#!/usr/bin/env node

/**
 * Analyze Slug Status for Nuclear Candidates
 *
 * This script analyzes the slug status of nuclear candidate movies
 * to determine how many need slug generation work.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeSlugStatus() {
  try {
    console.log('🔍 Analyzing slug status for nuclear candidates...\n');

    // Get all nuclear candidate movies (top 5,700 by creation date)
    const { data: nuclearCandidates, error: nuclearError } = await supabase
      .from('movies')
      .select('id, title, year, slug, tmdb_id')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5700);

    if (nuclearError) {
      throw new Error(`Failed to fetch nuclear candidates: ${nuclearError.message}`);
    }

    console.log(`📊 NUCLEAR CANDIDATES ANALYSIS (Top 5,700 movies)`);
    console.log(`Total nuclear candidates: ${nuclearCandidates.length}`);
    console.log('');

    // Analyze slug status
    let noSlug = 0;
    let emptySlug = 0;
    let tooLong = 0;
    let tooShort = 0;
    let hasBadPatterns = 0;
    let goodSlugs = 0;

    const badPatterns = [
      'Plot:',
      'Overview:',
      'Synopsis:',
      'starring',
      'stars',
      'features',
      'follows',
      'story of',
      'about',
    ];

    nuclearCandidates.forEach(movie => {
      const slug = movie.slug;

      // No slug
      if (!slug || slug === null) {
        noSlug++;
        return;
      }

      // Empty slug
      if (slug.trim() === '') {
        emptySlug++;
        return;
      }

      // Too long
      if (slug.length > 50) {
        tooLong++;
        return;
      }

      // Too short
      if (slug.length <= 5) {
        tooShort++;
        return;
      }

      // Contains bad patterns
      const lowerSlug = slug.toLowerCase();
      const hasBadPattern = badPatterns.some(pattern => lowerSlug.includes(pattern));
      if (hasBadPattern) {
        hasBadPatterns++;
        return;
      }

      // Good slug
      goodSlugs++;
    });

    const totalNeedingWork = noSlug + emptySlug + tooLong + tooShort + hasBadPatterns;

    console.log(`📈 SLUG STATUS BREAKDOWN:`);
    console.log(`├─ No slug: ${noSlug} movies`);
    console.log(`├─ Empty slug: ${emptySlug} movies`);
    console.log(`├─ Too long (>50 chars): ${tooLong} movies`);
    console.log(`├─ Too short (≤5 chars): ${tooShort} movies`);
    console.log(`├─ Contains bad patterns: ${hasBadPatterns} movies`);
    console.log(`└─ Good slugs: ${goodSlugs} movies`);
    console.log('');

    console.log(`🎯 SUMMARY:`);
    console.log(
      `Movies needing slug work: ${totalNeedingWork} / ${nuclearCandidates.length} (${((totalNeedingWork / nuclearCandidates.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `Movies with good slugs: ${goodSlugs} / ${nuclearCandidates.length} (${((goodSlugs / nuclearCandidates.length) * 100).toFixed(1)}%)`
    );
    console.log('');

    // Show some examples of bad slugs
    console.log(`📝 EXAMPLES OF BAD SLUGS:`);

    const tooLongExamples = nuclearCandidates.filter(m => m.slug && m.slug.length > 50).slice(0, 3);

    if (tooLongExamples.length > 0) {
      console.log(`\nToo Long (${tooLongExamples.length} shown):`);
      tooLongExamples.forEach(movie => {
        console.log(`  • "${movie.title}" (${movie.year})`);
        console.log(`    "${movie.slug}" (${movie.slug.length} chars)`);
      });
    }

    const badPatternExamples = nuclearCandidates
      .filter(m => {
        if (!m.slug) return false;
        const lowerSlug = m.slug.toLowerCase();
        return badPatterns.some(pattern => lowerSlug.includes(pattern));
      })
      .slice(0, 3);

    if (badPatternExamples.length > 0) {
      console.log(`\nBad Patterns (${badPatternExamples.length} shown):`);
      badPatternExamples.forEach(movie => {
        console.log(`  • "${movie.title}" (${movie.year})`);
        console.log(`    "${movie.slug}"`);
      });
    }

    console.log('');
    console.log(`💡 RECOMMENDATION:`);
    if (totalNeedingWork < 1000) {
      console.log(
        `With ${totalNeedingWork} movies needing slug work, batch generation is recommended.`
      );
      console.log(
        `Estimated cost: ~$${(totalNeedingWork * 0.005).toFixed(2)} (${totalNeedingWork} × $0.005)`
      );
    } else {
      console.log(
        `With ${totalNeedingWork} movies needing work, consider organic generation for cost efficiency.`
      );
      console.log(`Batch cost: ~$${(totalNeedingWork * 0.005).toFixed(2)}`);
      console.log(
        `Organic cost: Only pay for viewed movies (~20% = $${(totalNeedingWork * 0.2 * 0.005).toFixed(2)})`
      );
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeSlugStatus();
