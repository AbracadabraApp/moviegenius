import React, { useState, useEffect } from 'react';

export default function StreamingAvailabilityLink({ tmdbId }) {
  const [streamingData, setStreamingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!tmdbId) {
      setLoading(false);
      return;
    }

    const fetchStreamingData = async () => {
      try {
        const response = await fetch(`/api/movie-streaming?id=${tmdbId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Movie not found - don't show error, just don't display
            setStreamingData(null);
            setLoading(false);
            return;
          }
          throw new Error(`Failed to fetch streaming data: ${response.status}`);
        }
        
        const data = await response.json();
        setStreamingData(data);
      } catch (err) {
        console.error('Error fetching streaming data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStreamingData();
  }, [tmdbId]);

  // Don't render while loading
  if (loading) {
    return null;
  }

  // Don't render if no data or error
  if (error || !streamingData || !streamingData.streaming_data || streamingData.streaming_data === 'TBD') {
    return null;
  }

  // Format streaming data with expandable platforms
  const cleanStreamingData = streamingData.streaming_data.replace('Available on ', '');
  const platforms = cleanStreamingData.split(', ').map(p => p.trim()).filter(p => p);
  
  const displayPlatforms = expanded ? platforms : platforms.slice(0, 3);
  const hasMore = platforms.length > 3;
  const moreCount = platforms.length - 3;

  return (
    <>
      <div className="streaming-availability-container">
        <span className="streaming-availability-text">
          <strong className="movie-title-plain">{streamingData.title}</strong> <span className="year-plain">({streamingData.year}):</span> <span className="streaming-text">streaming on {displayPlatforms.join(', ')}</span>
          {hasMore && !expanded && (
            <>
              <span className="streaming-text">, and</span> <span className="expand-link" onClick={() => setExpanded(true)}>
                {moreCount} more
              </span>
            </>
          )}
        </span>
      </div>
      
      <style jsx>{`
        .streaming-availability-container {
          padding: 4px 20px 16px 20px;
          background-color: #ffffff;
        }
        
        .streaming-availability-text {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
          line-height: 1.4;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        
        .movie-title-plain {
          font-weight: 600;
          color: inherit;
        }
        
        .year-plain {
          color: #374151;
          font-weight: normal;
        }
        
        .streaming-text {
          color: #6b7280;
        }
        
        .expand-link {
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: #d4af37;
          text-decoration-thickness: 1px;
          text-underline-offset: 2px;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        
        .expand-link:hover {
          text-decoration-color: #b8941f;
          color: #374151;
        }
      `}</style>
    </>
  );
}