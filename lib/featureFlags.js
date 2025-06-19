/**
 * Feature Flag System
 * 
 * Provides safe A/B testing capabilities with rollback support.
 * Supports environment-based overrides and gradual rollouts.
 */

// Feature flag configuration
const FEATURE_FLAGS = {
  // Header A/B Test - B variant uses 'b' prefix instead of '#' for markdown headers
  HEADER_B_VARIANT: {
    enabled: true,
    rolloutPercentage: 'auto', // Use gradual rollout system
    environments: {
      development: true,   // Always enabled in dev for testing
      staging: false,      // Disabled in staging by default
      production: false    // Disabled in production by default
    },
    description: 'B-header format: uses lowercase "b" prefix instead of hashtag notation',
    dateCreated: '2024-06-19',
    owner: 'UX Team',
    jiraTicket: 'UX-123',
    rolloutTestName: 'movie_header_format' // Links to rollout configuration
  }
};

/**
 * Gets the current environment
 * @returns {string} Current environment (development, staging, production)
 */
function getCurrentEnvironment() {
  if (typeof window === 'undefined') return 'development'; // SSR fallback
  
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  } else if (hostname.includes('staging') || hostname.includes('vercel.app')) {
    return 'staging';
  } else {
    return 'production';
  }
}

/**
 * Generates consistent user bucket for A/B testing
 * Uses session storage to ensure consistency within session
 * @returns {number} User bucket (0-99)
 */
function getUserBucket() {
  if (typeof window === 'undefined') return 0; // SSR fallback
  
  let bucket = sessionStorage.getItem('ab_test_bucket');
  if (!bucket) {
    // Generate consistent bucket based on session
    const sessionId = sessionStorage.getItem('session_id') || 
                     Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('session_id', sessionId);
    
    // Simple hash function for consistent bucketing
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      const char = sessionId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    bucket = Math.abs(hash) % 100;
    sessionStorage.setItem('ab_test_bucket', bucket.toString());
  }
  return parseInt(bucket, 10);
}

/**
 * Checks if a feature flag is enabled for the current user
 * @param {string} flagName - Name of the feature flag
 * @returns {boolean} Whether the feature is enabled
 */
export function isFeatureEnabled(flagName) {
  const flag = FEATURE_FLAGS[flagName];
  if (!flag) {
    console.warn(`Feature flag '${flagName}' not found`);
    return false;
  }

  const environment = getCurrentEnvironment();
  
  // Check environment-specific override
  if (flag.environments && flag.environments[environment] !== undefined) {
    const enabled = flag.environments[environment];
    console.log(`Feature '${flagName}' ${enabled ? 'enabled' : 'disabled'} by environment (${environment})`);
    return enabled;
  }

  // Check global enabled flag
  if (!flag.enabled) {
    return false;
  }

  // Check rollout percentage
  let rolloutPercentage = flag.rolloutPercentage;
  
  // Handle automatic rollout system
  if (rolloutPercentage === 'auto' && flag.rolloutTestName) {
    try {
      const { getCurrentRolloutPercentage } = require('./rolloutConfig');
      rolloutPercentage = getCurrentRolloutPercentage(flag.rolloutTestName);
    } catch (err) {
      console.warn(`Failed to get auto rollout percentage for ${flagName}:`, err.message);
      rolloutPercentage = 0; // Safe fallback
    }
  }
  
  if (rolloutPercentage === 0) {
    return false;
  }
  
  if (rolloutPercentage === 100) {
    return true;
  }

  // A/B test based on user bucket
  const userBucket = getUserBucket();
  const enabled = userBucket < rolloutPercentage;
  
  console.log(`Feature '${flagName}' ${enabled ? 'enabled' : 'disabled'} for bucket ${userBucket} (rollout: ${rolloutPercentage}%)`);
  return enabled;
}

/**
 * Gets feature flag metadata for monitoring/debugging
 * @param {string} flagName - Name of the feature flag
 * @returns {object} Feature flag metadata
 */
export function getFeatureMetadata(flagName) {
  const flag = FEATURE_FLAGS[flagName];
  if (!flag) return null;

  return {
    ...flag,
    environment: getCurrentEnvironment(),
    userBucket: getUserBucket(),
    isEnabled: isFeatureEnabled(flagName)
  };
}

/**
 * Manual override for testing (development only)
 * @param {string} flagName - Name of the feature flag
 * @param {boolean} enabled - Whether to enable the flag
 */
export function setFeatureOverride(flagName, enabled) {
  if (getCurrentEnvironment() !== 'development') {
    console.warn('Feature overrides only allowed in development');
    return;
  }
  
  if (typeof window === 'undefined') return;
  
  const overrides = JSON.parse(localStorage.getItem('feature_overrides') || '{}');
  overrides[flagName] = enabled;
  localStorage.setItem('feature_overrides', JSON.stringify(overrides));
  
  console.log(`Feature '${flagName}' manually ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Clear all manual overrides (development only)
 */
export function clearFeatureOverrides() {
  if (getCurrentEnvironment() !== 'development') {
    console.warn('Feature overrides only allowed in development');
    return;
  }
  
  if (typeof window === 'undefined') return;
  localStorage.removeItem('feature_overrides');
  console.log('All feature overrides cleared');
}

/**
 * Check for manual override in development
 * @param {string} flagName - Name of the feature flag
 * @returns {boolean|null} Override value or null if no override
 */
function getFeatureOverride(flagName) {
  if (getCurrentEnvironment() !== 'development') return null;
  if (typeof window === 'undefined') return null;
  
  const overrides = JSON.parse(localStorage.getItem('feature_overrides') || '{}');
  return overrides[flagName] !== undefined ? overrides[flagName] : null;
}

// Apply manual overrides in development
const originalIsFeatureEnabled = isFeatureEnabled;
export { originalIsFeatureEnabled };

export function isFeatureEnabledWithOverrides(flagName) {
  const override = getFeatureOverride(flagName);
  if (override !== null) {
    console.log(`Feature '${flagName}' ${override ? 'enabled' : 'disabled'} by manual override`);
    return override;
  }
  return originalIsFeatureEnabled(flagName);
}

// Replace the main export with override-aware version in development
if (getCurrentEnvironment() === 'development') {
  module.exports.isFeatureEnabled = isFeatureEnabledWithOverrides;
}

// Export flag names for type safety
export const FLAGS = Object.keys(FEATURE_FLAGS).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});

/**
 * Development helper to list all flags and their status
 */
export function debugFeatureFlags() {
  if (getCurrentEnvironment() !== 'development') {
    console.warn('Debug functions only available in development');
    return;
  }
  
  console.table(
    Object.entries(FEATURE_FLAGS).map(([name, config]) => ({
      name,
      enabled: isFeatureEnabled(name),
      rollout: config.rolloutPercentage + '%',
      environment: getCurrentEnvironment(),
      description: config.description
    }))
  );
}