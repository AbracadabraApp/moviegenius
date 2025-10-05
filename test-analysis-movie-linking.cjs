#!/usr/bin/env node

/**
 * Test Movie Linking for Railway Analyses
 *
 * Tests the movie linking logic on individual analyses to diagnose why links are missed.
 * Usage: node test-analysis-movie-linking.cjs [tmdb_id]
 */

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testMovieLinking(tmdbId) {
  try {
    // Get the analysis
    const analysisResult = await pool.query(`
      SELECT
        ma.id,
        ma.claude_response,
        ma.has_links,
        ma.link_count,
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
    console.log(`📊 Current state: ${analysis.link_count || 0} links, has_links=${analysis.has_links || false}\n`);

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

    console.log(`📝 Analysis text length: ${analysisText.length} characters\n`);

    // Show first 500 characters of analysis
    console.log('📄 Analysis preview (first 500 chars):');
    console.log('-'.repeat(70));
    console.log(analysisText.substring(0, 500));
    console.log('-'.repeat(70));
    console.log('');

    // Find all movie title mentions with <link> tags
    const linkPattern = /<link>([^<]+)<\/link>/g;
    const matches = [...analysisText.matchAll(linkPattern)];

    console.log(`🔍 Found ${matches.length} movie mentions with <link> tags:\n`);

    if (matches.length === 0) {
      console.log('ℹ️  No <link> tags found in analysis text.');
      console.log('ℹ️  This movie may not mention other films, or links were already processed.\n');

      // Check for existing links
      const existingLinks = (analysisText.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
      if (existingLinks > 0) {
        console.log(`✅ Found ${existingLinks} existing movie links in processed content\n`);

        // Show sample
        const linkSample = analysisText.match(/<a[^>]*href="\/movie\/\d+"[^>]*>([^<]+)<\/a>/);
        if (linkSample) {
          console.log(`Sample link: ${linkSample[0]}\n`);
        }
      }
      return;
    }

    // Test each movie title match
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const movieTitle = match[1];

      console.log(`${i + 1}. "${movieTitle}"`);

      // Normalize title for matching
      const normalized = movieTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();

      // Try exact match
      let result = await pool.query(
        'SELECT id, title, year FROM movies WHERE title = $1 LIMIT 1',
        [movieTitle]
      );

      if (result.rows.length > 0) {
        console.log(`   ✅ EXACT MATCH: ${result.rows[0].title} (${result.rows[0].year}) [ID: ${result.rows[0].id}]`);
        continue;
      }

      // Try normalized match
      if (normalized !== movieTitle) {
        result = await pool.query(
          'SELECT id, title, year FROM movies WHERE title = $1 LIMIT 1',
          [normalized]
        );

        if (result.rows.length > 0) {
          console.log(`   ✅ NORMALIZED MATCH: ${result.rows[0].title} (${result.rows[0].year}) [ID: ${result.rows[0].id}]`);
          continue;
        }
      }

      // Try case-insensitive match
      result = await pool.query(
        'SELECT id, title, year FROM movies WHERE LOWER(title) = LOWER($1) LIMIT 1',
        [normalized]
      );

      if (result.rows.length > 0) {
        console.log(`   ✅ CASE-INSENSITIVE: ${result.rows[0].title} (${result.rows[0].year}) [ID: ${result.rows[0].id}]`);
        continue;
      }

      // Try with "The" prefix
      if (!normalized.toLowerCase().startsWith('the ')) {
        result = await pool.query(
          'SELECT id, title, year FROM movies WHERE LOWER(title) = LOWER($1) LIMIT 1',
          [`The ${normalized}`]
        );

        if (result.rows.length > 0) {
          console.log(`   ✅ WITH "THE": ${result.rows[0].title} (${result.rows[0].year}) [ID: ${result.rows[0].id}]`);
          continue;
        }
      }

      // Try without "The" prefix
      if (normalized.toLowerCase().startsWith('the ')) {
        const withoutThe = normalized.substring(4);
        result = await pool.query(
          'SELECT id, title, year FROM movies WHERE LOWER(title) = LOWER($1) LIMIT 1',
          [withoutThe]
        );

        if (result.rows.length > 0) {
          console.log(`   ✅ WITHOUT "THE": ${result.rows[0].title} (${result.rows[0].year}) [ID: ${result.rows[0].id}]`);
          continue;
        }
      }

      // Try fuzzy match (contains)
      result = await pool.query(
        'SELECT id, title, year FROM movies WHERE LOWER(title) LIKE LOWER($1) ORDER BY year DESC LIMIT 3',
        [`%${normalized}%`]
      );

      if (result.rows.length > 0) {
        console.log(`   ⚠️  FUZZY MATCHES (${result.rows.length}):`);
        result.rows.forEach(r => {
          console.log(`      → ${r.title} (${r.year}) [ID: ${r.id}]`);
        });
      } else {
        console.log(`   ❌ NO MATCH FOUND - Title not in database`);
      }

      console.log('');
    }

    // Look for potential movie mentions without <link> tags
    console.log(`\n🔎 Searching for potential movie mentions without <link> tags...\n`);

    // Get a sample of movies from database to search for
    const sampleMovies = await pool.query(`
      SELECT DISTINCT m.title, m.year, m.id
      FROM movies m
      WHERE m.year BETWEEN ${analysis.year - 20} AND ${analysis.year + 10}
      ORDER BY m.year DESC
      LIMIT 100
    `);

    let foundUntagged = false;
    for (const movie of sampleMovies.rows) {
      // Skip the current movie itself
      if (movie.id === analysis.id) continue;

      // Search for movie title in analysis (case insensitive)
      const titleRegex = new RegExp(`\\b${movie.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (titleRegex.test(analysisText) && !analysisText.includes(`<link>${movie.title}</link>`)) {
        console.log(`   ⚠️  Found untagged: "${movie.title}" (${movie.year})`);
        foundUntagged = true;
      }
    }

    if (!foundUntagged) {
      console.log(`   ✅ No obvious untagged movie mentions found in sample\n`);
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total <link> tags: ${matches.length}`);
    console.log(`   These are the potential movie links that the linker will attempt to match.\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// CLI
const tmdbId = process.argv[2] || '408'; // Default to Fight Club

console.log('🔬 Movie Linking Diagnostic Tool\n');
console.log('This tool shows which movie titles are tagged with <link> in the analysis');
console.log('and tests whether they can be matched to movies in the database.\n');
console.log('='.repeat(70));

testMovieLinking(tmdbId);
