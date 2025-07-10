/**
 * Theme Footer Component
 * 
 * Simple static footer with links to 10 theme pages.
 */

export default function ThemeFooter({ currentTheme = null }) {
  // Static theme list
  const themes = [
    { slug: 'film-noir', name: 'Film Noir' },
    { slug: 'horror-suspense', name: 'Horror & Suspense' },
    { slug: 'comedy-through-time', name: 'Comedy' },
    { slug: 'women-directors', name: 'Women Directors' },
    { slug: 'world-cinema', name: 'International Masters' },
    { slug: 'acclaimed-directors', name: 'Acclaimed Directors' },
    { slug: 'avant-garde-film', name: 'Movements in Film' },
    { slug: 'magic-of-moviemaking', name: 'The Magic of Moviemaking' },
    { slug: 'cinema-through-decades', name: 'Cinema Through the Decades' },
    { slug: 'cinema-cultural-impact', name: 'Hollywood Transformed' }
  ];

  // Filter out current theme if specified
  const availableThemes = currentTheme 
    ? themes.filter(theme => theme.slug !== currentTheme)
    : themes;

  return (
    <div style={styles.footer}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          {currentTheme ? 'Explore Other Themes' : 'Explore Cinema Themes'}
        </h3>
        
        <div style={styles.themeGrid}>
          {availableThemes.map((theme) => (
            <a
              key={theme.slug}
              href={`/${theme.slug}`}
              style={styles.themeButton}
            >
              {theme.name}
            </a>
          ))}
        </div>

        <div style={styles.hubSection}>
          <a href="/genius" style={styles.hubButton}>
            ← Back to Education Hub
          </a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  footer: {
    backgroundColor: '#fefdf8',
    borderTop: '3px solid #d4af37',
    padding: '48px 20px 40px',
    marginTop: '60px',
    fontFamily: 'Georgia, "Times New Roman", serif'
  },
  
  section: {
    marginBottom: '24px'
  },
  
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000000',
    marginBottom: '24px',
    textAlign: 'center',
    fontFamily: 'Georgia, "Times New Roman", serif',
    letterSpacing: '0.5px'
  },
  
  // Theme Grid - 2 columns to match EpisodeFooter pattern
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '32px',
    maxWidth: '500px',
    margin: '0 auto 32px auto'
  },
  
  themeButton: {
    padding: '16px 12px',
    border: '1px solid #d4af37',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
    fontFamily: 'Georgia, "Times New Roman", serif',
    lineHeight: '1.3',
    minHeight: '65px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(212, 175, 55, 0.1)',
    backgroundColor: '#ffffff',
    color: '#000000'
  },

  // Hub Navigation Section
  hubSection: {
    textAlign: 'center',
    marginTop: '24px'
  },

  hubButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    textDecoration: 'none',
    fontFamily: 'Georgia, "Times New Roman", serif',
    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.1)',
    display: 'inline-block'
  },
};