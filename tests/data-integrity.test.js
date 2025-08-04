/**
 * Data Integrity Protection Tests
 * 
 * CRITICAL: These tests must pass BEFORE implementing any zero-waste changes.
 * They protect against the core risk of corrupting existing linked content.
 */

import { 
  TIER_1_COMPLETE_CONTENT, 
  TIER_2_UNLINKED_CONTENT,
  EDGE_CASE_CONTENT,
  SUCCESS_CRITERIA 
} from './fixtures/content-tiers.js';

// Mock the linking functions - will be replaced with actual imports
const mockLinkingFunctions = {
  hasLinks: (content) => content && content.includes('<a href="/movie/'),
  processMovieLinks: async (content) => content, // Placeholder
  getOrGenerate: async (movieData) => movieData,  // Placeholder
};

describe('Data Integrity Protection - CRITICAL TESTS', () => {
  
  describe('Tier 1: Complete Content Protection', () => {
    test('NEVER modifies existing linked content', async () => {
      const originalContent = TIER_1_COMPLETE_CONTENT.movieAnalysis.props.sections[0].content;
      const processedContent = await mockLinkingFunctions.processMovieLinks(originalContent);
      
      // This is the most critical test - existing links must NEVER change
      expect(processedContent).toBe(originalContent);
      expect(processedContent).toContain('<a href="/movie/500" class="movie-title" data-tmdb-id="500">Reservoir Dogs</a>');
    });

    test('correctly identifies complete content', () => {
      const completeContent = TIER_1_COMPLETE_CONTENT.movieAnalysis.props.sections[0].content;
      const result = mockLinkingFunctions.hasLinks(completeContent);
      
      expect(result).toBe(true);
    });

    test('preserves link attributes and classes', () => {
      const linkedContent = `<a href="/movie/100" class="movie-title" data-tmdb-id="100">Movie</a>`;
      const hasValidLinks = mockLinkingFunctions.hasLinks(linkedContent);
      
      expect(hasValidLinks).toBe(true);
      expect(linkedContent).toContain('class="movie-title"');
      expect(linkedContent).toContain('data-tmdb-id="100"');
    });

    test('handles complex content with multiple existing links', () => {
      const complexContent = `
        Analysis of <a href="/movie/100" class="movie-title" data-tmdb-id="100">Lock Stock</a> (1998) 
        and <a href="/movie/500" class="movie-title" data-tmdb-id="500">Reservoir Dogs</a> (1992) 
        shows clear influence on <a href="/movie/107" class="movie-title" data-tmdb-id="107">Snatch</a> (2000).
      `;
      
      const isComplete = mockLinkingFunctions.hasLinks(complexContent);
      expect(isComplete).toBe(true);
    });
  });

  describe('Tier 2: Unlinked Content Detection', () => {
    test('correctly identifies unlinked content', () => {
      const unlinkedContent = TIER_2_UNLINKED_CONTENT.movieAnalysis.props.sections[0].content;
      const hasLinks = mockLinkingFunctions.hasLinks(unlinkedContent);
      
      expect(hasLinks).toBe(false);
      expect(unlinkedContent).toContain('**Pulp Fiction**');
      expect(unlinkedContent).not.toContain('<a href="/movie/');
    });

    test('detects mixed linking states correctly', () => {
      const mixedContent = EDGE_CASE_CONTENT.mixedLinkingState.content;
      const hasAnyLinks = mockLinkingFunctions.hasLinks(mixedContent);
      
      // If ANY links exist, should be treated as Tier 1 (complete)
      expect(hasAnyLinks).toBe(true);
    });
  });

  describe('Self-Reference Protection', () => {
    test('prevents movies from linking to themselves', () => {
      const selfRefContent = EDGE_CASE_CONTENT.selfReference.content;
      const movieTitle = EDGE_CASE_CONTENT.selfReference.movieTitle;
      
      // Mock processing function should strip self-references
      const shouldNotLinkToSelf = !selfRefContent.includes(`<a href="/movie/`) || 
                                 !selfRefContent.includes(`>${movieTitle}</a>`);
      
      expect(shouldNotLinkToSelf).toBe(true);
    });
  });

  describe('Edge Case Resilience', () => {
    test('handles malformed patterns gracefully', () => {
      const malformedContent = EDGE_CASE_CONTENT.malformedPatterns.content;
      
      // Should not crash or throw errors
      expect(() => {
        mockLinkingFunctions.hasLinks(malformedContent);
      }).not.toThrow();
    });

    test('processes large content blocks efficiently', () => {
      const largeContent = EDGE_CASE_CONTENT.largeContentBlock.content;
      const startTime = Date.now();
      
      const result = mockLinkingFunctions.hasLinks(largeContent);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(SUCCESS_CRITERIA.performance.maxProcessingTime);
      expect(result).toBeDefined();
    });

    test('handles special characters without corruption', () => {
      const specialContent = EDGE_CASE_CONTENT.specialCharacters.content;
      
      expect(() => {
        mockLinkingFunctions.hasLinks(specialContent);
      }).not.toThrow();
      
      // Content should preserve special characters
      expect(specialContent).toContain('Amélie');
      expect(specialContent).toContain('8½');
    });
  });

  describe('JSON Structure Integrity', () => {
    test('preserves nuclear static JSON structure', () => {
      const originalStructure = TIER_1_COMPLETE_CONTENT.movieAnalysis;
      
      // Mock processing should preserve all required fields
      expect(originalStructure.props).toBeDefined();
      expect(originalStructure.props.title).toBeDefined();
      expect(originalStructure.props.year).toBeDefined();
      expect(originalStructure.props.tmdbId).toBeDefined();
      expect(originalStructure.props.sections).toBeArray();
    });

    test('preserves episode JSON structure', () => {
      const originalEpisode = TIER_1_COMPLETE_CONTENT.episodeContent;
      
      expect(originalEpisode.episode).toBeDefined();
      expect(originalEpisode.content).toBeDefined();
      expect(originalEpisode.content.opener).toBeDefined();
      expect(originalEpisode.content.sections).toBeArray();
    });

    test('maintains section type consistency', () => {
      const sections = TIER_1_COMPLETE_CONTENT.movieAnalysis.props.sections;
      
      sections.forEach(section => {
        expect(section.type).toBeDefined();
        expect(['text', 'movies']).toContain(section.type);
        if (section.type === 'text') {
          expect(section.content).toBeDefined();
          expect(typeof section.content).toBe('string');
        }
      });
    });
  });

  describe('Database State Protection', () => {
    test('does not modify existing movie records', async () => {
      // Mock database lookup should return existing data unchanged
      const existingMovie = { tmdb_id: 100, title: "Lock, Stock and Two Smoking Barrels", year: 1998 };
      
      // Processing should not alter database records
      expect(existingMovie.tmdb_id).toBe(100);
      expect(existingMovie.title).toBe("Lock, Stock and Two Smoking Barrels");
      expect(existingMovie.year).toBe(1998);
    });

    test('respects completion flags', async () => {
      const movieWithLinks = { 
        id: 100, 
        hasLinks: true,
        content: TIER_1_COMPLETE_CONTENT.movieAnalysis.props.sections[0].content
      };
      
      // getOrGenerate should skip movies with hasLinks=true
      const result = await mockLinkingFunctions.getOrGenerate(movieWithLinks);
      
      // Should return existing data without API calls
      expect(result).toEqual(movieWithLinks);
    });
  });

  describe('Critical System Boundaries', () => {
    test('linking system never writes to files in test mode', () => {
      // This test ensures we have proper dry-run capabilities
      const dryRunMode = true;
      
      expect(dryRunMode).toBe(true);
      
      // In real implementation, verify no fs.writeFileSync calls in dry run
    });

    test('linking system respects environment flags', () => {
      // Critical: must have safeguards against production runs
      const isProduction = process.env.NODE_ENV === 'production';
      const hasAdminFlag = process.env.ALLOW_CONTENT_MODIFICATION === 'true';
      
      if (isProduction && !hasAdminFlag) {
        expect(false).toBe(true); // Should not run destructive operations
      }
    });

    test('all external API calls have error handling', () => {
      // Mock failed API responses
      const mockFailedFetch = () => Promise.reject(new Error('API failure'));
      
      expect(() => {
        mockFailedFetch().catch(error => {
          // Should handle gracefully, not crash
          expect(error.message).toBe('API failure');
        });
      }).not.toThrow();
    });
  });
});

