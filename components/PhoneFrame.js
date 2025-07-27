// components/PhoneFrame.js - WITH MY CLEAN NAVBAR
import { useEffect, useState } from 'react';
import { shouldShowPhoneFrame, getPlatformName } from '../lib/platform';
import NavBar from './NavBar';
import { routeValidation } from '../lib/routes';

export default function PhoneFrame({ children }) {
  const [isClient, setIsClient] = useState(false);
  const [showFrame, setShowFrame] = useState(true); // Always start with desktop frame
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    // Set client flag first to prevent hydration mismatch
    setIsClient(true);
    // Update frame visibility only after client hydration
    setShowFrame(shouldShowPhoneFrame());
    setPlatform(getPlatformName());
  }, []);

  // NavBar configuration - using MY clean implementation
  const navItems = [
    { label: 'Movies', route: '/movies', icon: 'Clapperboard' },
    { label: 'Genius', route: '/genius', icon: 'Sparkles' },
    { label: 'You', route: '/you', icon: 'User' }
  ];

  // During SSR, always render desktop layout to prevent hydration mismatch
  if (!isClient) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.phoneFrame}>
          <div style={styles.screen}>
            <div style={styles.content}>{children}</div>
            <NavBar navItems={navItems} routeValidation={routeValidation} isMobile={false} />
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
          <div style={{
            ...styles.content,
            ...(showFrame ? {} : styles.mobileContentOverrides)
          }}>{children}</div>
          <NavBar navItems={navItems} routeValidation={routeValidation} isMobile={!showFrame} />
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
    backgroundColor: '#000000',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    paddingBottom: '120px', // Space for sticky navbar and content
  },

  // Mobile overrides - applied via CSS instead of conditional rendering
  mobileOverrides: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#000000',
    padding: 0,
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  },
  mobileFrameOverrides: {
    width: '100%',
    height: '100vh',
    backgroundColor: '#000000',
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
};
