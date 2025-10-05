/**
 * Movie Title Linking Tests
 *
 * Tests for converting **Movie Title** (Year) patterns to HTML links
 * using the movie-analysis-linker.js system during assembly
 */

import { MOVIE_TITLE_PATTERNS } from '../fixtures/assembly-test-data.js';
import { processAnalysisContent } from '../../lib/movie-analysis-linker.js';

// Mock the railway-db module for testing
jest.mock('../../lib/railway-db.js', () => ({
  getRailwayClient: jest.fn(),
  getPool: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn(),
  })),
  PersonService: {
    getPersonByName: jest.fn(),
  },
  MovieService: {
    getMovie: jest.fn(),
  },
}));

// Mock database responses for known movie titles
const mockMovieDatabase = {
  'The Matrix': { tmdb_id: 603, title: 'The Matrix', year: 1999 },
  'Citizen Kane': { tmdb_id: 15, title: 'Citizen Kane', year: 1941 },
  'Blade Runner': { tmdb_id: 78, title: 'Blade Runner', year: 1982 },
  'Minority Report': { tmdb_id: 180, title: 'Minority Report', year: 2002 },
  'Fight Club': { tmdb_id: 550, title: 'Fight Club', year: 1999 },
  'Se7en': { tmdb_id: 807, title: 'Se7en', year: 1995 },
};

