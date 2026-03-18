// components/PhoneFrame.js - WITH MY CLEAN NAVBAR
import { useEffect, useState } from 'react';
import { shouldShowPhoneFrame, getPlatformName } from '../lib/platform';
import NavBar from './NavBar';
import { routeValidation, navItems, navItemsWithGenius } from '../lib/routes';
import { ChevronLeft, ChevronRight, Copy, Share, RotateCcw } from 'lucide-react';

export default function PhoneFrame({ children, backgroundImage, showDarkOverlay = false }) {
  const [isClient, setIsClient] = useState(false);
  const [showFrame, setShowFrame] = useState(true); // Always start with desktop frame
  const [platform, setPlatform] = useState('');
  const [showGeniusTab, setShowGeniusTab] = useState(false);

  useEffect(() => {
    // Set client flag first to prevent hydration mismatch
    setIsClient(true);
    // Update frame visibility only after client hydration
    setShowFrame(shouldShowPhoneFrame());
    setPlatform(getPlatformName());

    // Check for genius easter egg in URL
    const params = new URLSearchParams(window.location.search);
    setShowGeniusTab(params.get('genius') === 'true');
  }, []);

  // Use navItems with or without Genius based on easter egg
  const currentNavItems = showGeniusTab ? navItemsWithGenius : navItems;

  // During SSR, always render desktop layout to prevent hydration mismatch
  if (!isClient) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.phoneFrame}>
          <div style={styles.screen}>
            {/* Background Image */}
            {backgroundImage && (
              <>
                <img
                  src={backgroundImage}
                  alt="Background"
                  style={styles.backgroundImage}
                />
                {showDarkOverlay && <div style={styles.backgroundOverlay} />}
              </>
            )}
            <div style={styles.content}>{children}</div>
            <NavBar navItems={navItems} routeValidation={routeValidation} isMobile={false} />
            {/* iPhone Safari Bottom Bar */}
            <div style={styles.safariBottomBar}>
              <div style={styles.safariControls}>
                <button style={styles.safariButton} disabled>
                  <ChevronLeft size={20} color="rgba(0, 0, 0, 0.3)" strokeWidth={2.5} />
                </button>
                <button style={styles.safariButton} disabled>
                  <ChevronRight size={20} color="rgba(0, 0, 0, 0.3)" strokeWidth={2.5} />
                </button>
                <button style={styles.safariButton}>
                  <Share size={18} color="rgba(0, 0, 0, 0.7)" strokeWidth={2} />
                </button>
                <button style={styles.safariButton}>
                  <div style={styles.tabsIcon}>
                    <div style={styles.tabsIconInner}>1</div>
                  </div>
                </button>
              </div>
              <div style={styles.homeIndicator}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Always render same DOM structure, use CSS for responsive layout differences
  // This prevents hydration mismatches by keeping DOM identical
  return (
    <div style={{
      ...styles.pageContainer,
      // Apply mobile-specific styles via CSS instead of conditional rendering
      ...(showFrame ? {} : styles.mobileOverrides)
    }}>
      <div style={{
        ...styles.phoneFrame,
        // Hide frame styling on mobile, keep structure
        ...(showFrame ? {} : styles.mobileFrameOverrides)
      }}>
        <div style={{
          ...styles.screen,
          ...(showFrame ? {} : styles.mobileScreenOverrides)
        }}>
          {/* Background Image */}
          {backgroundImage && (
            <>
              <img
                src={backgroundImage}
                alt="Background"
                style={styles.backgroundImage}
              />
              {showDarkOverlay && <div style={styles.backgroundOverlay} />}
            </>
          )}
          <div style={{
            ...styles.content,
            ...(showFrame ? {} : styles.mobileContentOverrides)
          }}>{children}</div>
          <NavBar navItems={currentNavItems} routeValidation={routeValidation} isMobile={!showFrame} />
          {/* iPhone Safari Bottom Bar - only show in desktop phone frame */}
          {showFrame && (
            <div style={styles.safariBottomBar}>
              <div style={styles.safariControls}>
                <button style={styles.safariButton} disabled>
                  <ChevronLeft size={20} color="rgba(0, 0, 0, 0.3)" strokeWidth={2.5} />
                </button>
                <button style={styles.safariButton} disabled>
                  <ChevronRight size={20} color="rgba(0, 0, 0, 0.3)" strokeWidth={2.5} />
                </button>
                <button style={styles.safariButton}>
                  <Share size={18} color="rgba(0, 0, 0, 0.7)" strokeWidth={2} />
                </button>
                <button style={styles.safariButton}>
                  <div style={styles.tabsIcon}>
                    <div style={styles.tabsIconInner}>1</div>
                  </div>
                </button>
              </div>
              <div style={styles.homeIndicator}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  // Desktop layout with phone frame
  pageContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    minHeight: '100vh',
    padding: '20px',
    width: '100vw',
    maxWidth: '100vw',
    overflowX: 'hidden',
  },
  phoneFrame: {
    width: '375px',
    height: '667px',
    backgroundColor: '#000000',
    borderRadius: '24px',
    border: '4px solid #9ca3af',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
  },
  screen: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden', // Clips any content that extends beyond bounds
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    overflowX: 'hidden', // Prevent horizontal scroll
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    paddingBottom: '120px', // Space for sticky navbar and content
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 10,
  },
  
  // iPhone Safari Bottom Bar - Light grey placeholder frame like in screenshot
  safariBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '49px',
    backgroundColor: 'rgba(248, 248, 248, 0.94)',
    borderBottomLeftRadius: '16px',
    borderBottomRightRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: '6px',
    paddingBottom: '8px',
    backdropFilter: 'blur(20px)',
    borderTop: '0.5px solid rgba(0, 0, 0, 0.08)',
    zIndex: 1001, // Above navbar
  },
  
  safariControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: '16px',
    paddingRight: '16px',
    height: '30px',
  },
  
  safariButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    minWidth: '44px',
    minHeight: '44px',
  },
  
  tabsIcon: {
    width: '20px',
    height: '16px',
    border: '1.5px solid #007AFF',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  
  tabsIconInner: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#007AFF',
    lineHeight: 1,
  },
  
  homeIndicator: {
    width: '134px',
    height: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '2.5px',
    alignSelf: 'center',
  },

  // Mobile overrides - applied via CSS instead of conditional rendering
  mobileOverrides: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#ffffff',
    padding: 0,
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  },
  mobileFrameOverrides: {
    width: '100%',
    height: '100vh',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    border: 'none',
    boxShadow: 'none',
    padding: 0,
  },
  mobileScreenOverrides: {
    borderRadius: 0,
  },
  mobileContentOverrides: {
    width: '100%',
  },

  // Background image styles - using img tag approach from hero images
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    zIndex: 0,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)',
    zIndex: 1,
  },
};
