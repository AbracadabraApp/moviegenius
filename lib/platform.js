// lib/platform.js - Platform detection utilities

/**
 * Detects if the app is running in Capacitor (native mobile app)
 */
export function isCapacitor() {
  // Check if Capacitor is available (only in mobile app)
  if (typeof window !== 'undefined') {
    return !!(window.Capacitor || window.capacitor);
  }
  return false;
}

/**
 * Detects if the app should use mobile layout (Capacitor or mobile web)
 */
export function isMobileLayout() {
  if (typeof window !== 'undefined') {
    // If in Capacitor, definitely mobile
    if (isCapacitor()) {
      return true;
    }
    
    // For web, check if on mobile device
    const isMobileWeb = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    return isMobileWeb;
  }
  return false;
}

/**
 * Detects if the app should show the phone frame wrapper
 */
export function shouldShowPhoneFrame() {
  // Check build target first (for mobile builds, never show frame)
  if (typeof process !== 'undefined' && process.env.BUILD_TARGET === 'mobile') {
    return false;
  }
  
  // Only show phone frame on desktop web
  return !isMobileLayout();
}

/**
 * Gets the platform name for debugging
 */
export function getPlatformName() {
  if (isCapacitor()) {
    return 'capacitor';
  }
  if (isMobileLayout()) {
    return 'mobile-web';
  }
  return 'desktop-web';
}