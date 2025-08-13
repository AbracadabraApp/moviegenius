/**
 * TrailerModal Component - Optimized for search result trailer playback
 * 
 * Lightweight modal specifically designed for quick trailer viewing
 * in search contexts without disrupting the search flow.
 */
import { X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * TrailerModal - Modal for trailer playback
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close modal handler
 * @param {string} props.videoId - YouTube video ID
 * @param {string} props.movieTitle - Movie title for accessibility
 */
export default function TrailerModal({ isOpen, onClose, videoId, movieTitle }) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen || !videoId) {
    return null;
  }

  // Handle backdrop click to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={styles.closeButton}
          aria-label="Close trailer"
        >
          <X size={24} color="white" />
        </button>

        {/* Video Container */}
        <div style={styles.videoContainer}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={`${movieTitle} Trailer`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={styles.iframe}
          />
        </div>

        {/* Movie Title */}
        <div style={styles.titleBar}>
          <h3 style={styles.movieTitle}>{movieTitle} - Trailer</h3>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },

  modal: {
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: '800px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },

  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(0, 0, 0, 0.7)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    zIndex: 10,
  },

  videoContainer: {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%', // 16:9 aspect ratio
    height: 0,
  },

  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },

  titleBar: {
    padding: '12px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },

  movieTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};