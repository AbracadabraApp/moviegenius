const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMovieByTmdbId(tmdbId) {
  console.log(`🔍 Checking database for TMDB ID: ${tmdbId}\n`);
  
  // Check if movie exists by TMDB ID
  const { data: movie, error: movieError } = await supabase
    .from('movies')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .single();
    
  if (movieError || !movie) {
    console.log('❌ Movie not found in database');
    console.log('Error:', movieError?.message || 'No record found');
    return;
  }
  
  console.log('✅ Movie found in database:');
  console.log(`- ID: ${movie.id}`);
  console.log(`- Title: ${movie.title}`);
  console.log(`- Year: ${movie.year}`);
  console.log(`- TMDB ID: ${movie.tmdb_id}`);
  console.log(`- Official Title: ${movie.official_title || 'None'}`);
  console.log(`- Poster: ${movie.poster_url ? 'Yes' : 'None'}`);
  console.log(`- Slug: ${movie.slug || 'None'}`);
  console.log(`- Created: ${movie.created_at}`);
  console.log(`- Updated: ${movie.updated_at || 'None'}`);
  
  // Check for existing analysis
  const { data: analysis, error: analysisError } = await supabase
    .from('movie_analyses')
    .select('*')
    .eq('movie_id', movie.id)
    .eq('analysis_type', 'page_analysis')
    .single();
    
  if (analysis) {
    console.log('\n✅ Cached analysis found:');
    console.log(`- Analysis ID: ${analysis.id}`);
    console.log(`- Created: ${analysis.created_at}`);
    console.log(`- Query: ${analysis.query_text}`);
    
    if (analysis.claude_response) {
      const response = analysis.claude_response;
      console.log(`- Cost: $${response.cost_estimate || 'Unknown'}`);
      console.log(`- Input tokens: ${response.input_tokens || 'Unknown'}`);
      console.log(`- Output tokens: ${response.output_tokens || 'Unknown'}`);
      console.log(`- Model: ${response.model || 'Unknown'}`);
      console.log(`- Content length: ${response.raw_content?.length || 0} characters`);
      
      if (response.entity_data?.entities) {
        const entities = response.entity_data.entities;
        console.log(`- Movies detected: ${entities.movies?.length || 0}`);
        console.log(`- People detected: ${entities.people?.length || 0}`);
      }
      
      // Analyze the prompt format
      if (response.raw_content) {
        const content = response.raw_content;
        console.log('\n📋 Prompt Format Analysis:');
        console.log(`- Contains PARAGRAPH: ${content.includes('PARAGRAPH:') ? '✅' : '❌'}`);
        console.log(`- Contains MOVIES: ${content.includes('MOVIES:') ? '✅' : '❌'}`);
        console.log(`- Contains EXPLORE_FURTHER: ${content.includes('EXPLORE_FURTHER:') ? '✅' : '❌'}`);
        console.log(`- Contains MORE_IDEAS: ${content.includes('MORE_IDEAS:') ? '✅' : '❌'}`);
        
        // Count sections
        const paragraphs = (content.match(/PARAGRAPH:/g) || []).length;
        const movies = (content.match(/MOVIES:/g) || []).length;
        const explores = (content.match(/EXPLORE_FURTHER:/g) || []).length;
        const moreIdeas = (content.match(/MORE_IDEAS:/g) || []).length;
        
        console.log(`- PARAGRAPH sections: ${paragraphs}`);
        console.log(`- MOVIES entries: ${movies}`);
        console.log(`- EXPLORE_FURTHER topics: ${explores}`);
        console.log(`- MORE_IDEAS entries: ${moreIdeas}`);
        
        // Show content preview
        console.log('\n📄 Content Preview (first 300 chars):');
        console.log(content.substring(0, 300) + '...');
      }
    }
  } else {
    console.log('\n❌ No cached analysis found');
    console.log('Analysis error:', analysisError?.message || 'No record found');
  }
}

// Run with the TMDB ID
checkMovieByTmdbId(429191).catch(console.error);