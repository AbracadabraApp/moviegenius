// pages/api/browse-list-movies.js - Get movies for a specific browse list
import fs from 'fs';
import path from 'path';
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { listName } = req.query;

    if (!listName || typeof listName !== 'string') {
      return res.status(400).json({ error: 'List name is required' });
    }

    console.log(`🔍 Getting movies for list: "${listName}"`);

    // Step 1: Find all movie-list JSON files that contain this list
    const movieListsDir = path.join(process.cwd(), 'public', 'data', 'movie-lists');
    let movieIds = [];
    
    try {
      const files = fs.readdirSync(movieListsDir);
      
      for (const file of files) {
        if (file.startsWith('movie-') && file.endsWith('.json')) {
          try {
            const filePath = path.join(movieListsDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const movieListData = JSON.parse(fileContent);
            
            // Check if this movie has the requested list
            if (movieListData.lists) {
              const hasTargetList = movieListData.lists.some(list => 
                list.url_path === listName || 
                list.name.toLowerCase().replace(/\s+/g, '-') === listName
              );
              
              if (hasTargetList) {
                // Extract movie ID from filename (movie-603.json -> 603)
                const movieId = file.replace('movie-', '').replace('.json', '');
                movieIds.push(parseInt(movieId));
              }
            }
          } catch (fileError) {
            console.warn(`Error reading ${file}:`, fileError.message);
          }
        }
      }
      
      console.log(`📂 Found ${movieIds.length} movies in list "${listName}": ${movieIds.slice(0, 5).join(', ')}${movieIds.length > 5 ? '...' : ''}`);
      
    } catch (dirError) {
      console.warn('Error reading movie-lists directory:', dirError.message);
    }

    // Step 2: Get movie details from TMDB and database for found IDs
    if (movieIds.length === 0) {
      return res.status(200).json({
        listName,
        movies: [],
        totalMovies: 0,
        hasResults: false
      });
    }

    const client = getRailwayClient();
    
    try {
      await client.connect();
      
      // Query database for movie data including poster URLs and slugs
      const query = `
        SELECT m.tmdb_id, m.title, m.year, m.contributors_json, 
               m.poster_url, m.streaming_data, m.slug
        FROM movies m
        WHERE m.tmdb_id = ANY($1::int[])
        ORDER BY m.tmdb_id
      `;

      const result = await client.query(query, [movieIds]);

      // Import shared utilities and TMDB service
      const { formatMovieForDisplay } = await import('../../lib/hooks/useMovieData.js');
      const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search.js');
      
      // Format movies using database data, fetch TMDB overviews
      const movies = [];
      
      for (const row of result.rows) {
        let overview = '';
        
        // Always fetch overview from TMDB (like search does)
        try {
          const tmdbData = await getTMDBMovieDetails(row.tmdb_id);
          overview = tmdbData?.overview || '';
        } catch (error) {
          console.warn(`Error fetching TMDB overview for movie ${row.tmdb_id}:`, error.message);
        }
        
        // Use consistent formatting utility
        const movie = formatMovieForDisplay({
          tmdb_id: row.tmdb_id,
          title: row.title,
          year: row.year,
          poster_url: row.poster_url,
          overview: overview,
          contributors_json: row.contributors_json,
          streaming_data: row.streaming_data,
          initialSlug: null, // No slugs in browse lists
          popularity: 0
        });
        
        movies.push(movie);
      }

      console.log(`🎬 Found ${movies.length} movies for list "${listName}"`);

      res.status(200).json({
        listName,
        movies,
        totalMovies: movies.length,
        hasResults: movies.length > 0
      });

    } catch (error) {
      console.error('Database query error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail
      });
      
      res.status(500).json({ 
        error: 'Database query failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  } catch (error) {
    console.error('Browse list movies error:', error);
    res.status(500).json({
      error: 'Failed to get list movies',
      message: error.message,
    });
  }
}