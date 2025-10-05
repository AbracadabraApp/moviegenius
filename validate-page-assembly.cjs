#!/usr/bin/env node
/**
 * Direct Page Assembly Validator
 * Tests all constituent parts of movie pages without Jest complexity
 * Run: node --env-file=.env.local validate-page-assembly.cjs
 */

const { Pool } = require('pg');

async function validatePageAssembly() {
  console.log('🎬 Starting Page Assembly Validation...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3
  });

  try {
    // Import ESM function
    const { assembleEnhancedMovieData } = await import('./lib/enhanced-assembly.js');

    // Test movies
    const testMovies = [
      { tmdbId: 550, title: 'Fight Club', year: 1999 },
      { tmdbId: 18, title: 'The Fifth Element', year: 1997 }
    ];

    const results = {};

    for (const movie of testMovies) {
      console.log(`🎭 Testing ${movie.title} (${movie.year})...`);

      try {
        const enhancedData = await assembleEnhancedMovieData(movie.tmdbId);
        const validation = validateMovieComponents(enhancedData, movie);

        results[movie.title] = validation;

        // Print summary for this movie
        printMovieValidation(movie.title, validation);
        console.log(''); // Empty line between movies

      } catch (error) {
        console.error(`❌ Failed to assemble ${movie.title}:`, error.message);
        results[movie.title] = { error: error.message };
      }
    }

    // Print overall summary
    printOverallSummary(results);

    return results;

  } finally {
    await pool.end();
  }
}

/**
 * Validate all components of a movie page
 */
function validateMovieComponents(enhancedData, expectedMovie) {
  const validation = {
    header: validateMovieHeader(enhancedData.movieHeader, expectedMovie),
    streaming: validateStreaming(enhancedData.movieHeader),
    trailer: validateTrailer(enhancedData.movieHeader),
    whyWatch: validateWhyWatch(enhancedData.analysis.whyWatch),
    analysis: validateAnalysis(enhancedData.analysis.sections),
    movieLinking: validateMovieLinking(enhancedData.analysis.sections),
    contributorLinking: validateContributorLinking(enhancedData.keyElements),
    featuredFilms: validateFeaturedFilms(enhancedData.analysis.featuredMovies),
    contextualHeaders: validateContextualHeaders(enhancedData.analysis.sections),
    moreIdeas: validateMoreIdeas(enhancedData.analysis.moreIdeas),
    metadata: validateMetadata(enhancedData)
  };

  // Calculate overall score
  const scores = Object.values(validation).map(v => v.score || 0);
  validation.overall = {
    score: scores.reduce((a, b) => a + b, 0) / scores.length,
    passed: scores.every(score => score >= 0.5)
  };

  return validation;
}

function validateMovieHeader(movieHeader, expected) {
  const issues = [];
  let score = 1.0;

  if (!movieHeader.title || movieHeader.title !== expected.title) {
    issues.push(`Title mismatch: expected "${expected.title}", got "${movieHeader.title}"`);
    score -= 0.3;
  }

  if (!movieHeader.year || movieHeader.year !== expected.year) {
    issues.push(`Year mismatch: expected ${expected.year}, got ${movieHeader.year}`);
    score -= 0.3;
  }

  if (!movieHeader.posterUrl || !movieHeader.posterUrl.includes('image.tmdb.org')) {
    issues.push('Missing or invalid poster URL');
    score -= 0.2;
  }

  if (!movieHeader.overview) {
    issues.push('Missing overview');
    score -= 0.2;
  }

  return { score: Math.max(0, score), issues, data: { hasTrailer: !!movieHeader.trailerVideoId } };
}

function validateStreaming(movieHeader) {
  return {
    score: movieHeader.streaming ? 1.0 : 0.5, // Optional but good to have
    issues: movieHeader.streaming ? [] : ['No streaming data'],
    data: { streaming: movieHeader.streaming || null }
  };
}

function validateTrailer(movieHeader) {
  const issues = [];
  let score = 1.0;

  if (!movieHeader.trailerVideoId) {
    issues.push('No trailer video ID');
    score = 0.3; // Not critical but important
  } else if (!/^[A-Za-z0-9_-]{11}$/.test(movieHeader.trailerVideoId)) {
    issues.push('Invalid trailer video ID format');
    score -= 0.5;
  }

  return { score, issues, data: { videoId: movieHeader.trailerVideoId } };
}

function validateWhyWatch(whyWatch) {
  const issues = [];
  let score = 1.0;

  if (!whyWatch.recommendation || !['YES', 'NO'].includes(whyWatch.recommendation)) {
    issues.push('Invalid or missing recommendation');
    score -= 0.5;
  }

  if (!Array.isArray(whyWatch.reasons)) {
    issues.push('Missing or invalid reasons array');
    score -= 0.3;
  } else if (whyWatch.recommendation === 'YES' && whyWatch.reasons.length === 0) {
    issues.push('YES recommendation should have reasons');
    score -= 0.2;
  }

  return { score: Math.max(0, score), issues, data: whyWatch };
}

