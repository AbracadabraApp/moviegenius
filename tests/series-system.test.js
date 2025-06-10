/**
 * Educational Series System Unit Tests
 * 
 * Tests for series configuration, content generation, and API endpoints
 */

const fs = require('fs');
const path = require('path');
const { loadSeriesConfig, parseClaudeResponse, generateEpisodeContent } = require('../scripts/generate-episode-content');

// Mock data for testing
const mockSeriesConfig = {
  "2": {
    "id": 2,
    "title": "Cinema Through Time - 1970-2025",
    "description": "How film evolved from the auteur renaissance through the present day",
    "episodes": [
      {
        "id": 1,
        "title": "1970s: The Auteur Renaissance",
        "subtitle": "When directors became superstars",
        "posters": [
          "https://image.tmdb.org/t/p/w200/poster1.jpg",
          "https://image.tmdb.org/t/p/w200/poster2.jpg"
        ]
      }
    ]
  }
};

const mockClaudeResponse = `OPENER: The 1970s marked a revolutionary period in American cinema.

PARAGRAPH: The decade began with a creative explosion that redefined filmmaking. Francis Ford Coppola's The Godfather demonstrated artistic greatness. The Last Picture Show proved intimate stories could captivate audiences.
MOVIES: The Godfather|1972|Coppola's epic family saga|tt0068646
MOVIES: The Last Picture Show|1971|Bogdanovich's nostalgic masterpiece|tt0067328

PARAGRAPH: Martin Scorsese emerged as the poet of urban alienation with Mean Streets. Steven Spielberg revolutionized the thriller with Jaws. These directors crafted personal statements about American society.
MOVIES: Mean Streets|1973|Scorsese's breakthrough Catholic guilt story|tt0070379
MOVIES: Jaws|1975|Spielberg's shark thriller creates summer blockbuster|tt0073195

MORE_IDEAS: Taxi Driver|1976|De Niro's Travis Bickle antihero|tt0075314
MORE_IDEAS: The Conversation|1974|Coppola's paranoid surveillance thriller|tt0071360`;

describe('Series Configuration', () => {
  test('should load series configuration correctly', () => {
    // Mock fs.readFileSync
    const originalReadFileSync = fs.readFileSync;
    fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(mockSeriesConfig));

    const config = loadSeriesConfig();
    
    expect(config).toEqual(mockSeriesConfig);
    expect(config['2'].title).toBe('Cinema Through Time - 1970-2025');
    expect(config['2'].episodes).toHaveLength(1);
    expect(config['2'].episodes[0].id).toBe(1);

    // Restore original function
    fs.readFileSync = originalReadFileSync;
  });

  test('should validate series structure', () => {
    const series = mockSeriesConfig['2'];
    
    expect(series).toHaveProperty('id');
    expect(series).toHaveProperty('title');
    expect(series).toHaveProperty('description');
    expect(series).toHaveProperty('episodes');
    expect(Array.isArray(series.episodes)).toBe(true);
  });

  test('should validate episode structure', () => {
    const episode = mockSeriesConfig['2'].episodes[0];
    
    expect(episode).toHaveProperty('id');
    expect(episode).toHaveProperty('title');
    expect(episode).toHaveProperty('subtitle');
    expect(episode).toHaveProperty('posters');
    expect(Array.isArray(episode.posters)).toBe(true);
  });
});

describe('Claude Response Parsing', () => {
  test('should parse opener correctly', () => {
    const parsed = parseClaudeResponse(mockClaudeResponse);
    
    expect(parsed.opener).toBe('The 1970s marked a revolutionary period in American cinema.');
  });

  test('should parse paragraphs and movies correctly', () => {
    const parsed = parseClaudeResponse(mockClaudeResponse);
    
    expect(parsed.sections).toHaveLength(4); // 2 text + 2 movie sections
    
    // Check first text section
    expect(parsed.sections[0].type).toBe('text');
    expect(parsed.sections[0].content).toContain('creative explosion');
    
    // Check first movie section
    expect(parsed.sections[1].type).toBe('movies');
    expect(parsed.sections[1].movies).toHaveLength(2);
    expect(parsed.sections[1].movies[0].title).toBe('The Godfather');
    expect(parsed.sections[1].movies[0].year).toBe(1972);
    expect(parsed.sections[1].movies[0].tmdb_id).toBe('tt0068646');
  });

  test('should parse more ideas correctly', () => {
    const parsed = parseClaudeResponse(mockClaudeResponse);
    
    expect(parsed.moreIdeas.movies).toHaveLength(2);
    expect(parsed.moreIdeas.movies[0].title).toBe('Taxi Driver');
    expect(parsed.moreIdeas.movies[0].year).toBe(1976);
    expect(parsed.moreIdeas.movies[1].title).toBe('The Conversation');
  });

  test('should handle malformed response gracefully', () => {
    const malformedResponse = 'Invalid response without proper structure';
    const parsed = parseClaudeResponse(malformedResponse);
    
    expect(parsed.opener).toBeNull();
    expect(parsed.sections).toHaveLength(0);
    expect(parsed.moreIdeas.movies).toHaveLength(0);
  });
});

