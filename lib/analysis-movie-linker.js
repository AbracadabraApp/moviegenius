/**
 * Analysis Movie Linking Service - Integrated Version
 * 
 * Processes movie references during analysis creation to:
 * 1. Extract movies from both MOVIES: lines and **bold** patterns
 * 2. Create/update movie database entries with TMDB data
 * 3. Generate HTML links in analysis content
 * 4. Return linked movies for Featured Films section
 * 
 * Used during analysis creation for immediate linking (no batch processing needed).
 */

import { Client } from 'pg';

// Railway PostgreSQL connection helper
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set for movie linking');
  }
  
  return new Client({ connectionString: dbUrl });
}

/**
 * Extract movie references from analysis content
 * Returns both MOVIES: line movies and **bold** pattern movies
 */
function extractAllMovieReferences(content) {
  if (!content || typeof content !== 'string') return { featuredMovies: [], linkedMovies: [] };

  const featuredMovies = [];
  const linkedMovies = [];

  // Extract MOVIES: lines (existing featured movies)
  // Fixed: streaming field should only capture until end of line, not subsequent text
  const moviesPattern = /^MOVIES:\s*([^|\n]+)\|(\d{4})\|([^|\n]+)(?:\|([^|\n]+))?/gm;
  let match;
  
  while ((match = moviesPattern.exec(content)) !== null) {
    featuredMovies.push({
      title: match[1].trim(),
      year: parseInt(match[2]),
      slug: match[3].trim(),
      streaming: match[4]?.trim() || null,
      source: 'MOVIES_LINE'
    });
  }

  // Extract **Movie Title** (Year) patterns (linked movies)
  const boldWithYearPattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
  while ((match = boldWithYearPattern.exec(content)) !== null) {
    let title = match[1].trim();
    const year = parseInt(match[2]);
    
    // Remove year from title if duplicated
    if (title.endsWith(`(${year})`)) {
      title = title.replace(`(${year})`, '').trim();
    }
    
    linkedMovies.push({
      title,
      year,
      original: match[0],
      source: 'BOLD_PATTERN'
    });
  }

  // Extract **Movie Title** without year patterns
  const boldWithoutYearPattern = /\*\*([^*]+)\*\*/g;
  const contentWithoutYears = content.replace(boldWithYearPattern, ''); // Remove already processed
  
  while ((match = boldWithoutYearPattern.exec(contentWithoutYears)) !== null) {
    const title = match[1].trim();
    
    // Skip if it's likely not a movie title
    if (title.length < 2 || title.includes('|') || /^(and|or|the|of|in|to|a|an)$/i.test(title)) {
      continue;
    }
    
    linkedMovies.push({
      title,
      year: null,
      original: match[0],
      source: 'BOLD_PATTERN'
    });
  }

  return { featuredMovies, linkedMovies };
}

/**
 * Look up movie in database by title and optional year
 */
async function findMovieInDatabase(title, year = null) {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    
    let query, params;
    if (year) {
      query = 'SELECT id, tmdb_id, title, year, slug, poster_url FROM movies WHERE LOWER(title) LIKE LOWER($1) AND year = $2 ORDER BY year DESC LIMIT 1';
      params = [`%${title}%`, year];
    } else {
      query = 'SELECT id, tmdb_id, title, year, slug, poster_url FROM movies WHERE LOWER(title) LIKE LOWER($1) ORDER BY year DESC LIMIT 1';
      params = [`%${title}%`];
    }
    
    const result = await client.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
    
  } catch (error) {
    console.log(`No DB match for "${title}"${year ? ` (${year})` : ''}:`, error.message);
    return null;
  } finally {
    await client.end();
  }
}

/**
 * Add movie to database using HMDB API lookup
 */
