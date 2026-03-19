/**
 * NetflixCarousel Component - Enhanced carousel with Netflix-style features
 *
 * Features:
 * - Left/right navigation arrows that appear on hover
 * - Smooth scrolling with scroll-snap
 * - Hover effects on individual cards
 * - Mobile-first responsive design
 * - Touch scrolling support
 */

import { useRouter } from 'next/router';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NetflixCard from './NetflixCard';

export default function NetflixCarousel({
  title,
  movies = [],
  collectionId = null,
  showViewAll = true,
  categoryLabel = null
}) {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  if (!movies || movies.length === 0) {
    return null;
  }

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction) => {
    if (!scrollRef.current) return;

    const scrollAmount = scrollRef.current.offsetWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleViewAll = () => {
    if (collectionId) {
      router.push(`/browse/${collectionId}`);
    }
  };

  return (
    <section style={styles.section}>
      {/* Section Header */}
      <div style={styles.header}>
        <div>
          {categoryLabel && (
            <p style={styles.categoryLabel}>{categoryLabel}</p>
          )}
          <h2 style={styles.title}>{title}</h2>
        </div>
        {showViewAll && collectionId && (
          <button onClick={handleViewAll} style={styles.viewAllButton}>
            View All →
          </button>
        )}
      </div>

      {/* Horizontal Scrolling Carousel with Navigation */}
      <div
        style={styles.carouselWrapper}
        onMouseEnter={() => movies.length > 4 && setShowRightArrow(scrollRef.current?.scrollLeft < scrollRef.current?.scrollWidth - scrollRef.current?.clientWidth - 10)}
      >
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            style={{...styles.navButton, ...styles.leftButton}}
            aria-label="Scroll left"
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'}
          >
            <ChevronLeft size={32} color="#ffffff" />
          </button>
        )}

        {/* Carousel */}
        <div
          ref={scrollRef}
          style={styles.carousel}
          onScroll={handleScroll}
        >
          {movies.map((movie, index) => (
            <div
              key={`${movie.tmdb_id}-${index}`}
              style={styles.cardWrapper}
            >
              <NetflixCard
                movie={movie}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && movies.length > 4 && (
          <button
            onClick={() => scroll('right')}
            style={{...styles.navButton, ...styles.rightButton}}
            aria-label="Scroll right"
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'}
          >
            <ChevronRight size={32} color="#ffffff" />
          </button>
        )}
      </div>
    </section>
  );
}

const styles = {
  section: {
    marginBottom: '32px',
    position: 'relative',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '0 16px 8px 16px',
  },

  categoryLabel: {
    fontSize: '11px',
    fontWeight: '400',
    color: '#ffffff',
    opacity: 0.7,
    margin: '0 0 2px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  viewAllButton: {
    background: 'none',
    border: 'none',
    color: '#d4af37',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    flexShrink: 0,
  },

  carouselWrapper: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },

  carousel: {
    display: 'flex',
    overflowX: 'auto',
    gap: '8px',
    padding: '0 16px 16px 16px',
    scrollSnapType: 'x mandatory',
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },

  cardWrapper: {
    flex: '0 0 auto',
    width: '140px',
    scrollSnapAlign: 'start',
  },

  navButton: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    width: '48px',
    height: '140px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.3s ease, opacity 0.3s ease',
    opacity: 0.9,
    padding: 0,
  },

  leftButton: {
    left: 0,
    background: 'linear-gradient(to right, rgba(0, 0, 0, 0.7), transparent)',
  },

  rightButton: {
    right: 0,
    background: 'linear-gradient(to left, rgba(0, 0, 0, 0.7), transparent)',
  },
};

// Add webkit scrollbar hiding via style injection
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .netflix-carousel::-webkit-scrollbar {
      display: none;
    }
  `;
  if (!document.getElementById('netflix-carousel-styles')) {
    style.id = 'netflix-carousel-styles';
    document.head.appendChild(style);
  }
}
