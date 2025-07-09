// test-search-debug.js - Debug multi-search functionality
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function testSearchAPI() {
  console.log('🧪 Testing Multi-Search API\n');
  
  const tests = [
    {
      name: 'First search - Matrix',
      query: 'matrix',
      expected: 'Should return Matrix movies'
    },
    {
      name: 'Second search - Inception',
      query: 'inception',
      expected: 'Should return Inception movies'
    },
    {
      name: 'Third search - Zero results',
      query: 'zxcvbnmasdfgh',
      expected: 'Should return fallback message'
    },
    {
      name: 'Fourth search - Baby',
      query: 'baby',
      expected: 'Should return Baby movies'
    }
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n--- Test ${i + 1}: ${test.name} ---`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/api/multi-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: test.query })
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Response time: ${duration}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🎬 Movies found: ${data.movies?.length || 0}`);
        console.log(`👥 People found: ${data.people?.length || 0}`);
        console.log(`🔍 Query: "${data.query}"`);
        console.log(`✅ Has results: ${data.hasResults}`);
        
        if (data.fallback) {
          console.log(`💬 Fallback: "${data.fallback.message}"`);
        }
        
        if (data.movies?.length > 0) {
          console.log(`🎭 First movie: "${data.movies[0].title}" (${data.movies[0].year})`);
        }
        
        console.log(`✅ ${test.expected}`);
      } else {
        console.log(`❌ Request failed: ${response.status}`);
        const errorText = await response.text();
        console.log(`Error: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`💥 Test failed: ${error.message}`);
    }
    
    // Wait between tests to avoid overwhelming the API
    if (i < tests.length - 1) {
      console.log('⏳ Waiting 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n🏁 All tests completed');
}

// Test consecutive searches rapidly
async function testRapidSearches() {
  console.log('\n🚀 Testing Rapid Consecutive Searches\n');
  
  const queries = ['matrix', 'inception', 'baby', 'avengers', 'zxcvbnm'];
  const promises = [];
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`🔍 Firing search ${i + 1}: "${query}"`);
    
    const promise = fetch(`${API_BASE}/api/multi-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    }).then(async (response) => {
      const data = await response.json();
      return {
        query,
        status: response.status,
        movieCount: data.movies?.length || 0,
        duration: Date.now()
      };
    }).catch(error => ({
      query,
      error: error.message
    }));
    
    promises.push(promise);
  }
  
  try {
    const results = await Promise.all(promises);
    
    console.log('\n📊 Rapid Search Results:');
    results.forEach((result, index) => {
      if (result.error) {
        console.log(`${index + 1}. "${result.query}" - ERROR: ${result.error}`);
      } else {
        console.log(`${index + 1}. "${result.query}" - ${result.status} - ${result.movieCount} movies`);
      }
    });
    
  } catch (error) {
    console.log(`💥 Rapid test failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🎬 MovieGenius Multi-Search Test Suite');
  console.log('=====================================\n');
  
  try {
    await testSearchAPI();
    await testRapidSearches();
  } catch (error) {
    console.log(`💥 Test suite failed: ${error.message}`);
  }
}

// Run tests
runAllTests();