/**
 * Database Inspection API
 * 
 * Quick endpoint to see what's in production database
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get all movie lists
    const { data: lists, error: listsError } = await supabase
      .from('movie_lists')
      .select('id, name, slug, content_type, is_active, created_at')
      .order('created_at', { ascending: false });

    if (listsError) {
      throw new Error(`Lists query failed: ${listsError.message}`);
    }

    // Get movie count for each list
    const listsWithCounts = [];
    for (const list of lists || []) {
      const { data: items, error: itemsError } = await supabase
        .from('movie_list_items')
        .select('id')
        .eq('list_id', list.id);

      listsWithCounts.push({
        ...list,
        movieCount: items?.length || 0
      });
    }

    // Get total movies in database
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true });

    const totalMovies = movies?.length || 0;

    // Get sample movies
    const { data: sampleMovies, error: sampleError } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .limit(5);

    res.status(200).json({
      database_summary: {
        total_lists: lists?.length || 0,
        total_movies: totalMovies,
        active_lists: lists?.filter(l => l.is_active).length || 0
      },
      lists: listsWithCounts,
      sample_movies: sampleMovies || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database inspection error:', error);
    res.status(500).json({ 
      error: 'Failed to inspect database',
      details: error.message
    });
  }
}