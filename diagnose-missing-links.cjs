#!/usr/bin/env node

/**
 * Diagnose Missing Movie Links in Analysis
 *
 * Shows which movie titles appear in an analysis but aren't linked.
 */

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function diagnoseMissingLinks(tmdbId) {
  try {
    // Get the analysis
    const analysisResult = await pool.query(`
      SELECT
        ma.id,
        ma.claude_response,
        m.title,
        m.year,
        m.tmdb_id
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = $1
      LIMIT 1
    `, [tmdbId]);

    if (analysisResult.rows.length === 0) {
      console.log(`❌ No analysis found for TMDB ID ${tmdbId}`);
      return;
    }

    const analysis = analysisResult.rows[0];
    const claudeResponse = analysis.claude_response;

    console.log(`\n📽️  Movie: ${analysis.title} (${analysis.year})`);
    console.log(`TMDB ID: ${analysis.tmdb_id}\n`);

    // Extract analysis text
    let analysisText = '';
    if (claudeResponse.processed_content) {
      analysisText = typeof claudeResponse.processed_content === 'string'
        ? claudeResponse.processed_content
        : JSON.stringify(claudeResponse.processed_content);
    } else if (claudeResponse.raw_content) {
      const rawContent = typeof claudeResponse.raw_content === 'string'
        ? JSON.parse(claudeResponse.raw_content)
        : claudeResponse.raw_content;

      if (rawContent.content && Array.isArray(rawContent.content)) {
        analysisText = rawContent.content
          .map(section => section.text || '')
          .filter(text => text.trim().length > 0)
          .join('\n\n');
      }
    }

    if (!analysisText) {
      console.log('❌ No analysis text found');
      return;
    }

    console.log(`📝 Analysis length: ${analysisText.length} characters\n`);

    // Count existing links
    const existingLinks = (analysisText.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
    console.log(`✅ Existing movie links: ${existingLinks}\n`);

    // Get all movies from database to check against
    console.log('🔍 Checking for unlinked movie mentions...\n');

    const allMoviesResult = await pool.query(`
      SELECT id, title, year, tmdb_id
      FROM movies
      WHERE year BETWEEN 1920 AND 2024
      ORDER BY title
    `);

    const foundMentions = [];

    for (const movie of allMoviesResult.rows) {
      // Skip the current movie itself
      if (movie.tmdb_id === parseInt(tmdbId)) continue;

      // Create regex for exact title match
      const escapedTitle = movie.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const titleRegex = new RegExp(`\\b${escapedTitle}\\b`, 'i');

      // Check if title appears in text
      if (titleRegex.test(analysisText)) {
        // Check if it's already linked
        const linkedRegex = new RegExp(`<a[^>]*>${escapedTitle}</a>`, 'i');
        const isLinked = linkedRegex.test(analysisText);

        if (!isLinked) {
          foundMentions.push({
            title: movie.title,
            year: movie.year,
            id: movie.id,
            tmdbId: movie.tmdb_id
          });
        }
      }
    }

    if (foundMentions.length === 0) {
      console.log('✅ No unlinked movie mentions found - all movies are linked!\n');
    } else {
      console.log(`⚠️  Found ${foundMentions.length} unlinked movie mentions:\n`);

      foundMentions.forEach((movie, i) => {
        console.log(`${i + 1}. "${movie.title}" (${movie.year})`);
        console.log(`   Database ID: ${movie.id}, TMDB ID: ${movie.tmdbId}`);
        console.log('');
      });
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Existing links: ${existingLinks}`);
    console.log(`   Unlinked mentions: ${foundMentions.length}`);
    console.log(`   Potential total: ${existingLinks + foundMentions.length}\n`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

const tmdbId = process.argv[2];

if (!tmdbId) {
  console.log('Usage: node diagnose-missing-links.cjs <tmdb_id>');
  process.exit(1);
}

console.log('🔬 Missing Movie Links Diagnostic\n');
console.log('='.repeat(70));

diagnoseMissingLinks(tmdbId);
