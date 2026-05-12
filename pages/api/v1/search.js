/**
 * POST /api/v1/search
 *
 * Unified search endpoint for movies and people
 *
 * Request Body:
 * {
 *   query: string,           // Search query (min 2 characters)
 *   type?: 'movie' | 'person' | 'multi',  // Search type (default: 'movie')
 *   includeExternal?: boolean,  // Include TMDB results (default: false)
 *   saveToCatalog?: boolean   // Save TMDB results to catalog (default: false)
 * }
 *
 * Response:
 * {
 *   query: string,
 *   movies: [{
 *     id: number,
 *     tmdb_id: number,
 *     title: string,
 *     year?: number,
 *     poster_url?: string,
 *     contributors?: string,
 *     whyWatch?: { reasons: string[], recommendation: 'YES' | 'NO' },
 *     analysisPreview?: string,
 *     contentScore: number
 *   }],
 *   people?: [{
 *     id: number,
 *     name: string,
 *     profile_path?: string,
 *     known_for_department?: string
 *   }],
 *   hasResults: boolean,
 *   saved?: number,  // Number of new movies saved to catalog
 *   fallback?: {
 *     message: string,
 *     askUrl: string
 *   }
 * }
 */

import { Client } from 'pg';
import { ensureMovieInDb } from '../../../lib/services/tmdb-persist.js';

function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }

  return new Client({ connectionString: dbUrl });
}

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

