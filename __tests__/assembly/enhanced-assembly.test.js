/**
 * Enhanced Assembly Integration Tests
 *
 * End-to-end tests for the complete assembly process:
 * 1. Read from correct database sources
 * 2. Process movie title linking
 * 3. Assemble into enhanced static format
 * 4. Validate output structure and content
 */

import { Pool } from 'pg';
import { TEST_MOVIES, EXPECTED_ENHANCED_FORMAT } from '../fixtures/assembly-test-data.js';
import { getMovieContributors } from '../../lib/services/contributors-service.js';
import { processAnalysisContent } from '../../lib/movie-analysis-linker.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Enhanced Assembly Function - This is what we're testing
async function assembleEnhancedMovieData(tmdbId) {
  const client = await pool.connect();

  try {
    // 1. Get base movie data
    const movieResult = await client.query(`
      SELECT id, tmdb_id, title, year, poster_url, streaming_data, trailer_url
      FROM movies
      WHERE tmdb_id = $1
    `, [tmdbId]);

    if (movieResult.rows.length === 0) {
      throw new Error(`Movie with TMDB ID ${tmdbId} not found`);
    }

    const movie = movieResult.rows[0];

    // 2. Get enhanced analysis data (NOT from claude_response.raw_content)
    const analysisResult = await client.query(`
      SELECT
        enhanced_sections::text as sections,
        enhanced_key_elements::text as key_elements
      FROM movie_analyses
      WHERE movie_id = $1
      AND analysis_type = 'general'
      AND enhanced_format = true
    `, [movie.id]);

    if (analysisResult.rows.length === 0) {
      throw new Error(`No enhanced analysis found for movie ${movie.title}`);
    }

    const analysisData = analysisResult.rows[0];
    const sections = JSON.parse(analysisData.sections);
    const keyElements = analysisData.key_elements ? JSON.parse(analysisData.key_elements) : {};

    // 3. Process movie title linking in sections
    const processedSections = [];
    for (const section of sections) {
      if (section.text) {
        const processedText = await processAnalysisContent(
          section.text,
          movie.title,
          `${movie.title} section`
        );
        processedSections.push({
          ...section,
          text: processedText
        });
      } else {
        processedSections.push(section);
      }
    }

    // 4. Get Why Watch data
    const whyWatchResult = await client.query(`
      SELECT recommendation, reasons
      FROM enhanced_why_watch
      WHERE tmdb_id = $1
    `, [tmdbId]);

    const whyWatch = whyWatchResult.rows.length > 0
      ? whyWatchResult.rows[0]
      : { recommendation: 'NO', reasons: [] };

    // 5. Get More Ideas data
    const moreIdeasResult = await client.query(`
      SELECT ideas
      FROM more_ideas
      WHERE tmdb_id = $1
    `, [tmdbId]);

    const moreIdeas = moreIdeasResult.rows.length > 0
      ? moreIdeasResult.rows[0].ideas
      : [];

    // 6. Get Contributors data
    let contributors = null;
    try {
      contributors = await getMovieContributors(movie.id, tmdbId);
    } catch (error) {
      console.warn(`Contributors error for ${movie.title}:`, error.message);
    }

    // 7. Assemble enhanced static format
    const enhancedData = {
      // Core movie identification
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,

      // Movie header data
      movieHeader: {
        title: movie.title,
        year: movie.year,
        posterUrl: movie.poster_url || `https://image.tmdb.org/t/p/w500/placeholder.jpg`,
        trailerVideoId: movie.trailer_url || null,
        streaming: movie.streaming_data || null,
        overview: `${movie.title} (${movie.year})` // Basic overview
      },

      // Analysis content
      analysis: {
        keyElements: keyElements,
        sections: processedSections,
        whyWatch: whyWatch,
        featuredMovies: [], // TODO: Extract from analysis or generate
        moreIdeas: moreIdeas,
        exploreTopics: [] // TODO: Extract from keyElements or generate
      },

      // Contributors data for footer
      keyElements: contributors || {},

      // Metadata
      enhancedFormat: true,
      staticGenerated: true,
      lastUpdated: new Date().toISOString(),
      buildData: {
        posterValidated: !!movie.poster_url,
        streamingCurrent: !!movie.streaming_data,
        trailerResolved: !!movie.trailer_url,
        linksProcessed: true
      }
    };

    return enhancedData;

  } finally {
    client.release();
  }
}

