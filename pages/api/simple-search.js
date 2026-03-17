// pages/api/simple-search.js - 100% TMDB-based movie search API
import { Client } from 'pg';

// Railway PostgreSQL connection helper
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
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const searchQuery = query.trim();
    console.log(`🔍 TMDB search: "${searchQuery}" [with popularity scores]`);

    // Search TMDB directly - 100% coverage with TMDB IDs
    const { searchTMDB } = await import('../../lib/services/tmdb-search.js');
    const tmdbResults = await searchTMDB(searchQuery);

    let movies = [];
    if (tmdbResults && tmdbResults.length > 0) {
      // Convert TMDB results to our format - all have TMDB IDs
      movies = tmdbResults.slice(0, 20).map(movie => ({
        id: `tmdb_${movie.id}`, // Temporary ID for frontend
        title: movie.title,
        year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
        tmdb_id: movie.id, // 100% guaranteed TMDB ID
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : '/images/placeholder-poster.jpg',
        popularity: movie.popularity || 0, // Include TMDB popularity score for ranking
        streaming_data: null, // Will be fetched organically if needed
        slug: null,
        overview: movie.overview || '',
        contributors: null, // Will be enriched from database if available
      }));

      console.log(`🎬 Found ${movies.length} TMDB results for "${searchQuery}"`);

      // Fetch contributors_json from database for these movies
      if (movies.length > 0) {
        const client = getRailwayClient();
        
        try {
          await client.connect();
          
          const tmdbIds = movies.map(m => m.tmdb_id);

          // Single fast query with contributors_json, analysis data, and whyWatch
          const movieDataResult = await client.query(`
            SELECT
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

          // Create lookup maps
          const contributorsMap = {};
          const analysisMap = {};
          movieDataResult.rows.forEach(row => {
            contributorsMap[row.tmdb_id] = row.contributors_json;

            // Store analysis data
            analysisMap[row.tmdb_id] = {
              whyWatch: row.reasons && row.recommendation ? {
                reasons: row.reasons,
                recommendation: row.recommendation
              } : null,
              firstSection: row.enhanced_sections && row.enhanced_sections[0]
                ? row.enhanced_sections[0].text
                : null
            };
          });

          // Use your template approach for contributors
          const getDisplayContributors = (contributors_json) => {
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
          };

          // Enrich movies with contributors and analysis data
          movies = movies.map(movie => {
            const contributorsJson = contributorsMap[movie.tmdb_id];
            const contributorText = getDisplayContributors(contributorsJson);
            const analysisData = analysisMap[movie.tmdb_id];

            // Calculate content coverage score (0-100)
            let contentScore = 0;
            if (contributorText) contentScore += 20;
            if (analysisData?.whyWatch) contentScore += 40;
            if (analysisData?.firstSection) contentScore += 40;

            return {
              ...movie,
              contributors: contributorText,
              whyWatch: analysisData?.whyWatch || null,
              analysisPreview: analysisData?.firstSection || null,
              contentScore
            };
          });

          // Sort by content coverage first, then TMDB popularity
          movies.sort((a, b) => {
            if (b.contentScore !== a.contentScore) {
              return b.contentScore - a.contentScore;
            }
            return b.popularity - a.popularity;
          });

          // V1: Prioritize movies with content - limit no-content results
          const moviesWithContent = movies.filter(m => m.contentScore > 0);
          const moviesWithoutContent = movies.filter(m => m.contentScore === 0).slice(0, 5); // Max 5 without content
          movies = [...moviesWithContent, ...moviesWithoutContent];

        } catch (error) {
          console.error('Error fetching contributors for search:', error);
          // Continue with movies without contributors
        } finally {
          await client.end();
        }
      }
    }

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
