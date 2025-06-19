/**
 * Gradual Rollout Configuration and Management
 * 
 * Provides structured rollout phases with automatic progression,
 * safety checks, and rollback capabilities for A/B tests.
 */

import { getTestMetrics, isTestRolledBack } from './abTestMonitoring';

// Rollout phase configuration
const ROLLOUT_PHASES = {
  movie_header_format: {
    phases: [
      {
        name: 'Initial Test',
        percentage: 5,
        duration: 48, // hours
        minSampleSize: 100,
        maxErrorRate: 3, // 3%
        description: 'Initial small-scale test with close monitoring'
      },
      {
        name: 'Expanded Test',
        percentage: 15,
        duration: 48, // hours
        minSampleSize: 500,
        maxErrorRate: 2, // 2%
        description: 'Expanded test with more users'
      },
      {
        name: 'Broader Rollout',
        percentage: 30,
        duration: 72, // hours
        minSampleSize: 1000,
        maxErrorRate: 1.5, // 1.5%
        description: 'Broader rollout with business metrics tracking'
      },
      {
        name: 'Majority Rollout',
        percentage: 50,
        duration: 96, // hours
        minSampleSize: 2000,
        maxErrorRate: 1, // 1%
        description: 'Majority of users, final validation phase'
      },
      {
        name: 'Near Complete',
        percentage: 75,
        duration: 72, // hours
        minSampleSize: 3000,
        maxErrorRate: 0.8, // 0.8%
        description: 'Near complete rollout, preparing for full launch'
      },
      {
        name: 'Full Rollout',
        percentage: 100,
        duration: null, // Permanent
        minSampleSize: 5000,
        maxErrorRate: 0.5, // 0.5%
        description: 'Full rollout to all users'
      }
    ],
    
    // Rollout schedule metadata
    startDate: null, // Set when rollout begins
    currentPhase: -1, // -1 = not started, 0+ = phase index
    lastPhaseChange: null,
    pausedAt: null,
    rollbackReason: null
  }
};

/**
 * Gets the current rollout status for a test
 * @param {string} testName - Name of the A/B test
 * @returns {object} Current rollout status
 */
export function getRolloutStatus(testName) {
  const config = ROLLOUT_PHASES[testName];
  if (!config) {
    throw new Error(`No rollout configuration found for test: ${testName}`);
  }

  const now = Date.now();
  
  // Check if test is rolled back
  if (isTestRolledBack(testName)) {
    return {
      testName,
      status: 'rolled_back',
      currentPhase: null,
      percentage: 0,
      reason: config.rollbackReason || 'emergency_rollback'
    };
  }

  // Check if rollout hasn't started
  if (config.currentPhase === -1 || !config.startDate) {
    return {
      testName,
      status: 'not_started',
      currentPhase: null,
      percentage: 0,
      nextPhase: config.phases[0]
    };
  }

  // Check if rollout is paused
  if (config.pausedAt) {
    const currentPhaseConfig = config.phases[config.currentPhase];
    return {
      testName,
      status: 'paused',
      currentPhase: currentPhaseConfig,
      percentage: currentPhaseConfig.percentage,
      pausedAt: config.pausedAt,
      pausedDuration: now - config.pausedAt
    };
  }

  // Get current phase
  const currentPhaseConfig = config.phases[config.currentPhase];
  const phaseStartTime = config.lastPhaseChange || config.startDate;
  const phaseElapsed = now - phaseStartTime;
  const phaseDuration = currentPhaseConfig.duration * 60 * 60 * 1000; // Convert hours to ms

  // Check if it's time for next phase
  const isPhaseComplete = currentPhaseConfig.duration === null || phaseElapsed >= phaseDuration;
  const hasNextPhase = config.currentPhase < config.phases.length - 1;

  return {
    testName,
    status: isPhaseComplete && !hasNextPhase ? 'completed' : 'active',
    currentPhase: currentPhaseConfig,
    percentage: currentPhaseConfig.percentage,
    phaseStartTime,
    phaseElapsed,
    phaseDuration,
    phaseProgress: currentPhaseConfig.duration ? (phaseElapsed / phaseDuration) * 100 : 100,
    isPhaseComplete,
    nextPhase: hasNextPhase ? config.phases[config.currentPhase + 1] : null,
    canAdvance: isPhaseComplete && hasNextPhase
  };
}