describe('Movie Title Linking', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock MovieService.getMovie to return our test data
    const { MovieService } = require('../../lib/railway-db.js');
    MovieService.getMovie.mockImplementation((title, year) => {
      const movie = mockMovieDatabase[title];
      if (movie && (!year || movie.year === year)) {
        return Promise.resolve(movie);
      }
      return Promise.resolve(null);
    });
  });

  describe('Pattern Recognition', () => {
    test('should identify **Movie Title** (Year) patterns', () => {
      const testText = 'This film is like **The Matrix** (1999) in many ways.';
      const pattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
      const matches = [...testText.matchAll(pattern)];

      expect(matches.length).toBe(1);
      expect(matches[0][1]).toBe('The Matrix');
      expect(matches[0][2]).toBe('1999');
    });

    test('should identify multiple movie patterns in same text', () => {
      const testText = 'Similar to **Blade Runner** (1982) and **Minority Report** (2002).';
      const pattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
      const matches = [...testText.matchAll(pattern)];

      expect(matches.length).toBe(2);
      expect(matches[0][1]).toBe('Blade Runner');
      expect(matches[1][1]).toBe('Minority Report');
    });

    test('should handle **Movie Title** patterns without year', () => {
      const testText = 'Reminiscent of **Citizen Kane** and its themes.';
      const pattern = /\*\*([^*]+)\*\*/g;
      const matches = [...testText.matchAll(pattern)];

      expect(matches.length).toBe(1);
      expect(matches[0][1]).toBe('Citizen Kane');
    });
  });

  describe('Link Conversion', () => {
    test('should convert **Movie Title** (Year) to HTML link with correct TMDB ID', async () => {
      const input = 'This film shares DNA with **The Matrix** (1999) in its reality-questioning themes.';
      const currentMovieTitle = 'Fight Club'; // Prevent self-linking

      const result = await processAnalysisContent(input, currentMovieTitle, 'test-section');

      expect(result).toContain('<a href="/movie/603"');
      expect(result).toContain('class="movie-title"');
      expect(result).toContain('data-tmdb-id="603"');
      expect(result).toContain('The Matrix</a>');
      expect(result).toContain('(1999)'); // Year should remain
    });

    test('should process multiple movie titles in same content', async () => {
      const input = 'Similar to **Blade Runner** (1982) and **Minority Report** (2002).';
      const currentMovieTitle = 'Fight Club';

      const result = await processAnalysisContent(input, currentMovieTitle, 'test-section');

      // Check first movie link
      expect(result).toContain('<a href="/movie/78"');
      expect(result).toContain('Blade Runner</a>');
      expect(result).toContain('(1982)');

      // Check second movie link
      expect(result).toContain('<a href="/movie/180"');
      expect(result).toContain('Minority Report</a>');
      expect(result).toContain('(2002)');
    });

    test('should preserve formatting around movie links', async () => {
      const input = 'Like **Citizen Kane** (1941), it explores the corruption of power.';
      const currentMovieTitle = 'Fight Club';

      const result = await processAnalysisContent(input, currentMovieTitle, 'test-section');

      expect(result.startsWith('Like ')).toBe(true);
      expect(result).toContain('</a> (1941), it explores');
      expect(result.endsWith('corruption of power.')).toBe(true);
    });

    test('should handle movie titles not found in database', async () => {
      const input = 'Similar to **Nonexistent Movie** (2023) in style.';
      const currentMovieTitle = 'Fight Club';

      const result = await processAnalysisContent(input, currentMovieTitle, 'test-section');

      // Should remain as bold text if movie not found
      expect(result).toContain('**Nonexistent Movie**');
      expect(result).not.toContain('<a href="/movie/');
    });

    test('should prevent self-referential links', async () => {
      const input = 'This **Fight Club** (1999) analysis covers key themes.';
      const currentMovieTitle = 'Fight Club';

      const result = await processAnalysisContent(input, currentMovieTitle, 'test-section');

      // Should remain as bold text, not become a link
      expect(result).toContain('**Fight Club**');
      expect(result).not.toContain('<a href="/movie/550"');
    });
  });

  describe('Test Pattern Processing', () => {
    test('should process all test patterns correctly', async () => {
      for (const testCase of MOVIE_TITLE_PATTERNS) {
        const result = await processAnalysisContent(testCase.input, 'Fight Club', 'test-section');

        // Extract the movie title from the expected output
        const expectedMatch = testCase.expected.match(/href="\/movie\/(\d+)"/);
        if (expectedMatch) {
          const expectedTmdbId = expectedMatch[1];
          expect(result).toContain(`href="/movie/${expectedTmdbId}"`);
          expect(result).toContain('class="movie-title"');
          expect(result).toContain(`data-tmdb-id="${expectedTmdbId}"`);
        }
      }
    });
  });

  describe('Enhanced Sections Processing', () => {
    test('should process array of sections with movie title links', async () => {
      const sections = [
        {
          text: 'This film is influenced by **The Matrix** (1999).',
          subhead: 'Visual Style'
        },
        {
          text: 'The narrative structure recalls **Citizen Kane** (1941).',
          subhead: 'Storytelling'
        }
      ];

      const processedSections = [];
      for (const section of sections) {
        const processedText = await processAnalysisContent(section.text, 'Fight Club', 'test-section');
        processedSections.push({
          ...section,
          text: processedText
        });
      }

      // Check first section
      expect(processedSections[0].text).toContain('<a href="/movie/603"');
      expect(processedSections[0].text).toContain('The Matrix</a>');
      expect(processedSections[0].subhead).toBe('Visual Style');

      // Check second section
      expect(processedSections[1].text).toContain('<a href="/movie/15"');
      expect(processedSections[1].text).toContain('Citizen Kane</a>');
      expect(processedSections[1].subhead).toBe('Storytelling');
    });

    test('should preserve section structure while processing links', async () => {
      const section = {
        text: 'Influenced by **Blade Runner** (1982) and **Se7en** (1995).',
        subhead: 'Influences',
        type: 'analysis'
      };

      const processedText = await processAnalysisContent(section.text, 'Fight Club', 'test-section');
      const processedSection = {
        ...section,
        text: processedText
      };

      expect(processedSection.subhead).toBe('Influences');
      expect(processedSection.type).toBe('analysis');
      expect(processedSection.text).toContain('<a href="/movie/78"');
      expect(processedSection.text).toContain('<a href="/movie/807"');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty or null content gracefully', async () => {
      expect(await processAnalysisContent('', 'Fight Club', 'test')).toBe('');
      expect(await processAnalysisContent(null, 'Fight Club', 'test')).toBe(null);
      expect(await processAnalysisContent(undefined, 'Fight Club', 'test')).toBe(undefined);
    });

    test('should handle database connection errors gracefully', async () => {
      const { MovieService } = require('../../lib/railway-db.js');
      MovieService.findMovieByTitle.mockRejectedValue(new Error('Database connection failed'));

      const input = 'This film is like **The Matrix** (1999).';
      const result = await processAnalysisContent(input, 'Fight Club', 'test-section');

      // Should return original text if processing fails
      expect(result).toBe(input);
    });

    test('should handle malformed movie title patterns', async () => {
      const input = 'This has **incomplete pattern (1999 missing closing paren.';
      const result = await processAnalysisContent(input, 'Fight Club', 'test-section');

      // Should return original text for malformed patterns
      expect(result).toBe(input);
    });
  });
});