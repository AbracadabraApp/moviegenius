// Debug script to test movie 153 locally
const fetch = require('node-fetch');

async function testMovie153() {
  try {
    console.log('Testing /api/movie-analysis?tmdbId=153...\n');
    
    const response = await fetch('http://localhost:3001/api/movie-analysis?tmdbId=153');
    const data = await response.json();
    
    console.log('API Response Structure:');
    console.log('- analysis keys:', Object.keys(data.analysis || {}));
    console.log('- cached:', data.cached);
    console.log('- source:', data.source);
    
    if (data.analysis?.claude_response) {
      console.log('\nClaude Response Structure:');
      console.log('- claude_response keys:', Object.keys(data.analysis.claude_response));
      
      if (data.analysis.claude_response.raw_content) {
        try {
          const parsed = JSON.parse(data.analysis.claude_response.raw_content);
          console.log('\nParsed Raw Content:');
          console.log('- whyWatch structure:', typeof parsed.whyWatch, parsed.whyWatch);
          console.log('- whyWatch.reasons length:', parsed.whyWatch?.reasons?.length);
          console.log('- content sections:', parsed.content?.length);
          console.log('- linkedReferences:', parsed.linkedReferences?.length);
          console.log('- First content type:', parsed.content?.[0]?.type);
          
        } catch (e) {
          console.log('❌ Failed to parse raw_content:', e.message);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Visit http://localhost:3001/movie/153 to see rendered output');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMovie153();