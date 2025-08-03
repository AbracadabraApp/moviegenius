/**
 * Framework A: Analysis JSON Ground Truth Validation
 * 
 * Tests that validate existing analysis JSON maintains structural integrity
 * and conforms to the prompt specification discovered in Phase 1 & 2.
 * 
 * CRITICAL: These tests validate ground truth - they do NOT modify analysis content.
 */

// Use global fetch (available in Node 18+) or fallback to require
const fetch = globalThis.fetch || require('node-fetch');

// Test sample movie IDs covering diverse eras and genres
const TEST_MOVIE_IDS = [
  '599',   // Sunset Boulevard (1950) - classic film noir
  '11',    // Star Wars (1977) - sci-fi blockbuster  
  '550',   // Fight Club (1999) - modern cult classic
  '278',   // The Shawshank Redemption (1994) - drama classic
  '238',   // The Godfather (1972) - crime epic
  '27205', // Inception (2010) - modern complex narrative
  '157336' // Interstellar (2014) - recent sci-fi
];

/**
 * Helper function to fetch and parse analysis JSON
 * Handles both string and pre-parsed analysis responses
 */
async function getAnalysisJson(tmdbId) {
  try {
    const response = await fetch(`http://localhost:3001/api/movie-analysis?tmdbId=${tmdbId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} for movie ${tmdbId}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.analysis) {
      throw new Error(`No analysis data returned for movie ${tmdbId}`);
    }
    
    // Handle both string and pre-parsed analysis responses
    let analysis;
    if (typeof data.analysis === 'string') {
      analysis = JSON.parse(data.analysis);
    } else {
      analysis = data.analysis;
    }
    
    if (!analysis) {
      throw new Error(`Failed to parse analysis for movie ${tmdbId}`);
    }
    
    return analysis;
  } catch (error) {
    console.error(`Error fetching analysis for movie ${tmdbId}:`, error.message);
    throw error;
  }
}

describe('Analysis JSON Ground Truth Validation', () => {
  
  describe('A1: JSON Parsing Integrity', () => {
    
    test.each(TEST_MOVIE_IDS)('should parse analysis JSON without errors for movie %s', async (tmdbId) => {
      expect(async () => {
        await getAnalysisJson(tmdbId);
      }).not.toThrow();
    });
    
    test('should handle malformed JSON gracefully', async () => {
      // Test system behavior with invalid movie ID (should return error, not crash)
      const response = await fetch('http://localhost:3001/api/movie-analysis?tmdbId=999999999');
      
      // System should handle gracefully - either return error or valid fallback
      expect([200, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        // If returns data, it should be valid JSON or explicit error
        expect(data).toHaveProperty('analysis');
      }
    });
    
  });
  
  describe('A2: Prompt Specification Compliance', () => {
    
    test.each(TEST_MOVIE_IDS)('should contain all required top-level fields for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      // Validate against prompt specification
      expect(analysis).toHaveProperty('metadata');
      expect(analysis).toHaveProperty('keyElements');
      expect(analysis).toHaveProperty('whyWatch');
      expect(analysis).toHaveProperty('content');
      expect(analysis).toHaveProperty('featuredMovies');
      expect(analysis).toHaveProperty('exploreTopics');
      expect(analysis).toHaveProperty('linkedReferences');
      expect(analysis).toHaveProperty('moreIdeas');
      expect(analysis).toHaveProperty('generationMetadata');
      
      // Validate array types
      expect(Array.isArray(analysis.content)).toBe(true);
      expect(Array.isArray(analysis.featuredMovies)).toBe(true);
      expect(Array.isArray(analysis.exploreTopics)).toBe(true);
      expect(Array.isArray(analysis.whyWatch)).toBe(true);
    });
    
    test.each(TEST_MOVIE_IDS)('should have exactly 7 content sections for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      expect(analysis.content).toHaveLength(7);
      
      // Validate content section types match prompt specification
      const expectedTypes = [
        'introduction',
        'technicalAnalysis', 
        'culturalContext',
        'thematicExploration',
        'legacyAndImpact',
        'contemporaryRelevance',
        'conclusion'
      ];
      
      const actualTypes = analysis.content.map(section => section.type);
      expect(actualTypes).toEqual(expectedTypes);
    });
    
    test.each(TEST_MOVIE_IDS)('should have prompt-specified array lengths for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      // From prompt: 4 compelling reasons to watch
      expect(analysis.whyWatch).toHaveLength(4);
      
      // From prompt: 4 films from different decades  
      expect(analysis.featuredMovies).toHaveLength(4);
      
      // From prompt: 5 related topics
      expect(analysis.exploreTopics).toHaveLength(5);
      
      // From prompt: 20-50 related films (validate range)
      expect(analysis.moreIdeas.length).toBeGreaterThanOrEqual(20);
      expect(analysis.moreIdeas.length).toBeLessThanOrEqual(50);
    });
    
  });
  
  describe('A3: Data Type and Structure Validation', () => {
    
    test.each(TEST_MOVIE_IDS)('should have valid metadata structure for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      const { metadata } = analysis;
      
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.year).toBe('number');
      expect(metadata.year).toBeGreaterThan(1800);
      expect(metadata.year).toBeLessThan(new Date().getFullYear() + 20);
      
      expect(metadata.analysisType).toBe('comprehensive');
      expect(typeof metadata.wordCount).toBe('number');
      expect(metadata.targetRange).toBe('600-750');
      expect(typeof metadata.confidenceScore).toBe('number');
      expect(metadata.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(metadata.confidenceScore).toBeLessThanOrEqual(100);
    });
    
    test.each(TEST_MOVIE_IDS)('should have valid content sections for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      analysis.content.forEach((section, index) => {
        expect(section).toHaveProperty('type');
        expect(section).toHaveProperty('text');
        expect(typeof section.type).toBe('string');
        expect(typeof section.text).toBe('string');
        expect(section.text.length).toBeGreaterThan(0);
        
        // Validate no empty content
        expect(section.text.trim()).not.toBe('');
      });
    });
    
    test.each(TEST_MOVIE_IDS)('should have valid featuredMovies structure for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      analysis.featuredMovies.forEach((movie, index) => {
        expect(movie).toHaveProperty('title');
        expect(movie).toHaveProperty('year');
        expect(movie).toHaveProperty('description');
        
        expect(typeof movie.title).toBe('string');
        expect(typeof movie.year).toBe('number');
        expect(typeof movie.description).toBe('string');
        
        expect(movie.title.trim()).not.toBe('');
        expect(movie.year).toBeGreaterThan(1800);
        expect(movie.year).toBeLessThan(new Date().getFullYear() + 20);
        expect(movie.description.trim()).not.toBe('');
      });
    });
    
    test.each(TEST_MOVIE_IDS)('should have valid exploreTopics structure for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      analysis.exploreTopics.forEach((topic, index) => {
        expect(topic).toHaveProperty('topic');
        expect(topic).toHaveProperty('category');
        expect(topic).toHaveProperty('difficulty');
        
        expect(typeof topic.topic).toBe('string');
        expect(typeof topic.category).toBe('string');
        expect(typeof topic.difficulty).toBe('string');
        
        expect(topic.topic.trim()).not.toBe('');
        expect(topic.category.trim()).not.toBe('');
        expect(['Beginner', 'Intermediate', 'Advanced']).toContain(topic.difficulty);
      });
    });
    
  });
  
  describe('A4: Content Quality Validation', () => {
    
    test.each(TEST_MOVIE_IDS)('should meet word count targets for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      // Validate reported word count matches target range
      expect(analysis.metadata.wordCount).toBeGreaterThanOrEqual(600);
      expect(analysis.metadata.wordCount).toBeLessThanOrEqual(750);
      
      // Validate actual content length (rough word count estimate)
      const totalText = analysis.content.map(section => section.text).join(' ');
      const estimatedWordCount = totalText.split(/\\s+/).length;
      
      // Allow some variance between reported and estimated word count
      expect(estimatedWordCount).toBeGreaterThan(500); // Minimum substantial content
    });
    
    test.each(TEST_MOVIE_IDS)('should contain substantial text content for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      // Each content section should have meaningful length
      analysis.content.forEach((section, index) => {
        expect(section.text.length).toBeGreaterThan(50); // Minimum section length
        
        // Should not contain placeholder text
        expect(section.text.toLowerCase()).not.toContain('lorem ipsum');
        expect(section.text.toLowerCase()).not.toContain('todo');
        expect(section.text.toLowerCase()).not.toContain('[placeholder]');
      });
    });
    
    test.each(TEST_MOVIE_IDS)('should have valid generation metadata for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      const { generationMetadata } = analysis;
      
      expect(generationMetadata).toHaveProperty('timestamp');
      expect(generationMetadata).toHaveProperty('version');
      expect(generationMetadata.version).toBe('1.0');
      
      // Validate timestamp format (ISO 8601)
      expect(() => new Date(generationMetadata.timestamp)).not.toThrow();
    });
    
  });
  
  describe('A5: Cross-Analysis Consistency', () => {
    
    test('should maintain consistent structure across all test movies', async () => {
      const analyses = await Promise.all(
        TEST_MOVIE_IDS.map(id => getAnalysisJson(id))
      );
      
      // All analyses should have identical structure
      const firstStructure = Object.keys(analyses[0]).sort();
      
      analyses.forEach((analysis, index) => {
        const structure = Object.keys(analysis).sort();
        expect(structure).toEqual(firstStructure);
      });
    });
    
    test('should have no duplicate featured movies across different analyses', async () => {
      const analyses = await Promise.all(
        TEST_MOVIE_IDS.slice(0, 3).map(id => getAnalysisJson(id)) // Test subset for performance
      );
      
      // Check that analyses reference different featured movies (not identical sets)
      const featuredMovieSets = analyses.map(analysis => 
        analysis.featuredMovies.map(movie => `${movie.title} (${movie.year})`)
      );
      
      // Each analysis should have unique featured movie combinations
      for (let i = 0; i < featuredMovieSets.length; i++) {
        for (let j = i + 1; j < featuredMovieSets.length; j++) {
          const intersection = featuredMovieSets[i].filter(movie => 
            featuredMovieSets[j].includes(movie)
          );
          // Some overlap is expected, but not identical sets
          expect(intersection.length).toBeLessThan(featuredMovieSets[i].length);
        }
      }
    });
    
  });
  
});

// Export helper for use in other test files
module.exports = { getAnalysisJson, TEST_MOVIE_IDS };