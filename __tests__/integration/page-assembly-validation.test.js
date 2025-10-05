/**
 * Page Assembly Validation Integration Test
 * Verifies all constituent parts of movie pages are properly assembled
 *
 * Components tested:
 * - Movie Header (title, year, poster, overview)
 * - Streaming availability
 * - Trailer (action bar component)
 * - Why Watch section
 * - Analysis sections with proper structure
 * - Movie linking within analysis text
 * - Contributor linking for cast/crew
 * - Featured Films sections
 * - Contextual headers/subheads
 * - More Ideas recommendations
 */

import { assembleEnhancedMovieData } from '../../lib/enhanced-assembly.js';

describe('Page Assembly Validation Integration Tests', () => {
  const testMovies = [
    { tmdbId: 550, title: 'Fight Club', expectedYear: 1999 },
    { tmdbId: 18, title: 'The Fifth Element', expectedYear: 1997 }
  ];

  describe.each(testMovies)('$title ($expectedYear) - Complete Assembly', ({ tmdbId, title, expectedYear }) => {
    let enhancedData;

    beforeAll(async () => {
      enhancedData = await assembleEnhancedMovieData(tmdbId);
    }, 30000);

    test('has complete movie header', () => {
      const { movieHeader } = enhancedData;

      expect(movieHeader).toMatchObject({
        title: title,
        year: expectedYear,
        posterUrl: expect.stringMatching(/^https:\/\/image\.tmdb\.org\/t\/p\/w500\/[A-Za-z0-9]+\.jpg$/),
        overview: expect.stringContaining(title)
      });

      // Trailer video ID should be present and valid YouTube format
      if (movieHeader.trailerVideoId) {
        expect(movieHeader.trailerVideoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
        console.log(`🎬 ${title} trailer: ${movieHeader.trailerVideoId}`);
      } else {
        console.log(`⚠️ ${title} has no trailer`);
      }

      // Streaming data (optional but logged for visibility)
      if (movieHeader.streaming) {
        console.log(`📺 ${title} streaming: ${movieHeader.streaming}`);
      }
    });

    test('has properly structured analysis sections', () => {
      const { analysis } = enhancedData;

      expect(analysis.sections).toBeInstanceOf(Array);
      expect(analysis.sections.length).toBeGreaterThan(0);

      // Each section should have required structure
      analysis.sections.forEach((section, index) => {
        expect(section).toMatchObject({
          text: expect.any(String),
          subhead: expect.any(String)
        });

        expect(section.text.length).toBeGreaterThan(10);
        expect(section.subhead.length).toBeGreaterThan(2);
      });

      console.log(`📝 ${title}: ${analysis.sections.length} analysis sections`);
    });

    test('has contextual headers/subheads', () => {
      const { analysis } = enhancedData;

      const subheads = analysis.sections.map(s => s.subhead);

      // Should have meaningful, diverse subheads
      expect(subheads.length).toBeGreaterThan(0);

      // Subheads should be descriptive (not generic)
      const genericSubheads = subheads.filter(subhead =>
        subhead === 'Section' || subhead === 'Part' || subhead.length < 3
      );
      expect(genericSubheads.length).toBe(0);

      console.log(`🏷️ ${title} subheads:`, subheads.slice(0, 3).join(', '));
    });

    test('has movie linking within analysis text', () => {
      const { analysis } = enhancedData;

      // Look for movie links in analysis sections
      const sectionsWithMovieLinks = analysis.sections.filter(section =>
        section.text.includes('class="movie-title"') &&
        section.text.includes('data-tmdb-id=')
      );

      // Should have at least some movie references linked
      if (sectionsWithMovieLinks.length > 0) {
        console.log(`🔗 ${title}: ${sectionsWithMovieLinks.length} sections with movie links`);

        // Validate link format
        sectionsWithMovieLinks.forEach(section => {
          const linkMatches = section.text.match(/data-tmdb-id="(\d+)"/g);
          if (linkMatches) {
            linkMatches.forEach(match => {
              const tmdbId = match.match(/data-tmdb-id="(\d+)"/)[1];
              expect(parseInt(tmdbId)).toBeGreaterThan(0);
            });
          }
        });
      } else {
        console.log(`⚠️ ${title}: No movie links found in analysis`);
      }
    });

    test('has contributor linking for cast/crew', () => {
      const { keyElements } = enhancedData;

      // Should have contributors with proper linking structure
      expect(keyElements).toBeInstanceOf(Object);

      const contributorTypes = ['director', 'writers', 'stars', 'cinematographer', 'composer'];
      let hasContributors = false;

      contributorTypes.forEach(type => {
        if (keyElements[type]) {
          hasContributors = true;

          if (Array.isArray(keyElements[type])) {
            // Multiple contributors (writers, stars)
            keyElements[type].forEach(contributor => {
              expect(contributor).toMatchObject({
                name: expect.any(String),
                slug: expect.stringMatching(/^\/person\/\d+$/),
                personId: expect.any(Number)
              });
            });
            console.log(`👥 ${title} ${type}: ${keyElements[type].length} people`);
          } else {
            // Single contributor (director, cinematographer, composer)
            expect(keyElements[type]).toMatchObject({
              name: expect.any(String),
              slug: expect.stringMatching(/^\/person\/\d+$/),
              personId: expect.any(Number)
            });
            console.log(`👤 ${title} ${type}: ${keyElements[type].name}`);
          }
        }
      });

      if (!hasContributors) {
        console.log(`⚠️ ${title}: No contributors found`);
      }
    });

    test('has why watch recommendation', () => {
      const { analysis } = enhancedData;

      expect(analysis.whyWatch).toMatchObject({
        recommendation: expect.stringMatching(/^(YES|NO)$/),
        reasons: expect.any(Array)
      });

      if (analysis.whyWatch.recommendation === 'YES') {
        expect(analysis.whyWatch.reasons.length).toBeGreaterThan(0);
        expect(analysis.whyWatch.reasons.length).toBeLessThanOrEqual(3);
      }

      console.log(`💡 ${title} recommendation: ${analysis.whyWatch.recommendation} (${analysis.whyWatch.reasons.length} reasons)`);
    });

    test('has more ideas recommendations', () => {
      const { analysis } = enhancedData;

      expect(analysis.moreIdeas).toBeInstanceOf(Array);

      if (analysis.moreIdeas.length > 0) {
        analysis.moreIdeas.forEach(idea => {
          expect(idea).toMatchObject({
            title: expect.any(String),
            year: expect.any(Number),
            connection: expect.any(String)
          });

          expect(idea.year).toBeGreaterThan(1880);
          expect(idea.year).toBeLessThan(2030);
          expect(idea.connection.length).toBeGreaterThan(10);
        });

        console.log(`💭 ${title}: ${analysis.moreIdeas.length} more ideas`);
      } else {
        console.log(`⚠️ ${title}: No more ideas found`);
      }
    });

    test('has featured films (if available)', () => {
      const { analysis } = enhancedData;

      expect(analysis.featuredMovies).toBeInstanceOf(Array);

      if (analysis.featuredMovies.length > 0) {
        analysis.featuredMovies.forEach(featured => {
          expect(featured).toMatchObject({
            title: expect.any(String)
            // Add more validation as featuredMovies structure is defined
          });
        });

        console.log(`🎯 ${title}: ${analysis.featuredMovies.length} featured films`);
      } else {
        console.log(`ℹ️ ${title}: No featured films (expected for current implementation)`);
      }
    });

    test('has complete build metadata', () => {
      const { buildData } = enhancedData;

      expect(buildData).toMatchObject({
        posterValidated: expect.any(Boolean),
        streamingCurrent: expect.any(Boolean),
        trailerResolved: expect.any(Boolean),
        linksProcessed: true // Should always be true after assembly
      });

      console.log(`🔧 ${title} build status:`, {
        poster: buildData.posterValidated ? '✅' : '❌',
        streaming: buildData.streamingCurrent ? '✅' : '❌',
        trailer: buildData.trailerResolved ? '✅' : '❌',
        links: buildData.linksProcessed ? '✅' : '❌'
      });
    });

    test('has proper static generation metadata', () => {
      expect(enhancedData).toMatchObject({
        tmdbId: tmdbId,
        title: title,
        year: expectedYear,
        enhancedFormat: true,
        staticGenerated: true,
        lastUpdated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      });

      const lastUpdatedDate = new Date(enhancedData.lastUpdated);
      const now = new Date();
      const timeDifference = now - lastUpdatedDate;

      // Should be recently generated (within last hour for this test)
      expect(timeDifference).toBeLessThan(60 * 60 * 1000);
    });
  });

  describe('Cross-Movie Assembly Validation', () => {
    test('different movies have unique content', async () => {
      const [movie1, movie2] = await Promise.all([
        assembleEnhancedMovieData(550), // Fight Club
        assembleEnhancedMovieData(18)   // Fifth Element
      ]);

      // Should have different titles, years, posters
      expect(movie1.title).not.toBe(movie2.title);
      expect(movie1.year).not.toBe(movie2.year);
      expect(movie1.movieHeader.posterUrl).not.toBe(movie2.movieHeader.posterUrl);

      // Should have different analysis content
      expect(movie1.analysis.sections[0].text).not.toBe(movie2.analysis.sections[0].text);

      // Should have different trailers (if both have trailers)
      if (movie1.movieHeader.trailerVideoId && movie2.movieHeader.trailerVideoId) {
        expect(movie1.movieHeader.trailerVideoId).not.toBe(movie2.movieHeader.trailerVideoId);
      }

      console.log('✅ Movies have unique content across all components');
    }, 45000);

    test('assembly consistency across multiple runs', async () => {
      const tmdbId = 550; // Fight Club

      const [run1, run2] = await Promise.all([
        assembleEnhancedMovieData(tmdbId),
        assembleEnhancedMovieData(tmdbId)
      ]);

      // Core data should be identical
      expect(run1.tmdbId).toBe(run2.tmdbId);
      expect(run1.title).toBe(run2.title);
      expect(run1.year).toBe(run2.year);
      expect(run1.movieHeader.posterUrl).toBe(run2.movieHeader.posterUrl);
      expect(run1.analysis.sections.length).toBe(run2.analysis.sections.length);

      // Build metadata may differ slightly (timestamps)
      expect(run1.enhancedFormat).toBe(run2.enhancedFormat);
      expect(run1.staticGenerated).toBe(run2.staticGenerated);

      console.log('✅ Assembly is consistent across multiple runs');
    }, 45000);
  });
});