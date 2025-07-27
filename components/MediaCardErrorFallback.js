/**
 * MediaCard Error Fallback Component
 * 
 * Provides a graceful fallback when MediaCard components fail to render
 * Maintains the visual consistency of the movie list while showing minimal error state
 */
import { AlertCircle, Film } from 'lucide-react';

export default function MediaCardErrorFallback({ error, onRetry }) {
  return (
    <div style={styles.container}>
      <div style={styles.iconContainer}>
        <Film style={styles.filmIcon} />
        <AlertCircle style={styles.errorIcon} />
      </div>
      <div style={styles.content}>
        <div style={styles.title}>Movie card unavailable</div>
        <div style={styles.message}>Unable to load movie details</div>
        {onRetry && (
          <button onClick={onRetry} style={styles.retryButton}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '8px',
    minHeight: '80px',
  },
  iconContainer: {
    position: 'relative',
    marginRight: '12px',
    flexShrink: 0,
  },
  filmIcon: {
    width: '24px',
    height: '24px',
    color: '#9ca3af',
  },
  errorIcon: {
    width: '12px',
    height: '12px',
    color: '#ef4444',
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '2px',
  },
  message: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  retryButton: {
    fontSize: '11px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    textDecoration: 'underline',
  },
};