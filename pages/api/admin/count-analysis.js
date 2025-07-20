// pages/api/admin/count-analysis.js - Count movies with analysis

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Starting analysis count...');

    // Count ALL movies first
    const { count: totalMovies, error: totalError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    console.log('Total movies result:', { totalMovies, totalError });

    if (totalError) {
      console.error('❌ Error counting total movies:', totalError);
      return res.status(500).json({ error: 'Failed to count total movies', details: totalError });
    }

    // First, let's see what columns exist
    const { data: sampleMovie, error: sampleError } = await supabase
      .from('movies')
      .select('*')
      .limit(1);

    console.log('Sample movie columns:', Object.keys(sampleMovie?.[0] || {}));

    // Count movies with analysis (check different possible column names)
    let analysisData = [];
    let analysisError = null;

    // Try different potential column names
    const possibleColumns = ['analysis', 'claude_analysis', 'description', 'summary'];

    for (const column of possibleColumns) {
      try {
        const { data, error } = await supabase
          .from('movies')
          .select(`id, ${column}`)
          .not(column, 'is', null)
          .limit(10);

        if (!error && data?.length > 0) {
          console.log(`Found data in column: ${column}, count: ${data.length}`);
          analysisData = data;
          break;
        }
      } catch (e) {
        console.log(`Column ${column} doesn't exist or error:`, e.message);
      }
    }

    console.log('Analysis data result:', { count: analysisData?.length, analysisError });

    if (analysisError) {
      console.error('❌ Error fetching analysis data:', analysisError);
      return res
        .status(500)
        .json({ error: 'Failed to fetch analysis data', details: analysisError });
    }

    const moviesWithAnalysis = analysisData?.length || 0;
    const moviesWithoutAnalysis = totalMovies - moviesWithAnalysis;

    const result = {
      totalMovies,
      moviesWithAnalysis,
      moviesWithoutAnalysis,
      percentage: Math.round((moviesWithAnalysis / totalMovies) * 100),
      note: 'Sample of first 1000 movies with analysis',
    };

    console.log(`📊 Analysis stats:`, result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Analysis count failed:', error);
    return res.status(500).json({ error: 'Analysis count failed', details: error.message });
  }
}
