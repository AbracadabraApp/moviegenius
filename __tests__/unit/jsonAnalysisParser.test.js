// __tests__/unit/jsonAnalysisParser.test.js
/**
 * Comprehensive failing test suite for JSON Analysis Parser
 * These tests will ALL FAIL until the developer implements the functionality
 */

import { 
  parseJSONAnalysis,
  validateJSONAnalysis,
  buildAlternatingLayout,
  detectAnalysisFormat
} from '../../lib/analysis/jsonAnalysisParser';
import { loadTestFixtures } from '../fixtures/verifiedJsonAnalyses';
import Ajv from 'ajv';
import movieAnalysisSchema from '../schemas/movieAnalysisSchema.json';

describe('JSON Analysis Parser - Core Functions', () => {
  let testFixtures;
  
  beforeAll(async () => {
    testFixtures = await loadTestFixtures();
  });

  describe('detectAnalysisFormat', () => {
    test('detects JSON format from real analysis object', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const format = detectAnalysisFormat(testFixtures.FILM_NOIR_SAMPLE);
      expect(format).toBe('json');
    });

    test('detects JSON format from stringified analysis', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const jsonString = JSON.stringify(testFixtures.CLASSIC_DRAMA_SAMPLE);
      const format = detectAnalysisFormat(jsonString);
      expect(format).toBe('json');
    });

    test('detects unknown format for malformed data', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const format = detectAnalysisFormat('invalid data');
      expect(format).toBe('unknown');
    });

    test('detects text format for legacy PARAGRAPH: content', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const legacyText = 'PARAGRAPH: This is old format\nMOVIES: Title|2000|Description|Streaming';
      const format = detectAnalysisFormat(legacyText);
      expect(format).toBe('text');
    });
  });

  describe('validateJSONAnalysis', () => {
    test('validates complete film noir analysis as valid', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const validation = validateJSONAnalysis(testFixtures.FILM_NOIR_SAMPLE);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.criticalFailures).toHaveLength(0);
    });

    test('validates classic drama analysis structure', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const validation = validateJSONAnalysis(testFixtures.CLASSIC_DRAMA_SAMPLE);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('identifies missing required fields', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const incompleteAnalysis = {
        metadata: { title: 'Test', year: 2000 }
        // Missing required fields
      };
      
      const validation = validateJSONAnalysis(incompleteAnalysis);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing required field: keyElements');
      expect(validation.errors).toContain('Missing required field: content');
    });

    test('validates word count is within range', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const analysisWithBadWordCount = {
        ...testFixtures.FILM_NOIR_SAMPLE,
        metadata: {
          ...testFixtures.FILM_NOIR_SAMPLE.metadata,
          wordCount: 2000 // Outside 700-1100 range
        }
      };
      
      const validation = validateJSONAnalysis(analysisWithBadWordCount);
      
      expect(validation.errors).toContain('Word count 2000 outside expected range (700-1100)');
    });

    test('validates content sections are complete', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const analysisWithMissingSection = {
        ...testFixtures.CLASSIC_DRAMA_SAMPLE,
        content: testFixtures.CLASSIC_DRAMA_SAMPLE.content.slice(0, 5) // Remove sections
      };
      
      const validation = validateJSONAnalysis(analysisWithMissingSection);
      
      expect(validation.errors).toContain('Missing content section: legacyAndImpact');
      expect(validation.errors).toContain('Missing content section: conclusion');
    });
  });

  describe('parseJSONAnalysis', () => {
    test('parses complete film noir analysis correctly', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const result = parseJSONAnalysis(testFixtures.FILM_NOIR_SAMPLE);

      expect(result.textSections).toHaveLength(7);
      expect(result.featuredMovies).toHaveLength(4);
      expect(result.exploreTopics).toHaveLength(5);
      expect(result.moreIdeas.length).toBeGreaterThan(5);
      expect(result.format).toBe('json');
      expect(result.isJsonFormat).toBe(true);
      expect(result.entityStats.totalWordCount).toBeGreaterThan(800);
      expect(result.entityStats.totalWordCount).toBeLessThan(1100);
    });

    test('parses stringified JSON analysis', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const jsonString = JSON.stringify(testFixtures.CLASSIC_DRAMA_SAMPLE);
      const result = parseJSONAnalysis(jsonString);

      expect(result.textSections).toHaveLength(7);
      expect(result.metadata.title).toBe(testFixtures.CLASSIC_DRAMA_SAMPLE.metadata.title);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    test('processes text sections with proper structure', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const result = parseJSONAnalysis(testFixtures.FILM_NOIR_SAMPLE);

      const sectionTypes = result.textSections.map(section => section.type);
      expect(sectionTypes).toContain('introduction');
      expect(sectionTypes).toContain('technicalAnalysis');
      expect(sectionTypes).toContain('culturalContext');
      expect(sectionTypes).toContain('thematicExploration');
      expect(sectionTypes).toContain('legacyAndImpact');
      expect(sectionTypes).toContain('contemporaryRelevance');
      expect(sectionTypes).toContain('conclusion');

      // Each section should have word count
      result.textSections.forEach(section => {
        expect(section.wordCount).toBeGreaterThan(0);
        expect(section.text).toContain('**'); // Should have film title formatting
      });
    });

    test('processes featured movies with defaults', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const result = parseJSONAnalysis(testFixtures.CLASSIC_DRAMA_SAMPLE);

      result.featuredMovies.forEach(movie => {
        expect(movie.title).toBeDefined();
        expect(movie.year).toBeGreaterThan(1888);
        expect(movie.description).toBeDefined();
        expect(movie.slug).toMatch(/^[a-z0-9-]+-\d{4}$/);
        // Should have defaults for missing data
        expect(movie.poster_url).toBeDefined(); // null or actual URL
        expect(movie.streaming).toBeDefined(); // null or actual data
        expect(movie.tmdb_id).toBeDefined(); // null or actual ID
      });
    });

    test('throws descriptive error for malformed JSON', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      expect(() => parseJSONAnalysis('invalid json')).toThrow(
        'Invalid JSON analysis format: Unexpected token'
      );
    });

    test('throws error for missing required data', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const incompleteJson = { metadata: { title: 'Test' } };
      expect(() => parseJSONAnalysis(incompleteJson)).toThrow();
    });

    test('includes processing metadata', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const result = parseJSONAnalysis(testFixtures.FILM_NOIR_SAMPLE);

      expect(result.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.entityStats).toEqual({
        totalEntities: expect.any(Number),
        movies: expect.any(Number),
        people: expect.any(Number),
        totalSections: 7,
        totalWordCount: expect.any(Number)
      });
    });
  });

  describe('buildAlternatingLayout', () => {
    test('creates proper alternating text->movies->explore pattern', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const parsed = parseJSONAnalysis(testFixtures.FILM_NOIR_SAMPLE);
      const layout = buildAlternatingLayout(
        parsed.textSections, 
        parsed.featuredMovies, 
        parsed.exploreTopics
      );

      expect(layout[0].type).toBe('text');
      expect(layout[1].type).toBe('text');
      expect(layout[2].type).toBe('featured-movies'); // After text section 1
      expect(layout[4].type).toBe('featured-movies'); // After text section 3
      expect(layout[layout.length - 1].type).toBe('explore-topics');
    });

    test('assigns unique IDs to layout sections', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const parsed = parseJSONAnalysis(testFixtures.CLASSIC_DRAMA_SAMPLE);
      const layout = buildAlternatingLayout(
        parsed.textSections,
        parsed.featuredMovies,
        parsed.exploreTopics
      );

      const ids = layout.map(section => section.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size); // All IDs should be unique
      
      expect(ids.filter(id => id.startsWith('text-'))).toHaveLength(7);
      expect(ids.filter(id => id.startsWith('featured-movies-'))).toHaveLength(2);
      expect(ids.filter(id => id === 'explore-topics')).toHaveLength(1);
    });

    test('handles edge case with minimal content', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const layout = buildAlternatingLayout([{ type: 'introduction', text: 'Test' }], [], []);
      
      expect(layout).toHaveLength(1);
      expect(layout[0].type).toBe('text');
      expect(layout[0].content.type).toBe('introduction');
    });

    test('distributes featured movies at strategic points', () => {
      // ❌ WILL FAIL - function doesn't exist yet
      const parsed = parseJSONAnalysis(testFixtures.FILM_NOIR_SAMPLE);
      const layout = buildAlternatingLayout(
        parsed.textSections,
        parsed.featuredMovies,
        parsed.exploreTopics
      );

      const movieSections = layout.filter(section => section.type === 'featured-movies');
      expect(movieSections).toHaveLength(2);
      
      // First group should have 2 movies
      expect(movieSections[0].content).toHaveLength(2);
      // Second group should have remaining movies
      expect(movieSections[1].content).toHaveLength(parsed.featuredMovies.length - 2);
    });
  });
});

