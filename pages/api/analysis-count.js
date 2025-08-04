/**
 * Simple Analysis Count API
 * 
 * Returns count of movie analyses in database
 */

export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Count total analyses
    const { count: totalAnalyses, error: totalError } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to count total analyses: ${totalError.message}`);
    }

    // Count by analysis type
    const { data: byType, error: typeError } = await supabase
      .from('movie_analyses')
      .select('analysis_type')
      .then(({ data, error }) => {
        if (error) throw error;
        const counts = {};
        data.forEach(row => {
          counts[row.analysis_type] = (counts[row.analysis_type] || 0) + 1;
        });
        return { data: counts, error: null };
      });

    if (typeError) {
      throw new Error(`Failed to count by type: ${typeError.message}`);
    }

    // Count total movies
    const { count: totalMovies, error: moviesError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    if (moviesError) {
      throw new Error(`Failed to count movies: ${moviesError.message}`);
    }

    const analysisPercentage = totalMovies > 0 ? ((totalAnalyses / totalMovies) * 100).toFixed(1) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalAnalyses,
        totalMovies,
        analysisPercentage: `${analysisPercentage}%`,
        byType: byType,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analysis count error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}