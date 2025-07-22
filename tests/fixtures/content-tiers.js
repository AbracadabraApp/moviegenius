/**
 * Test Data Fixtures - Three-Tier Content Scenarios
 * 
 * These fixtures represent the actual content states we need to handle
 * in the zero-waste linking system implementation.
 */

// TIER 1: Complete Content (has links) - SKIP ENTIRELY
export const TIER_1_COMPLETE_CONTENT = {
  // Nuclear static movie analysis with existing links
  movieAnalysis: {
    props: {
      title: "Lock, Stock and Two Smoking Barrels",
      year: 1998,
      tmdbId: 100,
      sections: [
        {
          type: "text",
          content: `Lock, Stock and Two Smoking Barrels revolutionized British gangster cinema with its razor-sharp wit and intricate plot mechanics. Guy Ritchie's directorial debut created a template that countless films would try to replicate - the rapid-fire dialogue, intersecting criminal storylines, and stylized violence set to a pulsing soundtrack. The film shares DNA with Quentin Tarantino's <a href="/movie/500" class="movie-title" data-tmdb-id="500">Reservoir Dogs</a> (1992) but establishes its own distinctly British voice through cockney rhyming slang and London's criminal underbelly.`
        }
      ]
    }
  },

  // Episode content with existing links
  episodeContent: {
    episode: { title: "British Crime Cinema" },
    content: {
      opener: `This episode explores the evolution of British crime films from <a href="/movie/14807" class="movie-title" data-tmdb-id="14807">The Long Good Friday</a> (1980) through modern classics.`,
      sections: [
        {
          type: "text", 
          content: `Guy Ritchie's breakthrough <a href="/movie/100" class="movie-title" data-tmdb-id="100">Lock, Stock and Two Smoking Barrels</a> (1998) established the template.`
        }
      ]
    }
  }
};

// TIER 2: Unlinked Content (has analysis, missing links) - LINK ONLY
export const TIER_2_UNLINKED_CONTENT = {
  // Movie analysis without links - should be processed for linking
  movieAnalysis: {
    props: {
      title: "Pulp Fiction", 
      year: 1994,
      tmdbId: 680,
      sections: [
        {
          type: "text",
          content: `**Pulp Fiction** (1994) revolutionized independent cinema with its non-linear narrative structure and pop culture dialogue. Quentin Tarantino's masterpiece influenced countless filmmakers, from **Kill Bill** (2003) to **Snatch** (2000). The film's impact on **Reservoir Dogs** (1992) created a new template for crime storytelling.`
        }
      ]
    }
  },

  // Episode content without links - should be processed
  episodeContent: {
    episode: { title: "Tarantino's Influence" },
    content: {
      opener: `This episode examines how "Pulp Fiction" (1994) changed cinema forever.`,
      sections: [
        {
          type: "text",
          content: `Following "Reservoir Dogs" (1992), Tarantino created **Pulp Fiction** (1994) which became the template for **Jackie Brown** (1997) and inspired directors like Guy Ritchie with "Lock, Stock and Two Smoking Barrels" (1998).`
        }
      ]
    }
  }
};

// TIER 3: Missing Content (no analysis) - GENERATE FRESH
export const TIER_3_MISSING_CONTENT = {
  // Movie exists in database but no analysis - should generate with integrated linking
  movieData: {
    title: "The Matrix",
    year: 1999, 
    tmdb_id: 603,
    // No existing analysis sections
  }
};

// EDGE CASES - Critical scenarios that could break the system
export const EDGE_CASE_CONTENT = {
  // Mixed content - some links exist, some don't
  mixedLinkingState: {
    content: `Analysis of <a href="/movie/100" class="movie-title" data-tmdb-id="100">Lock, Stock and Two Smoking Barrels</a> (1998) shows influence from **Goodfellas** (1990) and connections to "Reservoir Dogs" (1992).`
  },

  // Self-referential content - movie mentioning itself
  selfReference: {
    movieTitle: "The Godfather",
    content: `**The Godfather** (1972) is widely considered the greatest crime film ever made. The film's influence on **Goodfellas** (1990) and **Scarface** (1983) is undeniable.`
  },

  // Title collisions - same title, different years
  titleCollisions: {
    content: `Both **Scarface** (1932) and **Scarface** (1983) explore themes of ambition and corruption, though **Scarface** (1983) became the more influential version.`
  },

  // Malformed patterns - should not crash the system
  malformedPatterns: {
    content: `Analysis of **Incomplete Movie and mentions of ** Invalid Pattern ** (not_a_year) and **Very Very Very Long Movie Title That Exceeds Normal Database Limits** (1999).`
  },

  // Large content blocks - performance testing
  largeContentBlock: {
    content: `${'**Movie Title** (1999) '.repeat(100)}` // 100 movie mentions
  },

  // Special characters and international titles
  specialCharacters: {
    content: `Analysis of **Amélie** (2001) and **8½** (1963) shows how international cinema influences **Crouching Tiger, Hidden Dragon** (2000).`
  }
};

