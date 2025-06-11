// components/PhoneFrame.js
import { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { shouldShowPhoneFrame, getPlatformName } from '../lib/platform';

export default function PhoneFrame({ children, active }) {
  const [showFrame, setShowFrame] = useState(true); // Default to frame for SSR
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    // Client-side detection
    setShowFrame(shouldShowPhoneFrame());
    setPlatform(getPlatformName());
  }, []);

  // Mobile layout (no frame)
  if (!showFrame) {
    return (
      <div style={styles.mobileContainer}>
        <div style={styles.mobileContent}>{children}</div>
        <NavBar active={active} />
      </div>
    );
  }

  // Desktop layout (with phone frame)
  return (
    <div style={styles.pageContainer}>
      <div style={styles.phoneFrame}>
        <div style={styles.screen}>
          <div style={styles.content}>{children}</div>
          <NavBar active={active} />
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
    paddingBottom: '90px', // Space for sticky navbar
  },
  
  // Mobile layout (full screen)
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  },
  mobileContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    width: '100%',
    paddingBottom: '90px', // Space for sticky navbar
  },
};
