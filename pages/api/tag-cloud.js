import { getPool } from '../../lib/railway-db.js';
import { createClient, supabase } from '../../lib/railway-adapter.js';


// pages/api/tag-cloud.js
/**
 * Unified Tag Cloud API
 *
 * Returns movie lists for tag clouds across the app.
 * Can filter by content_type or return all lists.
 * Replaces tag-cloud-lists.js, tag-cloud-declarative.js, and tag-cloud-educational.js
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  try {
    // TEMPORARILY DISABLED: const { createClient } = await import(@supabase/supabase-js);
    const pool = getPool();

    // Get optional content_type filter from query params
    const { content_type } = req.query;

    // Build query - start with base query
    let query = supabase
      .from('movie_lists')
      .select('id, name, slug, content_type')
      .eq('is_active', true);

    // Add content_type filter if specified
    if (content_type && ['declarative', 'educational'].includes(content_type)) {
      query = query.eq('content_type', content_type);
    }

    // Execute query with ordering
    const { data: lists, error } = await query.order('name');

    if (error) {
      console.error('Error fetching lists for tag cloud:', error);
      return res.status(500).json({
        error: 'Failed to fetch lists',
        details: error.message,
      });
    }

    // Cache tag cloud data for 1 hour - lists don't change often
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');

    // Return lists in format expected by tag cloud
    const response = {
      lists: lists || [],
      count: lists?.length || 0,
    };

    // Include content_type in response if filtered
    if (content_type) {
      response.contentType = content_type;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in tag-cloud API:', error);
    res.status(500).json({
      error: 'Failed to fetch tag cloud lists',
      details: error.message,
    });
  }
}
