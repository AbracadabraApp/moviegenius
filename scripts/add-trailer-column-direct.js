/**
 * Add Trailer Column Direct
 * 
 * Uses Supabase client to execute SQL directly
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

async function addTrailerColumn() {
  console.log('🔧 Adding trailer_url column to movies table...');
  
  try {
    // First check if column already exists
    const { data: testData, error: testError } = await supabase
      .from('movies')
      .select('trailer_url')
      .limit(1);
      
    if (!testError) {
      console.log('✅ trailer_url column already exists!');
      
      // Count how many movies have trailers
      const { data: moviesWithTrailers } = await supabase
        .from('movies')
        .select('trailer_url')
        .not('trailer_url', 'is', null)
        .neq('trailer_url', '');
        
      console.log(`📊 ${moviesWithTrailers?.length || 0} movies already have cached trailers`);
      return;
    }
    
    if (testError.message.includes('does not exist')) {
      console.log('📝 Column does not exist, attempting to add...');
      
      // Try using SQL via RPC (if available)
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE movies ADD COLUMN trailer_url TEXT;'
      });
      
      if (error) {
        console.log('❌ RPC method failed:', error.message);
        console.log('\n🔧 Manual SQL needed:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Please run this SQL in Supabase dashboard:');
        console.log('');
        console.log('ALTER TABLE movies ADD COLUMN trailer_url TEXT;');
        console.log('');
        console.log('Then restart the trailer populator script.');
        return;
      }
      
      console.log('✅ Successfully added trailer_url column via RPC!');
      
    } else {
      console.error('❌ Unexpected error:', testError);
    }
    
  } catch (error) {
    console.error('❌ Failed to add trailer column:', error.message);
    console.log('\n🔧 Manual approach required:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Execute: ALTER TABLE movies ADD COLUMN trailer_url TEXT;');
    console.log('4. Restart the trailer populator script');
  }
}

addTrailerColumn();