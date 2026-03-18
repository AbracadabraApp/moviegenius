// pages/api/simple-search.js - Database-first movie search API with TMDB fallback
import { Client } from 'pg';

// Railway PostgreSQL connection helper
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }

  return new Client({ connectionString: dbUrl });
}

// Helper function for contributors display
function getDisplayContributors(contributors_json) {
  if (!contributors_json) return null;

  const director = contributors_json.director?.[0];
  const topActors = contributors_json.star?.slice(0, 3) || [];

  const parts = [];
  if (topActors.length > 0) {
    parts.push(`Starring:`);
    parts.push(topActors.join(', '));
  }
  if (director) {
    parts.push(`Director:`);
    parts.push(director);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return res.status(400).json({ error: 'Query must be at least 3 characters' });
    }

    const searchQuery = query.trim();
    let movies = [];

    // Check if database is available
    const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
    const hasDatabaseAccess = !!dbUrl;

    if (hasDatabaseAccess) {
      // DATABASE-FIRST APPROACH
      console.log(`🔍 Database-first search: "${searchQuery}"`);
      const client = getRailwayClient();

      try {
        await client.connect();

        // Step 1: Advanced search with fuzzy matching and multi-word support
        // Tokenize search query for multi-word matching
        const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const searchPattern = `%${searchQuery}%`;

        const dbSearchResult = await client.query(`
          WITH ranked_movies AS (
            SELECT DISTINCT
              m.id,
              m.title,
              m.year,
              m.tmdb_id,
              m.poster_url,
              m.contributors_json,
              ma.enhanced_sections,
              ew.recommendation,
              ew.reasons,
              -- Ranking score calculation
              (
                -- Exact match bonus (case-insensitive): +10000
                CASE WHEN LOWER(m.title) = LOWER($1) THEN 10000 ELSE 0 END +
                -- Starts with query bonus: +5000
                CASE WHEN LOWER(m.title) LIKE LOWER($1) || '%' THEN 5000 ELSE 0 END +
                -- Contains all words bonus (for multi-word): +2000
                CASE WHEN ${searchWords.map((_, i) => `LOWER(m.title) LIKE $${i + 3}`).join(' AND ')}
                     THEN 2000 ELSE 0 END +
                -- Trigram similarity score (0-1, scaled to 0-1000): fuzzy matching
                (similarity(LOWER(m.title), LOWER($1)) * 1000) +
                -- Content bonus: movies with analysis ranked higher
                CASE WHEN ma.id IS NOT NULL THEN 500 ELSE 0 END +
                CASE WHEN ew.id IS NOT NULL THEN 300 ELSE 0 END +
                CASE WHEN m.contributors_json IS NOT NULL THEN 100 ELSE 0 END
              ) as rank_score
            FROM movies m
            LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
            LEFT JOIN enhanced_why_watch ew ON ma.id = ew.analysis_id
            WHERE
              -- Basic ILIKE match OR trigram similarity > 0.3
              (m.title ILIKE $2 OR similarity(LOWER(m.title), LOWER($1)) > 0.3)
          )
          SELECT * FROM ranked_movies
          ORDER BY rank_score DESC
          LIMIT 20
        `, [searchQuery, searchPattern, ...searchWords.map(w => `%${w}%`)]);

        console.log(`📚 Found ${dbSearchResult.rows.length} movies in our database`);

        // Convert DB results to movie format
        movies = dbSearchResult.rows.map(row => {
          const contributorText = getDisplayContributors(row.contributors_json);

          // Calculate content score
          let contentScore = 0;
          if (contributorText) contentScore += 20;
          if (row.reasons && row.recommendation) contentScore += 40;
          if (row.enhanced_sections && row.enhanced_sections[0]) contentScore += 40;

          return {
            id: row.id,
            title: row.title,
            year: row.year,
            tmdb_id: row.tmdb_id,
            poster_url: row.poster_url || '/images/placeholder-poster.jpg',
            contributors: contributorText,
            whyWatch: row.reasons && row.recommendation ? {
              reasons: row.reasons,
              recommendation: row.recommendation
            } : null,
            analysisPreview: row.enhanced_sections && row.enhanced_sections[0]
              ? row.enhanced_sections[0].text
              : null,
            contentScore
          };
        });

        // Database-only search - no TMDB supplementing
        // V2 Feature: TMDB new releases can be added as separate feature
        const moviesWithContent = movies.filter(m => m.contentScore > 0);
        console.log(`✅ ${moviesWithContent.length} movies with content, ${movies.length} total matches`);

      } catch (error) {
        console.error('Database search error:', error);
        // No fallback - return empty results
        movies = [];
      } finally {
        await client.end();
      }

    } else {
      // No database access - return empty results
      console.log(`❌ Database not available: "${searchQuery}"`);
      movies = [];
    }

    // No filtering - show all search matches
    // Content-rich movies are already prioritized by rank_score in the database query
    // (movies with analysis, contributors, etc. get higher scores)

    console.log(`🎯 Returning ${movies.length} search results`);

    // V1 Feature: Provide fallback info for empty results
    const hasResults = movies && movies.length > 0;

    res.status(200).json({
      movies: movies || [],
      query: searchQuery,
      hasResults,
      fallback: !hasResults
        ? {
            message:
              "We didn't find a result, but would you like to pass it on to our Movie Genius?",
            askUrl: `/genius?q=${encodeURIComponent(searchQuery)}`,
          }
        : null,
    });
  } catch (error) {
    console.error('Simple search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
}
