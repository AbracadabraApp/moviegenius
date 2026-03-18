// components/NavBar.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Clapperboard, Sparkles, User } from 'lucide-react';
import { shouldShowPhoneFrame } from '../lib/platform';
import Link from 'next/link';

export default function NavBar({ navItems = [], routeValidation = {}, isMobile = false }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [showFrame, setShowFrame] = useState(true); // Always start with desktop frame
  
  // Calculate initial active state to prevent flashing - enhanced safety
  const getActiveLabel = pathname => {
    try {
      // Safety checks for edge cases
      if (!pathname || typeof pathname !== 'string' || !Array.isArray(navItems)) {
        return null;
      }
      
      const activeItem = navItems.find(item => {
        // Ensure item has required properties
        if (!item || !item.route || typeof item.route !== 'string') {
          return false;
        }
        
        if (item.route === pathname) return true;
        // Movies active for /movie/[id] and /search pages
        if (
          item.route === '/movies' &&
          (pathname.startsWith('/movie/') || pathname.startsWith('/search'))
        ) {
          return true;
        }
        // You active for /you/* or /what-to-watch pages
        if ((item.route === '/what-to-watch' || item.route === '/you') &&
            (pathname.startsWith('/you/') || pathname.startsWith('/what-to-watch'))) {
          return true;
        }
        // Use centralized logic for Genius active state
        if (item.route === '/genius') {
          return routeValidation.shouldShowGeniusActive ? routeValidation.shouldShowGeniusActive(pathname) : false;
        }
        return false;
      });
      
      return activeItem?.label || null;
    } catch (error) {
      // Silently handle errors to prevent hydration mismatches
      return null;
    }
  };

  const [activeLabel, setActiveLabel] = useState(() =>
    getActiveLabel(router.asPath || router.pathname)
  );

  // HOOK ORDER FIX: Move ALL useEffect hooks before any early returns
  // First useEffect: Client detection and frame setup
  useEffect(() => {
    // Set client flag first to prevent hydration mismatch
    setIsClient(true);
    // Update frame visibility only after client hydration  
    setShowFrame(shouldShowPhoneFrame());
  }, []);

  // Second useEffect: Route change handling (now always called)
  useEffect(() => {
    // Conditional logic INSIDE the hook instead of conditional hook execution
    if (router.isReady) {
      const newActiveLabel = getActiveLabel(router.asPath || router.pathname);
      setActiveLabel(newActiveLabel);
    }
  }, [router.isReady, router.asPath, router.pathname]);

  // Icon mapping for nav items (moved before early return)
  const iconMap = {
    Clapperboard: Clapperboard,
    Sparkles: Sparkles,
    User: User,
  };

  // Early return AFTER all hooks to prevent hook order violations
  if (!isClient) {
    return (
      <nav style={{...styles.nav, ...styles.navDesktop}}>
        {navItems.map(item => {
          try {
            const Icon = iconMap[item.icon];
            const isActive = activeLabel === item.label;

            if (!Icon || !item.route || typeof item.route !== 'string') {
              return null;
            }

            return (
              <Link key={item.label} href={item.route} style={{ textDecoration: 'none' }}>
                <div style={{...styles.navItem, opacity: isActive ? 1 : 0.6, transform: isActive ? 'translateY(-2px)' : 'none'}}>
                  <Icon size={22} style={{...styles.icon, transform: isActive ? 'scale(1.15)' : 'scale(1)'}} />
                  <span style={styles.labelContainer}>
                    <span style={styles.label}>{item.label}</span>
                    {isActive && <div style={styles.underline} />}
                  </span>
                </div>
              </Link>
            );
          } catch (error) {
            return (
              <div key={item.label} style={{ ...styles.navItem, opacity: 0.4 }}>
                <span style={styles.label}>{item.label}</span>
              </div>
            );
          }
        })}
      </nav>
    );
  }

  // Always render same DOM structure, use CSS for positioning differences  
  // This prevents hydration mismatches by keeping DOM identical
  return (
    <nav
      style={{
        ...styles.nav,
        // Apply mobile/desktop positioning via CSS instead of conditional rendering
        ...(showFrame ? styles.navDesktop : styles.navMobile),
      }}
    >
      {navItems.map(item => {
        try {
          const Icon = iconMap[item.icon];
          const isActive = activeLabel === item.label;

          // Ensure Icon is valid before rendering
          if (!Icon) {
            // Remove console.error to prevent hydration mismatches
            return null;
          }

          // Ensure route is valid
          if (!item.route || typeof item.route !== 'string') {
            // Remove console.error to prevent hydration mismatches
            return null;
          }

          return (
            <Link key={item.label} href={item.route} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  ...styles.navItem,
                  opacity: isActive ? 1 : 0.6,
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}
              >
                <Icon
                  size={22} // Reduced from 28 to 22 for more compact look
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
            </Link>
          );
        } catch (error) {
          // Remove console.error to prevent hydration mismatches
          // Return fallback nav item without Link
          return (
            <div key={item.label} style={{ ...styles.navItem, opacity: 0.4 }}>
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
    borderTopLeftRadius: '0', // Flat design - no rounded corners
    borderTopRightRadius: '0',
    padding: '0', // Remove nav padding so touch targets can fill full height
    boxShadow: 'none', // Flat design - no shadow
    boxSizing: 'border-box',
  },
  navMobile: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100vw',
    zIndex: 1000,
    margin: 0,
  },
  navDesktop: {
    position: 'absolute',
    bottom: '49px', // Above Safari bottom bar (updated height)
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 1000,
    borderBottomLeftRadius: 0, // Remove bottom radius since Safari bar is below
    borderBottomRightRadius: 0,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', // Center content within full height
    gap: '2px', // Further reduced from 3px to 2px for ultra-compact
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '12px', // Keep same font size for readability
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    padding: '6px 17px', // Add back vertical spacing for icons within full-height touch targets
    height: '100%', // Extend touch target to full nav bar height
  },
  icon: {
    transition: 'all 0.3s ease',
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
    bottom: -2, // Further reduced from -3 to -2 for ultra-compact
    left: '15%',
    right: '15%',
    height: '1.5px', // Keep same thickness for visibility
    backgroundColor: '#ffffff',
    borderRadius: '1px',
    opacity: 0.9,
  },
};
