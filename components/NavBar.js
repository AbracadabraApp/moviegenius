// components/NavBar.js
import { useRouter } from 'next/router';
import { Clapperboard, Sparkles, User } from 'lucide-react';

export default function NavBar() {
  const router = useRouter();

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
    <nav style={styles.nav}>
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
              size={24}
              style={{
                ...styles.icon,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
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
    borderTopLeftRadius: '14px',
    borderTopRightRadius: '14px',
    padding: '12px 0',
    boxShadow: '0 -3px 12px rgba(0,0,0,0.3)',
    width: '100%',
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '13px',
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
