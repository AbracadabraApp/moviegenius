/**
 * ExplorePromptCard Error Fallback Component
 * 
 * Provides a graceful fallback when ExplorePromptCard components fail to render
 * Maintains the visual flow of the explore section while showing minimal error state
 */
import { AlertCircle, Compass } from 'lucide-react';

export default function ExplorePromptErrorFallback({ error, onRetry }) {
  return (
    <div style={styles.container}>
      <div style={styles.iconContainer}>
        <Compass style={styles.compassIcon} />
        <AlertCircle style={styles.errorIcon} />
      </div>
      <div style={styles.content}>
        <div style={styles.title}>Exploration topic unavailable</div>
        <div style={styles.message}>Unable to load this suggestion</div>
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
    padding: '16px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  iconContainer: {
    position: 'relative',
    marginRight: '12px',
    flexShrink: 0,
  },
  compassIcon: {
    width: '20px',
    height: '20px',
    color: '#0369a1',
  },
  errorIcon: {
    width: '10px',
    height: '10px',
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
    color: '#0c4a6e',
    marginBottom: '2px',
  },
  message: {
    fontSize: '12px',
    color: '#0369a1',
    marginBottom: '8px',
  },
  retryButton: {
    fontSize: '11px',
    color: '#0369a1',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    textDecoration: 'underline',
  },
};