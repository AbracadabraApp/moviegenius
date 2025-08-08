// pages/api/movie-list.js
/**
 * Movie List API - RAILWAY VERSION
 *
 * Retrieves a specific movie list with its movies and cached Claude description.
 * Uses Railway PostgreSQL exclusively.
 */

import { getPool } from '../../lib/railway-db.js';

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

  const client = await getPool().connect();
  try {
    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create new list
    const insertQuery = `
      INSERT INTO movie_lists (name, slug, description, content_type, claude_prompt, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      name,
      slug,
      description || null,
      content_type || 'declarative',
      claude_prompt || null,
      true,
      new Date().toISOString()
    ]);

    const newList = result.rows[0];

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
  } finally {
    client.release();
  }
}

async function handleGet(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'List slug is required' });
  }

  const client = await getPool().connect();
  try {
    // Get the list details
    const listQuery = 'SELECT * FROM movie_lists WHERE slug = $1 AND is_active = true';
    const listResult = await client.query(listQuery, [slug]);
    
    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: 'Movie list not found' });
    }
    
    const list = listResult.rows[0];

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
    
    const itemsResult = await client.query(itemsQuery, [list.id]);
    const movies = itemsResult.rows;

    // Get the appropriate analysis based on content type
    let analysisType = 'list_description';
    if (list.content_type === 'educational') {
      analysisType = 'educational_analysis';
    } else if (list.content_type === 'declarative') {
      analysisType = 'list_description_and_movies';
    }

    const analysisQuery = 'SELECT claude_response FROM list_analyses WHERE list_id = $1 AND analysis_type = $2';
    const analysisResult = await client.query(analysisQuery, [list.id, analysisType]);
    const cachedAnalysis = analysisResult.rows[0];

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
  } finally {
    client.release();
  }
}
