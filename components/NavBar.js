// components/NavBar.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Clapperboard, Sparkles, User } from 'lucide-react';
import { shouldShowPhoneFrame } from '../lib/platform';

export default function NavBar() {
  const router = useRouter();
  const [showFrame, setShowFrame] = useState(true); // Default to frame for SSR

  useEffect(() => {
    // Client-side detection
    setShowFrame(shouldShowPhoneFrame());
  }, []);

  const navItems = [
    { label: 'Movies', icon: Clapperboard, route: '/movies' },
    { label: 'Genius', icon: Sparkles, route: '/genius' },
    { label: 'You', icon: User, route: '/you' },
  ];

  const themeKeys = [
    'film-noir', 'horror-suspense', 'comedy-through-time', 'women-directors',
    'world-cinema', 'acclaimed-directors', 'avant-garde-film', 'magic-of-moviemaking',
    'cinema-through-decades', 'cinema-cultural-impact'
  ];

  const activeLabel = navItems.find(
    (item) => {
      if (item.route === router.pathname) return true;
      // Theme pages and episode pages should be considered part of Genius
      if (item.route === '/genius') {
        const pathname = router.pathname.slice(1); // Remove leading slash
        // Check if it's a theme page (e.g., "film-noir") 
        if (themeKeys.includes(pathname)) return true;
        // Check if it's an episode page (e.g., "film-noir/urban-anxiety")
        const themePart = pathname.split('/')[0];
        if (themeKeys.includes(themePart)) return true;
      }
      return false;
    }
  )?.label;


  return (
    <nav style={{
      ...styles.nav,
      ...(showFrame ? styles.navDesktop : styles.navMobile)
    }}>
      {navItems.map(({ label, icon: Icon, route }) => {
        const isActive = activeLabel === label;
        return (
          <a
            key={label} 
            href={route}
            style={{
              ...styles.navItem,
              opacity: isActive ? 1 : 0.6,
              transform: isActive ? 'translateY(-2px)' : 'none',
            }}
            onClick={(e) => {
              e.preventDefault();
              window.location.href = route;
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
              <span style={styles.label}>{label}</span>
              {isActive && <div style={styles.underline} />}
            </span>
          </a>
        );
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
