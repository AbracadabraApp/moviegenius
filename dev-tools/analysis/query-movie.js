#!/usr/bin/env node
/**
 * Simple script to query a movie record by TMDB ID
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function queryMovie(tmdbId) {
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Get TMDB ID from command line argument
const tmdbId = process.argv[2];
if (!tmdbId) {
  console.error('Usage: node query-movie.js <tmdb_id>');
  process.exit(1);
}

queryMovie(parseInt(tmdbId));