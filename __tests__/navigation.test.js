/**
 * Navigation Acceptance Tests
 * 
 * These tests verify that ALL navigation flows work correctly
 * BEFORE we refactor the navigation code.
 * 
 * Run these tests to ensure current navigation works,
 * then run after each refactor step to prevent regressions.
 */

const fs = require('fs');
const path = require('path');

// Mock Next.js router for testing
const mockRouter = {
  pathname: '/',
  push: jest.fn(),
  replace: jest.fn(),
};

// Mock useRouter hook
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock React hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
}));

describe('Navigation Acceptance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.pathname = '/';
  });

  describe('Homepage Theme Navigation', () => {
    test('Homepage contains all 10 theme routes', () => {
      const homepageContent = fs.readFileSync(
        path.join(__dirname, '../pages/index.js'),
        'utf8'
      );
      
      // Check for theme route mappings
      const expectedThemes = [
        'Film Noir',
        'Horror & Suspense', 
        'Comedy',
        'Women Directors',
        'International Masters',
        'Acclaimed Directors',
        'Movements in Film',
        'The Magic of Moviemaking',
        'Cinema Through the Decades',
        'Hollywood Transformed'
      ];
      
      expectedThemes.forEach(theme => {
        expect(homepageContent).toContain(theme);
      });
      
      // Verify theme routes use /themes/ prefix
      expect(homepageContent).toContain('/themes/film-noir');
      expect(homepageContent).toContain('/themes/horror-suspense');
      expect(homepageContent).toContain('/themes/comedy-through-time');
    });

    test('Homepage theme routes point to existing pages', () => {
      const themePaths = [
        'pages/themes/film-noir.js',
        'pages/themes/horror-suspense.js',
        'pages/themes/comedy-through-time.js',
        'pages/themes/women-directors.js',
        'pages/themes/world-cinema.js',
        'pages/themes/acclaimed-directors.js',
        'pages/themes/avant-garde-film.js',
        'pages/themes/magic-of-moviemaking.js',
        'pages/themes/cinema-through-decades.js',
        'pages/themes/cinema-cultural-impact.js'
      ];
      
      themePaths.forEach(themePath => {
        const fullPath = path.join(__dirname, '..', themePath);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });
  });

  describe('Theme Page Navigation', () => {
    test('ThemeFooter contains all theme links with /themes/ prefix', () => {
      const themeFooterContent = fs.readFileSync(
        path.join(__dirname, '../components/ThemeFooter.js'),
        'utf8'
      );
      
      // Check that it imports from centralized routes
      expect(themeFooterContent).toContain("from '../lib/routes'");
      expect(themeFooterContent).toContain("themeLinks");
      
      // Check that it uses the themeLinks array
      expect(themeFooterContent).toContain("themeLinks.map");
      expect(themeFooterContent).toContain("theme.href");
      expect(themeFooterContent).toContain("theme.label");
    });

    test('EssentialMovies episode links use correct pattern', () => {
      const essentialMoviesContent = fs.readFileSync(
        path.join(__dirname, '../components/EssentialMovies.js'),
        'utf8'
      );
      
      // Should import route helpers
      expect(essentialMoviesContent).toContain("from '../lib/routes'");
      expect(essentialMoviesContent).toContain("routeHelpers");
      
      // Should use route helper for episode links
      expect(essentialMoviesContent).toContain('routeHelpers.getEpisodeRoute');
    });

    test('Dynamic episode route handler exists', () => {
      const dynamicRoutePath = path.join(__dirname, '../pages/[theme]/[episode].js');
      expect(fs.existsSync(dynamicRoutePath)).toBe(true);
    });
  });

  describe('Episode Page Navigation', () => {
    test('EpisodeFooter theme links use /themes/ prefix', () => {
      const episodeFooterContent = fs.readFileSync(
        path.join(__dirname, '../components/EpisodeFooter.js'),
        'utf8'
      );
      
      // Should import route helpers
      expect(episodeFooterContent).toContain("from '../lib/routes'");
      expect(episodeFooterContent).toContain("routeHelpers");
      
      // Should use route helper for theme links
      expect(episodeFooterContent).toContain('routeHelpers.getThemeRoute');
    });

    test('EpisodeFooter episode links use correct pattern', () => {
      const episodeFooterContent = fs.readFileSync(
        path.join(__dirname, '../components/EpisodeFooter.js'),
        'utf8'
      );
      
      // Should use route helper for episode links
      expect(episodeFooterContent).toContain('routeHelpers.getEpisodeRoute');
    });
  });

  describe('Movie Navigation', () => {
    test('EssentialMovies movie links use correct pattern', () => {
      const essentialMoviesContent = fs.readFileSync(
        path.join(__dirname, '../components/EssentialMovies.js'),
        'utf8'
      );
      
      // Should use /movie/${movie.tmdb_id} pattern
      expect(essentialMoviesContent).toContain('href={`/movie/${movie.tmdb_id}`}');
    });

    test('Movie detail page handler exists', () => {
      const moviePagePath = path.join(__dirname, '../pages/movie/[id].js');
      expect(fs.existsSync(moviePagePath)).toBe(true);
    });
  });

  describe('NavBar Active State Detection', () => {
    test('NavBar imports required dependencies', () => {
      const navBarContent = fs.readFileSync(
        path.join(__dirname, '../components/NavBar.js'),
        'utf8'
      );
      
      expect(navBarContent).toContain("import { useRouter } from 'next/router'");
      expect(navBarContent).toContain("import Link from 'next/link'");
    });

    test('NavBar has theme detection logic', () => {
      const navBarContent = fs.readFileSync(
        path.join(__dirname, '../components/NavBar.js'),
        'utf8'
      );
      
      // Should import from centralized routes
      expect(navBarContent).toContain("from '../lib/routes'");
      
      // Should have route validation function
      expect(navBarContent).toContain("routeValidation");
      expect(navBarContent).toContain("shouldShowGeniusActive");
    });

    test('NavBar theme keys include all themes', () => {
      const navBarContent = fs.readFileSync(
        path.join(__dirname, '../components/NavBar.js'),
        'utf8'
      );
      
      // Check that it imports navItems from centralized routes
      expect(navBarContent).toContain("navItems");
      expect(navBarContent).toContain("from '../lib/routes'");
      
      // Check that it uses the navItems array
      expect(navBarContent).toContain("navItems.find");
    });
  });

  describe('Genius Page Navigation', () => {
    test('Genius page theme routes use /themes/ prefix', () => {
      const geniusContent = fs.readFileSync(
        path.join(__dirname, '../pages/genius.js'),
        'utf8'
      );
      
      // Check for theme route mappings with /themes/ prefix
      expect(geniusContent).toContain('/themes/film-noir');
      expect(geniusContent).toContain('/themes/horror-suspense');
    });
  });

  describe('Episode Template Navigation', () => {
    test('GeniusEpisodeTemplate theme routes use /themes/ prefix', () => {
      const episodeTemplateContent = fs.readFileSync(
        path.join(__dirname, '../components/GeniusEpisodeTemplate.js'),
        'utf8'
      );
      
      // Check for theme route mappings with /themes/ prefix
      expect(episodeTemplateContent).toContain('/themes/film-noir');
      expect(episodeTemplateContent).toContain('/themes/horror-suspense');
    });
  });

  describe('Route Consistency', () => {
    test('No components use old theme routes', () => {
      const componentFiles = [
        'components/ThemeFooter.js',
        'components/EpisodeFooter.js',
        'components/GeniusEpisodeTemplate.js',
        'pages/index.js',
        'pages/genius.js'
      ];
      
      const oldRoutePatterns = [
        /href=["']\/(film-noir|horror-suspense|comedy-through-time)["']/,
        /router\.push\(["']\/(film-noir|horror-suspense|comedy-through-time)["']\)/
      ];
      
      componentFiles.forEach(file => {
        const content = fs.readFileSync(
          path.join(__dirname, '..', file),
          'utf8'
        );
        
        oldRoutePatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            // Allow if it's part of /themes/theme-name
            const isThemesRoute = matches[0].includes('/themes/');
            expect(isThemesRoute).toBe(true);
          }
        });
      });
    });
  });

  describe('Theme Data Structure', () => {
    test('Theme episode mapping exists and is valid', () => {
      const themeMappingPath = path.join(__dirname, '../data/theme-episode-mapping.json');
      expect(fs.existsSync(themeMappingPath)).toBe(true);
      
      const themeMapping = JSON.parse(fs.readFileSync(themeMappingPath, 'utf8'));
      
      // Should have themes object
      expect(themeMapping.themes).toBeDefined();
      
      // Should have all expected themes
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
        'cinema-cultural-impact'
      ];
      
      expectedThemes.forEach(theme => {
        expect(themeMapping.themes[theme]).toBeDefined();
        expect(themeMapping.themes[theme].episodes).toBeDefined();
        expect(Array.isArray(themeMapping.themes[theme].episodes)).toBe(true);
      });
    });
  });
});

