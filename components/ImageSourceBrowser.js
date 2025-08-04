// Image Source Browser Component
import { useState, useEffect } from 'react';
import { Search, Download, ExternalLink, Camera, Star, Filter } from 'lucide-react';

export default function ImageSourceBrowser({ 
  episode, 
  onImageSelect,
  onClose 
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedSource, setSelectedSource] = useState('all');
  const [filter, setFilter] = useState('suitable'); // 'all', 'suitable', 'official'
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (episode) {
      searchImages();
    }
  }, [episode]);

  const searchImages = async () => {
    setLoading(true);
    try {
      // This would call the ImageSourceManager
      // For now, we'll simulate the API call
      const response = await fetch('/api/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode })
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Image search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async (image) => {
    setDownloading(image.id);
    try {
      // Download and process image
      const response = await fetch('/api/download-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image,
          episode: {
            theme: episode.theme?.title,
            series: episode.series?.title,
            title: episode.episode?.title
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        onImageSelect?.(result);
      }
    } catch (error) {
      console.error('Image download error:', error);
    } finally {
      setDownloading(null);
    }
  };

  const getFilteredImages = () => {
    if (!results) return [];

    let images = [];
    
    if (selectedSource === 'all') {
      images = [...results.unsplash, ...results.pexels, ...results.tmdb];
    } else {
      images = results[selectedSource] || [];
    }

    if (filter === 'suitable') {
      images = images.filter(img => img.suitable2to1);
    } else if (filter === 'official') {
      images = images.filter(img => img.source === 'tmdb');
    }

    return images;
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'tmdb': return '🎬';
      case 'unsplash': return '📸';
      case 'pexels': return '📷';
      default: return '🖼️';
    }
  };

  const getSourceLabel = (source) => {
    switch (source) {
      case 'tmdb': return 'Official Film Stills';
      case 'unsplash': return 'Unsplash Photography';
      case 'pexels': return 'Pexels Photography';
      default: return 'Unknown';
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Find Hero Image</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Episode Info */}
        <div style={styles.episodeInfo}>
          <h3 style={styles.episodeTitle}>{episode?.episode?.title}</h3>
          <p style={styles.episodeSubtitle}>{episode?.episode?.subtitle}</p>
          <span style={styles.episodeSeries}>
            {episode?.series?.title} • {episode?.theme?.title}
          </span>
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          <div style={styles.sourceSelector}>
            <label style={styles.controlLabel}>Source:</label>
            <select 
              value={selectedSource} 
              onChange={(e) => setSelectedSource(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Sources</option>
              <option value="tmdb">Official Film Stills</option>
              <option value="unsplash">Unsplash Photos</option>
              <option value="pexels">Pexels Photos</option>
            </select>
          </div>

          <div style={styles.filterSelector}>
            <label style={styles.controlLabel}>Filter:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              style={styles.select}
            >
              <option value="suitable">2:1 Aspect Ratio</option>
              <option value="official">Official Stills Only</option>
              <option value="all">All Images</option>
            </select>
          </div>

          <button onClick={searchImages} style={styles.refreshButton}>
            <Search size={16} />
            Refresh
          </button>
        </div>

        {/* Results Summary */}
        {results && !loading && (
          <div style={styles.summary}>
            <div style={styles.summaryStats}>
              <span>Total: {results.total}</span>
              <span>Suitable for 2:1: {results.suitable2to1.length}</span>
              <span>Official: {results.tmdb.length}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={styles.loading}>
            <Camera size={48} style={styles.loadingIcon} />
            <p>Searching image sources...</p>
          </div>
        )}

        {/* Results Grid */}
        {!loading && results && (
          <div style={styles.resultsContainer}>
            <div style={styles.imageGrid}>
              {getFilteredImages().map(image => (
                <div key={image.id} style={styles.imageCard}>
                  <div style={styles.imageContainer}>
                    <img 
                      src={image.url} 
                      alt={image.description} 
                      style={styles.image}
                    />
                    
                    {/* Source Badge */}
                    <div style={styles.sourceBadge}>
                      {getSourceIcon(image.source)}
                    </div>

                    {/* Aspect Ratio Badge */}
                    {image.suitable2to1 && (
                      <div style={styles.aspectBadge}>2:1</div>
                    )}

                    {/* Overlay */}
                    <div style={styles.imageOverlay}>
                      <button 
                        onClick={() => handleImageSelect(image)}
                        disabled={downloading === image.id}
                        style={styles.selectButton}
                      >
                        {downloading === image.id ? (
                          'Downloading...'
                        ) : (
                          <>
                            <Download size={16} />
                            Select
                          </>
                        )}
                      </button>

                      {(image.unsplashUrl || image.pexelsUrl) && (
                        <a 
                          href={image.unsplashUrl || image.pexelsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.externalLink}
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Image Info */}
                  <div style={styles.imageInfo}>
                    <p style={styles.imageDescription}>
                      {image.description?.slice(0, 60)}
                      {image.description?.length > 60 ? '...' : ''}
                    </p>
                    
                    <div style={styles.imageMetadata}>
                      <span style={styles.source}>
                        {getSourceLabel(image.source)}
                      </span>
                      
                      {image.photographer && (
                        <span style={styles.photographer}>
                          by {image.photographer}
                        </span>
                      )}
                      
                      <span style={styles.dimensions}>
                        {Math.round(image.aspectRatio * 100) / 100}:1
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {getFilteredImages().length === 0 && (
              <div style={styles.noResults}>
                <Camera size={48} style={styles.noResultsIcon} />
                <h3>No images found</h3>
                <p>Try adjusting your filter settings or check API configuration.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerNote}>
            Images are sourced from Unsplash, Pexels, and The Movie Database. 
            Attribution and licensing will be preserved.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },

  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },

  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
  },

  episodeInfo: {
    padding: '16px 24px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },

  episodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 4px 0',
  },

  episodeSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
    margin: '0 0 8px 0',
  },

  episodeSeries: {
    fontSize: '12px',
    color: '#d4af37',
    fontWeight: '500',
  },

  controls: {
    display: 'flex',
    gap: '16px',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    alignItems: 'end',
  },

  sourceSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  filterSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  controlLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151',
  },

  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
  },

  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#d4af37',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },

  summary: {
    padding: '12px 24px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },

  summaryStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#6b7280',
  },

  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    color: '#6b7280',
  },

  loadingIcon: {
    marginBottom: '16px',
    opacity: 0.6,
  },

  resultsContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },

  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },

  imageCard: {
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
  },

  imageContainer: {
    position: 'relative',
    aspectRatio: '2/1',
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  sourceBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    fontSize: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '4px',
    padding: '2px 6px',
  },

  aspectBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: '#10b981',
    color: '#ffffff',
    borderRadius: '4px',
    padding: '2px 6px',
  },

  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    padding: '16px 12px 12px',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },

  selectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#d4af37',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },

  externalLink: {
    color: '#ffffff',
    opacity: 0.8,
  },

  imageInfo: {
    padding: '12px',
  },

  imageDescription: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: '1.4',
    margin: '0 0 8px 0',
  },

  imageMetadata: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '11px',
    color: '#6b7280',
  },

  source: {
    fontWeight: '500',
  },

  photographer: {
    fontStyle: 'italic',
  },

  dimensions: {
    fontFamily: 'monospace',
  },

  noResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    color: '#6b7280',
    textAlign: 'center',
  },

  noResultsIcon: {
    marginBottom: '16px',
    opacity: 0.6,
  },

  footer: {
    padding: '12px 24px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },

  footerNote: {
    fontSize: '11px',
    color: '#6b7280',
    margin: 0,
    textAlign: 'center',
  },
};

// Add hover effect to image cards
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .image-card:hover .image-overlay {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);
}