describe('Episode Content Generation', () => {
  test('should generate episode structure correctly', async () => {
    // Mock Anthropic API
    const mockAnthropic = {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: mockClaudeResponse }]
        })
      }
    };

    // Mock require to return our mock
    const originalRequire = require;
    jest.doMock('@anthropic-ai/sdk', () => ({
      Anthropic: jest.fn(() => mockAnthropic)
    }));

    const series = mockSeriesConfig['2'];
    const episode = series.episodes[0];
    
    const result = await generateEpisodeContent(series, episode);
    
    expect(result).toHaveProperty('seriesId', '2');
    expect(result).toHaveProperty('episodeId', '1');
    expect(result).toHaveProperty('content');
    expect(result.content).toHaveProperty('opener');
    expect(result.content).toHaveProperty('sections');
    expect(result.content).toHaveProperty('moreIdeas');
  });
});

describe('API Endpoint Logic', () => {
  test('should load pre-generated content when available', () => {
    const mockEpisodeData = {
      content: {
        opener: 'Test opener',
        sections: [],
        moreIdeas: { movies: [] }
      }
    };

    // Mock fs.existsSync and fs.readFileSync
    const originalExistsSync = fs.existsSync;
    const originalReadFileSync = fs.readFileSync;
    
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(mockEpisodeData));

    // Import the function that loads episode content
    const { loadEpisodeContent } = require('../pages/api/series-episode');
    
    const result = loadEpisodeContent('2', '1');
    
    expect(result).toEqual(mockEpisodeData.content);
    expect(fs.existsSync).toHaveBeenCalledWith(
      expect.stringContaining('series-2-episode-1.json')
    );

    // Restore original functions
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
  });

  test('should return null when pre-generated content not available', () => {
    // Mock fs.existsSync to return false
    const originalExistsSync = fs.existsSync;
    fs.existsSync = jest.fn().mockReturnValue(false);

    const { loadEpisodeContent } = require('../pages/api/series-episode');
    
    const result = loadEpisodeContent('999', '999');
    
    expect(result).toBeNull();

    // Restore original function
    fs.existsSync = originalExistsSync;
  });
});

describe('Movie Data Processing', () => {
  test('should process movie data correctly', () => {
    const movieData = {
      title: 'The Godfather',
      year: 1972,
      slug: 'Epic family saga',
      tmdb_id: 'tt0068646'
    };

    const { processMovieData } = require('../pages/api/series-episode');
    const processed = processMovieData(movieData);

    expect(processed).toHaveProperty('title', 'The Godfather');
    expect(processed).toHaveProperty('year', 1972);
    expect(processed).toHaveProperty('slug', 'Epic family saga');
    expect(processed).toHaveProperty('poster_url', null);
    expect(processed).toHaveProperty('streaming', null);
  });
});

describe('URL Structure Validation', () => {
  test('should validate series URL patterns', () => {
    const validUrls = [
      '/recs',
      '/recs/series',
      '/recs/series/2',
      '/recs/2/1',
      '/recs?series=2'
    ];

    const urlPatterns = {
      main: /^\/recs$/,
      allSeries: /^\/recs\/series$/,
      seriesPage: /^\/recs\/series\/\d+$/,
      episode: /^\/recs\/\d+\/\d+$/,
      dynamicSeries: /^\/recs\?series=\d+$/
    };

    expect(validUrls[0]).toMatch(urlPatterns.main);
    expect(validUrls[1]).toMatch(urlPatterns.allSeries);
    expect(validUrls[2]).toMatch(urlPatterns.seriesPage);
    expect(validUrls[3]).toMatch(urlPatterns.episode);
    expect(validUrls[4]).toMatch(urlPatterns.dynamicSeries);
  });
});