function validateAnalysis(sections) {
  const issues = [];
  let score = 1.0;

  if (!Array.isArray(sections) || sections.length === 0) {
    issues.push('Missing or empty analysis sections');
    return { score: 0, issues, data: { sectionCount: 0 } };
  }

  sections.forEach((section, index) => {
    if (!section.text || section.text.length < 10) {
      issues.push(`Section ${index + 1}: Text too short or missing`);
      score -= 0.1;
    }

    if (!section.subhead || section.subhead.length < 3) {
      issues.push(`Section ${index + 1}: Subhead too short or missing`);
      score -= 0.1;
    }
  });

  return { score: Math.max(0, score), issues, data: { sectionCount: sections.length } };
}

function validateMovieLinking(sections) {
  let linkedSections = 0;
  let totalMovieLinks = 0;
  let properlyLinkedMovies = 0;
  let malformedLinks = 0;

  sections.forEach(section => {
    // Count movie links with proper structure
    const movieLinkMatches = section.text.match(/class="movie-title"[^>]*data-tmdb-id="(\d+)"[^>]*>/g) || [];
    const totalLinks = (section.text.match(/class="movie-title"/g) || []).length;

    if (totalLinks > 0) {
      linkedSections++;
      totalMovieLinks += totalLinks;
      properlyLinkedMovies += movieLinkMatches.length;
      malformedLinks += (totalLinks - movieLinkMatches.length);
    }
  });

  const linkSuccessRate = totalMovieLinks > 0 ? (properlyLinkedMovies / totalMovieLinks) : 0;

  return {
    score: linkSuccessRate >= 0.8 ? 1.0 : linkSuccessRate >= 0.5 ? 0.7 : 0.3,
    issues: [
      ...(linkedSections === 0 ? ['No movie links found'] : []),
      ...(malformedLinks > 0 ? [`${malformedLinks} malformed movie links`] : []),
      ...(linkSuccessRate < 0.8 ? [`Low link success rate: ${(linkSuccessRate * 100).toFixed(0)}%`] : [])
    ],
    data: {
      linkedSections,
      totalMovieLinks,
      properlyLinkedMovies,
      malformedLinks,
      linkSuccessRate: linkSuccessRate * 100
    }
  };
}

function validateContributorLinking(keyElements) {
  const issues = [];
  let score = 1.0;
  let contributorCount = 0;
  let properlyLinkedContributors = 0;
  let contributorsWithoutLinks = 0;

  const expectedTypes = ['director', 'writers', 'stars', 'cinematographer', 'composer'];

  expectedTypes.forEach(type => {
    if (keyElements[type]) {
      const contributors = Array.isArray(keyElements[type]) ? keyElements[type] : [keyElements[type]];
      contributors.forEach(contributor => {
        contributorCount++;

        if (!contributor.name) {
          issues.push(`${type}: Missing contributor name`);
          score -= 0.1;
          contributorsWithoutLinks++;
        } else if (!contributor.slug || !contributor.personId) {
          issues.push(`${type}: ${contributor.name} not linked to person page`);
          score -= 0.1;
          contributorsWithoutLinks++;
        } else if (!contributor.slug.match(/^\/person\/\d+$/)) {
          issues.push(`${type}: ${contributor.name} has invalid person link format`);
          score -= 0.1;
          contributorsWithoutLinks++;
        } else {
          properlyLinkedContributors++;
        }
      });
    }
  });

  if (contributorCount === 0) {
    issues.push('No contributors found');
    score = 0.3;
  }

  const contributorLinkRate = contributorCount > 0 ? (properlyLinkedContributors / contributorCount) : 0;

  return {
    score: Math.max(0, score),
    issues,
    data: {
      contributorCount,
      properlyLinkedContributors,
      contributorsWithoutLinks,
      contributorLinkRate: contributorLinkRate * 100
    }
  };
}

function validateFeaturedFilms(featuredMovies) {
  // Currently optional in implementation
  return {
    score: Array.isArray(featuredMovies) ? 1.0 : 0.8,
    issues: Array.isArray(featuredMovies) ? [] : ['FeaturedMovies not array'],
    data: { count: Array.isArray(featuredMovies) ? featuredMovies.length : 0 }
  };
}

function validateContextualHeaders(sections) {
  const subheads = sections.map(s => s.subhead).filter(Boolean);
  const uniqueSubheads = [...new Set(subheads)];

  const genericHeaders = subheads.filter(subhead =>
    ['Section', 'Part', 'Chapter'].includes(subhead) || subhead.length < 3
  );

  return {
    score: genericHeaders.length === 0 ? 1.0 : Math.max(0, 1.0 - (genericHeaders.length * 0.2)),
    issues: genericHeaders.length > 0 ? [`${genericHeaders.length} generic headers`] : [],
    data: { total: subheads.length, unique: uniqueSubheads.length }
  };
}

