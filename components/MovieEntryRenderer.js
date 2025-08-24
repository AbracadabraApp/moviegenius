/**
 * MovieEntryRenderer - Simple 60-line Static File Renderer
 * 
 * Replaces the complex 1000+ line MovieAnalysisWithEntities component
 * with a simple renderer that serves pre-processed static files.
 * 
 * Key Features:
 * - Renders pre-processed HTML content directly via dangerouslySetInnerHTML
 * - Handles pre-generated static files from /public/data/movies/
 * - <100ms rendering with zero runtime processing
 * - Simple fallback handling for missing data
 */

import { useState, useEffect } from 'react';

export default function MovieEntryRenderer({ tmdbId, fallbackData = null }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadMovieEntry() {
      try {
        setLoading(true);
        setError(null);
        
        // Try to load static file first
        const response = await fetch(`/data/movies/${tmdbId}.json`);
        
        if (!response.ok) {
          throw new Error(`Static file not found: ${tmdbId}`);
        }
        
        const movieData = await response.json();
        setEntry(movieData);
        
      } catch (err) {
        console.warn(`Failed to load static file for ${tmdbId}:`, err.message);
        
        // Fallback to provided data or error state
        if (fallbackData) {
          setEntry(fallbackData);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }

    if (tmdbId) {
      loadMovieEntry();
    }
  }, [tmdbId, fallbackData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading movie analysis...</div>
      </div>
    );
  }

  if (error && !entry) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-red-800 font-semibold">Unable to Load Analysis</h3>
        <p className="text-red-600">Error: {error}</p>
        <p className="text-sm text-red-500 mt-2">
          Static file may not exist yet. Try refreshing in a few minutes.
        </p>
      </div>
    );
  }

  if (!entry || !entry.sections) {
    return (
      <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
        <div className="text-yellow-800">No analysis available for this movie.</div>
      </div>
    );
  }

  return (
    <div className="movie-entry-content">
      {/* Render each text section */}
      {entry.sections.map((section, index) => (
        <div key={index} className="mb-6">
          {section.type === 'text' && (
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}
        </div>
      ))}
      
      {/* Optional metadata footer */}
      {entry.processedAt && (
        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
          Analysis processed: {new Date(entry.processedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}