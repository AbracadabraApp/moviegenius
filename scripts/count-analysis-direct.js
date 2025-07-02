#!/usr/bin/env node
/**
 * Direct Database Query for Analysis Count
 * Uses the Supabase client to count movies with analysis
 */

import { createClient } from '@supabase/supabase-js';

// Hardcode the credentials for direct access
const supabaseUrl = 'https://tjvaplqqibvlmazdvcwx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function countAnalysis() {
  console.log('🔍 Counting Movies with Analysis...\n');
  
  try {
    // Count total movies
    const { count: totalMovies, error: totalError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      console.error('❌ Error counting total movies:', totalError);
      return;
    }
    
    // Count movies with analysis (not null)
    const { count: moviesWithAnalysis, error: analysisError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('analysis', 'is', null);
    
    if (analysisError) {
      console.error('❌ Error counting movies with analysis:', analysisError);
      return;
    }
    
    // Count movies without analysis (null)
    const { count: moviesWithoutAnalysis, error: noAnalysisError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .is('analysis', null);
    
    if (noAnalysisError) {
      console.error('❌ Error counting movies without analysis:', noAnalysisError);
      return;
    }
    
    // Calculate percentages
    const analysisPercentage = ((moviesWithAnalysis / totalMovies) * 100).toFixed(1);
    const noAnalysisPercentage = ((moviesWithoutAnalysis / totalMovies) * 100).toFixed(1);
    
    console.log('📊 ANALYSIS COVERAGE REPORT');
    console.log('═══════════════════════════');
    console.log(`📽️  Total Movies: ${totalMovies.toLocaleString()}`);
    console.log(`✅ Movies with Analysis: ${moviesWithAnalysis.toLocaleString()} (${analysisPercentage}%)`);
    console.log(`❌ Movies without Analysis: ${moviesWithoutAnalysis.toLocaleString()} (${noAnalysisPercentage}%)`);
    console.log('');
    
    // Additional insights
    if (moviesWithAnalysis > 0) {
      console.log('💡 INSIGHTS:');
      console.log(`• ${moviesWithAnalysis.toLocaleString()} movies have Claude-generated analysis`);
      console.log(`• This represents your premium content library`);
      console.log(`• These are ideal candidates for trailer population`);
      console.log(`• High-value content for user engagement`);
      
      if (analysisPercentage > 50) {
        console.log('\n🎯 RECOMMENDATION: Excellent analysis coverage!');
        console.log('• Focus trailer efforts on analyzed movies first');
        console.log('• Consider static generation for these movies');
        console.log('• Your database has strong content foundation');
      } else {
        console.log('\n📈 RECOMMENDATION: Good analysis foundation');
        console.log('• Continue expanding analysis coverage');
        console.log('• Prioritize trailer population for analyzed content');
        console.log('• Consider batch analysis generation for popular movies');
      }
    }
    
  } catch (error) {
    console.error('💥 Database query failed:', error.message);
    console.error('Check your Supabase connection and credentials.');
  }
}

countAnalysis();