/**
 * MovieHeaderAB - A/B Testing Wrapper Component
 *
 * This component safely manages the A/B test between the original MovieHeader (A variant)
 * and the new B-header format MovieHeaderB (B variant).
 *
 * Features:
 * - Feature flag integration for safe rollouts
 * - Fallback to A variant on any errors
 * - Monitoring and analytics integration ready
 * - Preserves all original functionality
 *
 * Usage:
 *   Replace <MovieHeader {...props} /> with <MovieHeaderAB {...props} />
 *   The component will automatically serve the appropriate variant based on feature flags
 */

import { isFeatureEnabled, FLAGS, getFeatureMetadata } from '../lib/featureFlags';
import { trackVariantRender, trackVariantError, isTestRolledBack } from '../lib/abTestMonitoring';
import { useState, useEffect } from 'react';
import MovieHeader from './MovieHeader'; // A variant (original)
import MovieHeaderB from './MovieHeaderB'; // B variant (new format)

export default function MovieHeaderAB(props) {
  const [variant, setVariant] = useState('A'); // Default to A variant for safety
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Determine which variant to show
  useEffect(() => {
    if (!isClient) return; // Skip during SSR

    const testName = 'movie_header_format';

    try {
      // Check for emergency rollback first
      if (isTestRolledBack(testName)) {
        console.warn('A/B test under emergency rollback, serving A variant');
        setVariant('A');
        return;
      }

      const shouldShowB = isFeatureEnabled(FLAGS.HEADER_B_VARIANT);
      const newVariant = shouldShowB ? 'B' : 'A';

      if (newVariant !== variant) {
        setVariant(newVariant);

        // Analytics event for A/B test tracking
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'ab_test_variant_shown', {
            event_category: 'A/B Testing',
            event_label: testName,
            variant: newVariant,
            custom_parameter_1: getFeatureMetadata(FLAGS.HEADER_B_VARIANT)?.userBucket,
          });
        }
      }
    } catch (err) {
      console.error('Error determining A/B test variant:', err);
      setError(err);
      setVariant('A'); // Always fallback to A variant on error

      // Track error in monitoring system
      trackVariantError(testName, variant, err, 'feature_flag_logic');
    }
  }, [isClient, variant]);

  // During SSR or before client hydration, always serve A variant
  if (!isClient) {
    return <MovieHeader {...props} />;
  }

  // Error boundary: if anything goes wrong, serve A variant
  if (error) {
    console.warn('A/B test fallback: serving A variant due to error:', error);
    return <MovieHeader {...props} />;
  }

  try {
    const testName = 'movie_header_format';
    const renderStart = performance.now();

    // Serve the appropriate variant
    let component;
    switch (variant) {
      case 'B':
        component = <MovieHeaderB {...props} />;
        break;
      case 'A':
      default:
        component = <MovieHeader {...props} />;
        break;
    }

    // Track successful render
    const renderTime = performance.now() - renderStart;
    trackVariantRender(testName, variant, renderTime);

    return component;
  } catch (renderError) {
    const testName = 'movie_header_format';

    // Component-level error boundary
    console.error('Error rendering header variant:', renderError);

    // Track rendering errors in monitoring system
    trackVariantError(testName, variant, renderError, 'component_render');

    // Always fallback to A variant
    return <MovieHeader {...props} />;
  }
}

/**
 * Development helper to force a specific variant
 * Only works in development environment
 * @param {'A'|'B'} forceVariant - Variant to force
 */
MovieHeaderAB.forceVariant = function (forceVariant) {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('forceVariant only works in development');
    return;
  }

  const { setFeatureOverride, FLAGS } = require('../lib/featureFlags');
  setFeatureOverride(FLAGS.HEADER_B_VARIANT, forceVariant === 'B');
  console.log(`Forced header variant to: ${forceVariant}`);
};

/**
 * Development helper to get current variant info
 * Only works in development environment
 */
MovieHeaderAB.debugVariant = function () {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('debugVariant only works in development');
    return;
  }

  const { getFeatureMetadata, FLAGS } = require('../lib/featureFlags');
  const metadata = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);

  console.table({
    'Current Variant': metadata?.isEnabled ? 'B' : 'A',
    'Feature Enabled': metadata?.isEnabled,
    Environment: metadata?.environment,
    'User Bucket': metadata?.userBucket,
    'Rollout Percentage': metadata?.rolloutPercentage + '%',
  });

  return metadata;
};
