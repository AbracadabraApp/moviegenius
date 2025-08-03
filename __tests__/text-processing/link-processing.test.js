/**
 * Framework C: Enhanced Batch Pre-Computed Links Validation
 * 
 * Tests the improved linking approach with:
 * 1. Enhanced regex patterns for AI-generated content variations
 * 2. Parallelized batch processing for scalability
 * 3. Mocked filesystem operations for test isolation
 * 4. Comprehensive error tracking and reporting
 * 5. Performance validation for 17k dataset feasibility
 */

const fetch = globalThis.fetch || require('node-fetch');

// Import ground truth helper and test movies from Framework A
const { getAnalysisJson, TEST_MOVIE_IDS } = require('../ground-truth/analysis-json-validation.test.js');

/**
 * Enhanced Batch Link Processor
 * Simulates production workflow with improvements:
 * - Robust regex patterns for AI content variations
 * - Parallel processing for scalability
 * - In-memory storage simulation (no real filesystem)
 * - Comprehensive error tracking
 */
class EnhancedBatchLinkProcessor {

  constructor() {
    // In-memory storage simulation (replaces filesystem)
    this.linkStorage = new Map();
    this.errorLog = [];
    this.performanceMetrics = {
      totalProcessingTime: 0,
      parallelJobs: 0,
      regexMatches: 0,
      regexFailures: 0
    };
  }

  /**
   * Enhanced batch processing with parallelization
   * Processes multiple analyses concurrently for better performance
   */
  async generateLinkFilesParallel(allAnalyses, concurrency = 3) {
    const startTime = Date.now();
    const generationStats = {
      moviesProcessed: 0,
      linkFilesCreated: 0,
      totalLinksGenerated: 0,
      selfLinksExcluded: 0,
      regexErrors: 0,
      processingErrors: []
    };

    // Process analyses in parallel batches
    const processBatch = async (analysisBatch) => {
      return Promise.all(analysisBatch.map(async (analysis) => {
        try {
          const result = await this.processAnalysisForLinks(analysis);
          
          // Store in memory (simulates writing to /links/{id}.json)
          const movieId = this.sanitizeMovieId(analysis.metadata?.tmdbId);
          this.linkStorage.set(movieId, result.linkMappings);
          
          return result;
        } catch (error) {
          generationStats.processingErrors.push({
            movieId: analysis.metadata?.tmdbId,
            error: error.message
          });
          return { linkMappings: {}, stats: { selfLinksExcluded: 0, linksGenerated: 0, regexErrors: 0 } };
        }
      }));
    };

    // Split into batches and process
    const batches = [];
    for (let i = 0; i < allAnalyses.length; i += concurrency) {
      batches.push(allAnalyses.slice(i, i + concurrency));
    }

    const allResults = [];
    for (const batch of batches) {
      const batchResults = await processBatch(batch);
      allResults.push(...batchResults);
      this.performanceMetrics.parallelJobs++;
    }

    // Aggregate results
    allResults.forEach(result => {
      generationStats.moviesProcessed++;
      generationStats.linkFilesCreated++;
      generationStats.totalLinksGenerated += result.stats.linksGenerated;
      generationStats.selfLinksExcluded += result.stats.selfLinksExcluded;
      generationStats.regexErrors += result.stats.regexErrors;
    });

    this.performanceMetrics.totalProcessingTime = Date.now() - startTime;
    return generationStats;
  }

