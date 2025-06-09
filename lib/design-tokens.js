/**
 * Design Tokens & Constants
 * 
 * Centralized design system values for consistent styling across the application.
 * Following atomic design principles with a mobile-first approach.
 */

// Color Palette
export const colors = {
  // Primary colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a',
  },
  
  // Neutral grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#dc2626',
  
  // UI colors
  background: '#ffffff',
  surface: '#f9fafb',
  border: '#e5e7eb',
};

// Typography scale
export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, sans-serif',
    mono: 'SFMono-Regular, Consolas, monospace',
  },
  
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing scale (8px base unit)
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
};

// Border radius scale
export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// Shadow scale
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 2px 8px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 24px rgba(0, 0, 0, 0.2)',
};

// Breakpoints for responsive design
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
};

// Animation durations
export const animation = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
};

// Z-index scale
export const zIndex = {
  dropdown: 1000,
  modal: 1050,
  popover: 1100,
  tooltip: 1200,
};

// Component-specific tokens
export const components = {
  // MediaCard specific values
  mediaCard: {
    width: '100%',
    posterWidth: '80px',
    posterHeight: '120px',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    shadow: shadows.md,
    hoverShadow: shadows.lg,
    hoverTransform: 'translateY(-2px)',
  },
  
  // PhoneFrame specific values
  phoneFrame: {
    width: '384px', // w-96 in Tailwind
    height: '812px',
    borderWidth: '4px',
    borderRadius: borderRadius.xl,
    innerBorderRadius: borderRadius.lg,
  },
  
  // Navigation specific values
  navigation: {
    height: '72px',
    backgroundColor: colors.gray[800],
    iconSize: '24px',
    fontSize: typography.fontSize.xs,
  },
};