describe('JSON Analysis Schema Validation', () => {
  let testFixtures;
  let ajv;
  let validate;
  
  beforeAll(async () => {
    testFixtures = await loadTestFixtures();
    ajv = new Ajv({ allErrors: true });
    validate = ajv.compile(movieAnalysisSchema);
  });

  test('validates real film noir analysis against schema', () => {
    // ❌ WILL FAIL - schema validation setup needed
    const isValid = validate(testFixtures.FILM_NOIR_SAMPLE);
    expect(isValid).toBe(true);
    if (!isValid) {
      console.log('Schema validation errors:', validate.errors);
    }
  });

  test('validates real classic drama analysis against schema', () => {
    // ❌ WILL FAIL - schema validation setup needed
    const isValid = validate(testFixtures.CLASSIC_DRAMA_SAMPLE);
    expect(isValid).toBe(true);
  });

  test('validates minimal content analysis meets requirements', () => {
    // ❌ WILL FAIL - schema validation setup needed
    const isValid = validate(testFixtures.MINIMAL_CONTENT_SAMPLE);
    expect(isValid).toBe(true);
  });

  test('validates maximal content analysis meets requirements', () => {
    // ❌ WILL FAIL - schema validation setup needed
    const isValid = validate(testFixtures.MAXIMAL_CONTENT_SAMPLE);
    expect(isValid).toBe(true);
  });
});

describe('Error Handling and Edge Cases', () => {
  test('handles null input gracefully', () => {
    // ❌ WILL FAIL - error handling not implemented
    expect(() => parseJSONAnalysis(null)).toThrow('Invalid input');
  });

  test('handles undefined input gracefully', () => {
    // ❌ WILL FAIL - error handling not implemented
    expect(() => parseJSONAnalysis(undefined)).toThrow('Invalid input');
  });

  test('handles empty object gracefully', () => {
    // ❌ WILL FAIL - error handling not implemented
    expect(() => parseJSONAnalysis({})).toThrow('Missing required fields');
  });

  test('handles corrupted JSON structure', () => {
    // ❌ WILL FAIL - error handling not implemented
    const corruptedData = {
      metadata: null,
      content: 'not an array',
      featuredMovies: 123
    };
    
    expect(() => parseJSONAnalysis(corruptedData)).toThrow();
  });
});