function calculateRelevanceScore(movie, searchQuery) {
  const query = searchQuery.toLowerCase();
  const title = movie.title.toLowerCase();

  let score = movie.popularity || 0;

  // Exact title match bonus
  if (title === query) {
    score += 10000;
  }

  // Title starts with query bonus
  if (title.startsWith(query)) {
    score += 5000;
  }

  // Title contains query bonus
  if (title.includes(query)) {
    score += 2000;
  }

  // Word boundary matches
  const queryWords = query.split(/\s+/);
  const titleWords = title.split(/\s+/);

  queryWords.forEach(queryWord => {
    titleWords.forEach(titleWord => {
      if (titleWord.startsWith(queryWord)) {
        score += 1000;
      }
      if (titleWord.includes(queryWord)) {
        score += 500;
      }
    });
  });

  // Popularity bonus
  score += (movie.popularity || 0) * 10;

  return score;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, type = 'movie', includeExternal = false, saveToCatalog = false } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const searchQuery = query.trim();
    console.log(`[v1] Search: "${searchQuery}" (type: ${type}, external: ${includeExternal}, save: ${saveToCatalog})`);

    let movies = [];
    let people = [];
    let savedCount = 0;

    // Database-first search
    const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
    const hasDatabaseAccess = !!dbUrl;

    if (hasDatabaseAccess && (type === 'movie' || type === 'multi')) {
      const client = getRailwayClient();

      try {
        await client.connect();

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
              (
                CASE WHEN LOWER(m.title) = LOWER($1) THEN 10000 ELSE 0 END +
                CASE WHEN ${searchWords.map((_, i) => `LOWER(m.title) LIKE $${i + 3}`).join(' AND ')}
                     THEN 5000 ELSE 0 END +
                CASE WHEN LOWER(m.title) LIKE LOWER($1) || '%' THEN 2000 ELSE 0 END +
                (similarity(LOWER(m.title), LOWER($1)) * 1000) +
                CASE WHEN ma.id IS NOT NULL THEN 500 ELSE 0 END +
                CASE WHEN ew.id IS NOT NULL THEN 300 ELSE 0 END +
                CASE WHEN m.contributors_json IS NOT NULL THEN 100 ELSE 0 END
              ) as rank_score
            FROM movies m
            LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
            LEFT JOIN enhanced_why_watch ew ON ma.id = ew.analysis_id
            WHERE
              (m.title ILIKE $2 OR similarity(LOWER(m.title), LOWER($1)) > 0.3)
          )
          SELECT * FROM ranked_movies
          ORDER BY rank_score DESC
          LIMIT 20
        `, [searchQuery, searchPattern, ...searchWords.map(w => `%${w}%`)]);

        movies = dbSearchResult.rows.map(row => {
          const contributorText = getDisplayContributors(row.contributors_json);

          let contentScore = 0;
          if (contributorText) contentScore += 20;
          if (row.reasons && row.recommendation) contentScore += 40;
          if (row.enhanced_sections && row.enhanced_sections[0]) contentScore += 40;

          return {
            id: row.id,
            title: row.title,
            year: row.year,
            tmdb_id: row.tmdb_id,
            poster_url: row.poster_url || null,
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

        console.log(`[v1] Database: ${movies.length} movies found`);

      } catch (error) {
        console.error('[v1] Database search error:', error);
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

          if (type === 'movie' || type === 'multi') {
            // Use /search/multi to get both movies and TV shows, then filter
            const tmdbUrl = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(searchQuery)}`;
            const response = await fetch(tmdbUrl, { headers });

            if (response.ok) {
              const data = await response.json();

              // Filter to movies only (exclude TV shows)
              const movieResults = (data.results || [])
                .filter(item => item.media_type === 'movie')
                .slice(0, 10);

              const tvResults = (data.results || [])
                .filter(item => item.media_type === 'tv')
                .slice(0, 5);

              // Log TV shows found (so we know they're not movies)
              if (tvResults.length > 0) {
                console.log(`[v1] TMDB: Found ${tvResults.length} TV shows (filtered out): ${tvResults.map(tv => tv.name).join(', ')}`);
              }

              const tmdbMovies = movieResults.map(m => ({
                tmdb_id: m.id,
                title: m.title,
                year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
                poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
                contentScore: 0,
                external: true
              }));

              movies = tmdbMovies;
              console.log(`[v1] TMDB: ${movies.length} movies found`);

              // Save TMDB results to catalog if requested
              if (saveToCatalog && movies.length > 0) {
                try {
                  const saveResults = await Promise.all(
                    movies.map(m => ensureMovieInDb({
                      id: m.tmdb_id,
                      title: m.title,
                      release_date: m.year ? `${m.year}-01-01` : null,
                      poster_path: m.poster_url ? m.poster_url.replace('https://image.tmdb.org/t/p/w500', '') : null
                    }))
                  );

                  savedCount = saveResults.filter(r => r.isNew).length;
                  console.log(`[v1] Saved ${savedCount} new movies to catalog (${saveResults.length - savedCount} already existed)`);
                } catch (saveError) {
                  console.error('[v1] Error saving to catalog:', saveError);
                  // Continue even if save fails
                }
              }
            }
          }

          if (type === 'person' || type === 'multi') {
            const tmdbUrl = `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(searchQuery)}`;
            const response = await fetch(tmdbUrl, { headers });

            if (response.ok) {
              const data = await response.json();
              people = (data.results || []).slice(0, 10).map(p => ({
                id: p.id,
                name: p.name,
                profile_path: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
                known_for_department: p.known_for_department
              }));

              console.log(`[v1] TMDB: ${people.length} people found`);
            }
          }
        } catch (error) {
          console.error('[v1] TMDB search error:', error);
        }
      }
    }

    const hasResults = movies.length > 0 || people.length > 0;

    res.status(200).json({
      query: searchQuery,
      movies,
      ...(type === 'person' || type === 'multi' ? { people } : {}),
      hasResults,
      ...(saveToCatalog && savedCount > 0 ? { saved: savedCount } : {}),
      fallback: !hasResults
        ? {
            message: "We didn't find a result, but would you like to pass it on to our Movie Genius?",
            askUrl: `/genius?q=${encodeURIComponent(searchQuery)}`
          }
        : null
    });

  } catch (error) {
    console.error('[v1] Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