  /**
   * Process individual analysis for link generation
   */
  async processAnalysisForLinks(analysis) {
    const movieTitle = analysis.metadata?.title;
    const movieYear = analysis.metadata?.year;
    const linkMappings = {};
    const stats = { linksGenerated: 0, selfLinksExcluded: 0, regexErrors: 0 };

    // Scan all content sections for movie references
    for (const section of analysis.content) {
      try {
        const references = this.extractMovieReferencesEnhanced(section.text);
        
        references.forEach(ref => {
          // Skip self-referential links
          if (ref.title === movieTitle && ref.year === movieYear) {
            stats.selfLinksExcluded++;
            return;
          }
          
          // Create link mapping
          const linkKey = ref.fullMatch;
          const targetId = this.mockTmdbIdLookup(ref.title, ref.year);
          
          if (targetId && !linkMappings[linkKey]) {
            linkMappings[linkKey] = `/movie/${targetId}`;
            stats.linksGenerated++;
          }
        });
      } catch (error) {
        stats.regexErrors++;
        this.errorLog.push({
          section: section.type,
          error: error.message,
          text: section.text.substring(0, 100) + '...'
        });
      }
    }

    return { linkMappings, stats };
  }

  /**
   * Load link mappings from in-memory storage
   * Simulates runtime loading of pre-computed links
   */
  loadLinkMappings(movieId) {
    try {
      const sanitizedId = this.sanitizeMovieId(movieId);
      return this.linkStorage.get(sanitizedId) || {};
    } catch (error) {
      this.errorLog.push({
        operation: 'loadLinkMappings',
        movieId,
        error: error.message
      });
      return {};
    }
  }

