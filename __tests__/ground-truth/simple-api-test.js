// Simple test to check API connectivity during tests

const fetch = globalThis.fetch || require('node-fetch');

async function testAPIConnectivity() {
  try {
    console.log('Testing API connectivity...');
    const response = await fetch('http://localhost:3001/api/movie-analysis?tmdbId=599');
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Data keys:', Object.keys(data));
      console.log('Has analysis:', !!data.analysis);
      console.log('Analysis type:', typeof data.analysis);
    } else {
      console.log('Response not ok');
    }
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

testAPIConnectivity();