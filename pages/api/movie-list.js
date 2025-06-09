// pages/api/movie-list.js
/**
 * Movie List API
 * 
 * Retrieves a specific movie list with its movies and cached Claude description.
 * Supports the new list-based content system.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'List slug is required' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get the list details
    const { data: list, error: listError } = await supabase
      .from('movie_lists')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (listError || !list) {
      return res.status(404).json({ error: 'Movie list not found' });
    }

    // Get movies in the list with their details
    const { data: listItems, error: itemsError } = await supabase
      .from('movie_list_items')
      .select(`
        order_index,
        movies (
          id,
          title,
          year,
          slug,
          poster_url,
          tmdb_id,
          streaming_data
        )
      `)
      .eq('list_id', list.id)
      .order('order_index', { ascending: true });

    if (itemsError) {
      console.error('Error fetching list items:', itemsError);
      return res.status(500).json({ error: 'Failed to fetch list movies' });
    }

    // Extract movies from the join result
    const movies = listItems?.map(item => ({
      ...item.movies,
      order_index: item.order_index
    })) || [];

    // Get the appropriate analysis based on content type
    let analysisType = 'list_description';
    if (list.content_type === 'educational') {
      analysisType = 'educational_analysis';
    } else if (list.content_type === 'declarative') {
      analysisType = 'list_description_and_movies';
    }
    
    const { data: cachedAnalysis } = await supabase
      .from('list_analyses')
      .select('claude_response')
      .eq('list_id', list.id)
      .eq('analysis_type', analysisType)
      .single();

    const response = {
      list: {
        id: list.id,
        name: list.name,
        slug: list.slug,
        description: list.description,
        claude_prompt: list.claude_prompt,
        content_type: list.content_type,
        created_at: list.created_at
      },
      movies: movies,
      movieCount: movies.length,
      claudeDescription: cachedAnalysis?.claude_response?.raw_content || null,
      cached: !!cachedAnalysis
    };

    // Cache movie lists for 6 hours - lists change infrequently
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200');
    res.status(200).json(response);

  } catch (error) {
    console.error('Movie list API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}