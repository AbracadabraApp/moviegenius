// pages/api/upload-list-movies.js
/**
 * Upload List Movies API Route
 *
 * Creates or updates movie lists with their associated movies.
 * Handles batch creation of lists and movie-list relationships.
 */

import { createClient, supabase } from '../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { name, description, content_type, movies } = req.body;

  if (!name || !movies || !Array.isArray(movies)) {
    return res.status(400).json({
      error: 'List name and movies array are required',
    });
  }

  try {
    // Initialize Supabase client
    const pool = getPool();

    console.log(`🆕 Creating/updating list: "${name}" with ${movies.length} movies`);

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if list already exists
    const { data: existingList, error: findError } = await supabase
      .from('movie_lists')
      .select('id')
      .eq('slug', slug)
      .single();

    let listId;

    if (existingList && !findError) {
      // Update existing list
      const { data: updatedList, error: updateError } = await supabase
        .from('movie_lists')
        .update({
          name,
          description: description || null,
          content_type: content_type || 'declarative',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingList.id)
        .select()
        .single();

      if (updateError) throw updateError;

      listId = updatedList.id;
      console.log(`📝 Updated existing list: "${name}" (ID: ${listId})`);

      // Clear existing list items
      const { error: deleteError } = await supabase
        .from('movie_list_items')
        .delete()
        .eq('list_id', listId);

      if (deleteError) throw deleteError;
      console.log(`🗑️  Cleared existing items for list: "${name}"`);
    } else {
      // Create new list
      const { data: newList, error: createError } = await supabase
        .from('movie_lists')
        .insert({
          name,
          slug,
          description: description || null,
          content_type: content_type || 'declarative',
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;

      listId = newList.id;
      console.log(`✨ Created new list: "${name}" (ID: ${listId})`);
    }

    // Process movies and create list items
    const listItems = [];
    const movieResults = [];

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];

      try {
        // Find or create movie in database
        let movieRecord = null;

        // First try to find by TMDB ID if provided
        if (movie.tmdbId) {
          const { data: tmdbMovie } = await supabase
            .from('movies')
            .select('id, title, year')
            .eq('tmdb_id', movie.tmdbId)
            .single();

          movieRecord = tmdbMovie;
        }

        // If not found by TMDB ID, try by title and year
        if (!movieRecord) {
          const { data: titleMovie } = await supabase
            .from('movies')
            .select('id, title, year')
            .eq('title', movie.title)
            .eq('year', movie.year)
            .single();

          movieRecord = titleMovie;
        }

        // If still not found, create new movie record
        if (!movieRecord) {
          const { data: newMovie, error: movieError } = await supabase
            .from('movies')
            .insert({
              title: movie.title,
              year: movie.year,
              tmdb_id: movie.tmdbId || null,
              slug: movie.slug || null,
              created_at: new Date().toISOString(),
            })
            .select('id, title, year')
            .single();

          if (movieError) throw movieError;

          movieRecord = newMovie;
          console.log(`🎬 Created new movie: "${movie.title}" (${movie.year})`);
        }

        // Add to list items
        listItems.push({
          list_id: listId,
          movie_id: movieRecord.id,
          order_index: i + 1,
          created_at: new Date().toISOString(),
        });

        movieResults.push({
          title: movieRecord.title,
          year: movieRecord.year,
          status: 'added',
        });
      } catch (movieError) {
        console.error(`Error processing movie "${movie.title}":`, movieError);
        movieResults.push({
          title: movie.title,
          year: movie.year,
          status: 'error',
          error: movieError.message,
        });
      }
    }

    // Bulk insert list items
    if (listItems.length > 0) {
      const { error: itemsError } = await supabase.from('movie_list_items').insert(listItems);

      if (itemsError) throw itemsError;

      console.log(`📋 Added ${listItems.length} movies to list: "${name}"`);
    }

    res.status(200).json({
      success: true,
      message: `List "${name}" created/updated successfully`,
      list: {
        id: listId,
        name,
        slug,
        movie_count: listItems.length,
      },
      movies: movieResults,
    });
  } catch (error) {
    console.error('Error creating/updating list:', error);
    res.status(500).json({
      error: 'Failed to create/update list',
      details: error.message,
    });
  }
}