// DATABASE STATES - For testing database interaction scenarios
export const DATABASE_STATES = {
  // Movies that exist in database
  existingMovies: [
    { tmdb_id: 100, title: "Lock, Stock and Two Smoking Barrels", year: 1998 },
    { tmdb_id: 500, title: "Reservoir Dogs", year: 1992 },
    { tmdb_id: 680, title: "Pulp Fiction", year: 1994 }
  ],

  // Movies that don't exist - should trigger MediaCard creation
  missingMovies: [
    { title: "Unknown Indie Film", year: 2023 },
    { title: "Fictional Movie", year: 1999 }
  ],

  // Movies with title collisions
  titleCollisions: [
    { tmdb_id: 1932, title: "Scarface", year: 1932 },
    { tmdb_id: 1983, title: "Scarface", year: 1983 }
  ]
};

// EXPECTED OUTPUTS - What we expect after processing
export const EXPECTED_OUTPUTS = {
  // Tier 1 should remain unchanged
  tier1Unchanged: TIER_1_COMPLETE_CONTENT,

  // Tier 2 should have links added
  tier2WithLinks: {
    content: `<a href="/movie/680" class="movie-title" data-tmdb-id="680">Pulp Fiction</a> (1994) revolutionized independent cinema with its non-linear narrative structure and pop culture dialogue. Quentin Tarantino's masterpiece influenced countless filmmakers, from <a href="/movie/24" class="movie-title" data-tmdb-id="24">Kill Bill</a> (2003) to <a href="/movie/107" class="movie-title" data-tmdb-id="107">Snatch</a> (2000). The film's impact on <a href="/movie/500" class="movie-title" data-tmdb-id="500">Reservoir Dogs</a> (1992) created a new template for crime storytelling.`
  },

  // Self-reference should strip bold marks but not link
  selfReferenceStripped: {
    content: `The Godfather (1972) is widely considered the greatest crime film ever made. The film's influence on <a href="/movie/769" class="movie-title" data-tmdb-id="769">Goodfellas</a> (1990) and <a href="/movie/111" class="movie-title" data-tmdb-id="111">Scarface</a> (1983) is undeniable.`
  }
};

// PERFORMANCE BENCHMARKS - What we consider acceptable
export const PERFORMANCE_BENCHMARKS = {
  maxProcessingTime: 1000, // 1 second for typical content
  maxDatabaseQueries: 5,   // Per content block
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  
  // Large content processing limits
  largeContentMaxTime: 5000, // 5 seconds for 100+ movie mentions
  batchProcessingRate: 20,   // Movies per minute
};

// SUCCESS CRITERIA - Measurable outcomes
export const SUCCESS_CRITERIA = {
  dataIntegrity: {
    // Existing links must never be modified
    preserveExistingLinks: true,
    // Content structure must remain valid
    maintainContentStructure: true,
    // No data corruption in JSON files
    validateJSONIntegrity: true
  },

  linkingAccuracy: {
    // All valid movies should be linked
    minLinkingRate: 0.95, // 95% of valid movie mentions
    // False positive rate should be minimal  
    maxFalsePositiveRate: 0.02, // 2% false positives
    // Self-references should never be linked
    zeroSelfReferenceLinks: true
  },

  performance: {
    // Processing time within limits
    respectTimeoutLimits: true,
    // Memory usage under control
    respectMemoryLimits: true,
    // Database queries optimized
    efficientDatabaseUsage: true
  },

  systemReliability: {
    // No crashes on malformed input
    gracefulErrorHandling: true,
    // Consistent results on repeated processing
    deterministicOutput: true,
    // Recovery from API failures
    robustExternalAPICalls: true
  }
};