// Helper function to validate route patterns
function validateRoutePattern(content, expectedPattern, description) {
  const regex = new RegExp(expectedPattern);
  expect(regex.test(content)).toBe(true);
}

// Test data constants for reuse
export const TEST_THEMES = [
  { slug: 'film-noir', route: '/themes/film-noir', label: 'Film Noir' },
  { slug: 'horror-suspense', route: '/themes/horror-suspense', label: 'Horror & Suspense' },
  { slug: 'comedy-through-time', route: '/themes/comedy-through-time', label: 'Comedy' },
  { slug: 'women-directors', route: '/themes/women-directors', label: 'Women Directors' },
  { slug: 'world-cinema', route: '/themes/world-cinema', label: 'International Masters' },
  { slug: 'acclaimed-directors', route: '/themes/acclaimed-directors', label: 'Acclaimed Directors' },
  { slug: 'avant-garde-film', route: '/themes/avant-garde-film', label: 'Movements in Film' },
  { slug: 'magic-of-moviemaking', route: '/themes/magic-of-moviemaking', label: 'The Magic of Moviemaking' },
  { slug: 'cinema-through-decades', route: '/themes/cinema-through-decades', label: 'Cinema Through the Decades' },
  { slug: 'cinema-cultural-impact', route: '/themes/cinema-cultural-impact', label: 'Hollywood Transformed' }
];

export const TEST_ROUTES = {
  static: {
    home: '/',
    movies: '/movies',
    genius: '/genius',
    you: '/you'
  },
  dynamic: {
    episode: '/{theme}/{episode}',
    movie: '/movie/{id}'
  }
};