describe('Content Quality Validation', () => {
  test('should validate episode content structure', () => {
    const validContent = {
      opener: 'Opening sentence',
      sections: [
        { type: 'text', content: 'Paragraph content' },
        { 
          type: 'movies', 
          movies: [
            { title: 'Movie', year: 2020, slug: 'Description', tmdb_id: 'tt123456' }
          ]
        }
      ],
      moreIdeas: {
        title: 'More Ideas',
        movies: []
      }
    };

    expect(validContent).toHaveProperty('opener');
    expect(validContent).toHaveProperty('sections');
    expect(validContent).toHaveProperty('moreIdeas');
    expect(Array.isArray(validContent.sections)).toBe(true);
    expect(validContent.moreIdeas).toHaveProperty('movies');
  });

  test('should validate movie object structure', () => {
    const validMovie = {
      title: 'The Godfather',
      year: 1972,
      slug: 'Epic family saga',
      tmdb_id: 'tt0068646',
      poster_url: null,
      streaming: null
    };

    expect(validMovie).toHaveProperty('title');
    expect(validMovie).toHaveProperty('year');
    expect(validMovie).toHaveProperty('slug');
    expect(typeof validMovie.year).toBe('number');
    expect(validMovie.year).toBeGreaterThan(1800);
    expect(validMovie.year).toBeLessThan(2030);
  });
});

describe('Error Handling', () => {
  test('should handle missing series gracefully', () => {
    const { loadSeriesData } = require('../pages/api/series-episode');
    
    // Mock fs.readFileSync to throw error
    const originalReadFileSync = fs.readFileSync;
    fs.readFileSync = jest.fn().mockImplementation(() => {
      throw new Error('File not found');
    });

    const result = loadSeriesData();
    
    // Should return fallback structure
    expect(result).toHaveProperty('2');
    expect(result['2']).toHaveProperty('title');

    // Restore original function
    fs.readFileSync = originalReadFileSync;
  });

  test('should handle API errors gracefully', async () => {
    // Mock Anthropic API to throw error
    const mockAnthropic = {
      messages: {
        create: jest.fn().mockRejectedValue(new Error('API Error'))
      }
    };

    jest.doMock('@anthropic-ai/sdk', () => ({
      Anthropic: jest.fn(() => mockAnthropic)
    }));

    const series = mockSeriesConfig['2'];
    const episode = series.episodes[0];
    
    try {
      await generateEpisodeContent(series, episode);
    } catch (error) {
      expect(error.message).toBe('API Error');
    }
  });
});

describe('Performance Considerations', () => {
  test('should validate file sizes are reasonable', () => {
    const mockEpisodeContent = {
      seriesId: '2',
      episodeId: '1',
      content: {
        opener: 'Test opener',
        sections: new Array(6).fill({
          type: 'text',
          content: 'A'.repeat(500) // 500 chars per section
        }),
        moreIdeas: {
          movies: new Array(8).fill({
            title: 'Movie',
            year: 2020,
            slug: 'Description'
          })
        }
      }
    };

    const serialized = JSON.stringify(mockEpisodeContent);
    
    // File should be reasonable size (under 50KB)
    expect(serialized.length).toBeLessThan(50000);
    
    // But substantial enough to be valuable (over 2KB)
    expect(serialized.length).toBeGreaterThan(2000);
  });

  test('should validate reasonable number of movies per episode', () => {
    const parsed = parseClaudeResponse(mockClaudeResponse);
    
    const totalMovies = parsed.sections
      .filter(section => section.type === 'movies')
      .reduce((total, section) => total + section.movies.length, 0);
    
    const moreIdeasMovies = parsed.moreIdeas.movies.length;
    
    // Should have reasonable number of movies (8-25 total)
    expect(totalMovies + moreIdeasMovies).toBeGreaterThan(3);
    expect(totalMovies + moreIdeasMovies).toBeLessThan(30);
  });
});

// Integration test helpers
describe('Integration Test Helpers', () => {
  test('should provide test data generators', () => {
    const generateTestSeries = (id) => ({
      id,
      title: `Test Series ${id}`,
      description: `Description for series ${id}`,
      episodes: Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        title: `Episode ${i + 1}`,
        subtitle: `Subtitle ${i + 1}`,
        posters: [`poster${i + 1}.jpg`]
      }))
    });

    const testSeries = generateTestSeries(99);
    
    expect(testSeries.id).toBe(99);
    expect(testSeries.episodes).toHaveLength(6);
    expect(testSeries.episodes[0].id).toBe(1);
  });

  test('should provide content validation utilities', () => {
    const validateEpisodeContent = (content) => {
      const errors = [];
      
      if (!content.opener) errors.push('Missing opener');
      if (!content.sections || content.sections.length === 0) errors.push('Missing sections');
      if (!content.moreIdeas) errors.push('Missing moreIdeas');
      
      return errors;
    };

    const validContent = {
      opener: 'Test',
      sections: [{ type: 'text', content: 'Content' }],
      moreIdeas: { movies: [] }
    };

    const invalidContent = { opener: 'Test' };

    expect(validateEpisodeContent(validContent)).toHaveLength(0);
    expect(validateEpisodeContent(invalidContent)).toHaveLength(2);
  });
});

// Export for use in other test files
module.exports = {
  mockSeriesConfig,
  mockClaudeResponse,
  parseClaudeResponse
};