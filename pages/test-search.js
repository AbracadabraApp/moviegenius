// Test page to debug search functionality
import { useState } from 'react';

export default function TestSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const testSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('Testing search API...');
      const response = await fetch('/api/multi-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        setResults(data);
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        setError(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('Network Error:', err);
      setError(`Network Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Search API Test</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter search query..."
          style={{ padding: '10px', width: '300px', marginRight: '10px' }}
        />
        <button onClick={testSearch} disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? 'Searching...' : 'Test Search'}
        </button>
      </div>

      <div>
        <h3>Environment Check:</h3>
        <p>
          NEXT_PUBLIC_TMDB_API_KEY: {process.env.NEXT_PUBLIC_TMDB_API_KEY ? '✅ Set' : '❌ Missing'}
        </p>
        <p>Key value: {process.env.NEXT_PUBLIC_TMDB_API_KEY || 'undefined'}</p>
      </div>

      {error && (
        <div style={{ color: 'red', background: '#ffe6e6', padding: '10px', margin: '10px 0' }}>
          <h3>Error:</h3>
          <pre>{error}</pre>
        </div>
      )}

      {results && (
        <div style={{ background: '#e6ffe6', padding: '10px', margin: '10px 0' }}>
          <h3>Results:</h3>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
