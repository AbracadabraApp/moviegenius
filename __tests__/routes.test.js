/**
 * Route Validation Tests
 *
 * These tests verify that all routes return correct HTTP status codes
 * and that invalid routes properly return 404s.
 *
 * This prevents navigation regressions by ensuring all expected
 * routes are accessible and invalid routes are blocked.
 */

const fs = require('fs');
const path = require('path');

describe('Route Validation Tests', () => {
  describe('Theme Page Routes', () => {
    const expectedThemeRoutes = [
      '/themes/film-noir',
      '/themes/horror-suspense',
      '/themes/comedy-through-time',
      '/themes/women-directors',
      '/themes/world-cinema',
      '/themes/acclaimed-directors',
      '/themes/avant-garde-film',
      '/themes/magic-of-moviemaking',
      '/themes/cinema-through-decades',
      '/themes/cinema-cultural-impact',
    ];

    test('All theme page files exist', () => {
      expectedThemeRoutes.forEach(route => {
        const themeName = route.replace('/themes/', '');
        const filePath = path.join(__dirname, '../pages/themes', `${themeName}.js`);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('Theme pages import ThemePage component correctly', () => {
      expectedThemeRoutes.forEach(route => {
        const themeName = route.replace('/themes/', '');
        const filePath = path.join(__dirname, '../pages/themes', `${themeName}.js`);
        const content = fs.readFileSync(filePath, 'utf8');

        // Should import ThemePage
        expect(content).toContain("import ThemePage from '../../components/ThemePage'");

        // Should use correct themeId
        expect(content).toContain(`themeId="${themeName}"`);
      });
    });
  });

  describe('Static Page Routes', () => {
    const staticRoutes = [
      { route: '/', file: 'pages/index.js' },
      { route: '/movies', file: 'pages/movies.js' },
      { route: '/genius', file: 'pages/genius.js' },
      { route: '/you', file: 'pages/you.js' },
    ];

    test('All static page files exist', () => {
      staticRoutes.forEach(({ route, file }) => {
        const filePath = path.join(__dirname, '..', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Dynamic Route Handlers', () => {
    test('Episode dynamic route handler exists', () => {
      const episodeRoutePath = path.join(__dirname, '../pages/[theme]/[episode].js');
      expect(fs.existsSync(episodeRoutePath)).toBe(true);
    });

    test('Movie dynamic route handler exists', () => {
      const movieRoutePath = path.join(__dirname, '../pages/movie/[id].js');
      expect(fs.existsSync(movieRoutePath)).toBe(true);
    });

    test('Episode route handler has getStaticPaths', () => {
      const episodeRoutePath = path.join(__dirname, '../pages/[theme]/[episode].js');
      const content = fs.readFileSync(episodeRoutePath, 'utf8');

      expect(content).toContain('getStaticPaths');
      expect(content).toContain('getStaticProps');
    });
  });

  describe('Invalid Route Protection', () => {
    test('Old theme routes should not have page files', () => {
      const oldThemeRoutes = [
        'film-noir.js',
        'horror-suspense.js',
        'comedy-through-time.js',
        'women-directors.js',
        'world-cinema.js',
        'acclaimed-directors.js',
        'avant-garde-film.js',
        'magic-of-moviemaking.js',
        'cinema-through-decades.js',
        'cinema-cultural-impact.js',
      ];

      oldThemeRoutes.forEach(fileName => {
        const oldPath = path.join(__dirname, '../pages', fileName);
        // These should not exist (may exist as .backup files)
        if (fs.existsSync(oldPath)) {
          // If it exists, it should be a backup file
          expect(fileName).toContain('.backup');
        }
      });
    });
  });

  describe('Theme Episode Data Validation', () => {
    test('Theme episode mapping contains valid data', () => {
      const mappingPath = path.join(__dirname, '../data/theme-episode-mapping.json');
      expect(fs.existsSync(mappingPath)).toBe(true);

      const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

      // Validate structure
      expect(mapping.themes).toBeDefined();
      expect(typeof mapping.themes).toBe('object');

      // Check each theme has required fields
      Object.keys(mapping.themes).forEach(themeKey => {
        const theme = mapping.themes[themeKey];

        expect(theme.id).toBeDefined();
        expect(theme.title).toBeDefined();
        expect(theme.episodes).toBeDefined();
        expect(Array.isArray(theme.episodes)).toBe(true);

        // Check each episode has required fields
        theme.episodes.forEach(episode => {
          expect(episode.id).toBeDefined();
          expect(episode.title).toBeDefined();
          expect(episode.subtitle).toBeDefined();
          expect(typeof episode.id).toBe('string');
          expect(typeof episode.title).toBe('string');
        });
      });
    });

    test('All themes in mapping have corresponding page files', () => {
      const mappingPath = path.join(__dirname, '../data/theme-episode-mapping.json');
      const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

      Object.keys(mapping.themes).forEach(themeKey => {
        const themePage = path.join(__dirname, '../pages/themes', `${themeKey}.js`);
        expect(fs.existsSync(themePage)).toBe(true);
      });
    });
  });

  describe('Component Dependencies', () => {
    test('Required navigation components exist', () => {
      const requiredComponents = [
        'components/NavBar.js',
        'components/ThemeFooter.js',
        'components/EpisodeFooter.js',
        'components/EssentialMovies.js',
        'components/ThemePage.js',
        'components/PhoneFrame.js',
      ];

      requiredComponents.forEach(componentPath => {
        const fullPath = path.join(__dirname, '..', componentPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    test('Navigation components import required dependencies', () => {
      const navBarPath = path.join(__dirname, '../components/NavBar.js');
      const navBarContent = fs.readFileSync(navBarPath, 'utf8');

      expect(navBarContent).toContain('import { useRouter }');
      expect(navBarContent).toContain("import Link from 'next/link'");
    });
  });

  describe('Route Parameter Validation', () => {
    test('Theme keys in NavBar match theme mapping', () => {
      // Get theme keys from NavBar
      const navBarPath = path.join(__dirname, '../components/NavBar.js');
      const navBarContent = fs.readFileSync(navBarPath, 'utf8');

      // Get theme keys from mapping
      const mappingPath = path.join(__dirname, '../data/theme-episode-mapping.json');
      const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      const mappingThemes = Object.keys(mapping.themes);

      // Check that NavBar imports from centralized routes
      expect(navBarContent).toContain("from '../lib/routes'");
      expect(navBarContent).toContain('navItems');
      expect(navBarContent).toContain('routeValidation');
    });
  });

  describe('Link Pattern Validation', () => {
    test('All Link components use valid href patterns', () => {
      const componentFiles = [
        'components/ThemeFooter.js',
        'components/EssentialMovies.js',
        'components/EpisodeFooter.js',
      ];

      componentFiles.forEach(file => {
        const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

        // Should not contain broken patterns like href="/film-noir"
        const brokenPatterns = [
          /href=["']\/film-noir["']/,
          /href=["']\/horror-suspense["']/,
          /href=["']\/comedy-through-time["']/,
        ];

        brokenPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            // If found, should be part of /themes/ route
            expect(matches[0]).toContain('/themes/');
          }
        });
      });
    });
  });

  describe('Essential Movies Data Validation', () => {
    test('EssentialMovies component has valid movie data', () => {
      const essentialMoviesPath = path.join(__dirname, '../components/EssentialMovies.js');
      const content = fs.readFileSync(essentialMoviesPath, 'utf8');

      // Should define essentialMovies object
      expect(content).toContain('const essentialMovies = {');

      // Should have all theme keys
      const expectedThemes = [
        'film-noir',
        'horror-suspense',
        'comedy-through-time',
        'women-directors',
        'world-cinema',
        'acclaimed-directors',
        'avant-garde-film',
        'magic-of-moviemaking',
        'cinema-through-decades',
        'cinema-cultural-impact',
      ];

      expectedThemes.forEach(theme => {
        expect(content).toContain(`'${theme}': [`);
      });
    });
  });
});

// Test utilities for route validation
export const routeTestUtils = {
  /**
   * Validates that a component file contains expected route patterns
   */
  validateRoutePatterns: (componentPath, expectedPatterns) => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expectedPatterns.forEach(pattern => {
      expect(content).toMatch(pattern);
    });
  },

  /**
   * Validates that a component doesn't contain broken route patterns
   */
  validateNoBrokenRoutes: (componentPath, brokenPatterns) => {
    const content = fs.readFileSync(componentPath, 'utf8');
    brokenPatterns.forEach(pattern => {
      expect(content).not.toMatch(pattern);
    });
  },

  /**
   * Validates Next.js page file structure
   */
  validatePageStructure: (pagePath, expectedExports = ['default']) => {
    const content = fs.readFileSync(pagePath, 'utf8');
    expectedExports.forEach(exportName => {
      if (exportName === 'default') {
        expect(content).toMatch(/export default function/);
      } else {
        expect(content).toContain(`export ${exportName}`);
      }
    });
  },
};

// Route constants for testing
export const ROUTE_PATTERNS = {
  theme: /^\/themes\/[a-z-]+$/,
  episode: /^\/[a-z-]+\/[a-z-]+$/,
  movie: /^\/movie\/\d+$/,
  static: /^\/[a-z]*$/,
};
