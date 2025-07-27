/**
 * DiscoveryFooter Component
 *
 * Reusable footer with movie category buttons for discovery
 * Can be included on any page for consistent navigation
 * Renamed from CategoryBrowse for better semantic meaning
 */

import { useRouter } from 'next/router';

const DiscoveryFooter = ({ title = 'Browse by Category', compact = false, style = {} }) => {
  const router = useRouter();
  
  console.log('DiscoveryFooter rendering...', { title, compact });

  const handleCategoryClick = categorySlug => {
    router.push(`/search?category=${categorySlug}`);
  };

  return (
    <div style={{ ...styles.container, ...style }}>
      <h2 style={compact ? styles.titleCompact : styles.title}>{title}</h2>
      <div style={compact ? styles.gridCompact : styles.grid}>
        {browseCategories.map((category, index) => (
          <div
            key={index}
            style={compact ? styles.buttonCompact : styles.button}
            onClick={() => handleCategoryClick(category.slug)}
            onMouseEnter={e => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={e => {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.borderColor = '#d1d5db';
            }}
          >
            {category.label}
          </div>
        ))}
      </div>
    </div>
  );
};

// Browse categories - Most Popular All Time + Core Genres
const browseCategories = [
  // Most Popular All Time categories
  { label: 'Most Popular All Time', slug: 'popular-all-time' },
  { label: 'Top Rated Movies', slug: 'top-rated' },

  // Core TMDB Genres
  { label: 'Action', slug: 'action' },
  { label: 'Adventure', slug: 'adventure' },
  { label: 'Animation', slug: 'animation' },
  { label: 'Comedy', slug: 'comedy' },
  { label: 'Crime', slug: 'crime' },
  { label: 'Documentary', slug: 'documentary' },
  { label: 'Drama', slug: 'drama' },
  { label: 'Family', slug: 'family' },
  { label: 'Fantasy', slug: 'fantasy' },
  { label: 'History', slug: 'history' },
  { label: 'Horror', slug: 'horror' },
  { label: 'Music', slug: 'music' },
  { label: 'Mystery', slug: 'mystery' },
  { label: 'Romance', slug: 'romance' },
  { label: 'Science Fiction', slug: 'science-fiction' },
  { label: 'Thriller', slug: 'thriller' },
  { label: 'War', slug: 'war' },
  { label: 'Western', slug: 'western' },
];

const styles = {
  container: {
    marginTop: '32px',
    padding: '0 16px',
  },

  // Regular size
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  button: {
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Compact size
  titleCompact: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 12px 0',
  },
  gridCompact: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  buttonCompact: {
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '12px 8px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default DiscoveryFooter;