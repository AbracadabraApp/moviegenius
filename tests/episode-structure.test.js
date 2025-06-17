/**
 * Episode Structure Unit Tests
 * 
 * Tests to verify that genius episodes have all required elements for proper rendering.
 * This ensures episodes display correctly with all 6 key components:
 * 1. Fixed Ask Input Bar (handled by template)
 * 2. Hero Section with image, title, subtitle
 * 3. Main Content Sections (text, movies)
 * 4. Explore Further section (interactive prompts)
 * 5. Series Navigation ("More in [Series Title]")
 * 6. More Ideas Section ("Related Films")
 */

const fs = require('fs');
const path = require('path');

// Test Episode 1 as template reference
const EPISODE_PATH = '/Users/josh.petersen/moviegenius/data/episodes/genius-1-1-1.json';

describe('Episode Structure Tests', () => {
  let episodeData;

  beforeAll(() => {
    // Load episode data
    const episodeContent = fs.readFileSync(EPISODE_PATH, 'utf8');
    episodeData = JSON.parse(episodeContent);
  });

  describe('Required Metadata', () => {
    test('should have system metadata', () => {
      expect(episodeData.system).toBe('genius');
      expect(episodeData.themeId).toBeDefined();
      expect(episodeData.seriesId).toBeDefined();
      expect(episodeData.episodeId).toBeDefined();
    });

    test('should have theme data with updated structure', () => {
      expect(episodeData.theme).toBeDefined();
      expect(episodeData.theme.id).toBeDefined();
      expect(episodeData.theme.title).toBe('Genres'); // Updated from "Film Noir & Crime"
      expect(episodeData.theme.description).toBeDefined();
      expect(episodeData.theme.slug).toBe('genres'); // Updated from "film-noir-crime"
    });

    test('should have series data with updated title', () => {
      expect(episodeData.series).toBeDefined();
      expect(episodeData.series.id).toBeDefined();
      expect(episodeData.series.title).toBe('Classic Film Noir'); // Updated from "Classic Film Noir (1940-1958)"
      expect(episodeData.series.description).toBeDefined();
    });

    test('should have episode data', () => {
      expect(episodeData.episode).toBeDefined();
      expect(episodeData.episode.id).toBeDefined();
      expect(episodeData.episode.title).toBeDefined();
      expect(episodeData.episode.subtitle).toBeDefined();
    });
  });

  describe('Hero Section Requirements', () => {
    test('should have hero image path', () => {
      expect(episodeData.heroImage).toBeDefined();
      expect(episodeData.heroImage).toMatch(/^\/images\/hero\//);
    });

    test('hero image file should exist', () => {
      const imagePath = path.join('/Users/josh.petersen/moviegenius/public', episodeData.heroImage);
      expect(fs.existsSync(imagePath)).toBe(true);
    });

    test('should have episode title and subtitle for hero display', () => {
      expect(episodeData.episode.title).toBeTruthy();
      expect(episodeData.episode.subtitle).toBeTruthy();
    });
  });

  describe('Content Structure', () => {
    test('should have content object', () => {
      expect(episodeData.content).toBeDefined();
      expect(episodeData.content.sections).toBeDefined();
      expect(Array.isArray(episodeData.content.sections)).toBe(true);
    });

    test('should have opener text', () => {
      expect(episodeData.content.opener).toBeDefined();
      expect(typeof episodeData.content.opener).toBe('string');
      expect(episodeData.content.opener.length).toBeGreaterThan(50);
    });

    test('should have text sections', () => {
      const textSections = episodeData.content.sections.filter(s => s.type === 'text');
      expect(textSections.length).toBeGreaterThan(0);
      
      textSections.forEach(section => {
        expect(section.content).toBeDefined();
        expect(typeof section.content).toBe('string');
        expect(section.content.length).toBeGreaterThan(100); // Substantial content
      });
    });

    test('should have movies sections', () => {
      const moviesSections = episodeData.content.sections.filter(s => s.type === 'movies');
      expect(moviesSections.length).toBeGreaterThan(0);
      
      moviesSections.forEach(section => {
        expect(Array.isArray(section.movies)).toBe(true);
        expect(section.movies.length).toBeGreaterThan(0);
      });
    });

    test('should have subhead sections', () => {
      const subheadSections = episodeData.content.sections.filter(s => s.type === 'subhead');
      expect(subheadSections.length).toBeGreaterThan(0);
      
      subheadSections.forEach(section => {
        expect(section.content).toBeDefined();
        expect(typeof section.content).toBe('string');
      });
    });
  });

  describe('Explore Further Sections (Interactive Prompts)', () => {
    test('should have multiple explore_further sections interleaved', () => {
      const exploreSections = episodeData.content.sections.filter(s => s.type === 'explore_further');
      expect(exploreSections.length).toBeGreaterThan(1); // Should have multiple sections throughout
    });

    test('each explore_further should have prompts array', () => {
      const exploreSections = episodeData.content.sections.filter(s => s.type === 'explore_further');
      exploreSections.forEach(exploreSection => {
        expect(Array.isArray(exploreSection.prompts)).toBe(true);
        expect(exploreSection.prompts.length).toBeGreaterThan(0);
        expect(exploreSection.prompts.length).toBeLessThanOrEqual(2); // 1-2 focused prompts each
      });
    });

    test('prompts should be valid questions', () => {
      const exploreSections = episodeData.content.sections.filter(s => s.type === 'explore_further');
      exploreSections.forEach(exploreSection => {
        exploreSection.prompts.forEach(prompt => {
          expect(typeof prompt).toBe('string');
          expect(prompt.length).toBeGreaterThan(10); // Substantial question
          expect(prompt.endsWith('?')).toBe(true); // Should be questions
        });
      });
    });

    test('explore_further sections should be distributed throughout content', () => {
      const sections = episodeData.content.sections;
      const exploreIndices = sections.map((section, index) => 
        section.type === 'explore_further' ? index : -1
      ).filter(index => index !== -1);
      
      // Should not all be at the end
      const lastIndex = sections.length - 1;
      const allAtEnd = exploreIndices.every(index => index > lastIndex - 2);
      expect(allAtEnd).toBe(false);
    });
  });

  describe('Movie Object Validation', () => {
    test('all movies should have required fields', () => {
      const moviesSections = episodeData.content.sections.filter(s => s.type === 'movies');
      
      moviesSections.forEach(section => {
        section.movies.forEach(movie => {
          // Required fields
          expect(movie.title).toBeDefined();
          expect(typeof movie.title).toBe('string');
          
          expect(movie.year).toBeDefined();
          expect(typeof movie.year).toBe('number');
          expect(movie.year).toBeGreaterThan(1900);
          expect(movie.year).toBeLessThan(2030);
          
          expect(movie.slug).toBeDefined();
          expect(typeof movie.slug).toBe('string');
          expect(movie.slug.length).toBeGreaterThan(10); // Substantial description
          
          expect(movie.tmdb_id).toBeDefined();
          expect(typeof movie.tmdb_id).toBe('number');
          
          // Optional fields (can be null but should be defined)
          expect(movie.hasOwnProperty('poster_url')).toBe(true);
          expect(movie.hasOwnProperty('streaming')).toBe(true);
        });
      });
    });
  });

  describe('More Ideas Section (Related Films)', () => {
    test('should have moreIdeas section', () => {
      expect(episodeData.content.moreIdeas).toBeDefined();
      expect(episodeData.content.moreIdeas.title).toBeDefined();
      expect(episodeData.content.moreIdeas.movies).toBeDefined();
    });

    test('moreIdeas should have movies array', () => {
      expect(Array.isArray(episodeData.content.moreIdeas.movies)).toBe(true);
      expect(episodeData.content.moreIdeas.movies.length).toBeGreaterThan(0);
    });

    test('moreIdeas movies should have required fields', () => {
      episodeData.content.moreIdeas.movies.forEach(movie => {
        expect(movie.title).toBeDefined();
        expect(movie.year).toBeDefined();
        expect(movie.slug).toBeDefined();
        expect(movie.tmdb_id).toBeDefined();
      });
    });
  });

  describe('Series Navigation Requirements', () => {
    test('should have series title for navigation', () => {
      expect(episodeData.series.title).toBeDefined();
      expect(typeof episodeData.series.title).toBe('string');
      // Should NOT contain date ranges for clean navigation
      expect(episodeData.series.title).not.toMatch(/\(\d{4}-\d{4}\)/);
    });
  });

  describe('Metadata and Locking', () => {
    test('should have version and type metadata', () => {
      expect(episodeData.version).toBe('3.0');
      expect(episodeData.type).toBe('educational');
    });

    test('should have generation timestamps', () => {
      expect(episodeData.generatedAt).toBeDefined();
      expect(episodeData.lockedAt).toBeDefined();
      expect(episodeData.lockedBy).toBeDefined();
    });

    test('should be locked to prevent accidental changes', () => {
      expect(episodeData.locked).toBe(true);
    });
  });
});

// Additional test for complete episode structure validation
describe('Complete Episode Structure Validation', () => {
  test('episode should have all 6 required rendering elements', () => {
    // 1. Hero Section - validated by hero image and episode data
    expect(episodeData.heroImage).toBeDefined();
    expect(episodeData.episode.title).toBeDefined();
    expect(episodeData.episode.subtitle).toBeDefined();
    
    // 2. Main Content Sections - text and movies
    const textSections = episodeData.content.sections.filter(s => s.type === 'text');
    const moviesSections = episodeData.content.sections.filter(s => s.type === 'movies');
    expect(textSections.length).toBeGreaterThan(0);
    expect(moviesSections.length).toBeGreaterThan(0);
    
    // 3. Explore Further - interactive prompts
    const exploreSections = episodeData.content.sections.filter(s => s.type === 'explore_further');
    expect(exploreSections.length).toBe(1);
    expect(exploreSections[0].prompts.length).toBeGreaterThan(0);
    
    // 4. Series Navigation - clean series title
    expect(episodeData.series.title).toBe('Classic Film Noir');
    
    // 5. More Ideas - related films
    expect(episodeData.content.moreIdeas.movies.length).toBeGreaterThan(0);
    
    // Note: Fixed Ask Input Bar (#1) is handled by the template component
  });
});

module.exports = {
  EPISODE_PATH,
  episodeData: () => {
    const content = fs.readFileSync(EPISODE_PATH, 'utf8');
    return JSON.parse(content);
  }
};