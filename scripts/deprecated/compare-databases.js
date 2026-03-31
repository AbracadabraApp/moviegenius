// Compare Supabase (development) vs Railway databases
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function compareDatabases() {
  console.log('📊 Comparing Supabase (dev) vs Railway databases...\n');

  // Supabase connection
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Railway connection
  const railwayClient = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL
  });

  try {
    // Get Supabase data
    console.log('🔍 Querying Supabase (development)...');
    const { data: supabaseMovies, error: moviesError } = await supabase
      .from('movies')
      .select('title, year, tmdb_id')
      .order('title');

    const { data: supabaseAnalyses, error: analysesError } = await supabase
      .from('movie_analyses')
      .select('movie_id, analysis_type, query_text')
      .order('created_at');

    if (moviesError || analysesError) {
      console.error('❌ Supabase query error:', moviesError || analysesError);
    }

    // Get Railway data
    console.log('🔍 Querying Railway...');
    await railwayClient.connect();
    
    const railwayMoviesResult = await railwayClient.query(
      'SELECT title, year, tmdb_id FROM movies ORDER BY title'
    );
    
    const railwayAnalysesResult = await railwayClient.query(
      'SELECT movie_id, analysis_type, query_text FROM movie_analyses ORDER BY created_at'
    );

    // Compare results
    console.log('\n📺 MOVIES COMPARISON:');
    console.log(`Supabase: ${supabaseMovies?.length || 0} movies`);
    console.log(`Railway:  ${railwayMoviesResult.rows.length} movies`);

    if (supabaseMovies) {
      console.log('\nSupabase movies:');
      supabaseMovies.slice(0, 10).forEach(movie => {
        console.log(`  - ${movie.title} (${movie.year}) [TMDB: ${movie.tmdb_id}]`);
      });
    }

    console.log('\nRailway movies:');
    railwayMoviesResult.rows.forEach(movie => {
      console.log(`  - ${movie.title} (${movie.year}) [TMDB: ${movie.tmdb_id}]`);
    });

    console.log('\n🎬 ANALYSES COMPARISON:');
    console.log(`Supabase: ${supabaseAnalyses?.length || 0} analyses`);
    console.log(`Railway:  ${railwayAnalysesResult.rows.length} analyses`);

    if (supabaseAnalyses) {
      console.log('\nSupabase analyses:');
      supabaseAnalyses.slice(0, 5).forEach((analysis, i) => {
        console.log(`  ${i+1}. Type: ${analysis.analysis_type}, Query: ${analysis.query_text?.substring(0, 50)}...`);
      });
    }

    console.log('\nRailway analyses:');
    railwayAnalysesResult.rows.forEach((analysis, i) => {
      console.log(`  ${i+1}. Type: ${analysis.analysis_type}, Query: ${analysis.query_text?.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('❌ Database comparison failed:', error);
  } finally {
    await railwayClient.end();
  }
}

compareDatabases();