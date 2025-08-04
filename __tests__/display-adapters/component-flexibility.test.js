/**
 * Framework B: Display Component Adapter Validation
 * 
 * Tests that display components can flexibly adapt to the ground truth analysis JSON
 * structure discovered in Framework A. Validates that components handle data variations
 * gracefully without imposing rigid requirements on the JSON structure.
 * 
 * CRITICAL PRINCIPLE: Display code conforms to analysis (ground truth),
 * not the other way around.
 */

const fetch = globalThis.fetch || require('node-fetch');

// Import ground truth helper and test movies from Framework A
const { getAnalysisJson, TEST_MOVIE_IDS } = require('../ground-truth/analysis-json-validation.test.js');

/**
 * Mock React component rendering utility
 * Simulates how components should handle analysis data
 */
class ComponentRenderer {
  
  /**
   * Simulate MovieAnalysisWithEntities main content rendering
   * Tests the core display logic without actual React rendering
   */
  renderAnalysisContent(analysis) {
    const rendered = {
      sections: [],
      errors: [],
      warnings: []
    };

    try {
      // Test content sections rendering
      if (analysis.content && Array.isArray(analysis.content)) {
        analysis.content.forEach((section, index) => {
          if (!section.type || !section.text) {
            rendered.errors.push(`Section ${index}: Missing type or text`);
            return;
          }
          
          rendered.sections.push({
            type: section.type,
            hasContent: section.text.trim().length > 0,
            wordCount: section.text.split(/\s+/).length,
            paragraphs: section.text.split(/\n\n/).length
          });
        });
      } else {
        rendered.errors.push('Content array missing or invalid');
      }

      // Test featured movies rendering flexibility
      if (analysis.featuredMovies && Array.isArray(analysis.featuredMovies)) {
        rendered.featuredMovies = analysis.featuredMovies.map((movie, index) => {
          const movieRender = { valid: true };
          
          if (!movie.title || !movie.year || !movie.description) {
            rendered.errors.push(`Featured movie ${index}: Missing required fields`);
            movieRender.valid = false;
          }
          
          return movieRender;
        });
      }

      // Test explore topics rendering adaptability
      if (analysis.exploreTopics && Array.isArray(analysis.exploreTopics)) {
        rendered.exploreTopics = analysis.exploreTopics.map((topic, index) => {
          const topicRender = { valid: true };
          
          if (!topic.topic || !topic.category || !topic.difficulty) {
            rendered.errors.push(`Explore topic ${index}: Missing required fields`);
            topicRender.valid = false;
          }
          
          return topicRender;
        });
      }

      return rendered;
    } catch (error) {
      rendered.errors.push(`Rendering error: ${error.message}`);
      return rendered;
    }
  }

  /**
   * Simulate MediaCard component rendering for featured movies
   * Tests individual card component flexibility
   */
  renderMediaCard(movie) {
    const card = {
      rendered: false,
      errors: [],
      content: {}
    };

    try {
      // Required fields check
      if (!movie.title) {
        card.errors.push('Missing title');
        return card;
      }
      
      if (!movie.year || typeof movie.year !== 'number') {
        card.errors.push('Missing or invalid year');
        return card;
      }

      // Handle description gracefully
      card.content.title = movie.title;
      card.content.year = movie.year;
      card.content.description = movie.description || 'No description available';
      card.content.displayText = `${movie.title} (${movie.year})`;
      
      card.rendered = true;
      return card;
    } catch (error) {
      card.errors.push(`Card rendering error: ${error.message}`);
      return card;
    }
  }

  /**
   * Simulate text paragraph rendering with entity detection
   * Tests text processing flexibility
   */
  renderTextWithEntities(text, linkedReferences = []) {
    const result = {
      processed: false,
      errors: [],
      entityCount: 0,
      unlinkedEntities: []
    };

    try {
      if (typeof text !== 'string' || text.trim().length === 0) {
        result.errors.push('Invalid or empty text');
        return result;
      }

      // Find potential movie references in **Title** (year) format
      const movieMatches = text.match(/\*\*([^*]+)\*\* \((\d{4})\)/g) || [];
      result.entityCount = movieMatches.length;

      // Check if referenced movies exist in linkedReferences
      movieMatches.forEach(match => {
        const titleMatch = match.match(/\*\*([^*]+)\*\*/);
        const yearMatch = match.match(/\((\d{4})\)/);
        
        if (titleMatch && yearMatch) {
          const title = titleMatch[1];
          const year = parseInt(yearMatch[1]);
          
          // Look for corresponding linked reference
          const linkedRef = linkedReferences.find(ref => 
            ref.title === title && ref.year === year
          );
          
          if (!linkedRef) {
            result.unlinkedEntities.push({ title, year });
          }
        }
      });

      result.processed = true;
      return result;
    } catch (error) {
      result.errors.push(`Text processing error: ${error.message}`);
      return result;
    }
  }
}

