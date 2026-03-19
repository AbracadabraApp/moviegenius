/**
 * useTapDetection Hook
 *
 * Distinguishes between taps and swipes on touch devices.
 * Prevents accidental navigation when scrolling through carousels.
 *
 * Usage:
 *   const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTapDetection(onTap);
 *
 * @param {Function} onTap - Callback function to execute on tap
 * @param {number} threshold - Movement threshold in pixels (default: 20)
 * @returns {Object} Touch event handlers
 */

import { useState } from 'react';

export function useTapDetection(onTap, threshold = 20) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      // If no movement detected, it's a tap
      onTap();
      return;
    }

    const distanceX = Math.abs(touchStart.x - touchEnd.x);
    const distanceY = Math.abs(touchStart.y - touchEnd.y);
    const isSwipe = distanceX > threshold || distanceY > threshold;

    // Only execute callback if it wasn't a swipe
    if (!isSwipe) {
      onTap();
    }
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}