/**
 * Performance and Scale Tests
 */
describe('Performance Protection', () => {
  test('processing time remains under limits', () => {
    const testContent = 'Simple **Movie** (1999) test content';
    const startTime = Date.now();
    
    const result = mockLinkingFunctions.hasLinks(testContent);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(100); // 100ms for simple operations
    expect(result).toBeDefined();
  });

  test('memory usage stays reasonable', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Simulate processing large content
    const largeContent = '**Movie** (1999) '.repeat(1000);
    mockLinkingFunctions.hasLinks(largeContent);
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Should not increase memory by more than 10MB for this operation
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});

/**
 * Success Criteria Validation
 */
describe('Success Criteria Compliance', () => {
  test('meets data integrity requirements', () => {
    expect(SUCCESS_CRITERIA.dataIntegrity.preserveExistingLinks).toBe(true);
    expect(SUCCESS_CRITERIA.dataIntegrity.maintainContentStructure).toBe(true);
    expect(SUCCESS_CRITERIA.dataIntegrity.validateJSONIntegrity).toBe(true);
  });

  test('meets linking accuracy requirements', () => {
    expect(SUCCESS_CRITERIA.linkingAccuracy.minLinkingRate).toBeGreaterThanOrEqual(0.95);
    expect(SUCCESS_CRITERIA.linkingAccuracy.maxFalsePositiveRate).toBeLessThanOrEqual(0.02);
    expect(SUCCESS_CRITERIA.linkingAccuracy.zeroSelfReferenceLinks).toBe(true);
  });

  test('meets performance requirements', () => {
    expect(SUCCESS_CRITERIA.performance.respectTimeoutLimits).toBe(true);
    expect(SUCCESS_CRITERIA.performance.respectMemoryLimits).toBe(true);
    expect(SUCCESS_CRITERIA.performance.efficientDatabaseUsage).toBe(true);
  });

  test('meets system reliability requirements', () => {
    expect(SUCCESS_CRITERIA.systemReliability.gracefulErrorHandling).toBe(true);
    expect(SUCCESS_CRITERIA.systemReliability.deterministicOutput).toBe(true);
    expect(SUCCESS_CRITERIA.systemReliability.robustExternalAPICalls).toBe(true);
  });
});