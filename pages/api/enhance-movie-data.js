// pages/api/enhance-movie-data.js
// 🔒 DEPRECATED API - LOCKED AGAINST TMDB SUMMARY CONTAMINATION 🔒
//
// ⚠️  CRITICAL: This API is LOCKED and should NOT be used
// ⚠️  MediaCard uses /api/generate-organic-slug for taglines ONLY
// ⚠️  NO slug enhancement, NO summary generation allowed
//
// @version LOCKED-2025-07-02 - DO NOT MODIFY

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

const pool = getPool();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, year, needsSlug, needsPoster } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Title and year are required' });
  }

  console.warn('🔒 enhance-movie-data API called - this should be avoided for slug enhancement');
  console.warn('   MediaCard should rely on existing slug data only');

  try {
    // 🔒 PROTECTION: Only return existing database slugs, NO generation
    if (needsSlug) {
      const { data: existingMovie, error: dbError } = await supabase
        .from('movies')
        .select('slug')
        .eq('title', title)
        .eq('year', year)
        .single();

      if (!dbError && existingMovie?.slug) {
        // Return existing slug only
        return res.status(200).json({
          slug: existingMovie.slug,
          title: title,
          year: year,
          source: 'existing_database_slug',
        });
      }

      // 🔒 NO SLUG GENERATION - prevents TMDB summaries
      console.warn(
        `🔒 No existing slug for "${title}" (${year}) - refusing to generate to prevent TMDB contamination`
      );
    }

    // Return empty response for missing data
    return res.status(200).json({
      slug: null,
      title: title,
      year: year,
      source: 'protected_no_generation',
    });
  } catch (error) {
    console.error('Error in protected enhance-movie-data API:', error);
    return res.status(500).json({
      error: 'Enhanced data not available',
      details: 'Protected API - no enhancement performed',
    });
  }
}
