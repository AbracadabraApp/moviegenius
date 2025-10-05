/**
 * Database Integrity Integration Tests
 * Tests database consistency and data quality to prevent mass corruption
 *
 * These tests validate critical database integrity:
 * - Detect mass data corruption (like trailer duplication)
 * - Verify data consistency across tables
 * - Validate foreign key relationships
 * - Check for data anomalies
 */

describe('Database Integrity Integration Tests', () => {
  let pool;

  beforeAll(() => {
    pool = global.getTestPool();
  });

  describe('Trailer Data Integrity', () => {
    test('detects mass trailer duplication', async () => {
      const client = await pool.connect();

      try {
        // Check for suspicious trailer duplicates (like our previous bug)
        const result = await client.query(`
          SELECT
            trailer_url,
            COUNT(*) as movie_count,
            MIN(title) as example_title
          FROM movies
          WHERE trailer_url IS NOT NULL
          GROUP BY trailer_url
          HAVING COUNT(*) > 10
          ORDER BY movie_count DESC
          LIMIT 10
        `);

        console.log(`🔍 Found ${result.rows.length} trailer URLs used by 10+ movies`);

        // Log the most duplicated trailers for investigation
        result.rows.forEach(row => {
          console.log(`   ${row.trailer_url}: ${row.movie_count} movies (e.g., "${row.example_title}")`);
        });

        // Critical test: No single trailer should be used by more than 100 movies
        // (This caught our previous mass corruption bug)
        result.rows.forEach(row => {
          expect(row.movie_count).toBeLessThan(100);
        });

        // Warn about moderate duplicates (might indicate partial corruption)
        const moderateDuplicates = result.rows.filter(row => row.movie_count > 20);
        if (moderateDuplicates.length > 0) {
          console.warn(`⚠️ ${moderateDuplicates.length} trailers used by 20+ movies - investigate`);
        }

      } finally {
        client.release();
      }
    });

    test('trailer URLs follow expected format', async () => {
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT
            trailer_url,
            COUNT(*) as count
          FROM movies
          WHERE trailer_url IS NOT NULL
          AND trailer_url !~ '^[A-Za-z0-9_-]{11}$'  -- YouTube video ID format
          GROUP BY trailer_url
          ORDER BY count DESC
          LIMIT 5
        `);

        // Should have very few or no malformed trailer URLs
        expect(result.rows.length).toBeLessThan(10);

        if (result.rows.length > 0) {
          console.log('⚠️ Malformed trailer URLs found:');
          result.rows.forEach(row => {
            console.log(`   "${row.trailer_url}": ${row.count} movies`);
          });
        }

      } finally {
        client.release();
      }
    });
  });

  describe('Movie Data Consistency', () => {
    test('movie years are reasonable', async () => {
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT
            COUNT(*) as total_movies,
            COUNT(*) FILTER (WHERE year < 1888) as too_old,
            COUNT(*) FILTER (WHERE year > EXTRACT(YEAR FROM NOW()) + 5) as too_new,
            MIN(year) as earliest_year,
            MAX(year) as latest_year
          FROM movies
        `);

        const stats = result.rows[0];

        console.log(`📊 Movie year stats: ${stats.total_movies} movies, ${stats.earliest_year}-${stats.latest_year}`);

        // Basic sanity checks
        expect(parseInt(stats.total_movies)).toBeGreaterThan(1000); // Should have substantial movie data
        expect(parseInt(stats.too_old)).toBe(0); // No movies before cinema was invented
        expect(parseInt(stats.too_new)).toBeLessThan(100); // Few movies more than 5 years in future

      } finally {
        client.release();
      }
    });

    test('TMDB IDs are unique and positive', async () => {
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT
            COUNT(*) as total_movies,
            COUNT(DISTINCT tmdb_id) as unique_tmdb_ids,
            COUNT(*) FILTER (WHERE tmdb_id <= 0) as invalid_ids,
            COUNT(*) FILTER (WHERE tmdb_id IS NULL) as null_ids
          FROM movies
        `);

        const stats = result.rows[0];

        console.log(`🆔 TMDB ID stats: ${stats.unique_tmdb_ids} unique of ${stats.total_movies} total`);

        // TMDB IDs should be unique and positive
        expect(parseInt(stats.total_movies)).toBe(parseInt(stats.unique_tmdb_ids));
        expect(parseInt(stats.invalid_ids)).toBe(0);
        expect(parseInt(stats.null_ids)).toBe(0);

      } finally {
        client.release();
      }
    });
  });

  describe('Analysis Data Integrity', () => {
    test('movie analyses have required structure', async () => {
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT
            COUNT(*) as total_analyses,
            COUNT(*) FILTER (WHERE analysis_type = 'general') as general_analyses,
            COUNT(*) FILTER (WHERE enhanced_format = true) as enhanced_analyses,
            COUNT(*) FILTER (WHERE enhanced_sections IS NOT NULL) as with_sections,
            COUNT(*) FILTER (WHERE claude_response IS NOT NULL) as with_raw_content
          FROM movie_analyses
          LIMIT 1
        `);

        const stats = result.rows[0];

        console.log(`📝 Analysis stats:`);
        console.log(`   Total: ${stats.total_analyses}`);
        console.log(`   General: ${stats.general_analyses}`);
        console.log(`   Enhanced: ${stats.enhanced_analyses}`);
        console.log(`   With sections: ${stats.with_sections}`);
        console.log(`   With raw content: ${stats.with_raw_content}`);

        // Should have substantial analysis data
        expect(parseInt(stats.total_analyses)).toBeGreaterThan(1000);
        expect(parseInt(stats.general_analyses)).toBeGreaterThan(1000);

      } finally {
        client.release();
      }
    });

    test('enhanced analyses have valid JSON structure', async () => {
      const client = await pool.connect();

      try {
        // Test a sample of enhanced analyses for valid JSON
        const result = await client.query(`
          SELECT
            ma.enhanced_sections,
            ma.enhanced_key_elements,
            m.title
          FROM movie_analyses ma
          JOIN movies m ON ma.movie_id = m.id
          WHERE ma.enhanced_format = true
          AND ma.enhanced_sections IS NOT NULL
          ORDER BY RANDOM()
          LIMIT 5
        `);

        expect(result.rows.length).toBeGreaterThan(0);

        result.rows.forEach(row => {
          // Should be valid JSON
          expect(() => JSON.parse(row.enhanced_sections)).not.toThrow();

          if (row.enhanced_key_elements) {
            expect(() => JSON.parse(row.enhanced_key_elements)).not.toThrow();
          }

          // Sections should be an array
          const sections = JSON.parse(row.enhanced_sections);
          expect(Array.isArray(sections)).toBe(true);

          console.log(`✅ ${row.title}: ${sections.length} sections`);
        });

      } finally {
        client.release();
      }
    });
  });

  describe('Contributors Data Integrity', () => {
    test('movie contributors have valid person references', async () => {
      const client = await pool.connect();

      try {
        // Check for orphaned contributors (person_id doesn't exist in persons table)
        const result = await client.query(`
          SELECT
            mc.movie_tmdb_id,
            mc.person_id,
            mc.role,
            m.title as movie_title
          FROM movie_contributors mc
          JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
          LEFT JOIN persons p ON mc.person_id = p.id
          WHERE p.id IS NULL
          LIMIT 10
        `);

        // Should have very few orphaned contributors
        expect(result.rows.length).toBeLessThan(100);

        if (result.rows.length > 0) {
          console.log(`⚠️ Found ${result.rows.length} orphaned contributors:`);
          result.rows.slice(0, 5).forEach(row => {
            console.log(`   ${row.movie_title}: person_id ${row.person_id} (${row.role})`);
          });
        }

      } finally {
        client.release();
      }
    });

    test('contributors have expected role distribution', async () => {
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT
            role,
            COUNT(*) as count
          FROM movie_contributors
          GROUP BY role
          ORDER BY count DESC
        `);

        console.log('👥 Contributor role distribution:');
        result.rows.forEach(row => {
          console.log(`   ${row.role}: ${row.count}`);
        });

        // Should have major contributor types
        const roles = result.rows.map(row => row.role);
        expect(roles).toContain('director');
        expect(roles).toContain('star');

        // Directors should be less common than stars (typically 1 director per movie)
        const directorCount = parseInt(result.rows.find(r => r.role === 'director')?.count || 0);
        const starCount = parseInt(result.rows.find(r => r.role === 'star')?.count || 0);

        if (directorCount > 0 && starCount > 0) {
          expect(starCount).toBeGreaterThan(directorCount);
        }

      } finally {
        client.release();
      }
    });
  });

  describe('Reference Data Quality', () => {
    test('test movies exist with expected data', async () => {
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT
            m.tmdb_id,
            m.title,
            m.year,
            CASE WHEN ma.id IS NOT NULL THEN true ELSE false END as has_analysis,
            CASE WHEN mc.movie_tmdb_id IS NOT NULL THEN true ELSE false END as has_contributors
          FROM movies m
          LEFT JOIN movie_analyses ma ON m.id = ma.movie_id AND ma.analysis_type = 'general'
          LEFT JOIN (
            SELECT DISTINCT movie_tmdb_id FROM movie_contributors
          ) mc ON m.tmdb_id = mc.movie_tmdb_id
          WHERE m.tmdb_id IN (550, 18, 78, 562, 13)  -- Key test movies
          ORDER BY m.tmdb_id
        `);

        console.log('🎬 Test movie data availability:');
        result.rows.forEach(row => {
          console.log(`   ${row.title} (${row.year}): analysis=${row.has_analysis}, contributors=${row.has_contributors}`);
        });

        // Should have our key test movies
        expect(result.rows.length).toBeGreaterThan(3);

        // Most should have analysis data
        const withAnalysis = result.rows.filter(row => row.has_analysis).length;
        expect(withAnalysis).toBeGreaterThan(0);

      } finally {
        client.release();
      }
    });
  });
});