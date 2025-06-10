const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMovie() {
  console.log('🔍 Checking database for "A Fantastic Woman" (2017)...\n');
  
  // Check if movie exists
  const { data: movie, error: movieError } = await supabase
    .from('movies')
    .select('*')
    .eq('title', 'A Fantastic Woman')
    .eq('year', 2017)
    .single();
    
  if (movieError || !movie) {
    console.log('❌ Movie not found in database');
    console.log('Error:', movieError?.message || 'No record found');
    
    // Let's try a broader search
    const { data: similarMovies } = await supabase
      .from('movies')
      .select('title, year, tmdb_id')
      .ilike('title', '%Fantastic%')
      .limit(5);
    
    console.log('\n🔍 Similar titles found:');
    similarMovies?.forEach(m => console.log(`- ${m.title} (${m.year}) - TMDB: ${m.tmdb_id}`));
    return;
  }
  
  console.log('✅ Movie found in database:');
  console.log(`- ID: ${movie.id}`);
  console.log(`- Title: ${movie.title}`);
  console.log(`- Year: ${movie.year}`);
  console.log(`- TMDB ID: ${movie.tmdb_id || 'None'}`);
  console.log(`- Poster: ${movie.poster_url || 'None'}`);
  console.log(`- Slug: ${movie.slug || 'None'}`);
  console.log(`- Created: ${movie.created_at}`);
  
  // Check for existing analysis
  const { data: analysis, error: analysisError } = await supabase
    .from('movie_analyses')
    .select('*')
    .eq('movie_id', movie.id)
    .eq('analysis_type', 'page_analysis')
    .single();
    
  if (analysis) {
    console.log('\n✅ Cached analysis found:');
    console.log(`- Created: ${analysis.created_at}`);
    console.log(`- Cost: $${analysis.claude_response?.cost_estimate || 'Unknown'}`);
    console.log(`- Tokens: ${analysis.claude_response?.input_tokens}+${analysis.claude_response?.output_tokens}`);
    console.log(`- Model: ${analysis.claude_response?.model || 'Unknown'}`);
    console.log(`- Content length: ${analysis.claude_response?.raw_content?.length || 0} chars`);
    
    if (analysis.claude_response?.entity_data) {
      const entities = analysis.claude_response.entity_data.entities;
      console.log(`- Entities detected: ${entities?.movies?.length || 0} movies, ${entities?.people?.length || 0} people`);
    }
    
    // Show first 200 chars of analysis content
    if (analysis.claude_response?.raw_content) {
      console.log('\n📄 Analysis preview:');
      console.log(analysis.claude_response.raw_content.substring(0, 200) + '...');
    }
  } else {
    console.log('\n❌ No cached analysis found');
    console.log('Analysis error:', analysisError?.message || 'No record found');
  }
}

checkMovie().catch(console.error);