/**
 * Themes Overview Page
 * 
 * Simple, clean overview of all education themes.
 * This is where /genius should redirect to.
 */

import { useState } from 'react';
import Link from 'next/link';
import themeEpisodeMapping from '../data/theme-episode-mapping.json';

export default function ThemesPage() {
  const [selectedTheme, setSelectedTheme] = useState(null);
  const themes = Object.values(themeEpisodeMapping.themes);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>MovieGenius Education</h1>
        <p style={styles.subtitle}>
          Explore cinema through curated educational themes and episodes
        </p>
      </div>

      <div style={styles.themesGrid}>
        {themes.map((theme) => (
          <Link 
            key={theme.id} 
            href={`/${theme.id}`}
            style={styles.themeCard}
            onMouseEnter={() => setSelectedTheme(theme.id)}
            onMouseLeave={() => setSelectedTheme(null)}
          >
            <div style={{
              ...styles.cardContent,
              ...(selectedTheme === theme.id ? styles.cardHover : {})
            }}>
              <h3 style={styles.themeTitle}>{theme.title}</h3>
              <p style={styles.themeDescription}>{theme.description}</p>
              <div style={styles.episodeCount}>
                {theme.episodes.length} {theme.episodes.length === 1 ? 'episode' : 'episodes'}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          Each theme contains multiple episodes exploring different aspects of cinema history, 
          technique, and cultural impact.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  header: {
    textAlign: 'center',
    marginBottom: '60px'
  },
  
  title: {
    fontSize: '48px',
    fontWeight: '700',
    color: '#000000',
    margin: '0 0 16px 0'
  },
  
  subtitle: {
    fontSize: '20px',
    color: '#666666',
    margin: '0',
    lineHeight: '1.5'
  },
  
  themesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '60px'
  },
  
  themeCard: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block'
  },
  
  cardContent: {
    padding: '32px',
    border: '1px solid #e1e5e9',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  
  cardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    borderColor: '#d4af37'
  },
  
  themeTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000000',
    margin: '0 0 12px 0'
  },
  
  themeDescription: {
    fontSize: '16px',
    color: '#666666',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
    flex: 1
  },
  
  episodeCount: {
    fontSize: '14px',
    color: '#d4af37',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  
  footer: {
    textAlign: 'center',
    padding: '40px 0'
  },
  
  footerText: {
    fontSize: '16px',
    color: '#888888',
    margin: '0',
    lineHeight: '1.6'
  }
};