describe('Enhanced Assembly Integration', () => {
  afterAll(async () => {
    await pool.end();
  });

  describe('Complete Assembly Process', () => {
    test('should assemble Fight Club with all constituent parts', async () => {
      const result = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId);

      // Validate structure matches expected format
      expect(result.tmdbId).toBe(TEST_MOVIES.FIGHT_CLUB.tmdbId);
      expect(result.title).toBe(TEST_MOVIES.FIGHT_CLUB.title);
      expect(result.year).toBe(TEST_MOVIES.FIGHT_CLUB.year);

      // Validate enhanced format flags
      expect(result.enhancedFormat).toBe(true);
      expect(result.staticGenerated).toBe(true);
      expect(result.lastUpdated).toBeDefined();
      expect(result.buildData).toBeDefined();
      expect(result.buildData.linksProcessed).toBe(true);
    });

    test('should assemble Charlie\'s Angels with enhanced sections', async () => {
      const result = await assembleEnhancedMovieData(TEST_MOVIES.CHARLIES_ANGELS.tmdbId);

      // Validate analysis sections
      expect(result.analysis.sections).toBeDefined();
      expect(Array.isArray(result.analysis.sections)).toBe(true);
      expect(result.analysis.sections.length).toBe(TEST_MOVIES.CHARLIES_ANGELS.expectedSections);

      // Validate sections have been processed for links
      result.analysis.sections.forEach((section, index) => {
        expect(section).toHaveProperty('text');
        expect(typeof section.text).toBe('string');
        expect(section.text.length).toBeGreaterThan(0);

        console.log(`Section ${index + 1} processed:`,
          section.text.includes('<a href="/movie/') ? 'HAS LINKS' : 'NO LINKS');
      });
    });

    test('should include Why Watch data in correct format', async () => {
      const result = await assembleEnhancedMovieData(TEST_MOVIES.THE_ROCKETEER.tmdbId);

      expect(result.analysis.whyWatch).toBeDefined();
      expect(['YES', 'NO']).toContain(result.analysis.whyWatch.recommendation);

      if (result.analysis.whyWatch.reasons) {
        expect(Array.isArray(result.analysis.whyWatch.reasons)).toBe(true);
        expect(result.analysis.whyWatch.reasons.length).toBe(3);

        result.analysis.whyWatch.reasons.forEach(reason => {
          expect(typeof reason).toBe('string');
          expect(reason.length).toBeGreaterThan(0);
        });
      }
    });

    test('should include More Ideas data', async () => {
      const result = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId);

      expect(result.analysis.moreIdeas).toBeDefined();
      expect(Array.isArray(result.analysis.moreIdeas)).toBe(true);

      if (result.analysis.moreIdeas.length > 0) {
        expect(result.analysis.moreIdeas.length).toBe(15); // Expected 15 ideas

        result.analysis.moreIdeas.forEach(idea => {
          expect(idea).toHaveProperty('title');
          expect(idea).toHaveProperty('year');
          expect(typeof idea.title).toBe('string');
          expect(typeof idea.year).toBe('number');
        });
      }
    });
  });

  describe('Movie Title Link Processing', () => {
    test('should process movie title links in assembled sections', async () => {
      const result = await assembleEnhancedMovieData(TEST_MOVIES.CHARLIES_ANGELS.tmdbId);

      // Look for processed links in sections
      const allSectionText = result.analysis.sections
        .map(section => section.text)
        .join(' ');

      // Check if any movie title patterns were converted to links
      const hasLinks = allSectionText.includes('<a href="/movie/');
      const hasMovieTitleClass = allSectionText.includes('class="movie-title"');

      if (hasLinks) {
        expect(hasMovieTitleClass).toBe(true);
        console.log('Movie title links found in processed sections');

        // Extract and validate link structure
        const linkPattern = /<a href="\/movie\/\d+" class="movie-title" data-tmdb-id="\d+">[^<]+<\/a>/g;
        const links = allSectionText.match(linkPattern);

        if (links) {
          expect(links.length).toBeGreaterThan(0);
          console.log(`Found ${links.length} properly formatted movie links`);
        }
      } else {
        console.log('No movie title patterns found to convert to links');
      }
    });

    test('should prevent self-referential links in processed content', async () => {
      const result = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId);

      const allSectionText = result.analysis.sections
        .map(section => section.text)
        .join(' ');

      // Should not contain self-referential link to Fight Club itself
      expect(allSectionText).not.toContain(`<a href="/movie/${TEST_MOVIES.FIGHT_CLUB.tmdbId}"`);

      // But may still contain "Fight Club" as bold text
      if (allSectionText.includes('Fight Club')) {
        console.log('Fight Club mentioned but not self-linked (correct behavior)');
      }
    });
  });

  describe('Data Source Validation', () => {
    test('should read from enhanced_sections not claude_response', async () => {
      // Directly test that we're reading from the right field
      const tmdbId = TEST_MOVIES.CHARLIES_ANGELS.tmdbId;
      const client = await pool.connect();

      try {
        // Check what's in claude_response (should be just metadata)
        const claudeResult = await client.query(`
          SELECT claude_response
          FROM movie_analyses ma
          JOIN movies m ON ma.movie_id = m.id
          WHERE m.tmdb_id = $1
          AND ma.analysis_type = 'general'
        `, [tmdbId]);

        // Check what's in enhanced_sections (should be actual content)
        const enhancedResult = await client.query(`
          SELECT enhanced_sections::text as sections
          FROM movie_analyses ma
          JOIN movies m ON ma.movie_id = m.id
          WHERE m.tmdb_id = $1
          AND ma.analysis_type = 'general'
          AND ma.enhanced_format = true
        `, [tmdbId]);

        if (claudeResult.rows.length > 0 && enhancedResult.rows.length > 0) {
          const claudeResponse = claudeResult.rows[0].claude_response;
          const enhancedSections = enhancedResult.rows[0].sections;

          // Claude response should only have metadata
          expect(claudeResponse).toHaveProperty('cost');
          expect(claudeResponse).toHaveProperty('input_tokens');
          expect(claudeResponse).toHaveProperty('output_tokens');
          expect(claudeResponse).not.toHaveProperty('sections');
          expect(claudeResponse).not.toHaveProperty('raw_content');

          // Enhanced sections should have actual content
          const sections = JSON.parse(enhancedSections);
          expect(Array.isArray(sections)).toBe(true);
          expect(sections.length).toBeGreaterThan(0);
          expect(sections[0]).toHaveProperty('text');
          expect(sections[0].text.length).toBeGreaterThan(100); // Substantial content

          console.log('✅ Correctly reading from enhanced_sections, not claude_response');
        }
      } finally {
        client.release();
      }
    });
  });

  describe('Output Format Validation', () => {
    test('should match expected enhanced static format structure', async () => {
      const result = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId);

      // Validate top-level structure
      expect(typeof result.tmdbId).toBe('number');
      expect(typeof result.title).toBe('string');
      expect(typeof result.year).toBe('number');
      expect(typeof result.movieHeader).toBe('object');
      expect(typeof result.analysis).toBe('object');
      expect(typeof result.keyElements).toBe('object');
      expect(result.enhancedFormat).toBe(true);
      expect(result.staticGenerated).toBe(true);
      expect(typeof result.lastUpdated).toBe('string');
      expect(typeof result.buildData).toBe('object');

      // Validate movieHeader structure
      expect(result.movieHeader).toHaveProperty('title');
      expect(result.movieHeader).toHaveProperty('year');
      expect(result.movieHeader).toHaveProperty('posterUrl');
      expect(result.movieHeader).toHaveProperty('trailerVideoId');
      expect(result.movieHeader).toHaveProperty('streaming');
      expect(result.movieHeader).toHaveProperty('overview');

      // Validate analysis structure
      expect(result.analysis).toHaveProperty('keyElements');
      expect(result.analysis).toHaveProperty('sections');
      expect(result.analysis).toHaveProperty('whyWatch');
      expect(result.analysis).toHaveProperty('featuredMovies');
      expect(result.analysis).toHaveProperty('moreIdeas');
      expect(result.analysis).toHaveProperty('exploreTopics');

      // Validate buildData structure
      expect(result.buildData).toHaveProperty('posterValidated');
      expect(result.buildData).toHaveProperty('streamingCurrent');
      expect(result.buildData).toHaveProperty('trailerResolved');
      expect(result.buildData).toHaveProperty('linksProcessed');
      expect(result.buildData.linksProcessed).toBe(true);
    });

    test('should produce format compatible with movie page expectations', async () => {
      const result = await assembleEnhancedMovieData(TEST_MOVIES.CHARLIES_ANGELS.tmdbId);

      // This should match what the movie page expects in enhanced static files
      // Based on pages/movie/[id].js lines 87-128
      expect(result.enhancedFormat).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(Array.isArray(result.analysis.sections)).toBe(true);

      // Sections should have the structure that MovieAnalysisWithEntities expects
      result.analysis.sections.forEach(section => {
        expect(section).toHaveProperty('text'); // Component expects 'text' field
      });

      console.log('✅ Output format compatible with movie page component expectations');
    });
  });

  describe('Error Handling', () => {
    test('should handle movies with missing constituent parts gracefully', async () => {
      // Test with a truly non-existent movie ID
      try {
        const result = await assembleEnhancedMovieData(99999999); // Truly non-existent TMDB ID

        // Should not reach here
        expect(result).toBeUndefined(); // This should not execute
      } catch (error) {
        expect(error.message).toMatch(/Movie with TMDB ID 99999999 not found/);
      }
    });

    test('should provide sensible defaults for missing optional data', async () => {
      const result = await assembleEnhancedMovieData(TEST_MOVIES.THE_ROCKETEER.tmdbId);

      // Should have defaults for missing data
      expect(result.analysis.featuredMovies).toBeDefined();
      expect(result.analysis.exploreTopics).toBeDefined();
      expect(result.movieHeader.posterUrl).toBeDefined();

      if (!result.movieHeader.trailerVideoId) {
        expect(result.buildData.trailerResolved).toBe(false);
      }
    });
  });
});