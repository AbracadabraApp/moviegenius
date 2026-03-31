// Investigation script for TMDB ID 2005
// Checking for data consistency issues

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigateTMDB2005() {
  const tmdbId = 2005;
  
  console.log(`🔍 INVESTIGATING TMDB ID ${tmdbId}`);
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Look up movie by TMDB ID
    console.log(`\n1. MOVIE LOOKUP BY TMDB_ID`);
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single();
    
    if (movieError) {
      console.log(`❌ Movie lookup failed: ${movieError.message} (code: ${movieError.code})`);
      if (movieError.code === 'PGRST116') {
        console.log(`   This means no movie with TMDB ID ${tmdbId} exists in the database.`);
      }
      return;
    }
    
    if (!movie) {
      console.log(`❌ No movie found with TMDB ID ${tmdbId}`);
      return;
    }
    
    console.log(`✅ MOVIE FOUND:`);
    console.log(`   Database ID: ${movie.id}`);
    console.log(`   Title: "${movie.title}"`);
    console.log(`   Official Title: "${movie.official_title}"`);
    console.log(`   Year: ${movie.year}`);
    console.log(`   TMDB ID: ${movie.tmdb_id}`);
    console.log(`   Slug: ${movie.slug}`);
    console.log(`   Release Date: ${movie.release_date}`);
    console.log(`   Created: ${movie.created_at}`);
    console.log(`   Updated: ${movie.updated_at}`);
    
    // Step 2: Look up analyses for this movie
    console.log(`\n2. ANALYSIS LOOKUP FOR MOVIE_ID ${movie.id}`);
    const { data: analyses, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('*')
      .eq('movie_id', movie.id)
      .order('created_at', { ascending: false });
    
    if (analysisError) {
      console.log(`❌ Analysis lookup failed: ${analysisError.message}`);
      return;
    }
    
    console.log(`✅ FOUND ${analyses?.length || 0} ANALYSES:`);
    
    if (analyses && analyses.length > 0) {
      analyses.forEach((analysis, index) => {
        console.log(`\n   ANALYSIS ${index + 1}:`);
        console.log(`   ID: ${analysis.id}`);
        console.log(`   Type: ${analysis.analysis_type}`);
        console.log(`   Created: ${analysis.created_at}`);
        console.log(`   Updated: ${analysis.updated_at}`);
        console.log(`   Slug: ${analysis.slug}`);
        
        // Check if analysis content matches the movie
        if (analysis.analysis_content) {
          const content = typeof analysis.analysis_content === 'string' 
            ? analysis.analysis_content 
            : JSON.stringify(analysis.analysis_content);
          
          console.log(`   Content length: ${content.length} characters`);
          
          // Look for the movie title in the analysis content
          const titleInContent = content.toLowerCase().includes(movie.title.toLowerCase());
          const officialTitleInContent = movie.official_title && 
            content.toLowerCase().includes(movie.official_title.toLowerCase());
          
          console.log(`   Contains movie title "${movie.title}": ${titleInContent ? '✅' : '❌'}`);
          if (movie.official_title && movie.official_title !== movie.title) {
            console.log(`   Contains official title "${movie.official_title}": ${officialTitleInContent ? '✅' : '❌'}`);
          }
          
          // Show first 200 characters of content for manual inspection
          console.log(`   Content preview:`);
          console.log(`   "${content.substring(0, 200)}..."`);
        } else {
          console.log(`   ❌ No analysis content found`);
        }
      });
    }
    
    // Step 3: Cross-reference with TMDB API to verify correct movie
    console.log(`\n3. TMDB API VERIFICATION`);
    try {
      const tmdbResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`
      );
      
      if (tmdbResponse.ok) {
        const tmdbData = await tmdbResponse.json();
        console.log(`✅ TMDB API DATA:`);
        console.log(`   Title: "${tmdbData.title}"`);
        console.log(`   Original Title: "${tmdbData.original_title}"`);
        console.log(`   Release Date: ${tmdbData.release_date}`);
        console.log(`   Year: ${tmdbData.release_date?.split('-')[0]}`);
        console.log(`   Overview: ${tmdbData.overview?.substring(0, 100)}...`);
        
        // Compare with database data
        console.log(`\n4. DATA CONSISTENCY CHECK:`);
        const titleMatch = movie.title === tmdbData.title || 
                          movie.official_title === tmdbData.title ||
                          movie.title === tmdbData.original_title ||
                          movie.official_title === tmdbData.original_title;
        
        const yearMatch = movie.year?.toString() === tmdbData.release_date?.split('-')[0];
        
        console.log(`   Title consistency: ${titleMatch ? '✅' : '❌'}`);
        console.log(`   Year consistency: ${yearMatch ? '✅' : '❌'}`);
        
        if (!titleMatch) {
          console.log(`   ⚠️  TITLE MISMATCH DETECTED:`);
          console.log(`      DB Title: "${movie.title}"`);
          console.log(`      DB Official: "${movie.official_title}"`);
          console.log(`      TMDB Title: "${tmdbData.title}"`);
          console.log(`      TMDB Original: "${tmdbData.original_title}"`);
        }
        
        if (!yearMatch) {
          console.log(`   ⚠️  YEAR MISMATCH DETECTED:`);
          console.log(`      DB Year: ${movie.year}`);
          console.log(`      TMDB Year: ${tmdbData.release_date?.split('-')[0]}`);
        }
        
      } else {
        console.log(`❌ TMDB API request failed: ${tmdbResponse.status} ${tmdbResponse.statusText}`);
      }
    } catch (tmdbError) {
      console.log(`❌ TMDB API error: ${tmdbError.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Investigation failed: ${error.message}`);
    console.log(error.stack);
  }
}

// Run the investigation
investigateTMDB2005().then(() => {
  console.log('\n🏁 Investigation complete');
  process.exit(0);
}).catch(error => {
  console.error('Investigation failed:', error);
  process.exit(1);
});