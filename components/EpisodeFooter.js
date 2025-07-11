/**
 * Episode Footer Component
 * 
 * Simple component that filters current episode from theme episodes list.
 */

import themeMapping from '../data/theme-episode-mapping.json';

export default function EpisodeFooter({ currentTheme, currentEpisode }) {
  // Safety check for required props
  if (!currentTheme || !currentEpisode) return null;

  // Get current theme data
  const themeData = themeMapping.themes[currentTheme];
  if (!themeData) return null;

  // Filter out current episode from theme episodes
  const otherEpisodes = themeData.episodes.filter(ep => ep.id !== currentEpisode);

  // Static theme list
  const exploreThemes = [
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

  return (
    <div style={styles.footer}>
      
      {/* Episodes in Current Theme */}
      {otherEpisodes.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>More from {themeData.title}</h3>
          <div style={styles.episodeGrid}>
            {otherEpisodes.map((episode) => (
              <a
                key={episode.id}
                href={`/${currentTheme}/${episode.id}`}
                style={styles.episodeButton}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `/${currentTheme}/${episode.id}`;
                }}
              >
                <div style={styles.episodeTitle}>{episode.title}</div>
                <div style={styles.episodeSubtitle}>{episode.subtitle}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Explore Further Themes */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Explore Further</h3>
        <div style={styles.themeGrid}>
          {exploreThemes.filter(theme => theme.slug !== currentTheme).map((theme) => (
            <a
              key={theme.slug}
              href={`/${theme.slug}`}
              style={styles.themeButton}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = `/${theme.slug}`;
              }}
            >
              {theme.name}
            </a>
          ))}
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
    marginBottom: '48px'
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
  
  // Episode Navigation Styles
  episodeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  
  episodeButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #d4af37',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'left',
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.1)',
    fontFamily: 'Georgia, "Times New Roman", serif',
    display: 'block'
  },
  
  episodeTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#000000',
    marginBottom: '6px',
    fontFamily: 'Georgia, "Times New Roman", serif'
  },
  
  episodeSubtitle: {
    fontSize: '15px',
    color: '#4a5568',
    lineHeight: '1.5',
    fontStyle: 'italic'
  },
  
  // Theme Grid Styles - Enhanced with gold aesthetic
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '0px',
    maxWidth: '500px',
    margin: '0 auto'
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
  
};