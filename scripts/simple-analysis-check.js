#!/usr/bin/env node
/**
 * Simple Analysis Coverage Check
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

async function quickCheck() {
  console.log('📊 Quick Analysis Coverage Check\n');

  // Total movies
  const { count: totalMovies } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });

  // Count distinct movies with analysis
  const { count: totalAnalyses } = await supabase
    .from('movie_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_type', 'page_analysis');

  // Movies with slugs
  const { count: withSlugs } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .not('slug', 'is', null)
    .neq('slug', '');

  // Movies without slugs
  const { count: withoutSlugs } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .or('slug.is.null,slug.eq.');

  console.log(`📈 Database Overview:`);
  console.log(`  • Total movies: ${totalMovies}`);
  console.log(`  • Total analyses entries: ${totalAnalyses}`);
  console.log(`  • Movies with slugs: ${withSlugs} (${((withSlugs/totalMovies)*100).toFixed(1)}%)`);
  console.log(`  • Movies without slugs: ${withoutSlugs} (${((withoutSlugs/totalMovies)*100).toFixed(1)}%)`);

  console.log(`\n🔍 User's Observation Check:`);
  console.log(`  • Your observation: ~7k with analysis, ~10k without`);
  console.log(`  • Actual total analyses: ${totalAnalyses} entries`);
  console.log(`  • Note: Multiple analysis entries can exist per movie`);

  // Get sample of recent analyses to understand pattern
  const { data: recentAnalyses } = await supabase
    .from('movie_analyses')
    .select('movie_id, created_at')
    .eq('analysis_type', 'page_analysis')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`\n📋 Recent Analysis Pattern:`);
  recentAnalyses?.forEach((analysis, index) => {
    console.log(`  ${index + 1}. Movie ID: ${analysis.movie_id} - ${analysis.created_at}`);
  });
}

quickCheck().catch(console.error);