# MovieHeader A/B Testing Implementation

## Overview

This document describes the safe A/B testing infrastructure implemented for testing the new "B-header" format against the original MovieHeader component. The system provides feature flags, monitoring, emergency rollback capabilities, and comprehensive testing to ensure production safety.

## Background

The "B-header" format is a new text formatting approach where content uses a lowercase 'b' prefix instead of standard markdown '#' notation. This A/B test allows us to safely evaluate user response to this change while maintaining the ability to quickly rollback if issues arise.

## Architecture

### Components

1. **Feature Flag System** (`lib/featureFlags.js`)
   - Environment-aware feature flags
   - User bucketing for consistent A/B assignment
   - Manual overrides for development/testing
   - SSR-safe implementation

2. **Monitoring System** (`lib/abTestMonitoring.js`)
   - Real-time error tracking
   - Performance monitoring
   - Emergency rollback triggers
   - Analytics integration

3. **A/B Test Wrapper** (`components/MovieHeaderAB.js`)
   - Safe variant switching
   - Error boundaries with fallback
   - Performance tracking
   - Analytics events

4. **Variant Components**
   - `MovieHeader.js` - Original "A" variant
   - `MovieHeaderB.js` - New "B" variant with 'b' prefix formatting

## Implementation Details

### Feature Flag Configuration

The A/B test is controlled by the `HEADER_B_VARIANT` feature flag:

```javascript
HEADER_B_VARIANT: {
  enabled: false,
  rolloutPercentage: 0,
  environments: {
    development: true,   // Always enabled in dev
    staging: false,      // Disabled in staging
    production: false    // Disabled in production
  }
}
```

### User Bucketing

Users are consistently assigned to test buckets (0-99) based on session ID:
- Bucketing is stable within a session
- Distribution is statistically even
- No personal data is used in bucketing

### Monitoring Thresholds

The system monitors for:
- **Error Rate**: >5 errors per 100 renders triggers investigation
- **Performance**: >100ms render time generates warnings
- **Emergency Rollback**: >10 total errors or >5% error rate triggers automatic rollback

## Usage

### Basic Implementation

Replace existing MovieHeader usage:

```javascript
// Before
import MovieHeader from '../components/MovieHeader';
<MovieHeader title="Movie Title" year={2023} ... />

// After  
import MovieHeaderAB from '../components/MovieHeaderAB';
<MovieHeaderAB title="Movie Title" year={2023} ... />
```

### Development Testing

#### Force Specific Variants

```javascript
// Force B variant (development only)
MovieHeaderAB.forceVariant('B');

// Force A variant
MovieHeaderAB.forceVariant('A');

// Clear overrides
import { clearFeatureOverrides } from '../lib/featureFlags';
clearFeatureOverrides();
```

#### Debug Current State

```javascript
// Get detailed variant information
MovieHeaderAB.debugVariant();

// See all feature flags
import { debugFeatureFlags } from '../lib/featureFlags';
debugFeatureFlags();
```

#### Simulate Test Scenarios

```javascript
import { simulateTestScenario } from '../lib/abTestMonitoring';

// Test high error rate
simulateTestScenario('movie_header_format', 'high_error_rate');

// Test slow performance
simulateTestScenario('movie_header_format', 'slow_performance');

// Trigger emergency rollback
simulateTestScenario('movie_header_format', 'emergency_rollback');
```

## Rollout Strategy

### Phase 1: Development Testing (Complete)
- ✅ Feature flag infrastructure
- ✅ A/B test wrapper component  
- ✅ Comprehensive test suite
- ✅ Monitoring and rollback systems
- ✅ Documentation

### Phase 2: Staging Validation (Next)
1. Enable in staging environment
2. Validate both variants render correctly
3. Test error scenarios and rollback
4. Performance testing
5. QA validation of functionality

### Phase 3: Limited Production Rollout
1. Start with 5% traffic to B variant
2. Monitor for 24-48 hours
3. Gradually increase if metrics are good:
   - Day 1-2: 5%
   - Day 3-4: 15% 
   - Day 5-7: 30%
   - Week 2: 50%
   - Week 3: 75%
   - Week 4: 100% (if successful)

### Phase 4: Full Rollout or Rollback
- If successful: Make B variant the default
- If unsuccessful: Rollback and analyze learnings

## Safety Mechanisms

### Automatic Fallbacks

1. **SSR Safety**: Always serves A variant during server-side rendering
2. **Feature Flag Errors**: Falls back to A variant if flag system fails
3. **Component Errors**: Error boundaries catch render issues and serve A variant
4. **Emergency Rollback**: Automatic rollback when error thresholds are exceeded

### Manual Controls

1. **Environment Overrides**: Disable in specific environments instantly
2. **Emergency Rollback**: Manual rollback via monitoring system
3. **Development Overrides**: Force variants for testing

### Monitoring and Alerts

1. **Real-time Metrics**: Error rates, performance, render counts
2. **Analytics Integration**: Google Analytics events for all test interactions
3. **Console Logging**: Detailed logs for debugging
4. **Alert Integration**: Hooks for external monitoring systems

## Testing

### Automated Tests

Run the comprehensive test suite:

```bash
# Run A/B testing specific tests
npm test -- --testPathPattern="MovieHeaderAB|featureFlags"

# Run all header component tests
npm test -- --testPathPattern="MovieHeader"

# Run with coverage
npm test -- --coverage --testPathPattern="MovieHeader|featureFlags"
```

### Test Coverage

- ✅ Feature flag logic and environment detection
- ✅ User bucketing and consistency
- ✅ A/B variant switching
- ✅ Error handling and fallbacks
- ✅ Emergency rollback triggers
- ✅ Performance monitoring
- ✅ SSR safety
- ✅ Analytics event tracking

### Manual Testing Checklist

#### Before Rollout
- [ ] Both variants render identically except for text formatting
- [ ] Heart/bookmark functionality works in both variants
- [ ] Poster loading works correctly
- [ ] Performance is acceptable
- [ ] Error boundaries function properly
- [ ] Analytics events are firing
- [ ] Emergency rollback can be triggered

#### During Rollout
- [ ] Monitor error rates in real-time
- [ ] Check performance metrics
- [ ] Validate user bucketing is even
- [ ] Confirm analytics data is collecting
- [ ] Test manual rollback procedures

## Monitoring Dashboard

### Key Metrics to Track

1. **Variant Distribution**
   - % users seeing A vs B
   - Geographic distribution
   - Device/browser breakdown

2. **Error Metrics**
   - Error rate by variant
   - Error types and frequency
   - Time to emergency rollback

3. **Performance Metrics**
   - Average render time by variant
   - 95th percentile render time
   - Performance regression detection

4. **User Engagement**
   - Click-through rates on heart/bookmark
   - Time spent on movie pages
   - Bounce rate by variant

### Accessing Monitoring Data

```javascript
import { getAllTestMetrics, getTestMetrics } from '../lib/abTestMonitoring';

// Get all test data
const allMetrics = getAllTestMetrics();

// Get specific test data
const headerMetrics = getTestMetrics('movie_header_format');
console.log(headerMetrics);
```

## Rollback Procedures

### Automatic Rollback

The system automatically rolls back when:
- Error rate exceeds 5 errors per 100 renders
- More than 10 total errors occur
- Critical component failures are detected

### Manual Emergency Rollback

```javascript
// Option 1: Clear emergency rollback (if system triggered incorrectly)
import { clearEmergencyRollback } from '../lib/abTestMonitoring';
clearEmergencyRollback('movie_header_format');

// Option 2: Disable feature flag entirely
import { setFeatureOverride } from '../lib/featureFlags';
setFeatureOverride('HEADER_B_VARIANT', false);
```

### Production Rollback

1. **Immediate**: Disable feature flag in environment config
2. **Gradual**: Reduce rollout percentage to 0%
3. **Emergency**: Trigger emergency rollback system

## Troubleshooting

### Common Issues

#### B Variant Not Showing
1. Check if feature flag is enabled for environment
2. Verify user bucket falls within rollout percentage
3. Check for emergency rollbacks
4. Confirm development overrides aren't active

#### High Error Rates
1. Check browser console for JavaScript errors
2. Verify component props are correct
3. Test on different devices/browsers
4. Check network requests for failures

#### Performance Issues
1. Monitor render times in dashboard
2. Test on slower devices
3. Check for memory leaks
4. Verify image loading optimization

### Debug Commands

```javascript
// Check current feature flag state
import { getFeatureMetadata, FLAGS } from '../lib/featureFlags';
console.log(getFeatureMetadata(FLAGS.HEADER_B_VARIANT));

// Check test health
import { getTestMetrics } from '../lib/abTestMonitoring';
console.log(getTestMetrics('movie_header_format'));

// Verify user bucket
console.log('User bucket:', getFeatureMetadata(FLAGS.HEADER_B_VARIANT)?.userBucket);
```

## Analytics Events

The system tracks these Google Analytics events:

| Event | Category | Label | Description |
|-------|----------|-------|-------------|
| `ab_test_variant_shown` | A/B Testing | movie_header_format | User sees a variant |
| `ab_test_error_tracked` | A/B Testing Errors | movie_header_format | Error occurs in variant |
| `ab_test_render_success` | A/B Testing | movie_header_format | Successful render |
| `ab_test_slow_render` | A/B Testing Performance | movie_header_format | Slow render detected |
| `ab_test_emergency_rollback` | A/B Testing Critical | movie_header_format | Emergency rollback triggered |

## Best Practices

### Development
1. Always test both variants locally before pushing
2. Use development helpers for debugging
3. Write tests for any new functionality
4. Follow the gradual rollout strategy

### Monitoring
1. Check metrics daily during rollout
2. Set up alerts for error thresholds
3. Monitor user feedback channels
4. Track business metrics alongside technical metrics

### Safety
1. Never remove fallback mechanisms
2. Always test rollback procedures
3. Have emergency contacts ready during rollouts
4. Document any changes to the system

## Contact Information

For questions or issues with this A/B testing implementation:

- **Primary Contact**: UX Team
- **Technical Contact**: Engineering Team  
- **Emergency Contact**: On-call Engineer
- **JIRA Project**: UX-123

---

*Last Updated: 2024-06-19*
*Version: 1.0*