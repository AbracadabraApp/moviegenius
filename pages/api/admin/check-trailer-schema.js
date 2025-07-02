// pages/api/admin/check-trailer-schema.js - Check trailer column existence

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Checking trailer column...');
    
    // Try to select trailer_url column specifically
    const { data: trailerTest, error: trailerError } = await supabase
      .from('movies')
      .select('id, tmdb_id, trailer_url')
      .limit(5);
      
    if (trailerError) {
      console.log('❌ Trailer column error:', trailerError.message);
      
      // Check if it's a missing column error
      if (trailerError.message.includes('does not exist')) {
        return res.status(200).json({
          trailerColumnExists: false,
          error: 'trailer_url column does not exist',
          recommendation: 'Run: ALTER TABLE movies ADD COLUMN trailer_url TEXT;'
        });
      }
      
      return res.status(500).json({ error: 'Database error', details: trailerError });
    }
    
    // Count movies with trailers
    const moviesWithTrailers = trailerTest.filter(movie => 
      movie.trailer_url && movie.trailer_url !== ''
    ).length;
    
    // Get full schema for reference
    const { data: sampleMovie } = await supabase
      .from('movies')
      .select('*')
      .limit(1);
      
    const allColumns = Object.keys(sampleMovie?.[0] || {});
    
    const result = {
      trailerColumnExists: true,
      sampleData: trailerTest,
      moviesWithTrailers,
      totalSample: trailerTest.length,
      allColumns,
      trailerStorageInfo: {
        columnName: 'trailer_url',
        dataType: 'TEXT',
        stores: 'YouTube video ID (e.g., "dfeUzm6KF4g")',
        location: 'movies table'
      }
    };
    
    console.log('📊 Trailer schema check:', result);
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    return res.status(500).json({ error: 'Schema check failed', details: error.message });
  }
}