async function addMovieToDatabase(title, year = null, slug = null) {
  try {
    console.log(`🔍 Adding "${title}"${year ? ` (${year})` : ''} to database via TMDB...`);

    // Build TMDB search query with proper authentication
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    
    if (!apiKey || apiKey === 'placeholder' || apiKey.startsWith('placehol')) {
      console.log(`❌ No valid TMDB API key for "${title}" - skipping TMDB lookup`);
      return null;
    }
    
    const searchQuery = year ? `${title} ${year}` : title;
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}${year ? `&year=${year}` : ''}`;

    const tmdbResponse = await fetch(tmdbUrl);
    const tmdbData = await tmdbResponse.json();

    if (tmdbData.results && tmdbData.results.length > 0) {
      // Find best match (prefer exact year if specified)
      let bestMatch = tmdbData.results[0];

      if (year) {
        const yearMatch = tmdbData.results.find(movie => {
          const releaseYear = movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null;
          return releaseYear === year;
        });
        if (yearMatch) bestMatch = yearMatch;
      }

      const movieYear = bestMatch.release_date ? parseInt(bestMatch.release_date.substring(0, 4)) : year;
      const posterUrl = bestMatch.poster_path 
        ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}` 
        : null;

      // Insert into Railway PostgreSQL database
      const client = getRailwayClient();
      
      try {
        await client.connect();
        
        const insertQuery = `
          INSERT INTO movies (tmdb_id, title, year, slug, poster_url, official_title, release_date, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          ON CONFLICT (tmdb_id) DO UPDATE SET
            title = EXCLUDED.title,
            year = EXCLUDED.year,
            slug = EXCLUDED.slug,
            poster_url = EXCLUDED.poster_url,
            official_title = EXCLUDED.official_title,
            release_date = EXCLUDED.release_date,
            updated_at = NOW()
          RETURNING *
        `;
        
        const insertResult = await client.query(insertQuery, [
          bestMatch.id,
          bestMatch.title,
          movieYear,
          slug || null,
          posterUrl,
          bestMatch.title,
          bestMatch.release_date
        ]);

        const newMovie = insertResult.rows[0];
        console.log(`✅ Added "${bestMatch.title}" (${movieYear}) with TMDB ID ${bestMatch.id}`);
        return newMovie;
        
      } catch (insertError) {
        console.error(`Error inserting "${bestMatch.title}":`, insertError);
        return null;
      } finally {
        await client.end();
      }
    }

    console.log(`❌ No TMDB results for "${title}"${year ? ` (${year})` : ''}`);
    return null;
  } catch (error) {
    console.error(`Error adding "${title}" to database:`, error);
    return null;
  }
}

/**
 * Process a single movie reference and get/create database entry
 */
async function processMovieReference(movieRef) {
  // First, try to find in database
  let movie = await findMovieInDatabase(movieRef.title, movieRef.year);
  
  if (!movie) {
    // Add to database via TMDB
    movie = await addMovieToDatabase(movieRef.title, movieRef.year, movieRef.slug);
  }
  
  if (movie) {
    return {
      ...movieRef,
      id: movie.id,
      tmdb_id: movie.tmdb_id,
      poster_url: movie.poster_url,
      database_title: movie.title,
      database_year: movie.year
    };
  }
  
  return movieRef; // Return original if no database match
}

/**
 * Convert **Movie Title** patterns to HTML links in content
 */
function generateLinkedContent(content, processedMovies, currentMovieTmdbId = null) {
  let linkedContent = content;
  
  for (const movie of processedMovies) {
    if (!movie.tmdb_id || !movie.original) continue;
    
    // Skip self-referential links
    if (currentMovieTmdbId && movie.tmdb_id === currentMovieTmdbId) {
      // Just strip the ** marks for self-references
      linkedContent = linkedContent.replace(
        movie.original,
        movie.original.replace(/\*\*/g, '')
      );
      continue;
    }
    
    // Create HTML link
    const link = `<a href="/movie/${movie.tmdb_id}" class="movie-title" data-tmdb-id="${movie.tmdb_id}">${movie.title}</a>${movie.year ? ` (${movie.year})` : ''}`;
    
    linkedContent = linkedContent.replace(movie.original, link);
  }
  
  return linkedContent;
}

/**
 * Main function: Process all movie references in analysis content
 * Returns both processed content with HTML links and movie data for Featured Films
 */
export async function processAnalysisMovies(content, currentMovieTmdbId = null) {
  if (!content || typeof content !== 'string') {
    return {
      processedContent: content,
      featuredMovies: [],
      linkedMovies: [],
      allMovies: []
    };
  }

  console.log('🔗 Processing movie references in analysis content...');

  // Extract all movie references
  const { featuredMovies, linkedMovies } = extractAllMovieReferences(content);
  
  console.log(`Found ${featuredMovies.length} featured movies and ${linkedMovies.length} linked movies`);

  // Process all movies (both featured and linked)
  const allMovieRefs = [...featuredMovies, ...linkedMovies];
  const processedMovies = [];

  for (const movieRef of allMovieRefs) {
    const processedMovie = await processMovieReference(movieRef);
    processedMovies.push(processedMovie);
  }

  // Generate content with HTML links (only for linked movies, not MOVIES: lines)
  const linkedMoviesOnly = processedMovies.filter(m => m.source === 'BOLD_PATTERN');
  const processedContent = generateLinkedContent(content, linkedMoviesOnly, currentMovieTmdbId);

  // Separate for return
  const processedFeaturedMovies = processedMovies.filter(m => m.source === 'MOVIES_LINE');
  const processedLinkedMovies = processedMovies.filter(m => m.source === 'BOLD_PATTERN');

  console.log(`✅ Processed ${processedMovies.length} total movie references`);

  return {
    processedContent,
    featuredMovies: processedFeaturedMovies,
    linkedMovies: processedLinkedMovies,
    allMovies: processedMovies
  };
}

export {
  extractAllMovieReferences,
  findMovieInDatabase,
  addMovieToDatabase,
  processMovieReference,
  generateLinkedContent
};