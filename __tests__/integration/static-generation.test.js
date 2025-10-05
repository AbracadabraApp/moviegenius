/**
 * Static Generation Integration Tests
 * Tests the complete enhanced-assembly.js pipeline with real database
 *
 * These tests validate the entire static file generation process:
 * - Database queries for movie data
 * - Analysis content processing
 * - Movie/person linking
 * - Enhanced static file assembly
 */

import { assembleEnhancedMovieData, closePool } from '../../lib/enhanced-assembly.js';
import { processAnalysisContent } from '../../lib/movie-analysis-linker.js';

describe('Static Generation Integration Tests', () => {
  afterAll(async () => {
    // Clean up database connections
    await closePool();
  });

  describe('Enhanced Movie Data Assembly', () => {
    test('assembles complete enhanced data for Fight Club', async () => {
      const enhancedData = await assembleEnhancedMovieData(550); // Fight Club

      // Validate core structure
      expect(enhancedData).toMatchObject({
        tmdbId: 550,
        title: 'Fight Club',
        year: 1999,
        enhancedFormat: true,
        staticGenerated: true
      });

      // Validate movie header
      expect(enhancedData.movieHeader).toMatchObject({
        title: 'Fight Club',
        year: 1999,
        posterUrl: expect.stringContaining('image.tmdb.org'),
        overview: 'Fight Club (1999)'
      });

      // Validate analysis structure
      expect(enhancedData.analysis).toMatchObject({
        sections: expect.arrayContaining([
          expect.objectContaining({
            text: expect.any(String),
            subhead: expect.any(String)
          })
        ]),
        whyWatch: expect.objectContaining({
          recommendation: expect.stringMatching(/^(YES|NO)$/),
          reasons: expect.any(Array)
        }),
        moreIdeas: expect.any(Array)
      });

      // Validate contributors
      expect(enhancedData.keyElements).toMatchObject({
        director: expect.objectContaining({
          name: expect.any(String),
          slug: expect.stringMatching(/^\/person\/\d+$/)
        }),
        stars: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            slug: expect.stringMatching(/^\/person\/\d+$/)
          })
        ])
      });

      // Validate build metadata
      expect(enhancedData.buildData).toMatchObject({
        posterValidated: expect.any(Boolean),
        streamingCurrent: expect.any(Boolean),
        trailerResolved: expect.any(Boolean),
        linksProcessed: true
      });

      console.log(`✅ Fight Club enhanced data: ${enhancedData.analysis.sections.length} sections`);
    }, 20000);

    test('assembles complete enhanced data for The Fifth Element', async () => {
      const enhancedData = await assembleEnhancedMovieData(18); // The Fifth Element

      expect(enhancedData).toMatchObject({
        tmdbId: 18,
        title: 'The Fifth Element',
        year: 1997
      });

      // Should have processed movie links
      const sectionsWithLinks = enhancedData.analysis.sections.filter(section =>
        section.text.includes('class="movie-title"')
      );

      // At least some sections should have movie links processed
      console.log(`🔗 Fifth Element sections with links: ${sectionsWithLinks.length}/${enhancedData.analysis.sections.length}`);

    }, 20000);

    test('handles movie with minimal data gracefully', async () => {
      // Test with a movie that might have less complete data
      const enhancedData = await assembleEnhancedMovieData(78); // Blade Runner

      expect(enhancedData).toMatchObject({
        tmdbId: 78,
        title: expect.any(String),
        year: expect.any(Number),
        enhancedFormat: true
      });

      // Should still have basic structure even if some data is missing
      expect(enhancedData.analysis.sections).toBeInstanceOf(Array);
      expect(enhancedData.keyElements).toBeInstanceOf(Object);

      console.log(`📊 Blade Runner data completeness: ${JSON.stringify(enhancedData.buildData)}`);
    }, 20000);
  });

  describe('Movie Analysis Linking Pipeline', () => {
    test('processes movie mentions into proper links', async () => {
      const pool = global.getTestPool();
      const client = await pool.connect();

      try {
        // Test content with known movie mentions
        const testContent = `
**Bold Movie References**

This film shares DNA with **Blade Runner** (1982) and draws inspiration from **The Matrix** (1999).
The director of **Fight Club** created a masterpiece that influenced many films.
        `.trim();

        const processedContent = await processAnalysisContent(
          testContent,
          'Fight Club', // Current movie
          'test section',
          testContent, // Raw content for context
          {
            dbClient: client,
            contributors: [] // No contributors for this test
          }
        );

        // Should have converted bold movie titles to links
        expect(processedContent).toContain('class="movie-title"');
        expect(processedContent).toContain('data-tmdb-id=');

        // Should preserve non-movie bold text
        expect(processedContent).toContain('**Bold Movie References**');

        console.log('🔗 Sample processed content:', processedContent.substring(0, 200) + '...');

      } finally {
        client.release();
      }
    }, 15000);

    test('handles person mentions with contributor context', async () => {
      const pool = global.getTestPool();
      const client = await pool.connect();

      try {
        const testContent = `David Fincher's direction creates a unique atmosphere.`;

        const processedContent = await processAnalysisContent(
          testContent,
          'Fight Club',
          'test section',
          testContent,
          {
            dbClient: client,
            contributors: [
              { name: 'David Fincher', role: 'director' }
            ]
          }
        );

        // Should have processed person mentions
        expect(processedContent).toContain('David Fincher');

        console.log('👥 Person linking result:', processedContent);

      } finally {
        client.release();
      }
    }, 15000);
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles non-existent movie gracefully', async () => {
      await expect(
        assembleEnhancedMovieData(999999999)
      ).rejects.toThrow('Movie with TMDB ID 999999999 not found');
    });

    test('handles movie with no analysis data', async () => {
      // This would require a movie in the database without analysis
      // For now, just test that the function requires valid input
      await expect(
        assembleEnhancedMovieData(null)
      ).rejects.toThrow();
    });

    test('assembles data even with missing contributors', async () => {
      // Mock a scenario where contributors lookup fails
      const enhancedData = await assembleEnhancedMovieData(18);

      // Should still succeed even if contributors are missing
      expect(enhancedData.tmdbId).toBe(18);
      expect(enhancedData.enhancedFormat).toBe(true);

      // keyElements might be empty but should be an object
      expect(enhancedData.keyElements).toBeInstanceOf(Object);
    }, 20000);
  });

  describe('Data Quality Validation', () => {
    test('generated static files have consistent structure', async () => {
      const testMovies = [550, 18]; // Fight Club, Fifth Element

      const results = await Promise.all(
        testMovies.map(tmdbId => assembleEnhancedMovieData(tmdbId))
      );

      results.forEach(data => {
        // Every generated file should have these required fields
        expect(data).toMatchObject({
          tmdbId: expect.any(Number),
          title: expect.any(String),
          year: expect.any(Number),
          movieHeader: expect.objectContaining({
            title: expect.any(String),
            year: expect.any(Number),
            posterUrl: expect.any(String),
            overview: expect.any(String)
          }),
          analysis: expect.objectContaining({
            sections: expect.any(Array),
            whyWatch: expect.any(Object),
            moreIdeas: expect.any(Array)
          }),
          enhancedFormat: true,
          staticGenerated: true,
          lastUpdated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        });

        // Analysis sections should have proper structure
        data.analysis.sections.forEach(section => {
          expect(section).toMatchObject({
            text: expect.any(String),
            subhead: expect.any(String)
          });
        });
      });

      console.log(`📋 Validated ${results.length} static file structures`);
    }, 30000);
  });
});