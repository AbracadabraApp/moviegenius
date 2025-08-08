// pages/api/admin/check-analyses-state.js - Check movie_analyses table state

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

const pool = getPool();

export default async function handler(req, res) {
  try {
    // Get total count of analyses
    const { count: totalAnalyses, error: countError } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return res.status(500).json({ error: 'Failed to count analyses', details: countError });
    }

    // Get analyses by type
    const { data: byType, error: typeError } = await supabase
      .from('movie_analyses')
      .select('analysis_type')
      .eq('analysis_type', 'page_analysis');

    if (typeError) {
      return res.status(500).json({ error: 'Failed to get analysis types', details: typeError });
    }

    // Get recent analyses with movie info
    const { data: recentAnalyses, error: recentError } = await supabase
      .from('movie_analyses')
      .select(`
        id,
        movie_id,
        analysis_type,
        query_text,
        created_at,
        movies (
          tmdb_id,
          title,
          year
        )
      `)
      .eq('analysis_type', 'page_analysis')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      return res.status(500).json({ error: 'Failed to get recent analyses', details: recentError });
    }

    // Check for potential duplicates
    const { data: duplicateCheck, error: dupError } = await supabase
      .from('movie_analyses')
      .select(`
        movie_id,
        analysis_type,
        count(*) as count,
        movies (
          tmdb_id,
          title,
          year
        )
      `)
      .eq('analysis_type', 'page_analysis')
      .group('movie_id, analysis_type, movies.tmdb_id, movies.title, movies.year')
      .having('count(*)', 'gt', 1);

    const result = {
      totalAnalyses,
      pageAnalysesCount: byType?.length || 0,
      recentAnalyses: recentAnalyses?.map(a => ({
        movie_id: a.movie_id,
        tmdb_id: a.movies?.tmdb_id,
        title: a.movies?.title,
        year: a.movies?.year,
        query_text: a.query_text?.substring(0, 50) + '...',
        created_at: a.created_at
      })) || [],
      potentialDuplicates: duplicateCheck || []
    };

    console.log(`📊 Database state:`, {
      totalAnalyses,
      pageAnalyses: byType?.length,
      duplicates: duplicateCheck?.length || 0
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Database check failed:', error);
    return res.status(500).json({ error: 'Database check failed', details: error.message });
  }
}