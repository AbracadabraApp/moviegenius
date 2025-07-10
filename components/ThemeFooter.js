/**
 * Theme Footer Component
 * 
 * Simple static footer with links to 10 theme pages.
 */

export default function ThemeFooter() {
  return (
    <div style={styles.footer}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Explore Cinema Themes</h3>
        
        <div style={styles.themeGrid}>
          <a href="/film-noir" style={styles.themeButton}>Film Noir</a>
          <a href="/horror-suspense" style={styles.themeButton}>Horror & Suspense</a>
          <a href="/comedy-through-time" style={styles.themeButton}>Comedy</a>
          <a href="/women-directors" style={styles.themeButton}>Women Directors</a>
          <a href="/world-cinema" style={styles.themeButton}>International Masters</a>
          <a href="/acclaimed-directors" style={styles.themeButton}>Acclaimed Directors</a>
          <a href="/avant-garde-film" style={styles.themeButton}>Movements in Film</a>
          <a href="/magic-of-moviemaking" style={styles.themeButton}>The Magic of Moviemaking</a>
          <a href="/cinema-through-decades" style={styles.themeButton}>Cinema Through the Decades</a>
          <a href="/cinema-cultural-impact" style={styles.themeButton}>Hollywood Transformed</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  footer: {
    backgroundColor: '#ffffff',
    borderTop: '3px solid #d4af37',
    padding: '0px 20px 20px',
    marginTop: '0px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  section: {
    marginBottom: '24px'
  },
  
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000000',
    margin: '16px 0 16px 0',
    textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  // Theme Grid - 2 columns to match EpisodeFooter pattern
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '16px',
    maxWidth: '400px',
    margin: '0 auto 16px auto'
  },
  
  themeButton: {
    padding: '12px 8px',
    border: '1px solid #d4af37',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    textDecoration: 'none',
    textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.2',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    color: '#000000'
  },

};