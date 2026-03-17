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

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
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

        // Step 1: Search OUR database first for movies with content
        const dbSearchResult = await client.query(`
          SELECT DISTINCT
            m.id,
            m.title,
            m.year,
            m.tmdb_id,
            m.poster_path,
            m.contributors_json,
            ma.enhanced_sections,
            ew.recommendation,
            ew.reasons,
            COALESCE(m.popularity, 0) as popularity
          FROM movies m
          LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
          LEFT JOIN enhanced_why_watch ew ON ma.id = ew.analysis_id
          WHERE m.title ILIKE $1
          ORDER BY
            -- Prioritize movies with content
            CASE WHEN ma.id IS NOT NULL THEN 1 ELSE 2 END,
            CASE WHEN ew.id IS NOT NULL THEN 1 ELSE 2 END,
            CASE WHEN m.contributors_json IS NOT NULL THEN 1 ELSE 2 END,
            COALESCE(m.popularity, 0) DESC
          LIMIT 20
        `, [`%${searchQuery}%`]);

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
            poster_url: row.poster_path
              ? `https://image.tmdb.org/t/p/w500${row.poster_path}`
              : '/images/placeholder-poster.jpg',
            popularity: row.popularity || 0,
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

        // Step 2: Only supplement with TMDB if we have < 8 results with content
        const moviesWithContent = movies.filter(m => m.contentScore > 0);
        console.log(`✅ ${moviesWithContent.length} movies with content in our database`);

        if (moviesWithContent.length < 8) {
          console.log(`🔍 Supplementing with TMDB search (need ${8 - moviesWithContent.length} more)`);

          const { searchTMDB } = await import('../../lib/services/tmdb-search.js');
          const tmdbResults = await searchTMDB(searchQuery);

          if (tmdbResults && tmdbResults.length > 0) {
            // Get TMDB IDs we already have
            const existingTmdbIds = new Set(movies.map(m => m.tmdb_id).filter(Boolean));

            // Add TMDB results we don't already have
            const newTmdbMovies = tmdbResults
              .filter(movie => !existingTmdbIds.has(movie.id))
              .slice(0, 10)
              .map(movie => ({
                id: `tmdb_${movie.id}`,
                title: movie.title,
                year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
                tmdb_id: movie.id,
                poster_url: movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : '/images/placeholder-poster.jpg',
                popularity: movie.popularity || 0,
                contributors: null,
                whyWatch: null,
                analysisPreview: null,
                contentScore: 0
              }));

            console.log(`📺 Adding ${newTmdbMovies.length} new movies from TMDB`);
            movies = [...movies, ...newTmdbMovies];
          }
        }

      } catch (error) {
        console.error('Database search error:', error);
        // Fallback to TMDB-only search on database error
        console.log('⚠️  Falling back to TMDB-only search');
        const { searchTMDB } = await import('../../lib/services/tmdb-search.js');
        const tmdbResults = await searchTMDB(searchQuery);

        if (tmdbResults && tmdbResults.length > 0) {
          movies = tmdbResults.slice(0, 20).map(movie => ({
            id: `tmdb_${movie.id}`,
            title: movie.title,
            year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
            tmdb_id: movie.id,
            poster_url: movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : '/images/placeholder-poster.jpg',
            popularity: movie.popularity || 0,
            contributors: null,
            whyWatch: null,
            analysisPreview: null,
            contentScore: 0
          }));
        }
      } finally {
        await client.end();
      }

    } else {
      // TMDB-ONLY FALLBACK (no database access)
      console.log(`🔍 TMDB-only search: "${searchQuery}" (no database access)`);
      const { searchTMDB } = await import('../../lib/services/tmdb-search.js');
      const tmdbResults = await searchTMDB(searchQuery);

      if (tmdbResults && tmdbResults.length > 0) {
        movies = tmdbResults.slice(0, 20).map(movie => ({
          id: `tmdb_${movie.id}`,
          title: movie.title,
          year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
          tmdb_id: movie.id,
          poster_url: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : '/images/placeholder-poster.jpg',
          popularity: movie.popularity || 0,
          contributors: null,
          whyWatch: null,
          analysisPreview: null,
          contentScore: 0
        }));
      }
    }

    // Step 3: Sort by content coverage first, then TMDB popularity
    movies.sort((a, b) => {
      if (b.contentScore !== a.contentScore) {
        return b.contentScore - a.contentScore;
      }
      return b.popularity - a.popularity;
    });

    console.log(`🎯 Returning ${movies.length} total results`);

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
