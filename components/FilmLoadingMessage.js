/**
 * FilmLoadingMessage Component - 🔒 LOCKED COMPONENT 🔒
 * 
 * ⚠️  CRITICAL: Prevents technical message exposure to users
 * ⚠️  DO NOT show TMDB, API, or technical details in loading messages
 * ⚠️  ALWAYS use film-themed messages from loading-messages.json
 * 
 * Standard loading component with cinema-themed messages and icons.
 * Replaces plain "Loading..." and technical messages throughout the app.
 * 
 * @component
 * @version LOCKED-2025-06-25
 * @example
 * <FilmLoadingMessage message="Consulting the film critics..." />
 * <FilmLoadingMessage cycling={true} interval={3000} />
 */
import { useState, useEffect } from 'react';
import loadingMessages from '../data/loading-messages.json';

/**
 * FilmLoadingMessage - Cinema-themed loading component
 * 
 * @param {Object} props
 * @param {string} props.message - Specific message to show (optional)
 * @param {boolean} props.cycling - Whether to cycle through messages (default: false)
 * @param {number} props.interval - Cycling interval in ms (default: 5000)
 * @param {string} props.icon - Specific icon to show (optional)
 * @param {Object} props.style - Additional styles (optional)
 * @param {string} props.size - Size variant: 'small', 'medium', 'large' (default: 'medium')
 */
export default function FilmLoadingMessage({ 
  message, 
  cycling = false, 
  interval = 5000,
  icon,
  style = {},
  size = 'medium'
}) {
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentIcon, setCurrentIcon] = useState('');

  // 🔒 LOCKED: Film-themed icons - do not add technical icons
  const filmIcons = [
    'film-movie-reel-icon.png',
    'film-movie-icon.png',
    'chair-director-outline-icon.png',
    'movie-media-player-icon.png',
    'play-button-round-icon.png'
  ];

  // 🔒 LOCKED: Message selection - always use film-themed content
  const getRandomMessage = () => {
    if (message) return message; // Use specific message if provided
    
    // Select from film-themed messages only
    const randomIndex = Math.floor(Math.random() * loadingMessages.length);
    return loadingMessages[randomIndex];
  };

  const getRandomIcon = () => {
    if (icon) return icon; // Use specific icon if provided
    
    const randomIndex = Math.floor(Math.random() * filmIcons.length);
    return filmIcons[randomIndex];
  };

  // Initialize message and icon
  useEffect(() => {
    setCurrentMessage(getRandomMessage());
    setCurrentIcon(getRandomIcon());
  }, [message, icon]);

  // Set up cycling if enabled
  useEffect(() => {
    if (!cycling) return;

    const cycleInterval = setInterval(() => {
      setCurrentMessage(getRandomMessage());
      setCurrentIcon(getRandomIcon());
    }, interval);

    return () => clearInterval(cycleInterval);
  }, [cycling, interval, message, icon]);

  // Size-based styling
  const sizeStyles = {
    small: {
      container: { padding: '4px 8px' },
      icon: { width: '24px', height: '24px' },
      text: { fontSize: '12px' }
    },
    medium: {
      container: { padding: '8px 12px' },
      icon: { width: '32px', height: '32px' },
      text: { fontSize: '14px' }
    },
    large: {
      container: { padding: '12px 16px' },
      icon: { width: '48px', height: '48px' },
      text: { fontSize: '16px' }
    }
  };

  const currentSizeStyles = sizeStyles[size] || sizeStyles.medium;

  return (
    <div style={{
      ...styles.container,
      ...currentSizeStyles.container,
      ...style
    }}>
      <div style={styles.contentRow}>
        {currentIcon && (
          <img 
            src={`/icons/loading/${currentIcon}`}
            alt="Loading..." 
            style={{
              ...styles.icon,
              ...currentSizeStyles.icon
            }}
          />
        )}
        <span style={{
          ...styles.text,
          ...currentSizeStyles.text
        }}>
          {currentMessage}
        </span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  contentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  icon: {
    objectFit: 'contain',
  },
  text: {
    color: 'inherit',
    fontFamily: 'inherit',
    fontWeight: '400',
  },
};

// 🔒 LOCKED: Export validation patterns for integrity checker
export const FILM_LOADING_PATTERNS = {
  // Ensure no technical messages leak through
  noTechnicalMessages: /(?!.*(TMDB|API|fetch|database|server|endpoint))/i,
  
  // Ensure film-themed messages are used
  usesFilmThemes: /(film|movie|cinema|director|critic|archive|vault|studio|screen)/i,
  
  // Ensure proper icons are used
  usesFilmIcons: /(film-movie|chair-director|movie-media|play-button)/,
};