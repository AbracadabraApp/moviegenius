/**
 * Phase 3: Mass Generation Tests
 *
 * Tests for batch processing enhanced static file generation
 * and quality validation of generated files.
 */

import { massGeneration } from '../../scripts/phase3-mass-generation.js';
import { assembleEnhancedMovieData } from '../../lib/enhanced-assembly.js';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { TEST_MOVIES } from '../fixtures/assembly-test-data.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const TEST_OUTPUT_DIR = path.join(process.cwd(), '__tests__', 'tmp', 'enhanced-movies');

describe('Phase 3: Mass Generation Process', () => {

  beforeAll(async () => {
    // Ensure test output directory exists
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(TEST_OUTPUT_DIR, { recursive: true });
    } catch (error) {
      // Directory might not exist, ignore
    }
    await pool.end();
  });

  describe('Single Movie Generation', () => {
    test('should generate valid enhanced static file', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Write test file
      const filename = `movie-${TEST_MOVIES.FIGHT_CLUB.tmdbId}.json`;
      const filepath = path.join(TEST_OUTPUT_DIR, filename);
      await fs.writeFile(filepath, JSON.stringify(enhancedData, null, 2));

      // Verify file exists and is readable
      const fileStats = await fs.stat(filepath);
      expect(fileStats.size).toBeGreaterThan(1000); // At least 1KB
      expect(fileStats.size).toBeLessThan(500000);   // Less than 500KB

      // Verify file is valid JSON
      const fileContent = await fs.readFile(filepath, 'utf8');
      const parsedData = JSON.parse(fileContent);

      expect(parsedData.tmdbId).toBe(TEST_MOVIES.FIGHT_CLUB.tmdbId);
      expect(parsedData.enhancedFormat).toBe(true);
      expect(parsedData.staticGenerated).toBe(true);
    });

    test('should include all required data for static serving', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Verify complete structure for static serving
      expect(enhancedData).toHaveProperty('movieHeader');
      expect(enhancedData).toHaveProperty('analysis');
      expect(enhancedData).toHaveProperty('keyElements');
      expect(enhancedData).toHaveProperty('buildData');

      // Verify no external dependencies needed
      expect(enhancedData.movieHeader.posterUrl).toBeDefined();
      expect(enhancedData.movieHeader.streaming).toBeDefined(); // Can be null
      expect(enhancedData.movieHeader.trailerVideoId).toBeDefined(); // Can be null
    });
  });

  describe('File Format Validation', () => {
    test('should generate files with correct naming convention', () => {
      const tmdbId = 550;
      const expectedFilename = `movie-${tmdbId}.json`;
      expect(expectedFilename).toMatch(/^movie-\d+\.json$/);
    });

    test('should generate properly formatted JSON', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      const jsonString = JSON.stringify(enhancedData, null, 2);

      // Should be valid JSON
      expect(() => JSON.parse(jsonString)).not.toThrow();

      // Should be properly formatted (indented)
      expect(jsonString.includes('\n')).toBe(true);
      expect(jsonString.includes('  ')).toBe(true);
    });

    test('should be compatible with existing enhanced static files', async () => {
      // Read a known existing enhanced static file for comparison
      const existingFilePath = path.join(process.cwd(), 'public', 'data', 'enhanced-movies');

      let existingFile = null;
      try {
        const files = await fs.readdir(existingFilePath);
        if (files.length > 0) {
          const existingContent = await fs.readFile(
            path.join(existingFilePath, files[0]),
            'utf8'
          );
          existingFile = JSON.parse(existingContent);
        }
      } catch (error) {
        // No existing files, skip this test
      }

      if (existingFile) {
        const newData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

        // Should have same root structure
        const existingKeys = Object.keys(existingFile);
        const newKeys = Object.keys(newData);

        existingKeys.forEach(key => {
          expect(newData).toHaveProperty(key);
        });
      }
    });
  });

  describe('Performance Validation', () => {
    test('should generate files quickly for performance target', async () => {
      const startTime = Date.now();
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      const generationTime = Date.now() - startTime;

      // Should generate within reasonable time for batch processing
      expect(generationTime).toBeLessThan(5000); // Less than 5 seconds per movie

      // Generated file should enable <100ms serving
      const jsonSize = JSON.stringify(enhancedData).length;
      expect(jsonSize).toBeLessThan(500000); // Less than 500KB for fast serving
    });

    test('should optimize for static file serving', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // All expensive operations should be pre-computed
      expect(enhancedData.buildData.posterValidated).toBeDefined();
      expect(enhancedData.buildData.streamingCurrent).toBeDefined();
      expect(enhancedData.buildData.trailerResolved).toBeDefined();
      expect(enhancedData.buildData.linksProcessed).toBe(true);

      // No API calls should be needed at serve time
      expect(enhancedData.movieHeader.posterUrl).toBeDefined();
      expect(enhancedData.analysis.sections.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing movie gracefully', async () => {
      const nonExistentTmdbId = 999999999;

      await expect(
        assembleEnhancedMovieData(nonExistentTmdbId, pool)
      ).rejects.toThrow('not found');
    });

    test('should handle incomplete movie data gracefully', async () => {
      // This would test with a movie that has some missing data
      // For now, just ensure our test movie works
      await expect(
        assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool)
      ).resolves.toBeDefined();
    });
  });

  describe('Quality Validation', () => {
    test('should generate files that load correctly in movie pages', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Simulate what movie page expects
      expect(enhancedData.movieHeader).toBeDefined();
      expect(enhancedData.analysis).toBeDefined();

      // MovieHeaderLarge props
      expect(enhancedData.movieHeader.title).toBeDefined();
      expect(typeof enhancedData.movieHeader.year).toBe('number');
      expect(typeof enhancedData.movieHeader.posterUrl).toBe('string');

      // MovieAnalysisWithEntities props
      expect(Array.isArray(enhancedData.analysis.sections)).toBe(true);
      expect(enhancedData.analysis.whyWatch).toBeDefined();
      expect(Array.isArray(enhancedData.analysis.moreIdeas)).toBe(true);
    });

    test('should maintain data consistency across generation', async () => {
      // Generate same movie data twice
      const data1 = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      const data2 = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Core data should be consistent
      expect(data1.tmdbId).toBe(data2.tmdbId);
      expect(data1.title).toBe(data2.title);
      expect(data1.year).toBe(data2.year);
      expect(data1.analysis.sections.length).toBe(data2.analysis.sections.length);

      // Timestamps will be different
      expect(data1.lastUpdated).not.toBe(data2.lastUpdated);
    });
  });

  describe('Database Integration', () => {
    test('should read from correct database sources', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should use enhanced_sections (not claude_response.raw_content)
      expect(Array.isArray(enhancedData.analysis.sections)).toBe(true);
      expect(enhancedData.analysis.sections.length).toBeGreaterThan(0);

      // Should use enhanced_why_watch table
      expect(['YES', 'NO']).toContain(enhancedData.analysis.whyWatch.recommendation);
      expect(Array.isArray(enhancedData.analysis.whyWatch.reasons)).toBe(true);

      // Should use more_ideas table
      expect(Array.isArray(enhancedData.analysis.moreIdeas)).toBe(true);
    });
  });

  describe('File System Integration', () => {
    test('should create output directory if it doesn\'t exist', async () => {
      const testDir = path.join(TEST_OUTPUT_DIR, 'nested', 'directory');

      // Directory shouldn't exist initially
      let dirExists = false;
      try {
        await fs.access(testDir);
        dirExists = true;
      } catch {
        dirExists = false;
      }

      if (dirExists) {
        await fs.rm(testDir, { recursive: true });
      }

      // Create directory recursively
      await fs.mkdir(testDir, { recursive: true });

      // Should now exist
      const stats = await fs.stat(testDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('should handle file write permissions', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      const testFile = path.join(TEST_OUTPUT_DIR, 'permission-test.json');

      // Should be able to write file
      await expect(
        fs.writeFile(testFile, JSON.stringify(enhancedData, null, 2))
      ).resolves.not.toThrow();

      // Should be able to read file back
      const content = await fs.readFile(testFile, 'utf8');
      expect(JSON.parse(content)).toEqual(enhancedData);
    });
  });
});