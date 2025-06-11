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
    { label: 'Movies', icon: Clapperboard, route: '/recs' },
    { label: 'Genius', icon: Sparkles, route: '/ask' },
    { label: 'You', icon: User, route: '/you' },
  ];

  const activeLabel = navItems.find(
    (item) => item.route === router.pathname
  )?.label;

  const handleNavClick = (route, isActive) => {
    if (isActive) {
      // If clicking the same page, refresh to "home state"
      // Force a complete page reload to reset all state
      window.location.href = route;
    } else {
      // Normal navigation to different page
      router.push(route);
    }
  };

  return (
    <nav style={{
      ...styles.nav,
      ...(showFrame ? styles.navDesktop : styles.navMobile)
    }}>
      {navItems.map(({ label, icon: Icon, route }) => {
        const isActive = activeLabel === label;
        return (
          <div
            key={label} 
            style={{
              ...styles.navItem,
              opacity: isActive ? 1 : 0.6,
              transform: isActive ? 'translateY(-2px)' : 'none',
            }}
            onClick={() => handleNavClick(route, isActive)}
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
          </div>
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
