/**
 * Upload Movies to List API
 * 
 * Endpoint to populate a specific list with movies from local data
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { listId, movies, dryRun = false } = req.body;

  if (!listId || !movies || !Array.isArray(movies)) {
    return res.status(400).json({ 
      error: 'List ID and movies array are required',
      received: { listId: !!listId, movies: Array.isArray(movies) }
    });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify list exists
    const { data: list, error: listError } = await supabase
      .from('movie_lists')
      .select('id, name')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      return res.status(404).json({ error: 'List not found' });
    }

    let processedMovies = [];
    let addedMovies = [];
    let existingMovies = [];
    let errors = [];

    for (let i = 0; i < movies.length; i++) {
      const movieData = movies[i];
      
      try {
        // First, ensure movie exists in movies table
        let movieRecord = null;
        
        if (movieData.tmdb_id) {
          // Try to find by TMDB ID first
          const { data: existingMovie } = await supabase
            .from('movies')
            .select('id, title, year')
            .eq('tmdb_id', movieData.tmdb_id)
            .single();
          
          movieRecord = existingMovie;
        }
        
        if (!movieRecord) {
          // Create new movie record if it doesn't exist
          if (!dryRun) {
            const { data: newMovie, error: movieError } = await supabase
              .from('movies')
              .insert({
                title: movieData.title,
                year: movieData.year,
                tmdb_id: movieData.tmdb_id,
                poster_url: movieData.poster_url,
                slug: movieData.slug,
                streaming_data: movieData.streaming_data,
                created_at: new Date().toISOString()
              })
              .select('id, title, year')
              .single();
            
            if (movieError) {
              errors.push({ movie: movieData.title, error: movieError.message });
              continue;
            }
            
            movieRecord = newMovie;
          } else {
            // Dry run - just simulate
            movieRecord = { id: `new-${i}`, title: movieData.title, year: movieData.year };
          }
        }
        
        // Check if movie is already in this list
        const { data: existingListItem } = await supabase
          .from('movie_list_items')
          .select('id')
          .eq('list_id', listId)
          .eq('movie_id', movieRecord.id)
          .single();
        
        if (existingListItem) {
          existingMovies.push({
            title: movieRecord.title,
            year: movieRecord.year,
            movieId: movieRecord.id
          });
        } else {
          // Add to list
          if (!dryRun) {
            const { error: listItemError } = await supabase
              .from('movie_list_items')
              .insert({
                list_id: listId,
                movie_id: movieRecord.id,
                order_index: i + 1,
                created_at: new Date().toISOString()
              });
            
            if (listItemError) {
              errors.push({ movie: movieData.title, error: listItemError.message });
              continue;
            }
          }
          
          addedMovies.push({
            title: movieRecord.title,
            year: movieRecord.year,
            movieId: movieRecord.id,
            orderIndex: i + 1
          });
        }
        
        processedMovies.push({
          title: movieRecord.title,
          year: movieRecord.year,
          status: existingListItem ? 'existing' : 'added'
        });
        
      } catch (error) {
        errors.push({ movie: movieData.title || 'Unknown', error: error.message });
      }
    }

    const summary = {
      listId,
      listName: list.name,
      totalMovies: movies.length,
      processed: processedMovies.length,
      added: addedMovies.length,
      existing: existingMovies.length,
      errors: errors.length,
      dryRun
    };

    res.status(200).json({
      success: true,
      summary,
      addedMovies: dryRun ? addedMovies.slice(0, 5) : addedMovies,
      existingMovies: existingMovies.slice(0, 5),
      errors: errors.slice(0, 5),
      message: dryRun ? 'Dry run completed - no changes made' : 'Movies uploaded successfully'
    });

  } catch (error) {
    console.error('Upload movies API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}