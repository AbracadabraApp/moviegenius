/**
 * Test page to verify SimpleSearch component is using simple-search endpoint
 */

import { useState } from 'react';
import SimpleSearch from '../components/SimpleSearch';

export default function TestSearchPage() {
  const [results, setResults] = useState(null);
  
  const handleResults = (data) => {
    console.log('Search results received:', data);
    setResults(data);
  };
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Search Test Page</h1>
      <p>This page tests if SimpleSearch component is using the simple-search endpoint.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <SimpleSearch 
          onResults={handleResults}
          useUnifiedSearch={false}
          placeholder="Test search functionality..."
        />
      </div>
      
      {results && (
        <div>
          <h2>Results:</h2>
          <p><strong>Query:</strong> {results.query}</p>
          <p><strong>Has Results:</strong> {results.hasResults ? 'Yes' : 'No'}</p>
          <p><strong>Movies Found:</strong> {results.movies?.length || 0}</p>
          <p><strong>People Found:</strong> {results.people?.length || 0}</p>
          
          {results.movies?.length > 0 && (
            <div>
              <h3>First 3 Movies:</h3>
              <ul>
                {results.movies.slice(0, 3).map((movie, i) => (
                  <li key={i}>{movie.title} ({movie.year}) - TMDB ID: {movie.tmdb_id}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Open browser developer tools (F12)</li>
          <li>Go to Network tab</li>
          <li>Type a search query above and press Enter</li>
          <li>Check if the API call goes to <code>/api/simple-search</code> (good) or <code>/api/multi-search</code> (old)</li>
          <li>Verify the response returns movie results</li>
        </ol>
      </div>
    </div>
  );
}