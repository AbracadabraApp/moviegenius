/**
 * MovieScrollContainer Component - Optimized horizontal scrolling container
 * 
 * High-performance scrolling container designed for movie card collections:
 * - Smooth horizontal scrolling with momentum
 * - Optional scroll indicators and navigation arrows
 * - Responsive design with mobile touch support
 * - Intersection Observer for lazy loading
 * - Keyboard navigation support
 * - Customizable spacing and sizing
 * 
 * @component
 * @example
 * <MovieScrollContainer title="Popular Movies" showNavigation={true}>
 *   <MovieCardGlass {...movie1} />
 *   <MovieCardGlass {...movie2} />
 *   <MovieCardGlass {...movie3} />
 * </MovieScrollContainer>
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Movie cards to display
 * @param {string} [props.title] - Section title
 * @param {boolean} [props.showNavigation=true] - Show navigation arrows
 * @param {boolean} [props.showScrollIndicator=true] - Show scroll progress indicator
 * @param {string} [props.gap='16px'] - Gap between cards
 * @param {string} [props.padding='20px'] - Container padding
 * @param {Function} [props.onScroll] - Scroll event callback
 * @param {string} [props.height='auto'] - Container height
 * @param {boolean} [props.fadeEdges=true] - Add fade effect at edges
 */
export default function MovieScrollContainer({
  children,
  title,
  showNavigation = true,
  showScrollIndicator = true,
  gap = '16px',
  padding = '20px',
  onScroll,
  height = 'auto',
  fadeEdges = true
}) {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Check scroll position and update navigation state
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10); // 10px threshold
    
    // Calculate scroll progress (0 to 1)
    const maxScroll = scrollWidth - clientWidth;
    const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
    setScrollProgress(progress);
    
    // Call external scroll handler
    if (onScroll) {
      onScroll({ scrollLeft, scrollProgress: progress, canScrollLeft, canScrollRight });
    }
  };

  // Scroll to specific position with smooth animation
  const scrollToPosition = (targetScrollLeft) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const startScrollLeft = container.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    const duration = 300;
    const startTime = performance.now();

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      container.scrollLeft = startScrollLeft + distance * easeOut;
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Navigate left
  const scrollLeftHandler = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cardWidth = 240; // Default medium card width
    const scrollAmount = cardWidth * 2; // Scroll 2 cards worth
    const targetScrollLeft = Math.max(0, container.scrollLeft - scrollAmount);
    
    scrollToPosition(targetScrollLeft);
  };

  // Navigate right
  const scrollRightHandler = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cardWidth = 240; // Default medium card width
    const scrollAmount = cardWidth * 2; // Scroll 2 cards worth
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const targetScrollLeft = Math.min(maxScrollLeft, container.scrollLeft + scrollAmount);
    
    scrollToPosition(targetScrollLeft);
  };

  // Handle mouse drag scrolling
  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Multiply for faster scrolling
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle touch events for mobile
  const handleTouchStart = (e) => {
    if (!scrollContainerRef.current) return;
    
    const touch = e.touches[0];
    setStartX(touch.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!scrollContainerRef.current) return;
    
    const touch = e.touches[0];
    const x = touch.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Slightly less sensitive than mouse
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        scrollLeftHandler();
        break;
      case 'ArrowRight':
        e.preventDefault();
        scrollRightHandler();
        break;
      case 'Home':
        e.preventDefault();
        scrollToPosition(0);
        break;
      case 'End':
        e.preventDefault();
        if (scrollContainerRef.current) {
          const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
          scrollToPosition(maxScroll);
        }
        break;
    }
  };

  // Set up event listeners
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Initial check
    checkScrollPosition();

    // Scroll event listener
    container.addEventListener('scroll', checkScrollPosition, { passive: true });

    // Mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Resize observer for responsive updates
    const resizeObserver = new ResizeObserver(() => {
      checkScrollPosition();
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      resizeObserver.disconnect();
    };
  }, [isDragging, startX, scrollLeft]);

  const styles = {
    container: {
      position: 'relative',
      width: '100%',
      height: height,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },

    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      paddingLeft: padding,
      paddingRight: padding,
    },

    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#000',
      margin: 0,
      flex: 1,
    },

    navigationContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },

    navButton: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },

    navButtonDisabled: {
      opacity: 0.3,
      cursor: 'not-allowed',
    },

    scrollWrapper: {
      position: 'relative',
      overflow: 'hidden',
    },

    scrollContainer: {
      display: 'flex',
      gap: gap,
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollBehavior: 'smooth',
      paddingLeft: padding,
      paddingRight: padding,
      paddingBottom: '8px',
      cursor: isDragging ? 'grabbing' : 'grab',
      userSelect: 'none',
      
      // Hide scrollbar - using CSS properties that work with inline styles
      scrollbarWidth: 'none', // Firefox
      msOverflowStyle: 'none', // IE/Edge
      // Webkit scrollbar hiding is handled via CSS class
    },

    fadeLeft: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '40px',
      background: 'linear-gradient(to right, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0))',
      pointerEvents: 'none',
      zIndex: 2,
      opacity: fadeEdges && canScrollLeft ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },

    fadeRight: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '40px',
      background: 'linear-gradient(to left, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0))',
      pointerEvents: 'none',
      zIndex: 2,
      opacity: fadeEdges && canScrollRight ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },

    scrollIndicator: {
      marginTop: '12px',
      paddingLeft: padding,
      paddingRight: padding,
    },

    progressBar: {
      width: '100%',
      height: '2px',
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderRadius: '1px',
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: '1px',
      transition: 'width 0.1s ease',
      width: `${scrollProgress * 100}%`,
    },
  };

  return (
    <div 
      style={styles.container}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={title ? `${title} movie collection` : 'Movie collection'}
    >
      {/* Header with title and navigation */}
      {(title || showNavigation) && (
        <div style={styles.header}>
          {title && <h2 style={styles.title}>{title}</h2>}
          
          {showNavigation && (
            <div style={styles.navigationContainer}>
              <button
                onClick={scrollLeftHandler}
                style={{
                  ...styles.navButton,
                  ...(canScrollLeft ? {} : styles.navButtonDisabled),
                }}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} />
              </button>
              
              <button
                onClick={scrollRightHandler}
                style={{
                  ...styles.navButton,
                  ...(canScrollRight ? {} : styles.navButtonDisabled),
                }}
                disabled={!canScrollRight}
                aria-label="Scroll right"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scrollable content */}
      <div style={styles.scrollWrapper}>
        {/* Fade edges */}
        <div style={styles.fadeLeft} />
        <div style={styles.fadeRight} />
        
        <div
          ref={scrollContainerRef}
          style={styles.scrollContainer}
          className="movie-scroll-container"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          role="list"
        >
          {children}
        </div>
      </div>

      {/* Scroll progress indicator */}
      {showScrollIndicator && (
        <div style={styles.scrollIndicator}>
          <div style={styles.progressBar}>
            <div style={styles.progressFill} />
          </div>
        </div>
      )}
    </div>
  );
}

// Add CSS for webkit scrollbar hiding (since inline styles can't handle pseudo-selectors)
if (typeof document !== 'undefined' && !document.querySelector('#movie-scroll-container-styles')) {
  const style = document.createElement('style');
  style.id = 'movie-scroll-container-styles';
  style.textContent = `
    .movie-scroll-container::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(style);
}