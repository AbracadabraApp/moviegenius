#!/usr/bin/env node

/**
 * Check specific TMDB IDs for slug data
 * 
 * This script queries the database for specific TMDB IDs to check
 * if they have slug data in the database.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TMDB_IDS_TO_CHECK = [996, 678, 22112, 17218];

async function checkTMDBSlugs() {
  try {
    console.log('🔍 Checking specific TMDB IDs for slug data...\n');
    
    for (const tmdbId of TMDB_IDS_TO_CHECK) {
      console.log(`=== TMDB ID: ${tmdbId} ===`);
      
      const { data: movie, error } = await supabase
        .from('movies')
        .select('id, title, official_title, year, slug, poster_url, tmdb_id, created_at')
        .eq('tmdb_id', tmdbId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        console.log('❌ Movie not found in database');
      } else if (error) {
        console.log(`❌ Error querying TMDB ID ${tmdbId}:`, error.message);
      } else if (movie) {
        console.log(`✅ Movie found in database:`);
        console.log(`   Title: ${movie.title || 'N/A'}`);
        console.log(`   Official Title: ${movie.official_title || 'N/A'}`);
        console.log(`   Year: ${movie.year || 'N/A'}`);
        console.log(`   Slug: "${movie.slug || ''}"`);
        console.log(`   Slug Status: ${movie.slug ? (movie.slug.trim() === '' ? 'EMPTY STRING' : 'HAS VALUE') : 'NULL'}`);
        console.log(`   Created: ${movie.created_at || 'N/A'}`);
        console.log(`   Poster URL: ${movie.poster_url ? 'Present' : 'Missing'}`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  }
}

// Run the check
checkTMDBSlugs();