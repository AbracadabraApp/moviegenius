// lib/platform.js - Platform detection utilities

/**
 * Detects if the app should use mobile layout (mobile web)
 */
export function isMobileLayout() {
  if (typeof window !== 'undefined') {
    // Check if on mobile device
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
  // Only show phone frame on desktop web
  return !isMobileLayout();
}

/**
 * Gets the platform name for debugging
 */
export function getPlatformName() {
  if (isMobileLayout()) {
    return 'mobile-web';
  }
  return 'desktop-web';
}