  /**
   * Sanitize movie ID for safe storage key
   */
  sanitizeMovieId(movieId) {
    if (!movieId) return 'unknown';
    // Ensure it's a string and contains only alphanumeric characters
    return String(movieId).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Enhanced movie reference extraction with improved regex patterns
   * Handles AI-generated content variations more robustly
   */
  extractMovieReferencesEnhanced(text) {
    const references = [];
    this.performanceMetrics.regexMatches++;

    try {
      // Enhanced regex patterns for AI content variations
      const patterns = [
        // Standard pattern: **Title** (year)
        /\*\*\s*([^*]+?)\s*\*\*\s*\(\s*(\d{4})\s*\)/g,
        // Variation with extra spaces/formatting
        /\*\*\s*([^*]{2,})\s*\*\*\s*\(\s*(19\d{2}|20\d{2})\s*\)/g,
        // Handle titles with colons, dashes, special chars (but not *)
        /\*\*\s*([^*]+?[^*\s])\s*\*\*\s*\(\s*(\d{4})\s*\)/g
      ];

      patterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        
        while ((match = regex.exec(text)) !== null) {
          const title = match[1].trim();
          const year = parseInt(match[2]);
          
          // Validate extracted data
          if (this.isValidMovieReference(title, year)) {
            references.push({
              title,
              year,
              fullMatch: match[0],
              pattern: pattern.source
            });
          }
        }
      });

      // Remove duplicates (same title/year from different patterns)
      return this.deduplicateReferences(references);
      
    } catch (error) {
      this.performanceMetrics.regexFailures++;
      this.errorLog.push({
        operation: 'extractMovieReferences',
        error: error.message,
        textSample: text.substring(0, 200)
      });
      return [];
    }
  }

  /**
   * Validate extracted movie reference data
   */
  isValidMovieReference(title, year) {
    return (
      title && 
      title.length > 0 && 
      title.length < 200 && // Reasonable title length
      !isNaN(year) && 
      year >= 1880 && // Cinema invention
      year <= new Date().getFullYear() + 10 // Future releases
    );
  }

  /**
   * Remove duplicate references from different regex patterns
   */
  deduplicateReferences(references) {
    const seen = new Set();
    return references.filter(ref => {
      const key = `${ref.title}|${ref.year}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Enhanced text processing with improved error tracking
   * Uses the enhanced regex patterns and provides detailed analytics
   */
  processTextWithLinksEnhanced(text, linkMappings, currentMovieTitle = null, currentMovieYear = null) {
    const startTime = Date.now();
    const result = {
      originalText: text,
      processedText: text,
      linksApplied: [],
      linksSkipped: [],
      errorDetails: [],
      stats: {
        totalReferences: 0,
        linksApplied: 0,
        selfLinksSkipped: 0,
        secondMentionsSkipped: 0,
        unmappedReferences: 0,
        processingTimeMs: 0,
        patternsMatched: {}
      }
    };

    try {
      const alreadyLinked = new Set();
      
      // Use enhanced extraction to find all references
      const references = this.extractMovieReferencesEnhanced(text);
      result.stats.totalReferences = references.length;
      
      // Track which patterns are being matched
      references.forEach(ref => {
        const patternType = ref.pattern || 'unknown';
        result.stats.patternsMatched[patternType] = (result.stats.patternsMatched[patternType] || 0) + 1;
      });
      
      // Process each reference for linking
      let processedText = text;
      
      references.forEach(ref => {
        try {
          // Skip self-referential links
          if (ref.title === currentMovieTitle && ref.year === currentMovieYear) {
            result.stats.selfLinksSkipped++;
            result.linksSkipped.push({ 
              reason: 'self-reference', 
              match: ref.fullMatch,
              title: ref.title,
              year: ref.year
            });
            return;
          }
          
          // Skip second mentions
          if (alreadyLinked.has(ref.fullMatch)) {
            result.stats.secondMentionsSkipped++;
            result.linksSkipped.push({ 
              reason: 'second-mention', 
              match: ref.fullMatch,
              title: ref.title,
              year: ref.year
            });
            return;
          }
          
          // Check if we have a link mapping
          if (linkMappings[ref.fullMatch]) {
            alreadyLinked.add(ref.fullMatch);
            result.stats.linksApplied++;
            
            const linkHtml = `<a href="${linkMappings[ref.fullMatch]}" class="movie-link">${ref.title} (${ref.year})</a>`;
            processedText = processedText.replace(ref.fullMatch, linkHtml);
            
            result.linksApplied.push({
              originalText: ref.fullMatch,
              url: linkMappings[ref.fullMatch],
              linkText: `${ref.title} (${ref.year})`,
              title: ref.title,
              year: ref.year
            });
          } else {
            result.stats.unmappedReferences++;
            result.linksSkipped.push({ 
              reason: 'no-mapping', 
              match: ref.fullMatch,
              title: ref.title,
              year: ref.year
            });
          }
        } catch (refError) {
          result.errorDetails.push({
            reference: ref,
            error: refError.message
          });
        }
      });
      
      result.processedText = processedText;
      
    } catch (error) {
      result.errorDetails.push({
        operation: 'processTextWithLinks',
        error: error.message
      });
      // Return original text on processing error
      result.processedText = text;
    }
    
    result.stats.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Enhanced mock TMDB ID lookup with deterministic results
   * Eliminates randomness for consistent testing
   */
  mockTmdbIdLookup(title, year) {
    // Expanded mock mappings for comprehensive testing
    const mockMappings = {
      'The Matrix|1999': '603',
      'Blade Runner|1982': '78',
      'Casablanca|1942': '289',
      'Citizen Kane|1941': '15',
      'The Godfather|1972': '238',
      'Star Wars|1977': '11',
      'Fight Club|1999': '550',
      'Sunset Boulevard|1950': '599',
      'Double Indemnity|1944': '629',
      'The Apartment|1960': '284',
      'Psycho|1960': '539',
      'Vertigo|1958': '630',
      'North by Northwest|1959': '631',
      'Rear Window|1954': '632',
      'Inception|2010': '27205',
      'Interstellar|2014': '157336',
      'The Shawshank Redemption|1994': '278'
    };
    
    const key = `${title}|${year}`;
    if (mockMappings[key]) {
      return mockMappings[key];
    }
    
    // Deterministic fallback based on title/year hash instead of random
    const hash = this.simpleHash(key);
    return String(10000 + (hash % 90000)); // Generate ID between 10000-99999
  }

  /**
   * Simple hash function for deterministic ID generation
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Comprehensive performance measurement with parallel processing
   */
  async measureBatchPerformanceEnhanced(allAnalyses, concurrency = 3) {
    const startTime = Date.now();
    const stats = await this.generateLinkFilesParallel(allAnalyses, concurrency);
    const endTime = Date.now();
    
    return {
      processingTime: endTime - startTime,
      stats,
      performance: {
        moviesPerSecond: stats.moviesProcessed / ((endTime - startTime) / 1000),
        linksPerSecond: stats.totalLinksGenerated / ((endTime - startTime) / 1000),
        parallelJobsCompleted: this.performanceMetrics.parallelJobs,
        regexMatchSuccess: this.performanceMetrics.regexMatches,
        regexFailures: this.performanceMetrics.regexFailures,
        averageLinksPerMovie: stats.totalLinksGenerated / stats.moviesProcessed || 0,
        errorRate: stats.regexErrors / stats.moviesProcessed || 0
      },
      errorLog: this.errorLog.slice(), // Copy for inspection
      scalabilityProjection: this.projectScalability(stats, endTime - startTime)
    };
  }

  /**
   * Project performance for full 17k dataset
   */
  projectScalability(stats, actualTimeMs) {
    const sampledMovies = stats.moviesProcessed;
    const targetMovies = 17000;
    
    if (sampledMovies === 0) return null;
    
    const scaleFactor = targetMovies / sampledMovies;
    const projectedTimeMs = actualTimeMs * scaleFactor;
    
    return {
      targetDatasetSize: targetMovies,
      sampleSize: sampledMovies,
      projectedProcessingTimeMs: projectedTimeMs,
      projectedProcessingTimeMinutes: Math.round(projectedTimeMs / 60000),
      projectedTotalLinks: Math.round(stats.totalLinksGenerated * scaleFactor),
      feasible: projectedTimeMs < 3600000 // Less than 1 hour
    };
  }

  /**
   * Reset in-memory storage and metrics
   */
  reset() {
    this.linkStorage.clear();
    this.errorLog.length = 0;
    this.performanceMetrics = {
      totalProcessingTime: 0,
      parallelJobs: 0,
      regexMatches: 0,
      regexFailures: 0
    };
  }

  /**
   * Get comprehensive error report for debugging
   */
  getErrorReport() {
    return {
      totalErrors: this.errorLog.length,
      errorsByType: this.groupErrorsByType(),
      performanceMetrics: { ...this.performanceMetrics },
      storageStats: {
        moviesStored: this.linkStorage.size,
        totalMappings: Array.from(this.linkStorage.values())
          .reduce((sum, mappings) => sum + Object.keys(mappings).length, 0)
      }
    };
  }

  /**
   * Group errors by type for analysis
   */
  groupErrorsByType() {
    const grouped = {};
    this.errorLog.forEach(error => {
      const type = error.operation || 'unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }
}

describe('Enhanced Batch Pre-Computed Links Validation', () => {

  const processor = new EnhancedBatchLinkProcessor();
  
  // Reset before each test for isolation
  beforeEach(() => processor.reset());

  describe('C1: Enhanced Batch Generation with Parallelization', () => {

    test('should generate link mappings for multiple movies in parallel', async () => {
      const sampleAnalyses = await Promise.all(
        TEST_MOVIE_IDS.slice(0, 3).map(id => getAnalysisJson(id))
      );
      
      const stats = await processor.generateLinkFilesParallel(sampleAnalyses, 2);
      
      // Validate generation statistics
      expect(stats.moviesProcessed).toBe(3);
      expect(stats.linkFilesCreated).toBe(3);
      expect(stats.totalLinksGenerated).toBeGreaterThan(0);
      expect(stats.selfLinksExcluded).toBeGreaterThanOrEqual(0);
      
      // Validate storage was populated
      expect(processor.linkStorage.size).toBe(3);
      
      // Check that each movie has link mappings
      sampleAnalyses.forEach(analysis => {
        const movieId = processor.sanitizeMovieId(analysis.metadata?.tmdbId);
        const linkMappings = processor.loadLinkMappings(movieId);
        expect(typeof linkMappings).toBe('object');
      });
    });

    test('should exclude self-referential links during parallel generation', async () => {
      const analysis = await getAnalysisJson(TEST_MOVIE_IDS[0]);
      const stats = await processor.generateLinkFilesParallel([analysis]);
      
      // Should have processed without errors
      expect(stats.processingErrors).toHaveLength(0);
      expect(stats.selfLinksExcluded).toBeGreaterThanOrEqual(0);
      
      // Load the generated mappings and verify no self-links
      const movieId = processor.sanitizeMovieId(analysis.metadata?.tmdbId);
      const linkMappings = processor.loadLinkMappings(movieId);
      
      const movieTitle = analysis.metadata?.title;
      const movieYear = analysis.metadata?.year;
      const selfReferenceKey = `**${movieTitle}** (${movieYear})`;
      
      expect(linkMappings[selfReferenceKey]).toBeUndefined();
    });

    test('should measure and project scalability performance', async () => {
      const sampleAnalyses = await Promise.all(
        TEST_MOVIE_IDS.slice(0, 2).map(id => getAnalysisJson(id))
      );
      
      const performance = await processor.measureBatchPerformanceEnhanced(sampleAnalyses, 2);
      
      expect(performance.processingTime).toBeGreaterThan(0);
      expect(performance.stats.moviesProcessed).toBe(2);
      expect(performance.performance.moviesPerSecond).toBeGreaterThan(0);
      expect(performance.performance.parallelJobsCompleted).toBeGreaterThan(0);
      
      // Check scalability projection
      expect(performance.scalabilityProjection).toBeTruthy();
      expect(performance.scalabilityProjection.targetDatasetSize).toBe(17000);
      expect(performance.scalabilityProjection.feasible).toBeDefined();
    });

  });

  describe('C2: Enhanced Regex Pattern Matching', () => {

    test('should handle various AI-generated content formatting', () => {
      const testTexts = [
        'Standard: **The Matrix** (1999)',
        'Extra spaces: **  Blade Runner  ** (  1982  )',
        'With colons: **Dr. Strangelove: How I Learned** (1964)',
        'With dashes: **North by North-West** (1959)',
        'Invalid format: **Broken * Title** (1999)', // Should not match
        'No year: **Title Only**', // Should not match
        'Wrong format: The Matrix (1999)', // Should not match (no bold)
      ];
      
      testTexts.forEach(text => {
        const references = processor.extractMovieReferencesEnhanced(text);
        
        if (text.includes('Standard:') || text.includes('Extra spaces:') || 
            text.includes('With colons:') || text.includes('With dashes:')) {
          expect(references.length).toBeGreaterThan(0);
          references.forEach(ref => {
            expect(ref.title).toBeTruthy();
            expect(ref.year).toBeGreaterThan(1800);
            expect(ref.fullMatch).toContain('**');
          });
        } else if (text.includes('Invalid') || text.includes('No year') || text.includes('Wrong format')) {
          expect(references.length).toBe(0);
        }
      });
    });

    test('should validate movie reference data', () => {
      const validCases = [
        { title: 'The Matrix', year: 1999 },
        { title: 'A Film', year: 2024 },
        { title: 'Very Long Film Title With Many Words', year: 1950 }
      ];
      
      const invalidCases = [
        { title: '', year: 1999 }, // Empty title
        { title: 'Valid Title', year: 1800 }, // Too old
        { title: 'Valid Title', year: 2050 }, // Too future
        { title: 'A'.repeat(250), year: 1999 } // Too long title
      ];
      
      validCases.forEach(({ title, year }) => {
        expect(processor.isValidMovieReference(title, year)).toBe(true);
      });
      
      invalidCases.forEach(({ title, year }) => {
        expect(processor.isValidMovieReference(title, year)).toBe(false);
      });
    });

    test('should deduplicate references from multiple patterns', () => {
      const textWithDuplicates = 'First: **The Matrix** (1999) and second: **  The Matrix  ** (  1999  )';
      const references = processor.extractMovieReferencesEnhanced(textWithDuplicates);
      
      // Should find references but deduplicate to one
      expect(references.length).toBe(1);
      expect(references[0].title).toBe('The Matrix');
      expect(references[0].year).toBe(1999);
    });

  });

  describe('C3: Enhanced Text Processing with Error Tracking', () => {

    test('should process text with comprehensive analytics', () => {
      const testText = 'First mention **The Matrix** (1999) here. Second mention **The Matrix** (1999) here. Unknown **Mystery Film** (2025).';
      const linkMappings = {
        '**The Matrix** (1999)': '/movie/603'
      };
      
      const result = processor.processTextWithLinksEnhanced(testText, linkMappings);
      
      expect(result.stats.totalReferences).toBe(3);
      expect(result.stats.linksApplied).toBe(1);
      expect(result.stats.secondMentionsSkipped).toBe(1);
      expect(result.stats.unmappedReferences).toBe(1);
      expect(result.stats.processingTimeMs).toBeGreaterThan(0);
      
      // Check pattern tracking
      expect(result.stats.patternsMatched).toBeTruthy();
      
      // Validate link application
      expect(result.processedText).toContain('<a href="/movie/603"');
      expect(result.processedText.match(/<a href="\/movie\/603"/g)).toHaveLength(1);
    });

    test('should skip self-referential links with detailed tracking', () => {
      const testText = 'This movie **Sunset Boulevard** (1950) references itself and **The Matrix** (1999).';
      const linkMappings = {
        '**Sunset Boulevard** (1950)': '/movie/599',
        '**The Matrix** (1999)': '/movie/603'
      };
      
      const result = processor.processTextWithLinksEnhanced(
        testText, 
        linkMappings, 
        'Sunset Boulevard', 
        1950
      );
      
      expect(result.stats.totalReferences).toBe(2);
      expect(result.stats.selfLinksSkipped).toBe(1);
      expect(result.stats.linksApplied).toBe(1);
      
      // Check detailed skip tracking
      const selfSkip = result.linksSkipped.find(skip => skip.reason === 'self-reference');
      expect(selfSkip).toBeTruthy();
      expect(selfSkip.title).toBe('Sunset Boulevard');
      expect(selfSkip.year).toBe(1950);
      
      // Only The Matrix should be linked
      expect(result.processedText).toContain('<a href="/movie/603"');
      expect(result.processedText).toContain('**Sunset Boulevard** (1950)'); // Unchanged
    });

    test('should handle processing errors gracefully', () => {
      const malformedText = 'Text with problematic content: **Title** (invalid)';
      const linkMappings = {};
      
      const result = processor.processTextWithLinksEnhanced(malformedText, linkMappings);
      
      // Should complete without throwing
      expect(result.processedText).toBeTruthy();
      expect(result.errorDetails).toBeDefined();
      expect(result.stats.processingTimeMs).toBeGreaterThan(0);
    });

  });

  describe('C4: Performance and Integration Validation', () => {

    test.each(TEST_MOVIE_IDS.slice(0, 2))('should process complete movie analysis efficiently for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      // Generate link mappings for this movie
      await processor.generateLinkFilesParallel([analysis]);
      
      // Load the generated links
      const movieId = processor.sanitizeMovieId(analysis.metadata?.tmdbId || tmdbId);
      const linkMappings = processor.loadLinkMappings(movieId);
      
      // Process each content section
      const allResults = analysis.content.map(section => {
        return processor.processTextWithLinksEnhanced(
          section.text,
          linkMappings,
          analysis.metadata?.title,
          analysis.metadata?.year
        );
      });
      
      // Validate no processing errors
      allResults.forEach(result => {
        expect(result.processedText).toBeTruthy();
        expect(result.stats.totalReferences).toBeGreaterThanOrEqual(0);
        expect(result.stats.processingTimeMs).toBeGreaterThan(0);
        
        // If links were applied, validate they're properly formatted
        result.linksApplied.forEach(link => {
          expect(link.url).toMatch(/^\/movie\/\d+$/);
          expect(result.processedText).toContain(link.url);
        });
      });
    });

    test('should demonstrate complete enhanced workflow', async () => {
      // Step 1: Generate link mappings for multiple movies in parallel
      const multipleAnalyses = await Promise.all(
        TEST_MOVIE_IDS.slice(0, 2).map(id => getAnalysisJson(id))
      );
      
      const performance = await processor.measureBatchPerformanceEnhanced(multipleAnalyses, 2);
      
      expect(performance.stats.moviesProcessed).toBe(2);
      expect(performance.stats.linkFilesCreated).toBe(2);
      expect(performance.performance.parallelJobsCompleted).toBeGreaterThan(0);
      
      // Step 2: Process content with enhanced linking
      const targetAnalysis = multipleAnalyses[0];
      const movieId = processor.sanitizeMovieId(targetAnalysis.metadata?.tmdbId);
      const linkMappings = processor.loadLinkMappings(movieId);
      
      const sampleSection = targetAnalysis.content[0];
      const result = processor.processTextWithLinksEnhanced(
        sampleSection.text,
        linkMappings,
        targetAnalysis.metadata?.title,
        targetAnalysis.metadata?.year
      );
      
      // Validate complete workflow
      expect(Object.keys(linkMappings).length).toBeGreaterThanOrEqual(0);
      expect(result.processedText).toBeTruthy();
      expect(result.stats.processingTimeMs).toBeGreaterThan(0);
      
      // Check scalability projection
      expect(performance.scalabilityProjection).toBeTruthy();
      expect(performance.scalabilityProjection.feasible).toBeDefined();
    });

    test('should provide comprehensive error reporting', async () => {
      // Process some analyses to generate errors and metrics
      const analyses = await Promise.all(
        TEST_MOVIE_IDS.slice(0, 2).map(id => getAnalysisJson(id))
      );
      
      await processor.generateLinkFilesParallel(analyses);
      
      const errorReport = processor.getErrorReport();
      
      expect(errorReport).toHaveProperty('totalErrors');
      expect(errorReport).toHaveProperty('errorsByType');
      expect(errorReport).toHaveProperty('performanceMetrics');
      expect(errorReport).toHaveProperty('storageStats');
      
      expect(errorReport.storageStats.moviesStored).toBe(2);
      expect(errorReport.performanceMetrics.regexMatches).toBeGreaterThan(0);
    });

    test('should validate analysis JSON immutability', async () => {
      const analysis = await getAnalysisJson(TEST_MOVIE_IDS[0]);
      const originalContent = JSON.stringify(analysis.content);
      
      // Process through entire enhanced workflow
      await processor.generateLinkFilesParallel([analysis]);
      const movieId = processor.sanitizeMovieId(analysis.metadata?.tmdbId);
      const linkMappings = processor.loadLinkMappings(movieId);
      
      processor.processTextWithLinksEnhanced(
        analysis.content[0].text,
        linkMappings,
        analysis.metadata?.title,
        analysis.metadata?.year
      );
      
      // Analysis JSON should remain unchanged
      const finalContent = JSON.stringify(analysis.content);
      expect(finalContent).toBe(originalContent);
      
      // This validates that analysis JSON stays pure while linking operates separately
    });

  });

});

// Export for use in other test files
module.exports = { EnhancedBatchLinkProcessor, TEST_MOVIE_IDS };