/**
 * POST /api/v1/search
 *
 * Unified search endpoint for movies and people
 *
 * Request Body:
 * {
 *   query: string,           // Search query (min 2 characters)
 *   type?: 'movie' | 'person' | 'multi',  // Search type (default: 'movie')
 *   strategy?: 'database-first' | 'tmdb-first',  // Search strategy (default: 'database-first')
 *   includeExternal?: boolean,  // Include TMDB results (default: false)
 *   saveToCatalog?: boolean   // Save TMDB results to catalog (default: false)
 * }
 *
 * Search Strategies:
 * - 'database-first': Search local database first (exact title matching, best for curated lists)
 * - 'tmdb-first': Search TMDB first (broad fuzzy matching, searches cast/crew, best for user queries)
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
import { searchTMDB } from '../../../lib/services/tmdb-search.js';

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
    const {
      query,
      type = 'movie',
      strategy = 'database-first', // Default to database-first for backward compatibility
      includeExternal = false,
      saveToCatalog = false,
      includeCollections = true  // COLLECTION_SEARCH: Set to false to disable collection search
    } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    // Validate strategy parameter
    const validStrategies = ['database-first', 'tmdb-first'];
    if (!validStrategies.includes(strategy)) {
      return res.status(400).json({
        error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`
      });
    }

    const searchQuery = query.trim();
    console.log(`[v1] Search: "${searchQuery}" (type: ${type}, strategy: ${strategy}, external: ${includeExternal}, save: ${saveToCatalog})`);

    let movies = [];
    let people = [];
    let collections = [];  // COLLECTION_SEARCH: Easy rollback
    let savedCount = 0;

    // TMDB-first search strategy
    if (strategy === 'tmdb-first' && (type === 'movie' || type === 'multi')) {
      try {
        // Step 1: Search TMDB for broad coverage
        const tmdbResults = await searchTMDB(searchQuery);

        if (tmdbResults && tmdbResults.length > 0) {
          // Step 2: Convert TMDB results to our format
          movies = tmdbResults.slice(0, 20).map(movie => ({
            id: `tmdb_${movie.id}`, // Temporary ID
            tmdb_id: movie.id,
            title: movie.title,
            year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
            poster_url: movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : null,
            contentScore: 0, // Will be enriched from database
            contributors: null,
            whyWatch: null,
            analysisPreview: null
          }));

          console.log(`[v1] TMDB-first: ${movies.length} movies found`);

          // Step 3: Enrich with database data
          const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
          if (dbUrl && movies.length > 0) {
            const client = getRailwayClient();

            try {
              await client.connect();

              const tmdbIds = movies.map(m => m.tmdb_id);

              // Fetch database data for these TMDB IDs
              const dbDataResult = await client.query(`
                SELECT
                  m.id,
                  m.tmdb_id,
                  m.contributors_json,
                  ma.enhanced_sections,
                  ew.recommendation,
                  ew.reasons
                FROM movies m
                LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
                LEFT JOIN enhanced_why_watch ew ON ma.id = ew.analysis_id
                WHERE m.tmdb_id = ANY($1::int[])
              `, [tmdbIds]);

              // Create enrichment map
              const enrichmentMap = {};
              dbDataResult.rows.forEach(row => {
                enrichmentMap[row.tmdb_id] = {
                  id: row.id,
                  contributors: getDisplayContributors(row.contributors_json),
                  whyWatch: row.reasons && row.recommendation ? {
                    reasons: row.reasons,
                    recommendation: row.recommendation
                  } : null,
                  analysisPreview: row.enhanced_sections && row.enhanced_sections[0]
                    ? row.enhanced_sections[0].text
                    : null
                };
              });

              // Enrich TMDB results with database data
              movies = movies.map(movie => {
                const enrichment = enrichmentMap[movie.tmdb_id] || {};

                let contentScore = 0;
                if (enrichment.contributors) contentScore += 20;
                if (enrichment.whyWatch) contentScore += 40;
                if (enrichment.analysisPreview) contentScore += 40;

                return {
                  ...movie,
                  id: enrichment.id || movie.id,
                  contributors: enrichment.contributors || null,
                  whyWatch: enrichment.whyWatch || null,
                  analysisPreview: enrichment.analysisPreview || null,
                  contentScore
                };
              });

              console.log(`[v1] Enriched ${dbDataResult.rows.length}/${movies.length} movies with database data`);

            } catch (error) {
              console.error('[v1] Database enrichment error:', error);
              // Continue with unenriched TMDB data
            } finally {
              await client.end();
            }
          }
        }
      } catch (error) {
        console.error('[v1] TMDB-first search error:', error);
        movies = [];
      }
    }

    // Database-first search strategy (default)
    const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
    const hasDatabaseAccess = !!dbUrl;

    if (strategy === 'database-first' && hasDatabaseAccess && (type === 'movie' || type === 'multi')) {
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

    // TMDB fallback (only for database-first strategy when explicitly requested and no results)
    if (strategy === 'database-first' && includeExternal && movies.length === 0) {
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

    // COLLECTION_SEARCH: Search browse_lists for matching collections
    // To disable: Set includeCollections=false in request body
    if (includeCollections && hasDatabaseAccess) {
      const client = getRailwayClient();

      try {
        await client.connect();

        const searchPattern = `%${searchQuery}%`;

        const collectionSearchResult = await client.query(`
          WITH collection_movies AS (
            SELECT
              bl.id,
              bl.title,
              bl.description,
              bl.categories[1] as category,
              COUNT(blm.movie_id) as movie_count,
              ARRAY_AGG(m.poster_url ORDER BY blm.sequence) as top_posters
            FROM browse_lists bl
            LEFT JOIN browse_list_movies blm ON bl.id = blm.browse_list_id
            LEFT JOIN movies m ON blm.movie_id = m.id
            WHERE
              (bl.title ILIKE $1 OR
               bl.description ILIKE $1 OR
               bl.categories::text ILIKE $1)
              AND bl.status = 'published'
            GROUP BY bl.id, bl.title, bl.description, bl.categories
            HAVING COUNT(blm.movie_id) > 0
          )
          SELECT
            id,
            title,
            description,
            category,
            movie_count,
            top_posters
          FROM collection_movies
          ORDER BY
            CASE WHEN LOWER(title) = LOWER($2) THEN 3 ELSE 0 END DESC,
            movie_count DESC
          LIMIT 5
        `, [searchPattern, searchQuery]);

        collections = collectionSearchResult.rows.map(row => ({
          id: row.id,
          title: row.title,
          subtitle: row.description || null,  // Using description as subtitle for UI
          category: row.category || 'Collection',
          movie_count: row.movie_count,
          top_poster_urls: (row.top_posters || []).filter(url => url !== null).slice(0, 3)
        }));

        console.log(`[v1] Collections: ${collections.length} collections found`);

      } catch (error) {
        console.error('[v1] Collection search error:', error);
        collections = [];
      } finally {
        await client.end();
      }
    }

    const hasResults = movies.length > 0 || people.length > 0 || collections.length > 0;

    res.status(200).json({
      query: searchQuery,
      movies,
      ...(collections.length > 0 ? { collections } : {}),  // COLLECTION_SEARCH: Optional field
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
