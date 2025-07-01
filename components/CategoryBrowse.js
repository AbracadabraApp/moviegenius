/**
 * CategoryBrowse Footer Component
 * 
 * Reusable footer with movie category buttons for discovery
 * Can be included on any page for consistent navigation
 */

import { useRouter } from 'next/router';

const CategoryBrowse = ({ 
  title = "Browse by Category",
  compact = false,
  style = {}
}) => {
  const router = useRouter();

  const handleCategoryClick = (categorySlug) => {
    router.push(`/search?category=${categorySlug}`);
  };

  return (
    <div style={{...styles.container, ...style}}>
      <h2 style={compact ? styles.titleCompact : styles.title}>
        {title}
      </h2>
      <div style={compact ? styles.gridCompact : styles.grid}>
        {browseCategories.map((category, index) => (
          <div 
            key={index} 
            style={compact ? styles.buttonCompact : styles.button}
            onClick={() => handleCategoryClick(category.slug)}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
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

// Browse categories with search links
const browseCategories = [
  { label: 'Action Movies', slug: 'action' },
  { label: 'Comedy Films', slug: 'comedy' }, 
  { label: 'Sci-Fi Classics', slug: 'sci-fi' },
  { label: 'Horror Movies', slug: 'horror' },
  { label: 'Drama Films', slug: 'drama' },
  { label: 'Animated Movies', slug: 'animated' },
  { label: 'Thriller Films', slug: 'thriller' },
  { label: 'Romance Movies', slug: 'romance' },
  { label: 'Documentary', slug: 'documentary' },
  { label: 'Foreign Films', slug: 'foreign' },
  { label: 'Marvel Movies', slug: 'marvel' },
  { label: 'Film Noir', slug: 'noir' }
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
    gap: '12px',
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

export default CategoryBrowse;