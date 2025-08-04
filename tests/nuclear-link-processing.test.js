/**
 * Test suite for nuclear static generator link processing
 * Tests the build-time conversion of movie mentions to direct TMDB links
 */

const {
  buildMovieLookup,
  processTextLinks,
  validateStaticData,
} = require('../lib/utils/nuclear-link-utils.js');

describe('Nuclear Link Processing', () => {
  describe('buildMovieLookup', () => {
    test('should build lookup map from movie sections', () => {
      const sections = [
        {
          type: 'text',
          content: 'Some analysis text',
        },
        {
          type: 'movies',
          movies: [
            { title: 'Modern Times', year: 1936, tmdb_id: 3082 },
            { title: 'The General', year: 1926, tmdb_id: 961 },
            { title: 'City Lights', year: 1931, tmdb_id: 901 }, // Should be excluded if currentTitle
          ],
        },
      ];

      const lookup = buildMovieLookup(sections, 'City Lights');

      expect(lookup.size).toBe(2); // Should exclude City Lights
      expect(lookup.get('modern times (1936)')).toEqual({
        title: 'Modern Times',
        tmdb_id: 3082,
        year: 1936,
      });
      expect(lookup.get('the general (1926)')).toEqual({
        title: 'The General',
        tmdb_id: 961,
        year: 1926,
      });
      expect(lookup.get('city lights (1931)')).toBeUndefined(); // Self-referential exclusion
    });

    test('should handle sections without movies', () => {
      const sections = [{ type: 'text', content: 'Only text here' }];

      const lookup = buildMovieLookup(sections, 'Test Movie');
      expect(lookup.size).toBe(0);
    });

    test('should handle movies without tmdb_id', () => {
      const sections = [
        {
          type: 'movies',
          movies: [
            { title: 'Valid Movie', year: 2000, tmdb_id: 123 },
            { title: 'Invalid Movie', year: 2001, tmdb_id: null },
            { title: 'Another Invalid', year: 2002 }, // No tmdb_id field
          ],
        },
      ];

      const lookup = buildMovieLookup(sections, 'Different Title');
      expect(lookup.size).toBe(1);
      expect(lookup.get('valid movie (2000)')).toBeDefined();
      expect(lookup.get('invalid movie (2001)')).toBeUndefined();
    });
  });

  describe('processTextLinks', () => {
    let movieLookup;

    beforeEach(() => {
      movieLookup = new Map();
      movieLookup.set('modern times (1936)', { title: 'Modern Times', tmdb_id: 3082, year: 1936 });
      movieLookup.set('the general (1926)', { title: 'The General', tmdb_id: 961, year: 1926 });
      movieLookup.set('casablanca (1942)', { title: 'Casablanca', tmdb_id: 329, year: 1942 });
    });

    test('should convert movie mentions to direct links', () => {
      const content = 'This film influenced **Modern Times** (1936) and **The General** (1926).';
      const result = processTextLinks(content, movieLookup, 'City Lights');

      expect(result).toBe(
        'This film influenced <a href="/movie/3082" class="movie-title">Modern Times</a> (1936) and <a href="/movie/961" class="movie-title">The General</a> (1926).'
      );
    });

    test('should prevent self-referential links', () => {
      const content = 'This film **City Lights** (1931) influenced **Modern Times** (1936).';
      const result = processTextLinks(content, movieLookup, 'City Lights');

      // City Lights should remain as **text**, Modern Times should be linked
      expect(result).toBe(
        'This film **City Lights** (1931) influenced <a href="/movie/3082" class="movie-title">Modern Times</a> (1936).'
      );
    });

    test('should handle case-insensitive title matching', () => {
      const content = 'Films like **MODERN TIMES** (1936) and **modern times** (1936).';
      const result = processTextLinks(content, movieLookup, 'City Lights');

      expect(result).toBe(
        'Films like <a href="/movie/3082" class="movie-title">MODERN TIMES</a> (1936) and <a href="/movie/3082" class="movie-title">modern times</a> (1936).'
      );
    });

    test('should ignore movies not in lookup', () => {
      const content = 'Unknown movie **The Matrix** (1999) and known **Modern Times** (1936).';
      const result = processTextLinks(content, movieLookup, 'City Lights');

      expect(result).toBe(
        'Unknown movie **The Matrix** (1999) and known <a href="/movie/3082" class="movie-title">Modern Times</a> (1936).'
      );
    });

    test('should handle multiple mentions of same movie', () => {
      const content = '**Modern Times** (1936) and again **Modern Times** (1936).';
      const result = processTextLinks(content, movieLookup, 'City Lights');

      expect(result).toBe(
        '<a href="/movie/3082" class="movie-title">Modern Times</a> (1936) and again <a href="/movie/3082" class="movie-title">Modern Times</a> (1936).'
      );
    });

    test('should handle empty or null content', () => {
      expect(processTextLinks('', movieLookup, 'Test')).toBe('');
      expect(processTextLinks(null, movieLookup, 'Test')).toBe(null);
      expect(processTextLinks(undefined, movieLookup, 'Test')).toBe(undefined);
    });

    test('should handle complex text with multiple patterns', () => {
      const content = `
        The influence of **Modern Times** (1936) can be seen in later works.
        Compare this to **The General** (1926) and **Casablanca** (1942).
        Some unlinked **Random Movie** (2000) should remain unchanged.
      `;

      const result = processTextLinks(content, movieLookup, 'City Lights');

      expect(result).toContain('<a href="/movie/3082" class="movie-title">Modern Times</a> (1936)');
      expect(result).toContain('<a href="/movie/961" class="movie-title">The General</a> (1926)');
      expect(result).toContain('<a href="/movie/329" class="movie-title">Casablanca</a> (1942)');
      expect(result).toContain('**Random Movie** (2000)'); // Should remain unchanged
    });

    test('should preserve exact title casing in links', () => {
      const content = 'Films like **MODERN TIMES** (1936) with weird casing.';
      const result = processTextLinks(content, movieLookup, 'City Lights');

      // Should preserve the original "MODERN TIMES" casing in the link text
      expect(result).toBe(
        'Films like <a href="/movie/3082" class="movie-title">MODERN TIMES</a> (1936) with weird casing.'
      );
    });

    test('should handle edge case with title matching current movie but different casing', () => {
      const content = 'This film **CITY LIGHTS** (1931) influenced others.';
      const result = processTextLinks(content, movieLookup, 'City Lights');

      // Should still prevent self-referential link even with different casing
      expect(result).toBe('This film **CITY LIGHTS** (1931) influenced others.');
    });
  });

  describe('Integration Tests', () => {
    test('should process full analysis sections correctly', () => {
      const sections = [
        {
          type: 'text',
          content: '**City Lights** (1931) influenced **Modern Times** (1936).',
        },
        {
          type: 'movies',
          movies: [
            { title: 'City Lights', year: 1931, tmdb_id: 901 },
            { title: 'Modern Times', year: 1936, tmdb_id: 3082 },
          ],
        },
        {
          type: 'text',
          content: 'Later films like **Modern Times** (1936) continued the tradition.',
        },
      ];

      const lookup = buildMovieLookup(sections, 'City Lights');

      const processedSections = sections.map(section => {
        if (section.type === 'text' && section.content) {
          return {
            ...section,
            content: processTextLinks(section.content, lookup, 'City Lights'),
          };
        }
        return section;
      });

      // First text section: City Lights should remain, Modern Times should link
      expect(processedSections[0].content).toBe(
        '**City Lights** (1931) influenced <a href="/movie/3082" class="movie-title">Modern Times</a> (1936).'
      );

      // Third text section: Modern Times should link
      expect(processedSections[2].content).toBe(
        'Later films like <a href="/movie/3082" class="movie-title">Modern Times</a> (1936) continued the tradition.'
      );

      // Movies section should remain unchanged
      expect(processedSections[1]).toEqual(sections[1]);
    });
  });

  describe('validateStaticData', () => {
    test('should validate complete static data structure', () => {
      const validData = {
        props: {
          title: 'Test Movie',
          year: 2000,
          tmdbId: 123,
          hasAnalysis: true,
          initialPoster: 'https://image.tmdb.org/t/p/w500/valid.jpg',
          sections: [
            {
              type: 'text',
              content:
                'This film influenced <a href="/movie/456" class="movie-title">Other Movie</a> (2001).',
            },
            {
              type: 'movies',
              movies: [
                { title: 'Other Movie', year: 2001, tmdb_id: 456, poster_url: 'https://valid.jpg' },
              ],
            },
          ],
        },
      };

      const result = validateStaticData(validData, 'Test Movie');
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test('should detect search-based links', () => {
      const dataWithSearchLinks = {
        props: {
          title: 'Test Movie',
          year: 2000,
          tmdbId: 123,
          hasAnalysis: true,
          sections: [
            {
              type: 'text',
              content: 'See also <a href="/search?q=other+movie">Other Movie</a>.',
            },
          ],
        },
      };

      const result = validateStaticData(dataWithSearchLinks, 'Test Movie');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        'Section 0 has search-based links: href="/search?q=other+movie"'
      );
    });

    test('should detect unprocessed movie links', () => {
      const dataWithUnprocessedLinks = {
        props: {
          title: 'Test Movie',
          year: 2000,
          tmdbId: 123,
          hasAnalysis: true,
          sections: [
            {
              type: 'text',
              content: 'This film influenced **Other Movie** (2001) greatly.',
            },
          ],
        },
      };

      const result = validateStaticData(dataWithUnprocessedLinks, 'Test Movie');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        'Section 0 has unprocessed movie links: **Other Movie** (2001)'
      );
    });

    test('should allow self-referential unprocessed links', () => {
      const dataWithSelfRef = {
        props: {
          title: 'Test Movie',
          year: 2000,
          tmdbId: 123,
          hasAnalysis: true,
          sections: [
            {
              type: 'text',
              content:
                '**Test Movie** (2000) is a great film that influenced **Other Movie** (2001).',
            },
          ],
        },
      };

      const result = validateStaticData(dataWithSelfRef, 'Test Movie');
      expect(result.valid).toBe(false);
      // Should only complain about Other Movie, not Test Movie
      expect(result.issues).toContain(
        'Section 0 has unprocessed movie links: **Other Movie** (2001)'
      );
      expect(result.issues.some(issue => issue.includes('**Test Movie**'))).toBe(false);
    });

    test('should detect placeholder posters', () => {
      const dataWithPlaceholders = {
        props: {
          title: 'Test Movie',
          year: 2000,
          tmdbId: 123,
          hasAnalysis: true,
          initialPoster: '/images/placeholder-poster.jpg',
          sections: [
            {
              type: 'movies',
              movies: [
                {
                  title: 'Other Movie',
                  year: 2001,
                  tmdb_id: 456,
                  poster_url: '/images/placeholder-poster.jpg',
                },
              ],
            },
          ],
        },
      };

      const result = validateStaticData(dataWithPlaceholders, 'Test Movie');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        'Main movie has placeholder poster: /images/placeholder-poster.jpg'
      );
      expect(result.issues).toContain(
        'Movie 0 in section 0 has placeholder poster: /images/placeholder-poster.jpg'
      );
    });

    test('should detect missing TMDB IDs', () => {
      const dataWithMissingIds = {
        props: {
          title: 'Test Movie',
          year: 2000,
          tmdbId: 123,
          hasAnalysis: true,
          sections: [
            {
              type: 'movies',
              movies: [{ title: 'Other Movie', year: 2001, tmdb_id: null }],
            },
          ],
        },
      };

      const result = validateStaticData(dataWithMissingIds, 'Test Movie');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Movie 0 in section 0 missing TMDB ID: Other Movie');
    });
  });

  describe('End-to-End Validation Tests', () => {
    test('should run validation on test nuclear static file', async () => {
      // Test with a sample from actual nuclear static data
      const testData = {
        props: {
          title: 'City Lights',
          year: 1931,
          tmdbId: 901,
          hasAnalysis: true,
          initialPoster: 'https://image.tmdb.org/t/p/w500/ugmakEL5y294I5bXgiBqApuZpwc.jpg',
          sections: [
            {
              type: 'text',
              content:
                'This film influenced <a href="/movie/3082" class="movie-title">Modern Times</a> (1936).',
            },
            {
              type: 'movies',
              movies: [
                {
                  title: 'Modern Times',
                  year: 1936,
                  tmdb_id: 3082,
                  poster_url: 'https://image.tmdb.org/t/p/w500/valid.jpg',
                },
              ],
            },
          ],
        },
      };

      const result = validateStaticData(testData, 'City Lights');
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test('should detect self-referential processed links', () => {
      const dataWithSelfLink = {
        props: {
          title: 'City Lights',
          year: 1931,
          tmdbId: 901,
          hasAnalysis: true,
          sections: [
            {
              type: 'text',
              content:
                'This film <a href="/movie/901" class="movie-title">City Lights</a> (1931) is great.',
            },
          ],
        },
      };

      const result = validateStaticData(dataWithSelfLink, 'City Lights');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        'Section 0 has self-referential link: <a href="/movie/901" class="movie-title">City Lights</a>'
      );
    });
  });
});
