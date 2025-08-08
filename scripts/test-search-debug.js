// pages/api/test-search-debug.js - Debug search functionality
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tests = [
    { name: 'Matrix', query: 'matrix' },
    { name: 'Inception', query: 'inception' },
    { name: 'Zero results', query: 'zxcvbnmasdfgh' },
    { name: 'Baby', query: 'baby' },
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name} - "${test.query}"`);

      const startTime = Date.now();

      // Call our own multi-search API
      const response = await fetch(
        `${req.headers.origin || 'http://localhost:3000'}/api/multi-search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: test.query }),
        }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        results.push({
          test: test.name,
          query: test.query,
          status: 'success',
          duration: `${duration}ms`,
          movieCount: data.movies?.length || 0,
          peopleCount: data.people?.length || 0,
          hasResults: data.hasResults,
          fallback: data.fallback?.message || null,
          firstMovie: data.movies?.[0]?.title || null,
        });
      } else {
        results.push({
          test: test.name,
          query: test.query,
          status: 'error',
          duration: `${duration}ms`,
          error: `${response.status} ${response.statusText}`,
        });
      }
    } catch (error) {
      results.push({
        test: test.name,
        query: test.query,
        status: 'error',
        error: error.message,
      });
    }
  }

  // Test rapid consecutive searches
  console.log('🚀 Testing rapid consecutive searches...');
  const rapidQueries = ['avengers', 'batman', 'superman'];
  const rapidPromises = rapidQueries.map(query =>
    fetch(`${req.headers.origin || 'http://localhost:3000'}/api/multi-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
      .then(async response => {
        const data = await response.json();
        return {
          query,
          status: response.status,
          movieCount: data.movies?.length || 0,
        };
      })
      .catch(error => ({
        query,
        error: error.message,
      }))
  );

  const rapidResults = await Promise.all(rapidPromises);

  res.status(200).json({
    message: 'Search debug test completed',
    consecutiveTests: results,
    rapidTests: rapidResults,
    summary: {
      totalTests: results.length,
      successfulTests: results.filter(r => r.status === 'success').length,
      failedTests: results.filter(r => r.status === 'error').length,
    },
  });
}
