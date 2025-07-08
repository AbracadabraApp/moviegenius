// pages/test-multi-search.js - Test page for multi-search functionality
import React, { useState } from 'react';
import SimpleSearch from '../components/SimpleSearch';
import MultiSearchResults from '../components/MultiSearchResults';

export default function TestMultiSearch() {
  const [results, setResults] = useState({ movies: [], people: [] });
  const [query, setQuery] = useState('');

  const handleResults = (searchResults) => {
    setResults(searchResults);
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Multi-Search Test</h1>
          <p style={styles.subtitle}>Search for movies and people</p>
        </div>

        <div style={styles.searchContainer}>
          <SimpleSearch
            onResults={handleResults}
            placeholder="Search movies and people..."
          />
        </div>

        <MultiSearchResults results={results} query={query} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '20px',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
  },
  searchContainer: {
    marginBottom: '24px',
  },
};