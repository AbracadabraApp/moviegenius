/**
 * Theme Footer Component
 *
 * Simple static footer with links to 10 theme pages.
 */

import { useState } from 'react';
import { themeLinks } from '../lib/routes';

export default function ThemeFooter() {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div style={styles.footer}>
      <div style={styles.section}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '16px',
            padding: '0 16px',
          }}
        >
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#d4af37',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            Explore Cinema Themes
          </span>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            }}
          />
        </div>

        <div style={styles.themeGrid}>
          {themeLinks.map((theme, index) => (
            <a key={theme.href} href={theme.href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  ...styles.themeButton,
                  ...(hoveredIndex === index ? styles.themeButtonHover : {}),
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {theme.label}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  footer: {
    backgroundColor: '#ffffff',
    margin: '16px',
    marginTop: '0px',
    marginBottom: '120px',
    padding: '14px 12px 12px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segge UI", Roboto, sans-serif',
  },

  section: {
    marginBottom: '24px',
  },

  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000000',
    margin: '16px 0 16px 0',
    textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Theme Grid - 2 columns to match EpisodeFooter pattern
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '16px',
    maxWidth: '400px',
    margin: '0 auto 16px auto',
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
    color: '#000000',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },

  themeButtonHover: {
    backgroundColor: '#d4af37',
    color: '#ffffff',
    transform: 'translateY(-1px)',
  },
};
