/**
 * MovieGenius Discovery Page
 * Universal intelligent search for collections, movies, and people
 */
import { useState } from 'react';
import PhoneFrame from '../components/PhoneFrame';
import UniversalSearch from '../components/UniversalSearch';

export default function MovieGeniusPage() {
  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Hero Section */}
        <div style={styles.hero}>
          <h1 style={styles.title}>MovieGenius</h1>
          <p style={styles.subtitle}>
            Discover films by theme, mood, and style
          </p>
        </div>

        {/* Universal Search */}
        <div style={styles.searchSection}>
          <UniversalSearch
            placeholder="noir, espionage, fincher..."
            autoFocus={false}
          />
        </div>

        {/* Inspiration Section */}
        <div style={styles.inspiration}>
          <h3 style={styles.inspirationTitle}>Try searching for:</h3>
          <div style={styles.tags}>
            <SearchTag text="film noir" />
            <SearchTag text="1950s" />
            <SearchTag text="newsroom" />
            <SearchTag text="espionage" />
            <SearchTag text="psychological" />
            <SearchTag text="family secrets" />
            <SearchTag text="corruption" />
            <SearchTag text="urban stories" />
          </div>
        </div>

        {/* Featured Collections Preview (Optional) */}
        <div style={styles.featured}>
          <h3 style={styles.featuredTitle}>Featured Collections</h3>
          <div style={styles.collectionGrid}>
            <CollectionCard
              title="Newsroom Dramas"
              count={42}
              genre="Drama"
            />
            <CollectionCard
              title="WWII Espionage Thrillers"
              count={26}
              genre="Action Thriller"
            />
            <CollectionCard
              title="1950s Urban Stories"
              count={33}
              genre="Drama"
            />
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function SearchTag({ text }) {
  return (
    <button style={styles.tag}>
      {text}
    </button>
  );
}

function CollectionCard({ title, count, genre }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardContent}>
        <h4 style={styles.cardTitle}>{title}</h4>
        <p style={styles.cardMeta}>
          {count} films · {genre}
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    padding: '20px',
    paddingBottom: '100px',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '32px',
    paddingTop: '40px',
  },
  title: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  searchSection: {
    marginBottom: '48px',
  },
  inspiration: {
    marginBottom: '48px',
  },
  inspirationTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tag: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  featured: {
    marginTop: '48px',
  },
  featuredTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  collectionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  cardMeta: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
};