/**
 * Starts a gradual rollout for a test
 * @param {string} testName - Name of the A/B test
 * @returns {object} Updated rollout status
 */
export function startRollout(testName) {
  const config = ROLLOUT_PHASES[testName];
  if (!config) {
    throw new Error(`No rollout configuration found for test: ${testName}`);
  }

  if (config.currentPhase !== -1) {
    throw new Error(`Rollout for ${testName} has already started`);
  }

  const now = Date.now();
  config.startDate = now;
  config.currentPhase = 0;
  config.lastPhaseChange = now;
  config.pausedAt = null;
  config.rollbackReason = null;

  console.log(`🚀 Started gradual rollout for ${testName}`);
  logRolloutEvent(testName, 'rollout_started', {
    phase: config.phases[0].name,
    percentage: config.phases[0].percentage
  });

  return getRolloutStatus(testName);
}

/**
 * Advances to the next phase if conditions are met
 * @param {string} testName - Name of the A/B test
 * @param {boolean} force - Force advancement without safety checks
 * @returns {object} Updated rollout status or error info
 */
export function advancePhase(testName, force = false) {
  const config = ROLLOUT_PHASES[testName];
  if (!config) {
    throw new Error(`No rollout configuration found for test: ${testName}`);
  }

  const status = getRolloutStatus(testName);
  
  if (status.status !== 'active') {
    throw new Error(`Cannot advance phase: test status is ${status.status}`);
  }

  if (!status.canAdvance) {
    throw new Error('Current phase is not yet complete');
  }

  // Safety checks (unless forced)
  if (!force) {
    const safetyCheck = performSafetyChecks(testName, status.currentPhase);
    if (!safetyCheck.safe) {
      return {
        success: false,
        reason: 'safety_check_failed',
        details: safetyCheck.issues,
        recommendation: 'pause_rollout'
      };
    }
  }

  // Advance to next phase
  config.currentPhase += 1;
  config.lastPhaseChange = Date.now();

  const newPhase = config.phases[config.currentPhase];
  
  console.log(`📈 Advanced ${testName} to phase: ${newPhase.name} (${newPhase.percentage}%)`);
  logRolloutEvent(testName, 'phase_advanced', {
    fromPhase: status.currentPhase.name,
    toPhase: newPhase.name,
    percentage: newPhase.percentage,
    forced: force
  });

  return {
    success: true,
    newStatus: getRolloutStatus(testName)
  };
}

/**
 * Pauses the rollout at current phase
 * @param {string} testName - Name of the A/B test
 * @param {string} reason - Reason for pausing
 * @returns {object} Updated rollout status
 */
export function pauseRollout(testName, reason = 'manual_pause') {
  const config = ROLLOUT_PHASES[testName];
  if (!config) {
    throw new Error(`No rollout configuration found for test: ${testName}`);
  }

  config.pausedAt = Date.now();
  config.pauseReason = reason;

  console.log(`⏸️ Paused rollout for ${testName}: ${reason}`);
  logRolloutEvent(testName, 'rollout_paused', { reason });

  return getRolloutStatus(testName);
}

/**
 * Resumes a paused rollout
 * @param {string} testName - Name of the A/B test
 * @returns {object} Updated rollout status
 */
export function resumeRollout(testName) {
  const config = ROLLOUT_PHASES[testName];
  if (!config) {
    throw new Error(`No rollout configuration found for test: ${testName}`);
  }

  const pausedDuration = Date.now() - config.pausedAt;
  config.pausedAt = null;
  delete config.pauseReason;

  console.log(`▶️ Resumed rollout for ${testName} after ${Math.round(pausedDuration / 1000 / 60)} minutes`);
  logRolloutEvent(testName, 'rollout_resumed', { pausedDuration });

  return getRolloutStatus(testName);
}

/**
 * Performs safety checks before advancing to next phase
 * @param {string} testName - Name of the A/B test
 * @param {object} currentPhase - Current phase configuration
 * @returns {object} Safety check results
 */
