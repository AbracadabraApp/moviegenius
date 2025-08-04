#!/usr/bin/env node

// Test Supabase connectivity to diagnose 500 errors in development
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function testSupabase() {
  console.log('=== SUPABASE CONNECTIVITY TEST ===');
  
  console.log('Step 1: Checking environment variables...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ SET' : '❌ MISSING'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? '✅ SET' : '❌ MISSING'}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    console.log('Expected in .env.local:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    return;
  }

  try {
    console.log('\nStep 2: Testing Supabase client creation...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created successfully');

    console.log('\nStep 3: Testing basic connectivity...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_tables');
    
    if (tablesError) {
      console.log('⚠️ Schema query failed, trying simpler test...');
      console.log('Schema error:', tablesError.message);
    } else {
      console.log('✅ Basic connectivity successful');
    }

    console.log('\nStep 4: Testing movies table existence...');
    const { data: movieCount, error: countError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Movies table query failed:', {
        code: countError.code,
        message: countError.message,
        details: countError.details,
        hint: countError.hint
      });
    } else {
      console.log(`✅ Movies table accessible, total count: ${movieCount}`);
    }

    console.log('\nStep 5: Testing movie ID 11 (Star Wars) specifically...');
    const { data: starWars, error: starWarsError } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', 11)
      .single();
    
    if (starWarsError) {
      console.error('❌ Star Wars query failed:', {
        code: starWarsError.code,
        message: starWarsError.message,
        details: starWarsError.details,
        hint: starWarsError.hint
      });
      
      // Try alternative queries to understand the data structure
      console.log('\nStep 5a: Checking tmdb_id as string...');
      const { data: starWarsString, error: stringError } = await supabase
        .from('movies')
        .select('*')
        .eq('tmdb_id', '11')
        .single();
      
      if (stringError) {
        console.error('❌ String tmdb_id query also failed:', stringError.message);
      } else {
        console.log('✅ Found Star Wars with string tmdb_id:', starWarsString?.title || 'No title');
      }
      
      console.log('\nStep 5b: Checking first few movies to understand structure...');
      const { data: sampleMovies, error: sampleError } = await supabase
        .from('movies')
        .select('tmdb_id, title, id')
        .limit(5);
      
      if (sampleError) {
        console.error('❌ Sample movies query failed:', sampleError.message);
      } else {
        console.log('✅ Sample movies:', sampleMovies);
      }
    } else {
      console.log('✅ Star Wars found:', {
        title: starWars?.title,
        tmdb_id: starWars?.tmdb_id,
        id: starWars?.id
      });
    }

    console.log('\nStep 6: Testing table schema...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'movies' });
    
    if (columnsError) {
      console.log('⚠️ Schema introspection failed, trying direct query...');
      
      const { data: firstMovie, error: firstError } = await supabase
        .from('movies')
        .select('*')
        .limit(1)
        .single();
      
      if (firstError) {
        console.error('❌ First movie query failed:', firstError.message);
      } else {
        console.log('✅ First movie structure:', Object.keys(firstMovie || {}));
      }
    } else {
      console.log('✅ Movies table columns:', columns);
    }

    console.log('\n=== SUPABASE TEST SUMMARY ===');
    console.log('Environment variables: ✅');
    console.log('Supabase client: ✅');
    console.log(`Movies table access: ${countError ? '❌' : '✅'}`);
    console.log(`Star Wars (ID 11) access: ${starWarsError ? '❌' : '✅'}`);
    
    if (starWarsError || countError) {
      console.log('\n🔍 DEBUGGING RECOMMENDATIONS:');
      console.log('1. Check if movies table exists in Supabase dashboard');
      console.log('2. Verify tmdb_id column data type (integer vs string)');
      console.log('3. Ensure service role key has proper permissions');
      console.log('4. Check if movie with tmdb_id=11 exists in the table');
    } else {
      console.log('\n✅ All tests passed - Supabase should work for movie pages');
    }

  } catch (error) {
    console.error('❌ Supabase test failed with exception:', {
      message: error.message,
      stack: error.stack
    });
    
    console.log('\n🔍 DEBUGGING RECOMMENDATIONS:');
    console.log('1. Check .env.local file exists and is properly formatted');
    console.log('2. Verify Supabase URL and service role key are correct');
    console.log('3. Ensure @supabase/supabase-js package is installed');
    console.log('4. Check network connectivity to Supabase');
  }
}

testSupabase();