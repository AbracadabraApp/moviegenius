// pages/api/cache-movie-data.js
// Cache enhanced movie data to Supabase instead of JSON files
import { createClient, supabase } from './railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from './railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, year, slug, poster, streaming } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Title and year are required' });
  }

  try {
    // Initialize Supabase client
    const pool = getPool();

    // Find existing movie in Supabase
    const { data: existingMovie, error: findError } = await supabase
      .from('movies')
      .select('*')
      .eq('title', title)
      .eq('year', year)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is ok for new movies
      throw findError;
    }

    let result;
    let updated = false;

    if (existingMovie) {
      // Update existing movie with enhanced data
      const updates = {};

      // Only update fields that were provided and are different/missing
      // 🛡️ ULTIMATE PROTECTION: Don't overwrite good Claude slugs with bad ones
      const existingSlugIsGood =
        existingMovie.slug && existingMovie.slug.length > 30 && !existingMovie.slug.includes('-');
      const newSlugIsBetter = slug && slug.length > 30 && !slug.includes('-');

      // 🚨 STRICT FILTER: Block obvious URL-format slugs
      const isUrlFormatSlug =
        slug &&
        slug.includes('-') &&
        slug.length < 40 &&
        (slug.match(/^[a-z0-9-]+-(19|20)\d{2}$/) ||
          slug.toLowerCase() ===
            title
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/^the-|^a-|^an-/, ''));

      if (isUrlFormatSlug) {
        console.warn(`🚫 BLOCKED URL-format slug for ${title} (${year}): "${slug}"`);
        // Don't update with corrupted slug
      } else if (slug && (!existingMovie.slug || (newSlugIsBetter && !existingSlugIsGood))) {
        updates.slug = slug;
        updated = true;
      }

      if (
        poster &&
        poster !== '/images/placeholder-poster.jpg' &&
        (!existingMovie.poster_url || poster !== existingMovie.poster_url)
      ) {
        updates.poster_url = poster;
        updated = true;
      }

      if (
        streaming &&
        (!existingMovie.streaming_data || streaming !== existingMovie.streaming_data)
      ) {
        updates.streaming_data = streaming;
        updated = true;
      }

      if (updated) {
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('movies')
          .update(updates)
          .eq('id', existingMovie.id)
          .select()
          .single();

        if (error) throw error;

        result = data;
        console.log(`Updated Supabase record for: ${title} (${year})`);
      } else {
        result = existingMovie;
        console.log(`No updates needed for: ${title} (${year})`);
      }
    } else {
      // Create new movie entry (rare since we pre-populate via migration)
      const newMovie = {
        title,
        year,
        slug: slug || null,
        poster_url: poster || null,
        streaming_data: streaming || null,
        // Note: tmdb_id and other fields would need separate lookup
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('movies').insert(newMovie).select().single();

      if (error) throw error;

      result = data;
      updated = true;
      console.log(`Created new Supabase record for: ${title} (${year})`);
    }

    // Return response in format MediaCard expects
    res.status(200).json({
      success: true,
      cached: updated,
      updated: {
        slug: !!slug,
        poster: !!poster,
        streaming: !!streaming,
      },
      movie: {
        title: result.title,
        year: result.year,
        slug: result.slug,
        poster: result.poster_url, // Map database field to MediaCard format
        streaming: result.streaming_data, // Map database field to MediaCard format
        id: result.id,
        dataSource: 'supabase',
      },
    });
  } catch (error) {
    console.error('Supabase cache error:', error);

    res.status(500).json({
      error: 'Failed to cache movie data to Supabase',
      details: error.message,
    });
  }
}
