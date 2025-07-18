// components/NavBar.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Clapperboard, Sparkles, User } from 'lucide-react';
import { shouldShowPhoneFrame } from '../lib/platform';
import Link from 'next/link';

// Safe imports with fallbacks
let navItems, routeValidation;
try {
  const routes = require('../lib/routes');
  navItems = routes.navItems || [];
  routeValidation = routes.routeValidation || { shouldShowGeniusActive: () => false };
  
  // Validate routes are properly loaded
  if (!Array.isArray(navItems) || navItems.length === 0) {
    throw new Error('navItems is empty or invalid');
  }
} catch (error) {
  console.error('NavBar: Failed to load routes, using fallbacks:', error);
  navItems = [
    { label: 'Movies', icon: 'Clapperboard', route: '/movies' },
    { label: 'Genius', icon: 'Sparkles', route: '/genius' },
    { label: 'You', icon: 'User', route: '/you' }
  ];
  routeValidation = { shouldShowGeniusActive: () => false };
}

export default function NavBar() {
  const router = useRouter();
  const [showFrame, setShowFrame] = useState(true); // Default to frame for SSR
  const [activeLabel, setActiveLabel] = useState(null); // Start with null to match server render

  useEffect(() => {
    // Client-side detection for frame
    setShowFrame(shouldShowPhoneFrame());
  }, []);

  useEffect(() => {
    // Client-side active state calculation
    if (router.isReady) {
      try {
        const active = navItems.find(
          (item) => {
            if (item.route === router.pathname) return true;
            // Use centralized logic for Genius active state
            if (item.route === '/genius') {
              return routeValidation.shouldShowGeniusActive(router.pathname);
            }
            return false;
          }
        )?.label;
        setActiveLabel(active);
      } catch (error) {
        console.warn('NavBar: Error determining active state:', error);
        setActiveLabel(null);
      }
    }
  }, [router.isReady, router.pathname]); // Re-run on route changes

  // Icon mapping for nav items
  const iconMap = {
    'Clapperboard': Clapperboard,
    'Sparkles': Sparkles,
    'User': User
  };


  return (
    <nav style={{
      ...styles.nav,
      ...(showFrame ? styles.navDesktop : styles.navMobile)
    }}>
      {navItems.map((item) => {
        try {
          const Icon = iconMap[item.icon];
          const isActive = activeLabel === item.label;
          
          // Ensure Icon is valid before rendering
          if (!Icon) {
            console.error(`NavBar: Icon ${item.icon} not found in iconMap`);
            return null;
          }

          // Ensure route is valid
          if (!item.route || typeof item.route !== 'string') {
            console.error(`NavBar: Invalid route for ${item.label}:`, item.route);
            return null;
          }
          
          return (
            <Link
              key={item.label}
              href={item.route}
              passHref
              legacyBehavior
            >
              <a style={{textDecoration: 'none'}}>
                <div
                  style={{
                    ...styles.navItem,
                    opacity: isActive ? 1 : 0.6,
                    transform: isActive ? 'translateY(-2px)' : 'none',
                  }}
                >
                  <Icon
                    size={28}
                    style={{
                      ...styles.icon,
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                  <span style={styles.labelContainer}>
                    <span style={styles.label}>{item.label}</span>
                    {isActive && <div style={styles.underline} />}
                  </span>
                </div>
              </a>
            </Link>
          );
        } catch (error) {
          console.error(`NavBar: Error rendering nav item ${item.label}:`, error);
          // Return fallback nav item without Link
          return (
            <div key={item.label} style={{...styles.navItem, opacity: 0.4}}>
              <span style={styles.label}>{item.label}</span>
            </div>
          );
        }
      })}
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#222',
    borderTopLeftRadius: '20px',
    borderTopRightRadius: '20px',
    padding: '16px 0 20px 0',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
    margin: '0 -1px',
  },
  navMobile: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 1000,
  },
  navDesktop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 1000,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
  },
  icon: {
    transition: 'transform 0.2s ease',
  },
  labelContainer: {
    position: 'relative',
    display: 'inline-block',
  },
  label: {
    transition: 'opacity 0.2s ease',
  },
  underline: {
    position: 'absolute',
    bottom: -4,
    left: '10%',
    right: '10%',
    height: '2px',
    backgroundColor: '#ffffff',
    borderRadius: '1px',
    opacity: 0.9,
  },
};
