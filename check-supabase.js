// Check Supabase database contents
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSupabase() {
  try {
    console.log('Checking Supabase movie count...');
    const { count, error } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase error:', error.message);
      return;
    }
    
    console.log('Total movies in Supabase:', count);
    
    // Check analyses
    const { count: analysisCount, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true });
      
    if (!analysisError) {
      console.log('Total analyses in Supabase:', analysisCount);
    } else {
      console.error('Analysis count error:', analysisError.message);
    }
    
    // Check if we can access the data
    const { data: sampleMovies, error: sampleError } = await supabase
      .from('movies')
      .select('tmdb_id, title, year')
      .limit(5);
      
    if (!sampleError && sampleMovies) {
      console.log('\nSample movies:');
      sampleMovies.forEach(movie => {
        console.log(`  TMDB ${movie.tmdb_id}: ${movie.title} (${movie.year})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSupabase();