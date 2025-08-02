#!/usr/bin/env node
// Quick database state checker

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseState() {
  try {
    console.log('🔍 Checking movie_analyses table state...\n');

    // Total count
    const { count, error: countError } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Count error:', countError);
      return;
    }

    console.log(`📊 Total movie_analyses records: ${count}`);

    // Page analysis count
    const { data: pageAnalyses, error: pageError } = await supabase
      .from('movie_analyses')
      .select('id')
      .eq('analysis_type', 'page_analysis');

    if (!pageError) {
      console.log(`📄 Page analysis records: ${pageAnalyses?.length || 0}`);
    }

    // Recent analyses
    const { data: recent, error: recentError } = await supabase
      .from('movie_analyses')
      .select('movie_id, created_at')
      .eq('analysis_type', 'page_analysis')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentError && recent) {
      console.log('\n⏰ Most recent 5 analyses:');
      recent.forEach((r, i) => {
        console.log(`   ${i + 1}. Movie ID: ${r.movie_id} | ${new Date(r.created_at).toLocaleString()}`);
      });
    }

    // Check for duplicates
    const { data: allMovieIds } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (allMovieIds) {
      const movieIdCounts = {};
      allMovieIds.forEach(a => {
        movieIdCounts[a.movie_id] = (movieIdCounts[a.movie_id] || 0) + 1;
      });

      const duplicates = Object.entries(movieIdCounts).filter(([id, count]) => count > 1);
      console.log(`\n🔄 Duplicate analyses found: ${duplicates.length}`);
      
      if (duplicates.length > 0) {
        console.log('   First few duplicates:');
        duplicates.slice(0, 5).forEach(([movieId, count]) => {
          console.log(`   - Movie ID ${movieId}: ${count} analyses`);
        });
      }
    }

    console.log('\n✅ Database state check complete');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabaseState();