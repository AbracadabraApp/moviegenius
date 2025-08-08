// pages/api/movie-list.js
/**
 * Movie List API - RAILWAY VERSION
 *
 * Retrieves a specific movie list with its movies and cached Claude description.
 * Uses Railway PostgreSQL exclusively.
 */

import { getPool } from './railway-db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: 'Only GET and POST methods allowed' });
  }
}

async function handlePost(req, res) {
  const { name, description, content_type, claude_prompt } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'List name is required' });
  }

  try {
    const pool = getPool();

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create new list
    const insertQuery = `
      INSERT INTO movie_lists (name, slug, description, content_type, claude_prompt, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [
      name,
      slug, 
      description || null,
      content_type || 'declarative',
      claude_prompt || null,
      true
    ]);
    const newList = result.rows[0];

    if (!newList) {
      return res.status(500).json({ error: 'Failed to create list' });
    }

    res.status(201).json({
      success: true,
      message: 'List created successfully',
      list: newList,
    });
  } catch (error) {
    console.error('Error creating list:', error);
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({ error: 'List with this name already exists' });
    }
    res.status(500).json({
      error: 'Failed to create list',
      details: error.message,
    });
  }
}

async function handleGet(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'List slug is required' });
  }

  try {
    const pool = getPool();

    // Get the list details
    const listQuery = 'SELECT * FROM movie_lists WHERE slug = $1 AND is_active = true LIMIT 1';
    const listResult = await pool.query(listQuery, [slug]);
    const list = listResult.rows.length > 0 ? listResult.rows[0] : null;
    const listError = !list;

    if (listError || !list) {
      return res.status(404).json({ error: 'Movie list not found' });
    }

    // Get movies in the list with their details
    const itemsQuery = `
      SELECT 
        mli.order_index,
        m.id, m.title, m.year, m.slug, m.poster_url, m.tmdb_id, m.streaming_data
      FROM movie_list_items mli
      JOIN movies m ON mli.movie_id = m.id
      WHERE mli.list_id = $1
      ORDER BY mli.order_index ASC
    `;
    const itemsResult = await pool.query(itemsQuery, [list.id]);
    const listItems = itemsResult.rows;
    const itemsError = false;

    if (itemsError) {
      console.error('Error fetching list items:', itemsError);
      return res.status(500).json({ error: 'Failed to fetch list movies' });
    }

    // Extract movies from the join result
    const movies = listItems?.map(item => ({
      id: item.id,
      title: item.title,
      year: item.year,
      slug: item.slug,
      poster_url: item.poster_url,
      tmdb_id: item.tmdb_id,
      streaming_data: item.streaming_data,
      order_index: item.order_index,
    })) || [];

    // Get the appropriate analysis based on content type
    let analysisType = 'list_description';
    if (list.content_type === 'educational') {
      analysisType = 'educational_analysis';
    } else if (list.content_type === 'declarative') {
      analysisType = 'list_description_and_movies';
    }

    const analysisQuery = 'SELECT claude_response FROM list_analyses WHERE list_id = $1 AND analysis_type = $2 LIMIT 1';
    const analysisResult = await pool.query(analysisQuery, [list.id, analysisType]);
    const cachedAnalysis = analysisResult.rows.length > 0 ? analysisResult.rows[0] : null;

    const response = {
      list: {
        id: list.id,
        name: list.name,
        slug: list.slug,
        description: list.description,
        claude_prompt: list.claude_prompt,
        content_type: list.content_type,
        created_at: list.created_at,
      },
      movies: movies,
      movieCount: movies.length,
      claudeDescription: cachedAnalysis?.claude_response?.raw_content || null,
      cached: !!cachedAnalysis,
    };

    // Cache movie lists for 6 hours - lists change infrequently
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200');
    res.status(200).json(response);
  } catch (error) {
    console.error('Movie list API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
