// Quick script to check More Ideas database statistics
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
  ssl: false,
  max: 1
});

async function getStats() {
  try {
    // Count total movies with More Ideas
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM more_ideas');
    const totalMovies = parseInt(totalResult.rows[0].count);

    console.log(`\n📊 More Ideas Database Statistics:\n`);
    console.log(`Total movies with More Ideas: ${totalMovies.toLocaleString()}`);

    // Get a sample to understand the structure
    const sampleResult = await pool.query(`
      SELECT ideas
      FROM more_ideas
      WHERE ideas IS NOT NULL
      LIMIT 1
    `);

    if (sampleResult.rows.length > 0) {
      const sample = sampleResult.rows[0].ideas;
      let ideasPerMovie = 0;

      if (Array.isArray(sample)) {
        ideasPerMovie = sample.length;
      } else if (sample.moreIdeas && Array.isArray(sample.moreIdeas)) {
        ideasPerMovie = sample.moreIdeas.length;
      } else if (sample.ideas && Array.isArray(sample.ideas)) {
        ideasPerMovie = sample.ideas.length;
      }

      console.log(`Ideas per movie (sample): ${ideasPerMovie}`);
      console.log(`Estimated total unique film references: ${(totalMovies * ideasPerMovie).toLocaleString()}`);
    }

    // Try to extract unique tmdbIds from all ideas
    const uniqueResult = await pool.query(`
      SELECT COUNT(DISTINCT jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(ideas) = 'array' THEN ideas
          WHEN ideas->'moreIdeas' IS NOT NULL THEN ideas->'moreIdeas'
          WHEN ideas->'ideas' IS NOT NULL THEN ideas->'ideas'
          ELSE '[]'::jsonb
        END
      )->>'tmdbId')) as unique_count
      FROM more_ideas
      WHERE ideas IS NOT NULL
    `);

    if (uniqueResult.rows.length > 0) {
      console.log(`\nActual unique films referenced: ${parseInt(uniqueResult.rows[0].unique_count).toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getStats();
