/**
 * BackButton Component - 🔒 STANDARDIZED NAVIGATION 🔒
 *
 * ⚠️  CRITICAL: Provides consistent back navigation across the entire app
 * ⚠️  DO NOT create custom back button implementations
 * ⚠️  ALWAYS use this component for back navigation
 *
 * Standardized back button with smart navigation, consistent styling,
 * and proper browser history integration.
 *
 * @component
 * @version STANDARD-2025-06-25
 * @example
 * <BackButton />
 * <BackButton variant="text" context="movie" />
 * <BackButton fallbackRoute="/ask" position="top-right" />
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { CircleChevronLeft, ArrowLeft, ChevronLeft } from 'lucide-react';

/**
 * BackButton - Standardized navigation component
 *
 * @param {Object} props
 * @param {string} props.variant - Visual style: 'icon', 'text', 'iconText' (default: 'icon')
 * @param {string} props.method - Navigation method: 'history', 'router', 'smart' (default: 'smart')
 * @param {string} props.context - Page context for smart fallbacks: 'movie', 'person', 'list', 'episode' (optional)
 * @param {string} props.fallbackRoute - Where to go if no history (default: '/ask')
 * @param {string} props.position - Button position: 'top-left', 'top-right', 'inline' (default: 'top-left')
 * @param {string} props.size - Button size: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} props.customText - Custom back text (default: context-aware)
 * @param {Object} props.style - Additional styles (optional)
 * @param {Function} props.onClick - Custom click handler (optional)
 */
export default function BackButton({
  variant = 'icon',
  method = 'smart',
  context,
  fallbackRoute = '/ask',
  position = 'top-left',
  size = 'medium',
  customText,
  style = {},
  onClick,
}) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 🔒 LOCKED: Browser history detection
  useEffect(() => {
    setIsClient(true);

    // Check if there's history to go back to
    if (typeof window !== 'undefined') {
      setCanGoBack(window.history.length > 1);
    }
  }, []);

  // 🔒 LOCKED: Context-aware fallback routes
  const getFallbackRoute = useCallback(() => {
    if (customText) return fallbackRoute;

    switch (context) {
      case 'movie':
        return '/ask'; // Return to search/ask page
      case 'person':
        return '/ask'; // Return to search/ask page
      case 'list':
        return '/recs'; // Return to recommendations
      case 'episode':
        return '/recs'; // Return to series list
      default:
        return fallbackRoute;
    }
  }, [context, customText, fallbackRoute]);

  // 🔒 LOCKED: Smart navigation logic
  const handleBack = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }

    if (!isClient) return;

    try {
      if (method === 'router') {
        // Use router navigation
        router.push(getFallbackRoute());
      } else if (method === 'history') {
        // Use browser history
        if (canGoBack) {
          window.history.back();
        } else {
          router.push(getFallbackRoute());
        }
      } else if (method === 'smart') {
        // Smart detection: use history if available, otherwise fallback
        if (canGoBack && window.history.length > 1) {
          window.history.back();
        } else {
          router.push(getFallbackRoute());
        }
      }
    } catch (error) {
      console.error('BackButton navigation error:', error);
      // Emergency fallback
      router.push(fallbackRoute);
    }
  }, [onClick, isClient, method, router, getFallbackRoute, canGoBack, fallbackRoute]);

  // 🔒 LOCKED: Context-aware text generation
  const getBackText = useCallback(() => {
    if (customText) return customText;

    switch (context) {
      case 'movie':
        return 'Back to search';
      case 'person':
        return 'Back to search';
      case 'list':
        return 'Back to recommendations';
      case 'episode':
        return 'Back to series';
      default:
        return 'Back';
    }
  }, [context, customText]);

  // 🔒 LOCKED: Icon selection based on variant
  const getIcon = () => {
    const iconSize = sizeConfig[size].iconSize;

    switch (variant) {
      case 'icon':
        return <CircleChevronLeft size={iconSize} />;
      case 'text':
        return null;
      case 'iconText':
        return <ArrowLeft size={iconSize} />;
      default:
        return <CircleChevronLeft size={iconSize} />;
    }
  };

  // Size configuration
  const sizeConfig = {
    small: {
      iconSize: 20,
      fontSize: '12px',
      padding: '4px 8px',
    },
    medium: {
      iconSize: 24,
      fontSize: '14px',
      padding: '8px 12px',
    },
    large: {
      iconSize: 28,
      fontSize: '16px',
      padding: '12px 16px',
    },
  };

  const currentSize = sizeConfig[size];

  // Don't render on server to avoid hydration issues
  if (!isClient) {
    return null;
  }

  return (
    <button
      onClick={handleBack}
      style={{
        ...styles.baseButton,
        ...styles[position],
        ...currentSize,
        fontSize: currentSize.fontSize,
        padding: currentSize.padding,
        ...style,
      }}
      aria-label={`${getBackText()}`}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div style={styles.buttonContent}>
        {getIcon()}
        {(variant === 'text' || variant === 'iconText') && (
          <span style={styles.buttonText}>{getBackText()}</span>
        )}
      </div>
    </button>
  );
}

const styles = {
  baseButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#6b7280',
    fontWeight: '500',
    zIndex: 100,
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonText: {
    color: 'inherit',
    fontFamily: 'inherit',
    fontWeight: 'inherit',
  },
  // Position variants
  'top-left': {
    position: 'absolute',
    top: '16px',
    left: '16px',
  },
  'top-right': {
    position: 'absolute',
    top: '16px',
    right: '16px',
  },
  inline: {
    position: 'relative',
    display: 'inline-flex',
  },
};

// 🔒 LOCKED: Export validation patterns for integrity checker
export const BACK_BUTTON_PATTERNS = {
  // Ensure consistent navigation method
  usesSmartNavigation: /method.*smart|window\.history\.back/,

  // Ensure browser history integration
  usesBrowserHistory: /window\.history\.back|canGoBack/,

  // Ensure context-aware fallbacks
  usesContextFallbacks: /(movie|person|list|episode).*fallback/,

  // Ensure consistent icon usage
  usesStandardIcons: /(CircleChevronLeft|ArrowLeft)/,
};