function validateMoreIdeas(moreIdeas) {
  const issues = [];
  let score = 1.0;

  if (!Array.isArray(moreIdeas)) {
    issues.push('MoreIdeas not array');
    return { score: 0, issues, data: { count: 0 } };
  }

  if (moreIdeas.length === 0) {
    issues.push('No more ideas found');
    score = 0.3;
  } else {
    moreIdeas.forEach((idea, index) => {
      if (!idea.title || !idea.year || !idea.connection) {
        issues.push(`Idea ${index + 1}: Missing required fields`);
        score -= 0.1;
      }

      if (idea.year < 1880 || idea.year > 2030) {
        issues.push(`Idea ${index + 1}: Unrealistic year ${idea.year}`);
        score -= 0.05;
      }
    });
  }

  return { score: Math.max(0, score), issues, data: { count: moreIdeas.length } };
}

function validateMetadata(enhancedData) {
  const issues = [];
  let score = 1.0;

  if (!enhancedData.enhancedFormat) {
    issues.push('Not marked as enhanced format');
    score -= 0.3;
  }

  if (!enhancedData.staticGenerated) {
    issues.push('Not marked as static generated');
    score -= 0.3;
  }

  if (!enhancedData.lastUpdated) {
    issues.push('Missing lastUpdated timestamp');
    score -= 0.2;
  }

  if (!enhancedData.buildData || !enhancedData.buildData.linksProcessed) {
    issues.push('Links not processed');
    score -= 0.2;
  }

  return { score: Math.max(0, score), issues, data: enhancedData.buildData };
}

function printMovieValidation(title, validation) {
  console.log(`📋 ${title} Validation Results:`);

  const components = [
    { name: 'Header', key: 'header' },
    { name: 'Streaming', key: 'streaming' },
    { name: 'Trailer', key: 'trailer' },
    { name: 'Why Watch', key: 'whyWatch' },
    { name: 'Analysis', key: 'analysis' },
    { name: 'Movie Linking', key: 'movieLinking' },
    { name: 'Contributor Linking', key: 'contributorLinking' },
    { name: 'Featured Films', key: 'featuredFilms' },
    { name: 'Contextual Headers', key: 'contextualHeaders' },
    { name: 'More Ideas', key: 'moreIdeas' },
    { name: 'Metadata', key: 'metadata' }
  ];

  components.forEach(({ name, key }) => {
    const result = validation[key];
    const status = result.score >= 0.8 ? '✅' : result.score >= 0.5 ? '⚠️' : '❌';
    const score = (result.score * 100).toFixed(0);

    console.log(`   ${status} ${name}: ${score}%`);

    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`      • ${issue}`);
      });
    }

    // Show key data points with enhanced link tracking
    if (key === 'analysis' && result.data) {
      console.log(`      • ${result.data.sectionCount} sections`);
    }
    if (key === 'movieLinking' && result.data) {
      const successRate = result.data.linkSuccessRate?.toFixed(0) || 0;
      console.log(`      • ${result.data.totalMovieLinks} movie links in ${result.data.linkedSections} sections`);
      console.log(`      • ${result.data.properlyLinkedMovies} properly linked (${successRate}% success)`);
      if (result.data.malformedLinks > 0) {
        console.log(`      • ${result.data.malformedLinks} malformed links`);
      }
    }
    if (key === 'contributorLinking' && result.data) {
      const linkRate = result.data.contributorLinkRate?.toFixed(0) || 0;
      console.log(`      • ${result.data.contributorCount} contributors found`);
      console.log(`      • ${result.data.properlyLinkedContributors} properly linked (${linkRate}% success)`);
      if (result.data.contributorsWithoutLinks > 0) {
        console.log(`      • ${result.data.contributorsWithoutLinks} without person links`);
      }
    }
    if (key === 'moreIdeas' && result.data) {
      console.log(`      • ${result.data.count} recommendations`);
    }
  });

  const overallStatus = validation.overall.passed ? '✅' : '❌';
  const overallScore = (validation.overall.score * 100).toFixed(0);
  console.log(`   ${overallStatus} Overall: ${overallScore}%`);
}

function printOverallSummary(results) {
  console.log('\n🎯 Overall Page Assembly Summary:');

  const movies = Object.keys(results);
  let totalPassed = 0;

  movies.forEach(title => {
    const result = results[title];
    if (result.error) {
      console.log(`   ❌ ${title}: Error - ${result.error}`);
    } else if (result.overall) {
      const status = result.overall.passed ? '✅' : '❌';
      const score = (result.overall.score * 100).toFixed(0);
      console.log(`   ${status} ${title}: ${score}% overall`);

      if (result.overall.passed) totalPassed++;
    }
  });

  console.log(`\n📊 Summary: ${totalPassed}/${movies.length} movies passed validation`);

  if (totalPassed === movies.length) {
    console.log('🎉 All page components are properly assembled!');
  } else {
    console.log('🔧 Some components need attention for full page assembly');
  }
}

// Run validation
if (require.main === module) {
  validatePageAssembly()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validatePageAssembly };