// Migrate essential movies and analyses from Supabase to Railway for testing
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { essentialMovies } from './data/essential-movies.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Railway connection
const getRailwayClient = () => {
  return new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL
  });
};

async function migrateEssentialMovies() {
  console.log('🚚 Migrating essential movies from Supabase to Railway...\n');

  // Get first 10 essential movies for testing (mix of themes)
  const testMovies = [
    ...essentialMovies['film-noir'].slice(0, 3),
    ...essentialMovies['horror-suspense']?.slice(0, 2) || [],
    ...essentialMovies['acclaimed-directors']?.slice(0, 2) || [],
    ...essentialMovies['comedy-through-time']?.slice(0, 2) || [],
    ...essentialMovies['world-cinema']?.slice(0, 1) || []
  ].filter(Boolean);

  console.log(`📋 Migrating ${testMovies.length} test movies...`);
  
  const results = { success: 0, failed: 0, analyses: 0 };

  for (const movieInfo of testMovies) {
    try {
      console.log(`\n🎬 Processing: ${movieInfo.title} (${movieInfo.year})`);
      
      // Get movie from Supabase
      const { data: supabaseMovie, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .eq('tmdb_id', movieInfo.tmdb_id)
        .single();

      if (!supabaseMovie) {
        console.log(`   ❌ Movie not found in Supabase`);
        results.failed++;
        continue;
      }

      // Insert into Railway
      const railwayClient = getRailwayClient();
      await railwayClient.connect();

      try {
        // Insert movie
        const movieQuery = `
          INSERT INTO movies (
            tmdb_id, title, year, official_title, release_date, slug, 
            poster_url, streaming_data, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            title = EXCLUDED.title,
            year = EXCLUDED.year,
            official_title = EXCLUDED.official_title,
            release_date = EXCLUDED.release_date,
            slug = EXCLUDED.slug,
            poster_url = EXCLUDED.poster_url,
            streaming_data = EXCLUDED.streaming_data,
            updated_at = NOW()
          RETURNING id;
        `;

        const movieValues = [
          supabaseMovie.tmdb_id,
          supabaseMovie.title,
          supabaseMovie.year,
          supabaseMovie.official_title,
          supabaseMovie.release_date,
          supabaseMovie.slug,
          supabaseMovie.poster_url,
          supabaseMovie.streaming_data,
          supabaseMovie.created_at || new Date(),
          new Date()
        ];

        const movieResult = await railwayClient.query(movieQuery, movieValues);
        const railwayMovieId = movieResult.rows[0].id;
        
        console.log(`   ✅ Movie migrated with ID: ${railwayMovieId}`);

        // Get analyses from Supabase
        const { data: supabaseAnalyses, error: analysisError } = await supabase
          .from('movie_analyses')
          .select('*')
          .eq('movie_id', supabaseMovie.id)
          .order('created_at', { ascending: false })
          .limit(2); // Get up to 2 most recent analyses

        if (supabaseAnalyses && supabaseAnalyses.length > 0) {
          console.log(`   📝 Found ${supabaseAnalyses.length} analyses to migrate`);

          for (const analysis of supabaseAnalyses) {
            const analysisQuery = `
              INSERT INTO movie_analyses (
                movie_id, query_text, claude_response, analysis_type, 
                people_extracted, has_links, link_count, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id;
            `;

            const analysisValues = [
              railwayMovieId,
              analysis.query_text,
              analysis.claude_response,
              analysis.analysis_type || 'general',
              analysis.people_extracted || false,
              analysis.has_links || false,
              analysis.link_count || 0,
              analysis.created_at || new Date()
            ];

            await railwayClient.query(analysisQuery, analysisValues);
            results.analyses++;
          }
          
          console.log(`   ✅ ${supabaseAnalyses.length} analyses migrated`);
        } else {
          console.log(`   ⚠️  No analyses found for this movie`);
        }

        results.success++;

      } finally {
        await railwayClient.end();
      }

    } catch (error) {
      console.error(`   ❌ Failed to migrate ${movieInfo.title}:`, error.message);
      results.failed++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Movies migrated: ${results.success}`);
  console.log(`   ❌ Movies failed: ${results.failed}`);
  console.log(`   📝 Analyses migrated: ${results.analyses}`);
  console.log(`\n🎉 Migration complete!`);
}

migrateEssentialMovies();