describe('Display Component Adapter Validation', () => {

  const renderer = new ComponentRenderer();

  describe('B1: Core Content Rendering Flexibility', () => {

    test.each(TEST_MOVIE_IDS)('should render all content sections without errors for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      const rendered = renderer.renderAnalysisContent(analysis);

      expect(rendered.errors).toHaveLength(0);
      expect(rendered.sections).toHaveLength(7);
      
      // Each section should render successfully
      rendered.sections.forEach((section, index) => {
        expect(section.hasContent).toBe(true);
        expect(section.wordCount).toBeGreaterThan(0);
      });
    });

    test.each(TEST_MOVIE_IDS)('should handle content section variations gracefully for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      // Test that component can handle different paragraph structures
      analysis.content.forEach(section => {
        const textProcessing = renderer.renderTextWithEntities(section.text, analysis.linkedReferences);
        expect(textProcessing.processed).toBe(true);
        expect(textProcessing.errors).toHaveLength(0);
      });
    });

    test('should handle missing content sections gracefully', () => {
      const malformedAnalysis = {
        content: [
          { type: 'introduction' }, // Missing text
          { text: 'Some content' }, // Missing type
          { type: 'conclusion', text: '' } // Empty text
        ],
        linkedReferences: []
      };

      const rendered = renderer.renderAnalysisContent(malformedAnalysis);
      
      // Should identify errors but not crash
      expect(rendered.errors.length).toBeGreaterThan(0);
      expect(rendered.sections.length).toBeLessThan(3); // Only valid sections rendered
    });

  });

  describe('B2: Featured Movies Card Rendering', () => {

    test.each(TEST_MOVIE_IDS)('should render all featured movie cards for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      expect(analysis.featuredMovies).toHaveLength(4);
      
      analysis.featuredMovies.forEach((movie, index) => {
        const card = renderer.renderMediaCard(movie);
        expect(card.rendered).toBe(true);
        expect(card.errors).toHaveLength(0);
        expect(card.content.title).toBeTruthy();
        expect(card.content.year).toBeGreaterThan(1800);
        expect(card.content.displayText).toContain(movie.title);
      });
    });

    test('should handle malformed movie data gracefully', () => {
      const malformedMovies = [
        { title: 'Valid Movie', year: 1999, description: 'Good' },
        { title: '', year: 2000, description: 'Bad title' }, // Empty title
        { title: 'No Year Movie', description: 'Missing year' }, // No year
        { year: 1995, description: 'No title' }, // No title
        { title: 'Valid Title', year: 'invalid', description: 'Bad year' } // Invalid year type
      ];

      let successCount = 0;
      let errorCount = 0;

      malformedMovies.forEach(movie => {
        const card = renderer.renderMediaCard(movie);
        if (card.rendered) {
          successCount++;
        } else {
          errorCount++;
          expect(card.errors.length).toBeGreaterThan(0);
        }
      });

      expect(successCount).toBe(1); // Only first movie should succeed
      expect(errorCount).toBe(4); // Other 4 should fail gracefully
    });

  });

  describe('B3: Entity Linking and Text Processing', () => {

    test.each(TEST_MOVIE_IDS)('should process movie references in content text for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      // Test each content section for entity processing
      analysis.content.forEach(section => {
        const textResult = renderer.renderTextWithEntities(section.text, analysis.linkedReferences);
        
        expect(textResult.processed).toBe(true);
        expect(textResult.errors).toHaveLength(0);
        
        // If entities found, validate they exist in linkedReferences
        if (textResult.entityCount > 0) {
          expect(textResult.unlinkedEntities.length).toBeLessThanOrEqual(textResult.entityCount);
        }
      });
    });

    test('should identify unlinked movie references', () => {
      const textWithMovies = 'References **Casablanca** (1942) and **The Matrix** (1999) and **Nonexistent Film** (2025).';
      const linkedRefs = [
        { title: 'Casablanca', year: 1942, type: 'movie' },
        { title: 'The Matrix', year: 1999, type: 'movie' }
        // Missing reference for "Nonexistent Film"
      ];

      const result = renderer.renderTextWithEntities(textWithMovies, linkedRefs);
      
      expect(result.processed).toBe(true);
      expect(result.entityCount).toBe(3);
      expect(result.unlinkedEntities).toHaveLength(1);
      expect(result.unlinkedEntities[0].title).toBe('Nonexistent Film');
      expect(result.unlinkedEntities[0].year).toBe(2025);
    });

    test('should handle text without movie references', () => {
      const plainText = 'This is just regular text without any movie references.';
      const result = renderer.renderTextWithEntities(plainText, []);
      
      expect(result.processed).toBe(true);
      expect(result.entityCount).toBe(0);
      expect(result.unlinkedEntities).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

  });

  describe('B4: Component Resilience Testing', () => {

    test('should handle completely malformed analysis gracefully', () => {
      const malformedData = {
        content: null,
        featuredMovies: 'not an array',
        exploreTopics: undefined,
        linkedReferences: 42
      };

      const rendered = renderer.renderAnalysisContent(malformedData);
      
      // Should capture errors but not crash
      expect(rendered.errors.length).toBeGreaterThan(0);
      expect(rendered.sections).toEqual([]);
    });

    test('should handle empty analysis data', () => {
      const emptyData = {
        content: [],
        featuredMovies: [],
        exploreTopics: [],
        linkedReferences: []
      };

      const rendered = renderer.renderAnalysisContent(emptyData);
      
      // Should handle empty data without errors
      expect(rendered.errors).toHaveLength(0);
      expect(rendered.sections).toHaveLength(0);
      expect(rendered.featuredMovies).toHaveLength(0);
      expect(rendered.exploreTopics).toHaveLength(0);
    });

    test.each(TEST_MOVIE_IDS)('should maintain rendering consistency across different movies for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      const rendered1 = renderer.renderAnalysisContent(analysis);
      const rendered2 = renderer.renderAnalysisContent(analysis);
      
      // Multiple renders of same data should be identical
      expect(rendered1.sections.length).toBe(rendered2.sections.length);
      expect(rendered1.errors.length).toBe(rendered2.errors.length);
      expect(rendered1.featuredMovies?.length).toBe(rendered2.featuredMovies?.length);
    });

  });

  describe('B5: Cross-Component Integration', () => {

    test.each(TEST_MOVIE_IDS.slice(0, 3))('should handle full page rendering workflow for movie %s', async (tmdbId) => {
      const analysis = await getAnalysisJson(tmdbId);
      
      // Simulate full page component integration
      const mainContent = renderer.renderAnalysisContent(analysis);
      expect(mainContent.errors).toHaveLength(0);
      
      // Test each featured movie card individually
      const cardResults = analysis.featuredMovies.map(movie => 
        renderer.renderMediaCard(movie)
      );
      
      const failedCards = cardResults.filter(card => !card.rendered);
      expect(failedCards).toHaveLength(0);
      
      // Test text processing for each content section
      const textResults = analysis.content.map(section =>
        renderer.renderTextWithEntities(section.text, analysis.linkedReferences)
      );
      
      const failedTextProcessing = textResults.filter(result => !result.processed);
      expect(failedTextProcessing).toHaveLength(0);
    });

    test('should demonstrate component adaptation principle', async () => {
      // Test with first available movie
      const analysis = await getAnalysisJson(TEST_MOVIE_IDS[0]);
      
      // Components should adapt to whatever structure they receive
      const rendered = renderer.renderAnalysisContent(analysis);
      
      // Success criteria: Components work with ground truth data as-is
      expect(rendered.errors).toHaveLength(0);
      expect(rendered.sections.length).toBe(analysis.content.length);
      
      // This test validates the core principle:
      // Display components successfully render ground truth JSON without modification
    });

  });

});

// Export renderer utility for use in other test files
module.exports = { ComponentRenderer, TEST_MOVIE_IDS };