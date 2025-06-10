// Test the movie analysis API endpoint
const fetch = require('node-fetch');

async function testMovieAnalysis() {
  console.log('🧪 Testing movie-analysis API for "A Fantastic Woman" (2017)...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/movie-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'A Fantastic Woman',
        year: 2017
      })
    });
    
    if (!response.ok) {
      console.log(`❌ API call failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received:');
    console.log(`- Movie: ${data.movie?.title} (${data.movie?.year})`);
    console.log(`- Cached: ${data.cached ? 'Yes' : 'No'}`);
    console.log(`- Cost: $${data.cost || 'N/A'}`);
    console.log(`- Analysis length: ${data.analysis?.length || 0} characters`);
    
    if (data.entityData) {
      console.log(`- Movies detected: ${data.entityData.movies?.length || 0}`);
      console.log(`- People detected: ${data.entityData.people?.length || 0}`);
    }
    
    if (data.analysis) {
      console.log('\n📋 Prompt Format Check:');
      const analysis = data.analysis;
      console.log(`- Contains PARAGRAPH: ${analysis.includes('PARAGRAPH:') ? '✅' : '❌'}`);
      console.log(`- Contains MOVIES: ${analysis.includes('MOVIES:') ? '✅' : '❌'}`);
      console.log(`- Contains EXPLORE_FURTHER: ${analysis.includes('EXPLORE_FURTHER:') ? '✅' : '❌'}`);
      console.log(`- Contains MORE_IDEAS: ${analysis.includes('MORE_IDEAS:') ? '✅' : '❌'}`);
      
      console.log('\n📄 Analysis Preview (first 400 chars):');
      console.log(analysis.substring(0, 400) + '...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMovieAnalysis();