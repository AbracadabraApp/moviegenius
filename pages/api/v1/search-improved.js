/**
 * POST /api/v1/search-improved
 *
 * Advanced multi-stage fuzzy search with title normalization
 *
 * Handles edge cases:
 * - Leading articles: "The Matrix" = "Matrix"
 * - Punctuation: "Paris, je t'aime" = "Paris je taime"
 * - Year extraction: "Inception (2010)" -> year: 2010
 * - Fuzzy year: ±2 years if specified
 * - Trigram similarity for typos
 *
 * Request Body:
 * {
 *   query: string,           // Search query (required)
 *   year?: number,           // Optional year filter
 *   includeExternal?: boolean // Include TMDB fallback (default: false)
 * }
 */

import { Client } from 'pg';
import {
  normalizeTitle,
  extractYearFromTitle,
  buildMultiStageSearch,
  enrichSearchResults
} from '../../../lib/search-matching';

function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }

  return new Client({ connectionString: dbUrl });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, year, includeExternal = false } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const searchQuery = query.trim();
    console.log(`[v1/search-improved] Query: "${searchQuery}"${year ? ` (year: ${year})` : ''}`);

    let movies = [];

    // Database-first search with multi-stage matching
    const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
    const hasDatabaseAccess = !!dbUrl;

    if (hasDatabaseAccess) {
      const client = getRailwayClient();

      try {
        await client.connect();

        // Extract year from query if present (e.g., "Inception 2010")
        const { title: cleanTitle, year: extractedYear } = extractYearFromTitle(searchQuery);
        const searchYear = year || extractedYear;

        // Build multi-stage search query
        const { sql, params } = buildMultiStageSearch(cleanTitle, searchYear);

        console.log(`[v1/search-improved] Normalized: "${normalizeTitle(cleanTitle)}"${searchYear ? ` year: ${searchYear}` : ''}`);

        const result = await client.query(sql, params);

        // Enrich results with formatted data
        movies = enrichSearchResults(result.rows);

        console.log(`[v1/search-improved] Found ${movies.length} matches`);

        // Log match types for debugging
        const matchTypes = movies.reduce((acc, m) => {
          acc[m.matchType] = (acc[m.matchType] || 0) + 1;
          return acc;
        }, {});
        console.log(`[v1/search-improved] Match types:`, matchTypes);

      } catch (error) {
        console.error('[v1/search-improved] Database error:', error);
        movies = [];
      } finally {
        await client.end();
      }
    }

    // TMDB fallback (if requested and no database results)
    if (includeExternal && movies.length === 0) {
      const bearerToken = process.env.TMDB_BEARER_TOKEN;

      if (bearerToken && bearerToken.split('.').length === 3) {
        try {
          const headers = {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          };

          const tmdbUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(searchQuery)}`;
          const response = await fetch(tmdbUrl, { headers });

          if (response.ok) {
            const data = await response.json();
            const tmdbMovies = (data.results || []).slice(0, 10).map(m => ({
              tmdb_id: m.id,
              title: m.title,
              year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
              poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
              contentScore: 0,
              external: true,
              matchType: 'tmdb_external'
            }));

            movies = tmdbMovies;
            console.log(`[v1/search-improved] TMDB fallback: ${movies.length} movies`);
          }
        } catch (error) {
          console.error('[v1/search-improved] TMDB error:', error);
        }
      }
    }

    const hasResults = movies.length > 0;

    res.status(200).json({
      query: searchQuery,
      movies,
      hasResults,
      fallback: !hasResults
        ? {
            message: "We didn't find a result. Try different keywords or check spelling.",
            askUrl: `/genius?q=${encodeURIComponent(searchQuery)}`
          }
        : null
    });

  } catch (error) {
    console.error('[v1/search-improved] Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
