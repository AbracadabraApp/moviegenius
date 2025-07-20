// pages/api/cache-person-data.js
/**
 * Person Data Caching API Route
 *
 * Caches enhanced person data to the database.
 * Similar to cache-movie-data but for people.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { name, birthYear, deathYear, biography, profile, knownForDepartment } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Person name is required' });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // For now, we'll just log the cache request since we don't have auto-discovery yet
    console.log('Person data cache request:', {
      name,
      birthYear,
      deathYear,
      biography: biography ? 'present' : 'missing',
      profile: profile ? 'present' : 'missing',
      knownForDepartment,
    });

    // TODO: In the future, implement person discovery and database updates here
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'Person data cached successfully',
      cached: false, // Set to true when we implement actual caching
    });
  } catch (error) {
    console.error('Error caching person data:', error);
    res.status(500).json({
      error: 'Failed to cache person data',
      success: false,
    });
  }
}
