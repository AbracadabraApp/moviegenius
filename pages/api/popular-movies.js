// pages/api/popular-movies.js - TMDB Popular & Top Rated Movies API
import { ensureMovieInDb } from '../../lib/services/tmdb-persist';
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
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      return res.status(500).json({
        error: 'TMDB API key not configured',
        movies: [],
      });
    }

    console.log(`🎬 Fetching popular movies: ${category}`);

    let tmdbUrl;
    let categoryTitle;

    switch (category) {
      case 'popular-all-time':
        // Use TMDB top rated endpoint - these are classic acclaimed movies
        tmdbUrl = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
        categoryTitle = 'Greatest Films of All Time';
        break;

      case 'top-rated':
        // Use TMDB top rated endpoint - highest rated movies
        tmdbUrl = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
        categoryTitle = 'Top Rated Movies';
        break;

      default:
        return res.status(400).json({ error: 'Invalid category' });
    }

    const response = await fetch(tmdbUrl);

    if (!response.ok) {
      console.error(`TMDB API error: ${response.status}`);
      return res.status(500).json({
        error: 'Failed to fetch movies',
        movies: [],
      });
    }

    const data = await response.json();

    // Persist all results to DB — fire-and-forget
    (data.results || []).forEach(movie => ensureMovieInDb(movie).catch(() => {}));

    // Transform results to match our format
    const movies = (data.results || [])
      .filter(movie => movie.title && movie.id) // Ensure valid movie data
      .slice(0, 20) // Limit to 20 results
      .map(movie => ({
        id: `tmdb_${movie.id}`,
        title: movie.title,
        year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
        tmdb_id: movie.id,
        slug: null,
        overview: movie.overview || '',
        contributors: null, // Will be fetched from our database
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : '/images/placeholder-poster.jpg',
        popularity: movie.popularity || 0,
        vote_average: movie.vote_average || 0,
        vote_count: movie.vote_count || 0,
        release_date: movie.release_date,
        streaming_data: null, // Will be fetched from our database
      }));

    // Fetch movie data with contributors_json from single table
    const client = getRailwayClient();
    let enrichedMovies = movies;
    
    try {
      await client.connect();
      
      const tmdbIds = movies.map(m => m.tmdb_id);
      
      if (tmdbIds.length > 0) {
        // Single fast query with contributors_json
        const movieDataResult = await client.query(`
          SELECT tmdb_id, streaming_data, slug, contributors_json
          FROM movies 
          WHERE tmdb_id = ANY($1::int[])
        `, [tmdbIds]);

        // Create lookup map
        const movieDataMap = {};
        movieDataResult.rows.forEach(row => {
          movieDataMap[row.tmdb_id] = {
            streaming_data: row.streaming_data,
            slug: row.slug,
            contributors_json: row.contributors_json
          };
        });

        // Enrich movies with database data
        enrichedMovies = movies.map(movie => {
          const movieData = movieDataMap[movie.tmdb_id];
          
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

          const contributorsText = getDisplayContributors(movieData?.contributors_json);
          
          return {
            ...movie,
            contributors: contributorsText,
            streaming_data: movieData?.streaming_data || null,
            slug: movieData?.slug || null
          };
        });
      }
    } catch (error) {
      console.error('Error fetching movie data:', error);
      // Continue with TMDB-only data if database fails
    } finally {
      await client.end();
    }

    console.log(`✅ Popular movies success: ${category} -> ${enrichedMovies.length} movies`);

    res.status(200).json({
      movies: enrichedMovies,
      category,
      categoryTitle,
      hasResults: enrichedMovies.length > 0,
      totalResults: data.total_results || enrichedMovies.length,
    });
  } catch (error) {
    console.error('Popular movies error:', error);
    res.status(500).json({
      error: 'Internal server error',
      movies: [],
      message: error.message,
    });
  }
}
