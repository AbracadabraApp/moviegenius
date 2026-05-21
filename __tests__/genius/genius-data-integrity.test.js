/**
 * Genius Data Integrity Tests
 *
 * Validates the genius_data.json structure and content:
 * - JSON schema validation
 * - Category/tier structure
 * - Film data completeness
 * - TMDB ID format validation
 * - Tier ordering
 */

import fs from 'fs';
import path from 'path';

const GENIUS_DATA_PATH = path.join(process.cwd(), 'ios/moviegenius/moviegenius/Resources/genius_data.json');

describe('Genius Data Integrity', () => {
  let geniusData;

  beforeAll(() => {
    const rawData = fs.readFileSync(GENIUS_DATA_PATH, 'utf-8');
    geniusData = JSON.parse(rawData);
  });

  describe('Schema Validation', () => {
    test('should have valid root structure', () => {
      expect(geniusData).toHaveProperty('schemaVersion');
      expect(geniusData).toHaveProperty('categories');
      expect(geniusData.schemaVersion).toBe(1);
      expect(Array.isArray(geniusData.categories)).toBe(true);
    });

    test('should have 18 genre categories', () => {
      expect(geniusData.categories).toHaveLength(18);
    });

    test('each category should have valid structure', () => {
      geniusData.categories.forEach(category => {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('tiers');
        expect(typeof category.category).toBe('string');
        expect(category.category.length).toBeGreaterThan(0);
        expect(Array.isArray(category.tiers)).toBe(true);
        expect(category.tiers.length).toBeGreaterThan(0);
      });
    });

    test('all genre names should be unique', () => {
      const genreNames = geniusData.categories.map(c => c.category);
      const uniqueGenres = new Set(genreNames);
      expect(uniqueGenres.size).toBe(genreNames.length);
    });
  });

  describe('Tier Structure', () => {
    test('each tier should have required fields', () => {
      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          expect(tier).toHaveProperty('name');
          expect(tier).toHaveProperty('order');
          expect(tier).toHaveProperty('films');
          expect(typeof tier.name).toBe('string');
          expect(typeof tier.order).toBe('number');
          expect(Array.isArray(tier.films)).toBe(true);
        });
      });
    });

    test('tier names should follow naming convention', () => {
      const validTierNames = ['Essential', 'Great', 'Deeper Cuts', 'For Scholars', 'Way Deep', 'Ultra Deep'];

      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          expect(validTierNames).toContain(tier.name);
        });
      });
    });

    test('tier order should be sequential starting from 0', () => {
      geniusData.categories.forEach(category => {
        const orders = category.tiers.map(t => t.order).sort((a, b) => a - b);
        expect(orders[0]).toBe(0);

        for (let i = 1; i < orders.length; i++) {
          expect(orders[i]).toBe(orders[i - 1] + 1);
        }
      });
    });

    test('tier order should match array index', () => {
      geniusData.categories.forEach(category => {
        category.tiers.forEach((tier, index) => {
          expect(tier.order).toBe(index);
        });
      });
    });

    test('each category should have at least 3 tiers (Essential, Great, Deeper Cuts)', () => {
      geniusData.categories.forEach(category => {
        expect(category.tiers.length).toBeGreaterThanOrEqual(3);

        const tierNames = category.tiers.map(t => t.name);
        expect(tierNames).toContain('Essential');
        expect(tierNames).toContain('Great');
        expect(tierNames).toContain('Deeper Cuts');
      });
    });
  });

  describe('Film Data Validation', () => {
    test('each film should have required fields', () => {
      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          tier.films.forEach(film => {
            expect(film).toHaveProperty('title');
            expect(film).toHaveProperty('year');
            expect(film).toHaveProperty('tmdbId');

            expect(typeof film.title).toBe('string');
            expect(film.title.length).toBeGreaterThan(0);
            expect(typeof film.year).toBe('number');
            expect(typeof film.tmdbId).toBe('number');
          });
        });
      });
    });

    test('film years should be reasonable (1900-2030)', () => {
      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          tier.films.forEach(film => {
            expect(film.year).toBeGreaterThanOrEqual(1900);
            expect(film.year).toBeLessThanOrEqual(2030);
          });
        });
      });
    });

    test('TMDB IDs should be positive integers', () => {
      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          tier.films.forEach(film => {
            expect(film.tmdbId).toBeGreaterThan(0);
            expect(Number.isInteger(film.tmdbId)).toBe(true);
          });
        });
      });
    });

    test('each tier should have at least 1 film', () => {
      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          expect(tier.films.length).toBeGreaterThanOrEqual(1);
        });
      });
    });

    test('TMDB IDs should be unique within each category', () => {
      const issues = [];

      geniusData.categories.forEach(category => {
        const categoryIds = [];

        category.tiers.forEach(tier => {
          tier.films.forEach(film => {
            categoryIds.push({
              tmdbId: film.tmdbId,
              title: film.title,
              tier: tier.name,
            });
          });
        });

        // Check for duplicates within this category
        const seenIds = new Map();
        categoryIds.forEach(entry => {
          if (seenIds.has(entry.tmdbId)) {
            issues.push({
              category: category.category,
              tmdbId: entry.tmdbId,
              title: entry.title,
              firstTier: seenIds.get(entry.tmdbId),
              duplicateTier: entry.tier,
            });
          } else {
            seenIds.set(entry.tmdbId, entry.tier);
          }
        });
      });

      if (issues.length > 0) {
        console.warn(`\nFound ${issues.length} duplicate TMDB IDs within same category:`);
        issues.slice(0, 10).forEach(issue => {
          console.warn(`  ${issue.category}: "${issue.title}" (${issue.tmdbId}) appears in both ${issue.firstTier} and ${issue.duplicateTier}`);
        });
      }

      expect(issues.length).toBe(0);
    });

    test('movies CAN appear in multiple categories (cross-genre)', () => {
      const moviesByTmdbId = new Map();

      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          tier.films.forEach(film => {
            if (!moviesByTmdbId.has(film.tmdbId)) {
              moviesByTmdbId.set(film.tmdbId, []);
            }
            moviesByTmdbId.get(film.tmdbId).push(category.category);
          });
        });
      });

      // Find movies in multiple categories (this is expected and OK)
      const crossGenreMovies = [];
      moviesByTmdbId.forEach((categories, tmdbId) => {
        if (categories.length > 1) {
          crossGenreMovies.push({ tmdbId, categories });
        }
      });

      console.log(`\n${crossGenreMovies.length} movies appear in multiple categories (expected behavior)`);

      // Show a few examples
      if (crossGenreMovies.length > 0) {
        console.log('Examples of cross-genre films:');
        crossGenreMovies.slice(0, 5).forEach(movie => {
          console.log(`  TMDB ${movie.tmdbId}: ${movie.categories.join(', ')}`);
        });
      }

      // This is not a failure - just documenting expected behavior
      expect(crossGenreMovies.length).toBeGreaterThan(0);
    });
  });

  describe('Content Statistics', () => {
    test('should report total film count', () => {
      let totalFilms = 0;

      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          totalFilms += tier.films.length;
        });
      });

      console.log(`Total films in Genius: ${totalFilms}`);
      expect(totalFilms).toBeGreaterThan(0);
    });

    test('should report films per category', () => {
      console.log('\nFilms per category:');

      geniusData.categories.forEach(category => {
        let categoryTotal = 0;
        category.tiers.forEach(tier => {
          categoryTotal += tier.films.length;
        });

        console.log(`  ${category.category}: ${categoryTotal} films`);
        expect(categoryTotal).toBeGreaterThan(0);
      });
    });

    test('should report tier distribution', () => {
      const tierCounts = {};

      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          tierCounts[tier.name] = (tierCounts[tier.name] || 0) + 1;
        });
      });

      console.log('\nTier distribution:');
      Object.entries(tierCounts).forEach(([name, count]) => {
        console.log(`  ${name}: ${count} categories`);
      });
    });
  });

  describe('Top-3 Tiers Selection', () => {
    test('all categories should have top-3 tiers selectable', () => {
      geniusData.categories.forEach(category => {
        const top3Tiers = category.tiers.slice(0, 3);

        expect(top3Tiers).toHaveLength(3);
        expect(top3Tiers[0].order).toBe(0);
        expect(top3Tiers[1].order).toBe(1);
        expect(top3Tiers[2].order).toBe(2);
      });
    });

    test('top-3 tiers should contain substantial films', () => {
      geniusData.categories.forEach(category => {
        const top3Tiers = category.tiers.slice(0, 3);
        let totalTop3Films = 0;

        top3Tiers.forEach(tier => {
          totalTop3Films += tier.films.length;
        });

        // Top 3 tiers should have at least 10 films combined
        expect(totalTop3Films).toBeGreaterThanOrEqual(10);
      });
    });

    test('Essential tier should be tier 0', () => {
      geniusData.categories.forEach(category => {
        const essentialTier = category.tiers.find(t => t.name === 'Essential');
        expect(essentialTier).toBeDefined();
        expect(essentialTier.order).toBe(0);
      });
    });
  });
});
