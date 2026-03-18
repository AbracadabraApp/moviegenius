/**
 * MovieGenius Homepage - V1 Word Wheel Only
 *
 * Simple landing page with background images and word wheel search
 * All search results handled via SimpleSearch dropdown
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';

export default function MovieGeniusPage() {
  const router = useRouter();

  // Background images from /public/images/backgrounds/
  // Add any jpg/png files to that folder and they'll automatically rotate
  const backgroundImages = [
    '/images/backgrounds/1.jpg',
    '/images/backgrounds/2.jpg',
    '/images/backgrounds/3.jpg',
    '/images/backgrounds/4.jpg',
    '/images/backgrounds/5.jpg',
    '/images/backgrounds/6.jpg',
    '/images/backgrounds/7.jpg',
    '/images/backgrounds/8.jpg',
    '/images/backgrounds/9.jpg',
    '/images/backgrounds/10.jpg',
    '/images/backgrounds/11.jpg',
    '/images/backgrounds/12.jpg',
    '/images/backgrounds/13.jpg',
    '/images/backgrounds/14.jpg',
    '/images/backgrounds/15.jpg',
    '/images/backgrounds/16.jpg',
    '/images/backgrounds/17.jpg',
    '/images/backgrounds/18.jpg',
    '/images/backgrounds/19.jpg',
    '/images/backgrounds/20.jpg',
    '/images/backgrounds/21.jpg',
    '/images/backgrounds/22.jpg',
    '/images/backgrounds/23.jpg',
    '/images/backgrounds/24.jpg',
    '/images/backgrounds/25.jpg',
    '/images/backgrounds/26.jpg',
    '/images/backgrounds/27.jpg',
    '/images/backgrounds/28.jpg',
    '/images/backgrounds/29.jpg',
  ];

  // Pick random image on each page load
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Select new random image on each page load/mount
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    console.log('🎬 Background image selected:', randomIndex, backgroundImages[randomIndex]);
    setCurrentImageIndex(randomIndex);
  }, [router.asPath]); // Re-run when route changes

  return (
    <PhoneFrame
      backgroundImage={backgroundImages[currentImageIndex]}
      showDarkOverlay={false}
    >
      <div style={styles.container}>
        {/* Search header */}
        <div style={styles.header}>
          <SimpleSearch placeholder="Search movies..." />
        </div>

        {/* Content area - background shows through */}
        <div style={styles.content}>
          {/* V1: Word wheel only - no search results page */}
          {/* SimpleSearch component handles all search via dropdown */}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  header: {
    backgroundColor: 'rgba(34, 34, 34, 0.9)', // Match nav bar #222
    padding: '16px',
    position: 'relative',
    zIndex: 10,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    position: 'relative',
    zIndex: 10,
  },
};
