/**
 * MoviePlaceholder Component
 * 
 * Dynamic placeholder for movies without poster images.
 * Shows clapperboard icon with movie title and year.
 */
import { Clapperboard } from 'lucide-react';

export default function MoviePlaceholder({ title, year, className = '', compact = false }) {
  return (
    <div 
      className={`movie-placeholder ${className}`}
      style={styles.container}
    >
      <div style={styles.iconContainer}>
        <Clapperboard size={compact ? 60 : 180} color="#374151" />
      </div>
      {!compact && (
        <div style={styles.titleLine}>
          <span style={styles.title}>{title}</span>
          <span style={styles.year}> ({year})</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '20px',
    boxSizing: 'border-box',
  },
  iconContainer: {
    marginBottom: '30px',
  },
  titleLine: {
    display: 'inline',
    lineHeight: '1.3',
  },
  title: {
    fontSize: '27px', // 50% bigger than 18px
    fontWeight: '600',
    color: '#000000', // Black
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  year: {
    fontSize: '21px', // Lighter weight visually with smaller size
    color: '#6b7280', // Grey
    fontWeight: '300',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};