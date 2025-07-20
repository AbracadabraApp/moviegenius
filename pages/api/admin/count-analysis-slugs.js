// pages/api/admin/count-analysis-slugs.js - Count analyzed movies with/without slugs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Checking slug coverage for analyzed movies...');

    // Get all movie_ids from movie_analyses
    const { data: analysisData, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (analysisError) {
      console.error('❌ Error fetching analysis data:', analysisError);
      return res
        .status(500)
        .json({ error: 'Failed to fetch analysis data', details: analysisError });
    }

    // Get unique movie IDs (limited by Supabase but gives us a good sample)
    const uniqueMovieIds = [...new Set(analysisData.map(a => a.movie_id))];
    console.log(`📊 Found ${uniqueMovieIds.length} unique movies with analysis (sample)`);

    // Process in smaller batches to avoid URI length limits
    const batchSize = 50;
    let allMoviesData = [];

    for (let i = 0; i < uniqueMovieIds.length; i += batchSize) {
      const batch = uniqueMovieIds.slice(i, i + batchSize);
      const { data: batchData, error: batchError } = await supabase
        .from('movies')
        .select('id, slug, title, year')
        .in('id', batch);

      if (batchError) {
        console.error(`❌ Error fetching batch ${i}-${i + batchSize}:`, batchError);
        continue;
      }

      allMoviesData.push(...batchData);

      // Stop after first few batches to get a good sample without timing out
      if (i >= 200) break;
    }

    const moviesData = allMoviesData;

    if (moviesData.length === 0) {
      return res.status(500).json({ error: 'No movies data fetched' });
    }

    // Count movies with and without slugs
    const moviesWithSlugs = moviesData.filter(
      movie => movie.slug !== null && movie.slug !== ''
    ).length;
    const moviesWithoutSlugs = moviesData.filter(
      movie => movie.slug === null || movie.slug === ''
    ).length;

    // Get some examples
    const examplesWithSlugs = moviesData
      .filter(movie => movie.slug !== null && movie.slug !== '')
      .slice(0, 5)
      .map(movie => ({ title: movie.title, year: movie.year, slug: movie.slug }));

    const examplesWithoutSlugs = moviesData
      .filter(movie => movie.slug === null || movie.slug === '')
      .slice(0, 5)
      .map(movie => ({ title: movie.title, year: movie.year, id: movie.id }));

    const slugPercentage = Math.round((moviesWithSlugs / moviesData.length) * 100);

    // Estimate for full dataset based on sample
    const totalAnalysisRecords = 6885;
    const estimatedUniqueMovies = Math.round(totalAnalysisRecords / 6.88);
    const estimatedMoviesWithoutSlugs = Math.round(
      (moviesWithoutSlugs / moviesData.length) * estimatedUniqueMovies
    );

    const result = {
      sampleSize: moviesData.length,
      moviesWithSlugs,
      moviesWithoutSlugs,
      slugPercentage,
      estimatedTotals: {
        uniqueMoviesWithAnalysis: estimatedUniqueMovies,
        estimatedWithoutSlugs: estimatedMoviesWithoutSlugs,
        percentageWithoutSlugs: Math.round((moviesWithoutSlugs / moviesData.length) * 100),
      },
      examples: {
        withSlugs: examplesWithSlugs,
        withoutSlugs: examplesWithoutSlugs,
      },
      insights: {
        slugCoverage: slugPercentage > 70 ? 'High' : slugPercentage > 40 ? 'Medium' : 'Low',
        recommendation:
          slugPercentage < 50
            ? 'Many analyzed movies need Claude-generated slugs for SEO optimization'
            : 'Good slug coverage for analyzed content',
      },
    };

    console.log(`📊 Analysis-slug stats:`, result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Analysis-slug count failed:', error);
    return res.status(500).json({ error: 'Analysis-slug count failed', details: error.message });
  }
}
