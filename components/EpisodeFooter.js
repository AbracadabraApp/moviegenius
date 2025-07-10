/**
 * Episode Footer Component
 * 
 * Displays:
 * 1. Horizontal navigation for all episodes in the same theme (excluding current episode)
 * 2. "Explore Further" section with 10 main themes from genius home page
 */

import { useRouter } from 'next/router';
import themeMapping from '../data/theme-episode-mapping.json';

export default function EpisodeFooter({ currentTheme, currentEpisode }) {
  const router = useRouter();

  // Safety check for required props
  if (!currentTheme || !currentEpisode) return null;

  // Get current theme data
  const themeData = themeMapping.themes[currentTheme];
  if (!themeData) return null;

  // Filter out current episode from theme episodes
  const otherEpisodes = themeData.episodes.filter(ep => ep.id !== currentEpisode);

  // Complete theme mapping with exact slugs and display names
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

  const handleEpisodeClick = (episode) => {
    router.push(`/${currentTheme}/${episode.id}`);
  };

  const handleThemeClick = (themeSlug) => {
    // Navigate directly to theme page
    router.push(`/${themeSlug}`);
  };

  return (
    <div style={styles.footer}>
      
      {/* Episodes in Current Theme */}
      {otherEpisodes.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>More from {themeData.title}</h3>
          <div style={styles.episodeGrid}>
            {otherEpisodes.map((episode) => (
              <button
                key={episode.id}
                style={styles.episodeButton}
                onClick={() => handleEpisodeClick(episode)}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#fefdf8';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.2)';
                  e.target.style.borderColor = '#d4af37';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(212, 175, 55, 0.1)';
                  e.target.style.borderColor = '#d4af37';
                }}
              >
                <div style={styles.episodeTitle}>{episode.title}</div>
                <div style={styles.episodeSubtitle}>{episode.subtitle}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Explore Further Themes */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Explore Further</h3>
        <div style={styles.themeGrid}>
          {exploreThemes.filter(theme => theme.slug !== currentTheme).map((theme) => (
            <button
              key={theme.slug}
              style={styles.themeButton}
              onClick={() => handleThemeClick(theme.slug)}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#d4af37';
                e.target.style.color = '#ffffff';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 10px rgba(212, 175, 55, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.color = '#000000';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 6px rgba(212, 175, 55, 0.1)';
              }}
            >
              {theme.name}
            </button>
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
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.1)',
    outline: 'none',
    fontFamily: 'Georgia, "Times New Roman", serif'
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
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
    fontFamily: 'Georgia, "Times New Roman", serif',
    lineHeight: '1.3',
    minHeight: '65px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(212, 175, 55, 0.1)',
    backgroundColor: '#ffffff',
    color: '#000000',
    outline: 'none'
  },
  
};