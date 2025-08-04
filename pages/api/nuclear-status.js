/**
 * Nuclear Status API - Monitor nuclear static generation progress
 *
 * Provides detailed status of:
 * - Which movies have been nuclear-processed
 * - Generation costs and timing
 * - Queue status and next candidates
 * - Success/failure rates
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  try {
    // Get comprehensive nuclear status
    const status = await getNuclearStatus();

    res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 minute cache
    res.status(200).json(status);
  } catch (error) {
    console.error('Nuclear status error:', error);
    res.status(500).json({
      error: 'Failed to get nuclear status',
      details: error.message,
    });
  }
}

async function getNuclearStatus() {
  // 1. Get top 1,000 nuclear candidates + test movies (same logic as getStaticProps)
  const { data: topMovies } = await supabase
    .from('movies')
    .select('id, title, year, tmdb_id, created_at, poster_url')
    .not('tmdb_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000);

  // 2. Add test movies (from development hardcoded list)
  const testNuclearMovies = [550, 603, 680, 238, 27205, 424, 11, 155, 13, 497];
  const { data: testMovies } = await supabase
    .from('movies')
    .select('id, title, year, tmdb_id, created_at, poster_url')
    .in('tmdb_id', testNuclearMovies);

  // 3. Combine and deduplicate
  const allNuclearIds = new Set([...(topMovies || []), ...(testMovies || [])].map(m => m.id));
  const nuclearCandidates = [...(topMovies || []), ...(testMovies || [])].filter(
    (movie, index, arr) => arr.findIndex(m => m.id === movie.id) === index
  );

  // 4. Get analysis status for nuclear candidates
  const nuclearIds = nuclearCandidates.map(m => m.id);
  const { data: analyses } = await supabase
    .from('movie_analyses')
    .select(
      `
      movie_id,
      claude_response,
      created_at,
      query_text
    `
    )
    .eq('analysis_type', 'page_analysis')
    .in('movie_id', nuclearIds);

  // 5. Create analysis lookup
  const analysisLookup = new Map();
  analyses?.forEach(analysis => {
    analysisLookup.set(analysis.movie_id, analysis);
  });

  // 6. Categorize nuclear movies
  const processedMovies = [];
  const pendingMovies = [];
  let totalCost = 0;
  let totalTokens = 0;

  nuclearCandidates.forEach((movie, index) => {
    const analysis = analysisLookup.get(movie.id);

    if (analysis) {
      const cost = analysis.claude_response?.cost_estimate || 0;
      const tokens =
        (analysis.claude_response?.input_tokens || 0) +
        (analysis.claude_response?.output_tokens || 0);

      totalCost += cost;
      totalTokens += tokens;

      processedMovies.push({
        rank: index + 1,
        id: movie.id,
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: movie.year,
        poster_url: movie.poster_url,
        analysis_created: analysis.created_at,
        cost: cost,
        tokens: tokens,
        is_batch: analysis.claude_response?.batch_generated || false,
        nuclear_status: 'completed',
      });
    } else {
      pendingMovies.push({
        rank: index + 1,
        id: movie.id,
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: movie.year,
        poster_url: movie.poster_url,
        nuclear_status: 'pending',
      });
    }
  });

  // 7. Get overall database stats
  const { count: totalMovies } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });

  const { count: totalAnalyses } = await supabase
    .from('movie_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_type', 'page_analysis');

  // 8. Recent activity (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentAnalyses } = await supabase
    .from('movie_analyses')
    .select('movie_id, created_at, claude_response')
    .eq('analysis_type', 'page_analysis')
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false });

  const recentCost =
    recentAnalyses?.reduce((sum, a) => sum + (a.claude_response?.cost_estimate || 0), 0) || 0;

  // 9. Compile status
  return {
    nuclear_overview: {
      total_nuclear_candidates: nuclearCandidates.length,
      completed: processedMovies.length,
      pending: pendingMovies.length,
      completion_percentage: ((processedMovies.length / nuclearCandidates.length) * 100).toFixed(1),
      total_cost: totalCost,
      total_tokens: totalTokens,
      average_cost_per_movie:
        processedMovies.length > 0 ? (totalCost / processedMovies.length).toFixed(4) : 0,
    },

    database_overview: {
      total_movies: totalMovies,
      total_with_analysis: totalAnalyses,
      analysis_coverage_percentage:
        totalMovies > 0 ? ((totalAnalyses / totalMovies) * 100).toFixed(1) : 0,
    },

    recent_activity: {
      analyses_last_24h: recentAnalyses?.length || 0,
      cost_last_24h: recentCost,
      latest_analysis: recentAnalyses?.[0]?.created_at || null,
    },

    processed_movies: processedMovies.slice(0, 50), // First 50 for API response size
    pending_movies: pendingMovies.slice(0, 50), // First 50 pending

    next_actions: generateNextActions(processedMovies.length, pendingMovies.length),

    metadata: {
      generated_at: new Date().toISOString(),
      nuclear_criteria: 'Top 1,000 movies by creation date (most recent)',
      api_version: '1.0',
    },
  };
}

function generateNextActions(completed, pending) {
  const actions = [];

  if (pending > 0) {
    actions.push({
      action: 'generate_batch',
      description: `Generate analysis for ${Math.min(pending, 100)} pending nuclear movies`,
      priority: 'high',
      estimated_cost: `$${(Math.min(pending, 100) * 0.015).toFixed(2)}`,
      command: 'npm run nuclear:batch -- --count 100',
    });
  }

  if (completed >= 1000) {
    actions.push({
      action: 'expand_nuclear',
      description: 'Expand nuclear set to 5,000 movies (Week 2)',
      priority: 'medium',
      estimated_cost: '$60.00',
      command: 'npm run nuclear:expand -- --target 5000',
    });
  }

  if (completed > 0) {
    actions.push({
      action: 'validate_performance',
      description: 'Test nuclear movie load times',
      priority: 'low',
      command: 'npm run nuclear:test',
    });
  }

  return actions;
}
