// pages/api/admin/add-has-analysis-column.js
/**
 * Admin API to add has_analysis column to movies table
 */

import { createClient, supabase } from '../../../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../../lib/railway-db.js';

const pool = getPool();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Adding has_analysis column to movies table...');
    
    // Step 1: Add the has_analysis column (using raw SQL)
    console.log('📝 Adding has_analysis column...');
    
    // For PostgreSQL, we need to use a different approach since rpc might not be available
    // Let's try to add the column by attempting to select it first
    const { error: testError } = await supabase
      .from('movies')
      .select('has_analysis')
      .limit(1);
    
    if (testError && testError.message.includes('column "has_analysis" does not exist')) {
      // Column doesn't exist, we need to add it
      // Since we can't run ALTER TABLE directly, let's return instructions
      return res.status(200).json({
        success: false,
        message: 'Column does not exist. Please run this SQL in Supabase dashboard:',
        sql: `
-- Step 1: Add the has_analysis column
ALTER TABLE movies ADD COLUMN has_analysis BOOLEAN DEFAULT FALSE;

-- Step 2: Update existing movies that have analyses  
UPDATE movies 
SET has_analysis = TRUE 
WHERE id IN (
  SELECT DISTINCT movie_id 
  FROM movie_analyses 
  WHERE analysis_type = 'page_analysis'
);
        `.trim()
      });
    }
    
    // Column exists, let's update the existing movies
    console.log('✅ Column exists, updating existing movies...');
    
    // Get movies that have analyses but aren't marked as such
    const { data: moviesWithAnalyses, error: queryError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');
    
    if (queryError) {
      throw queryError;
    }
    
    const movieIds = [...new Set(moviesWithAnalyses.map(a => a.movie_id))];
    
    if (movieIds.length > 0) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ has_analysis: true })
        .in('id', movieIds);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`✅ Updated ${movieIds.length} movies with has_analysis = true`);
    }
    
    // Get statistics
    const { data: allMovies, error: allError } = await supabase
      .from('movies')
      .select('has_analysis');
    
    if (allError) {
      throw allError;
    }
    
    const total = allMovies.length;
    const withAnalysis = allMovies.filter(m => m.has_analysis).length;
    const needingAnalysis = total - withAnalysis;
    
    // Get sample movies needing analysis
    const { data: samples, error: sampleError } = await supabase
      .from('movies')
      .select('tmdb_id, title, year, has_analysis')
      .eq('has_analysis', false)
      .order('tmdb_id')
      .limit(5);
    
    if (sampleError) {
      throw sampleError;
    }
    
    res.status(200).json({
      success: true,
      message: 'has_analysis column setup complete!',
      statistics: {
        totalMovies: total,
        moviesWithAnalysis: withAnalysis,
        moviesNeedingAnalysis: needingAnalysis
      },
      sampleCandidates: samples.map(m => ({
        tmdbId: m.tmdb_id,
        title: m.title,
        year: m.year
      }))
    });
    
  } catch (error) {
    console.error('💥 Error setting up has_analysis column:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}