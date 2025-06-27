/**
 * Loading Spinner Component
 * 
 * A reusable loading indicator with customizable size and color.
 * Provides visual feedback during async operations.
 */
import React from 'react';

/**
 * LoadingSpinner - displays an animated loading indicator
 * 
 * @param {Object} props
 * @param {('small'|'medium'|'large')} props.size - Size of the spinner
 * @param {string} props.color - Color of the spinner (CSS color value)
 * @param {string} props.className - Additional CSS classes
 */
export default function LoadingSpinner({ 
  size = 'medium', 
  color = '#3b82f6',
  className = '' 
}) {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32,
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  return (
    <div 
      className={`loading-spinner ${className}`}
      style={styles.container}
      role="status"
      aria-label="Loading"
    >
      <svg
        width={spinnerSize}
        height={spinnerSize}
        viewBox="0 0 24 24"
        fill="none"
        style={styles.spinner}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeOpacity="0.25"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          style={styles.path}
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  path: {
    transformOrigin: 'center',
  },
};