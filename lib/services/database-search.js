/**
 * Database Search Service
 *
 * Searches our local movie database (2% coverage) for movies
 * before falling back to TMDB search (98% coverage)
 */

import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Parse search query from EntityLinkedText format
 * Input: "The Dark Knight 2008" or "Casablanca 1942"
 * Output: { title: "The Dark Knight", year: 2008 }
 */
export function parseSearchQuery(query) {
  // Extract year from end of query
  const yearMatch = query.match(/\s(\d{4})$/);

  if (!yearMatch) {
    return { title: query.trim(), year: null };
  }

  const year = parseInt(yearMatch[1]);
  const title = query.replace(/\s\d{4}$/, '').trim();

  return { title, year };
}

/**
 * Search our local database for exact title/year match
 */
export async function searchExactMatch(title, year) {
  try {
    const { data: movie, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, slug, poster_url')
      .eq('title', title)
      .eq('year', year)
      .single();

    if (error || !movie) {
      return null;
    }

    console.log(`✅ Database exact match: "${title}" (${year}) -> TMDB ${movie.tmdb_id}`);
    return movie;
  } catch (error) {
    console.warn('Database exact match error:', error);
    return null;
  }
}

/**
 * Search our local database with fuzzy matching
 * Handles slight variations in titles
 */
export async function searchFuzzyMatch(title, year) {
  try {
    // Build fuzzy search query
    let query = supabase.from('movies').select('id, title, year, tmdb_id, slug, poster_url');

    // If we have a year, filter by it first (most reliable)
    if (year) {
      query = query.eq('year', year);
    }

    // Use ilike for case-insensitive partial matching
    query = query.ilike('title', `%${title}%`);

    const { data: movies, error } = await query.limit(5);

    if (error || !movies || movies.length === 0) {
      return null;
    }

    // Return best match (exact year match preferred)
    const bestMatch = movies.find(m => m.year === year) || movies[0];

    console.log(
      `🔍 Database fuzzy match: "${title}" (${year}) -> "${bestMatch.title}" (${bestMatch.year})`
    );
    return bestMatch;
  } catch (error) {
    console.warn('Database fuzzy match error:', error);
    return null;
  }
}

/**
 * Main database search function
 * Tries exact match first, then fuzzy matching
 */
export async function searchOurDatabase(query) {
  const { title, year } = parseSearchQuery(query);

  console.log(`🔍 Searching database for: "${title}" (${year})`);

  // Try exact match first
  let result = await searchExactMatch(title, year);
  if (result) {
    return result;
  }

  // Fall back to fuzzy matching
  result = await searchFuzzyMatch(title, year);
  if (result) {
    return result;
  }

  console.log(`❌ Database search failed: "${title}" (${year}) not found`);
  return null;
}

/**
 * Generate a Claude-powered slug for a movie at creation time
 * Used to prevent the 53.5% missing slug problem
 */
async function generateSlugForMovie(title, year) {
  try {
    console.log(`🎯 Generating slug for new movie: ${title} (${year})`);
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Create a movie poster tagline for "${title}" (${year}). 
Requirements:
- 5-50 characters
- Engaging and cinematic
- NO plot summaries or character names
- NO "Plot:", "Overview:", "Synopsis:" prefixes
- Movie poster marketing style
- Examples: "Evil never dies", "Love conquers all", "Justice has a price"

Movie: ${title} (${year})`
      }]
    });

    const slug = message.content[0].text.trim().replace(/"/g, '');
    
    // Validate the generated slug
    if (slug.length < 5 || slug.length > 50 || 
        slug.includes('Plot:') || slug.includes('Overview:') || 
        slug.includes('Synopsis:') || slug.includes('Summary:')) {
      console.log(`⚠️ Generated slug failed validation for ${title}, using fallback`);
      return `${title} - A cinematic experience`;
    }
    
    console.log(`✅ Generated slug for ${title}: "${slug}"`);
    return slug;
  } catch (error) {
    console.log(`⚠️ Slug generation failed for ${title}: ${error.message}`);
    return `${title} - A cinematic experience`;
  }
}

/**
 * Check if a movie exists in our database by TMDB ID
 * Used to prevent duplicate creation
 */
export async function movieExistsInDatabase(tmdbId) {
  try {
    const { data: movie, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();

    return error ? null : movie;
  } catch (error) {
    return null;
  }
}

/**
 * Create basic movie entry in database from TMDB data
 * Used when a TMDB movie is discovered via search
 */
export async function createBasicMovieEntry(tmdbMovie) {
  try {
    const releaseYear = tmdbMovie.release_date
      ? parseInt(tmdbMovie.release_date.substring(0, 4))
      : null;

    // Generate slug immediately during movie creation (zero-waste architecture)
    const slug = await generateSlugForMovie(tmdbMovie.title, releaseYear);

    const movieData = {
      title: tmdbMovie.title,
      year: releaseYear,
      tmdb_id: tmdbMovie.id,
      slug: slug,
      slug_complete: true, // Mark as complete to prevent regeneration
      poster_url: tmdbMovie.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newMovie, error } = await supabase
      .from('movies')
      .insert(movieData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create movie entry:', error);
      return null;
    }

    console.log(
      `💾 Created database entry: "${tmdbMovie.title}" (${releaseYear}) -> TMDB ${tmdbMovie.id}`
    );
    return newMovie;
  } catch (error) {
    console.error('Error creating movie entry:', error);
    return null;
  }
}