function performSafetyChecks(testName, currentPhase) {
  const metrics = getTestMetrics(testName);
  const issues = [];

  // Check if test is rolled back
  if (metrics.isRolledBack) {
    issues.push({
      type: 'emergency_rollback',
      severity: 'critical',
      message: 'Test is under emergency rollback'
    });
  }

  // Check error rates for both variants
  ['A', 'B'].forEach(variant => {
    const variantMetrics = metrics.variants[variant];
    
    // Minimum sample size check
    if (variantMetrics.renders < currentPhase.minSampleSize) {
      issues.push({
        type: 'insufficient_sample',
        severity: 'warning',
        variant,
        message: `Variant ${variant} has insufficient sample size: ${variantMetrics.renders} < ${currentPhase.minSampleSize}`
      });
    }

    // Error rate check
    if (variantMetrics.errorRate > currentPhase.maxErrorRate) {
      issues.push({
        type: 'high_error_rate',
        severity: 'critical',
        variant,
        message: `Variant ${variant} error rate too high: ${variantMetrics.errorRate}% > ${currentPhase.maxErrorRate}%`
      });
    }

    // Health check
    if (!variantMetrics.isHealthy) {
      issues.push({
        type: 'unhealthy_variant',
        severity: 'warning',
        variant,
        message: `Variant ${variant} is not healthy`
      });
    }
  });

  const criticalIssues = issues.filter(issue => issue.severity === 'critical');
  const safe = criticalIssues.length === 0;

  return {
    safe,
    issues,
    criticalCount: criticalIssues.length,
    warningCount: issues.filter(issue => issue.severity === 'warning').length
  };
}

/**
 * Gets the current rollout percentage for a test (for feature flag system)
 * @param {string} testName - Name of the A/B test
 * @returns {number} Current rollout percentage (0-100)
 */
export function getCurrentRolloutPercentage(testName) {
  const status = getRolloutStatus(testName);
  
  switch (status.status) {
    case 'not_started':
    case 'rolled_back':
      return 0;
    case 'active':
    case 'paused':
    case 'completed':
      return status.percentage;
    default:
      return 0;
  }
}

/**
 * Auto-advance phases if conditions are met
 * This should be called periodically (e.g., via cron job or API endpoint)
 * @param {string} testName - Name of the A/B test
 * @returns {object} Results of auto-advancement
 */
export function autoAdvancePhases(testName) {
  try {
    const status = getRolloutStatus(testName);
    
    if (status.status !== 'active' || !status.canAdvance) {
      return {
        testName,
        action: 'no_action',
        reason: status.status !== 'active' ? `test_status_${status.status}` : 'phase_not_ready',
        status
      };
    }

    const result = advancePhase(testName, false);
    
    if (result.success) {
      return {
        testName,
        action: 'advanced',
        result,
        newPhase: result.newStatus.currentPhase.name
      };
    } else {
      // If safety checks failed, pause the rollout
      pauseRollout(testName, 'auto_pause_safety_check_failed');
      
      return {
        testName,
        action: 'paused',
        reason: result.reason,
        details: result.details
      };
    }
  } catch (error) {
    console.error(`Error in auto-advance for ${testName}:`, error);
    return {
      testName,
      action: 'error',
      error: error.message
    };
  }
}

/**
 * Gets dashboard data for all active rollouts
 * @returns {object} Dashboard data
 */
export function getRolloutDashboard() {
  const testNames = Object.keys(ROLLOUT_PHASES);
  const dashboard = {};

  testNames.forEach(testName => {
    try {
      const status = getRolloutStatus(testName);
      const metrics = getTestMetrics(testName);
      const safetyChecks = status.currentPhase ? 
        performSafetyChecks(testName, status.currentPhase) : 
        { safe: true, issues: [] };

      dashboard[testName] = {
        status,
        metrics,
        safetyChecks,
        canAutoAdvance: status.canAdvance && safetyChecks.safe
      };
    } catch (error) {
      dashboard[testName] = {
        error: error.message
      };
    }
  });

  return dashboard;
}

/**
 * Logs rollout events for monitoring and debugging
 */
function logRolloutEvent(testName, eventType, data = {}) {
  const event = {
    timestamp: Date.now(),
    testName,
    eventType,
    data
  };

  console.log(`📊 Rollout Event [${testName}]:`, event);

  // Analytics tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ab_test_rollout_event', {
      event_category: 'A/B Testing Rollout',
      event_label: testName,
      custom_parameter_1: eventType,
      custom_parameter_2: JSON.stringify(data)
    });
  }
}

// Export for external monitoring/admin tools
export { ROLLOUT_PHASES };