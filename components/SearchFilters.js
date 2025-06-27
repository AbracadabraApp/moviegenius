// components/SearchFilters.js - Search filters for movies
import { useState, useEffect } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

export default function SearchFilters({ 
  onFiltersChange, 
  style = {},
  initialFilters = {} 
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    yearRange: { min: null, max: null },
    genres: [],
    streaming: [],
    ...initialFilters
  });

  // Notify parent when filters change
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  // Handle year range changes
  const handleYearChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      yearRange: {
        ...prev.yearRange,
        [type]: value ? parseInt(value) : null
      }
    }));
  };

  // Handle genre toggle
  const handleGenreToggle = (genre) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  // Handle streaming platform toggle
  const handleStreamingToggle = (platform) => {
    setFilters(prev => ({
      ...prev,
      streaming: prev.streaming.includes(platform)
        ? prev.streaming.filter(s => s !== platform)
        : [...prev.streaming, platform]
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      yearRange: { min: null, max: null },
      genres: [],
      streaming: []
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      filters.yearRange.min || 
      filters.yearRange.max || 
      filters.genres.length > 0 || 
      filters.streaming.length > 0
    );
  };

  return (
    <div style={{ ...styles.container, ...style }}>
      {/* Filter toggle button */}
      <button
        style={{
          ...styles.toggleButton,
          ...(hasActiveFilters() ? styles.toggleButtonActive : {})
        }}
        onClick={() => setShowFilters(!showFilters)}
      >
        <Filter size={16} />
        <span>Filters</span>
        {hasActiveFilters() && (
          <span style={styles.activeCount}>
            {[
              filters.yearRange.min || filters.yearRange.max ? 1 : 0,
              filters.genres.length,
              filters.streaming.length
            ].reduce((a, b) => a + b, 0)}
          </span>
        )}
        <ChevronDown 
          size={16} 
          style={{
            transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      {/* Filter panel */}
      {showFilters && (
        <div style={styles.filtersPanel}>
          {/* Year Range */}
          <div style={styles.filterSection}>
            <div style={styles.filterTitle}>Release Year</div>
            <div style={styles.yearRange}>
              <input
                type="number"
                placeholder="From"
                value={filters.yearRange.min || ''}
                onChange={(e) => handleYearChange('min', e.target.value)}
                style={styles.yearInput}
                min="1900"
                max={new Date().getFullYear()}
              />
              <span style={styles.yearSeparator}>to</span>
              <input
                type="number"
                placeholder="To"
                value={filters.yearRange.max || ''}
                onChange={(e) => handleYearChange('max', e.target.value)}
                style={styles.yearInput}
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          {/* Genres */}
          <div style={styles.filterSection}>
            <div style={styles.filterTitle}>Genres</div>
            <div style={styles.genreGrid}>
              {popularGenres.map(genre => (
                <button
                  key={genre}
                  style={{
                    ...styles.genreChip,
                    ...(filters.genres.includes(genre) ? styles.genreChipActive : {})
                  }}
                  onClick={() => handleGenreToggle(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Streaming Platforms */}
          <div style={styles.filterSection}>
            <div style={styles.filterTitle}>Streaming Platforms</div>
            <div style={styles.streamingGrid}>
              {streamingPlatforms.map(platform => (
                <button
                  key={platform}
                  style={{
                    ...styles.streamingChip,
                    ...(filters.streaming.includes(platform) ? styles.streamingChipActive : {})
                  }}
                  onClick={() => handleStreamingToggle(platform)}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters() && (
            <div style={styles.clearSection}>
              <button
                style={styles.clearButton}
                onClick={clearFilters}
              >
                <X size={16} />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Popular genres for filtering
const popularGenres = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Thriller',
  'Documentary',
  'Animation',
  'Fantasy',
  'Crime',
  'Mystery'
];

// Streaming platforms
const streamingPlatforms = [
  'Netflix',
  'Amazon Prime',
  'Hulu',
  'Disney+',
  'HBO Max',
  'Apple TV+',
  'Paramount+',
  'Peacock'
];

const styles = {
  container: {
    width: '100%',
  },
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    width: '100%',
    justifyContent: 'space-between',
  },
  toggleButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    color: '#1d4ed8',
  },
  activeCount: {
    backgroundColor: '#ef4444',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    marginRight: '8px',
  },
  filtersPanel: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginTop: '8px',
    padding: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  filterSection: {
    marginBottom: '20px',
  },
  filterTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  
  // Year range
  yearRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  yearInput: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    flex: 1,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  yearSeparator: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },

  // Genres
  genreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  genreChip: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    textAlign: 'center',
  },
  genreChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    color: '#1d4ed8',
  },

  // Streaming platforms
  streamingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  streamingChip: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    textAlign: 'center',
  },
  streamingChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
    color: '#15803d',
  },

  // Clear section
  clearSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px',
    marginBottom: '-4px',
  },
  clearButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#dc2626',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
};