# MovieGenius Code Locking Strategy
# 🔒 Preventing Critical Code Reversions

## Problem Statement

**Recurring Issue:** Critical features like MediaCard navigation frequently break due to unintended modifications, specifically:
- TMDB ID props not being passed to MediaCard components
- Navigation logic being modified or removed
- Props interfaces being changed without considering downstream effects

## Implemented Solution

### 1. Component-Level Locking System

#### MediaCard Protection (ACTIVE)
- **Lock File:** `components/MediaCard.LOCK` 
- **Protected Sections:** TMDB ID navigation, props interface, state management
- **Automated Checks:** `scripts/check-locked-components.js`

#### Episode Content Protection (EXISTING)
- **Database Locks:** Episodes 1-1-1 through 1-1-6 protected
- **API Protection:** 409 errors for locked content
- **Override Mechanism:** `forceRegenerate: true`

### 2. Automated Integrity Checking

#### Component Checker Script
```bash
npm run check-locks
```

**Validates:**
- ✅ Critical prop interfaces remain intact
- ✅ Navigation functions preserve TMDB ID routing  
- ✅ State management code unchanged
- ✅ Fallback mechanisms still present

#### Pre-commit Integration
```bash
npm run pre-commit
```
**Runs:** Component checks + ESLint + TypeScript checking

### 3. Lock File Annotations

#### In-Code Protection
```javascript
/**
 * MediaCard Component - 🔒 LOCKED COMPONENT 🔒
 * @locked true
 * @version STABLE-2025-06-06
 */

// 🔒 CRITICAL: Always preserve TMDB ID for navigation
const movieObj = {
  tmdb_id: null // Will be fetched by MediaCard if needed
};
```

## Lock Classifications

### 🔴 **CRITICAL LOCKS** (Never modify without approval)
- MediaCard navigation logic
- Database episode locks  
- Error monitoring severity classification
- Core API authentication

### 🟡 **STABLE LOCKS** (Modify with testing)
- A/B testing rollout configuration
- Performance monitoring thresholds
- Cache warming strategies

### 🟢 **DEVELOPMENT LOCKS** (Safe to modify)
- UI styling within components
- Non-critical feature flags
- Development utilities

## Lock Implementation Patterns

### 1. **Database-Level Locks**
```sql
CREATE TABLE episodes (
  locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP,
  locked_by VARCHAR(255)
);
```

### 2. **Component-Level Locks**
```javascript
// Lock file: Component.LOCK
// In-code annotations: @locked true
// Integrity checks: Pattern matching
```

### 3. **Configuration Locks**
```javascript
const CRITICAL_CONFIG = {
  // 🔒 DO NOT MODIFY - See config.LOCK
  maxErrorRate: 0.5,
  rollbackThreshold: 0.03
};
```

## Breaking Change Prevention

### Automated Safeguards
1. **Pre-commit hooks** validate locked components
2. **CI/CD checks** run integrity tests
3. **Deployment verification** includes navigation testing
4. **Error monitoring** alerts on navigation failures

### Manual Safeguards
1. **Lock files** document change protocols
2. **Backup components** (`.STABLE` versions)
3. **Code annotations** mark critical sections
4. **Review requirements** for locked components

## Rollback Procedures

### Emergency Rollback (< 5 minutes)
```bash
# Restore stable MediaCard
cp components/MediaCard.js.STABLE components/MediaCard.js
git add components/MediaCard.js
git commit -m "Emergency: Restore stable MediaCard"
git push

# Verify fix
npm run check-locks
npm run test
```

### Database Rollback (Episodes)
```bash
# Unlock and regenerate if needed
npm run unlock-episodes -- 1 1 1-6
npm run episode-status
```

## Monitoring and Alerts

### Navigation Failure Detection
- **Error monitoring** tracks `router.push` failures
- **Analytics** monitor bounce rates on movie pages
- **Health checks** validate critical navigation paths

### Lock Integrity Monitoring  
- **Daily checks** via `check-locks` script in CI
- **Deployment verification** includes lock validation
- **Manual audits** during major releases

## Lock Maintenance

### Regular Reviews
- **Monthly:** Review all lock files for relevance
- **Quarterly:** Update lock patterns for new features
- **Per release:** Verify locks still protect intended functionality

### Lock Updates
1. Document reason for lock changes
2. Update integrity checker patterns
3. Test lock effectiveness
4. Update lock file documentation

## Usage Guidelines

### When to Lock Code
✅ **Lock when:**
- Code is used across multiple critical pages
- Modifications frequently break functionality
- Component has complex dependencies
- Navigation or data flow is involved

❌ **Don't lock when:**
- Code is isolated to single use case
- Changes are cosmetic only
- Component is actively under development
- Lock would prevent necessary updates

### Lock Implementation Checklist
- [ ] Create `.LOCK` file documenting restrictions
- [ ] Add integrity checks to `check-locked-components.js`
- [ ] Update pre-commit hooks if needed
- [ ] Create backup `.STABLE` version
- [ ] Document rollback procedure
- [ ] Test lock effectiveness
- [ ] Add monitoring for lock violations

## Future Enhancements

### Planned Improvements
1. **Git hooks** automatically reject commits that break locks
2. **IDE integration** highlight locked sections in editors
3. **Automated lock creation** for frequently modified components
4. **Lock inheritance** for component hierarchies
5. **Real-time lock monitoring** in production

### Advanced Lock Types
- **Behavioral locks:** Protect function behavior, not just code
- **Data flow locks:** Ensure props flow correctly through component trees
- **Performance locks:** Prevent changes that degrade performance
- **Security locks:** Protect authentication and sensitive data handling

## Success Metrics

### Lock Effectiveness
- **Reduction in navigation failures:** Target 90% decrease
- **Faster incident resolution:** Sub-5-minute rollbacks
- **Fewer breaking changes:** 80% reduction in critical reversions
- **Developer confidence:** Improved deployment reliability

### Monitoring Dashboards
- Lock violation frequency
- Time to detect breaking changes
- Rollback success rates
- Developer lock compliance

---

**🔒 This locking system provides comprehensive protection for critical MovieGenius components while maintaining development flexibility.**