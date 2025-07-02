// pages/api/admin/check-trailer-storage.js - Verify trailer storage is working

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Checking trailer storage...');
    
    // Get movies that should have cached trailers (recently accessed)
    const testMovies = [550, 278, 13]; // Fight Club, Shawshank, Forrest Gump
    
    const results = [];
    
    for (const tmdbId of testMovies) {
      // Check database directly
      const { data: movie, error } = await supabase
        .from('movies')
        .select('tmdb_id, title, trailer_url')
        .eq('tmdb_id', tmdbId)
        .single();
        
      if (error) {
        console.error(`Error fetching movie ${tmdbId}:`, error);
        continue;
      }
      
      results.push({
        tmdbId,
        title: movie?.title,
        trailer_url: movie?.trailer_url,
        hasTrailerInDB: !!movie?.trailer_url
      });
    }
    
    // Count total movies with trailers in DB
    const { count: moviesWithTrailers, error: countError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('trailer_url', 'is', null)
      .neq('trailer_url', '');
      
    const result = {
      testResults: results,
      totalMoviesWithTrailers: moviesWithTrailers || 0,
      countError: countError?.message || null,
      summary: {
        databaseStorageWorking: results.some(r => r.hasTrailerInDB),
        recommendedAction: results.every(r => !r.hasTrailerInDB) ? 
          'Database storage not working - check API code' : 
          'Some trailers cached successfully'
      }
    };
    
    console.log('📊 Trailer storage check:', result);
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Storage check failed:', error);
    return res.status(500).json({ error: 'Storage check failed', details: error.message });
  }
}