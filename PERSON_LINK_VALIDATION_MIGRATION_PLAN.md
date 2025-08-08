# Person Link Validation Migration Plan

## Executive Summary

This document outlines a comprehensive strategy to fix the person link data corruption issue where contributor scripts inserted malformed person links using name slugs (`/person/wallace-beery`) instead of proper numeric person IDs (`/person/12345`).

## Problem Statement

### Current Issues
- **Mixed Link Formats**: Database contains both `/person/123` (correct) and `/person/name-slug` (incorrect) links
- **Script Vulnerabilities**: Contributor linking scripts still generate slug-based links
- **No Validation**: No constraints prevent malformed person URLs from being inserted
- **Data Integrity**: Some person links point to non-existent person IDs

### Root Cause Analysis
1. **PersonRegistry.js Legacy Code**: Still uses `href="/person/${person.slug}"` instead of `href="/person/${person.id}"`
2. **Missing Validation**: No database or application-level validation for person link format
3. **Incomplete Migration**: Person ID system was implemented but linking scripts weren't updated

## Migration Strategy Overview

### Phase 1: Prevention (Database Constraints)
- **Objective**: Prevent future bad data insertion
- **Duration**: 1 day
- **Risk**: Low (constraints only block invalid data)

### Phase 2: Detection and Monitoring
- **Objective**: Identify existing bad data and monitor ongoing health
- **Duration**: 2 days  
- **Risk**: Very Low (read-only operations)

### Phase 3: Application Updates
- **Objective**: Fix scripts that generate malformed links
- **Duration**: 3 days
- **Risk**: Medium (requires testing of linking scripts)

### Phase 4: Data Sanitization
- **Objective**: Clean up existing malformed person links
- **Duration**: 2 days
- **Risk**: Medium (data modification)

### Phase 5: Validation and Testing
- **Objective**: Verify complete fix and prevent regression
- **Duration**: 2 days
- **Risk**: Low (validation and testing)

---

## Phase 1: Database Constraint Implementation

### 1.1 Deploy Database Constraints

**File**: `/Users/josh.petersen/moviegenius/scripts/add-person-link-validation.sql`

```bash
# Apply database constraints
psql $DATABASE_URL -f scripts/add-person-link-validation.sql
```

**Expected Outcome**: 
- Database rejects any new inserts with malformed person links
- Validation functions are available for monitoring

### 1.2 Test Constraint Effectiveness

```sql
-- Test that constraint blocks bad data
INSERT INTO movie_analyses (tmdb_id, claude_response) 
VALUES (999999, '{"processed_content": "Bad link: <a href=\"/person/bad-slug\">Test</a>"}');
-- Should fail with constraint violation
```

**Success Criteria**:
- ✅ Constraint blocks malformed person links
- ✅ Constraint allows valid person links
- ✅ No impact on existing valid operations

---

## Phase 2: Detection and Monitoring

### 2.1 Deploy Monitoring Queries

**File**: `/Users/josh.petersen/moviegenius/scripts/monitor-person-links.sql`

```bash
# Apply monitoring views and functions
psql $DATABASE_URL -f scripts/monitor-person-links.sql
```

### 2.2 Initial Data Assessment

```sql
-- Get baseline metrics
SELECT * FROM person_link_health_summary;

-- Identify worst affected movies
SELECT tmdb_id, title, malformed_links 
FROM person_link_audit 
WHERE status IN ('ALL_MALFORMED', 'MIXED')
ORDER BY malformed_links DESC 
LIMIT 20;
```

### 2.3 Set Up Automated Monitoring

```bash
# Add to cron for daily monitoring
0 9 * * * psql $DATABASE_URL -c "SELECT * FROM check_person_link_health();" | mail -s "Person Link Health Report" admin@example.com
```

**Success Criteria**:
- ✅ Complete visibility into bad data extent
- ✅ Monitoring system operational
- ✅ Baseline metrics established

---

## Phase 3: Application Code Updates

### 3.1 Fix PersonRegistry.js

**File**: `/Users/josh.petersen/moviegenius/lib/entity-linking/PersonRegistry.js`

**Current Issue** (Line 357):
```javascript
const link = `<a href="/person/${person.slug}" class="person-link">...`;
```

**Required Fix**:
```javascript
const link = `<a href="/person/${person.id}" class="person-link">...`;
```

**Implementation Steps**:
1. Update PersonRegistry to use person.id instead of person.slug
2. Ensure PersonRegistry loads person IDs from database
3. Add validation to linkPeople() method
4. Update all person-related linking functions

### 3.2 Update Contributing Scripts

**Files to Update**:
- `/Users/josh.petersen/moviegenius/scripts/process-movie-analysis-links.js`
- `/Users/josh.petersen/moviegenius/lib/movie-analysis-linker.js`
- Any scripts using PersonRegistry for linking

**Changes Required**:
1. Modify scripts to use validation middleware
2. Add person link validation before database insertion
3. Update error handling for constraint violations

### 3.3 Deploy Application Validation

**File**: `/Users/josh.petersen/moviegenius/lib/validation/person-link-validator.js`

**Integration Points**:
```javascript
// Before saving analysis content
import { defaultPersonLinkValidator } from '../lib/validation/person-link-validator.js';

const validation = await defaultPersonLinkValidator.validateAnalysisContent(content);
if (!validation.isValid) {
    throw new Error(`Person link validation failed: ${validation.errors.length} errors`);
}
```

**Success Criteria**:
- ✅ All scripts generate only numeric person ID links
- ✅ Application validation prevents bad data
- ✅ No regression in existing functionality

---

## Phase 4: Data Sanitization

### 4.1 Pre-Sanitization Assessment

```bash
# Run initial assessment
node scripts/sanitize-person-links.js --dry-run
```

**Expected Output**:
- Count of records requiring sanitization
- List of unresolvable name slugs
- Estimated time for full sanitization

### 4.2 Backup Current Data

```bash
# Create backup before sanitization
pg_dump $DATABASE_URL --table=movie_analyses > movie_analyses_backup_$(date +%Y%m%d).sql
```

### 4.3 Run Sanitization Process

```bash
# Test with small batch first
node scripts/sanitize-person-links.js --batch-size=10 --apply

# Full sanitization after testing
node scripts/sanitize-person-links.js --apply
```

### 4.4 Handle Unresolvable Links

**Manual Review Process**:
1. Extract unresolvable name slugs from sanitization log
2. Research correct person IDs for each slug
3. Create manual mapping file
4. Re-run sanitization with manual mappings

**Success Criteria**:
- ✅ 95%+ of malformed links automatically fixed
- ✅ Manual intervention plan for remaining links
- ✅ All person links use numeric IDs

---

## Phase 5: Validation and Testing

### 5.1 End-to-End Validation

```sql
-- Verify no malformed links remain
SELECT COUNT(*) as remaining_bad_links
FROM movie_analyses 
WHERE claude_response::text ~ 'href="/person/[^0-9]';
-- Should return 0

-- Verify constraint is working
SELECT * FROM person_link_health_summary;
-- Should show 100% health
```

### 5.2 Integration Testing

**Test Scenarios**:
1. **Script Execution**: Run contributor linking scripts and verify only numeric links
2. **API Insertion**: Test movie analysis API with person links
3. **Error Handling**: Verify proper error messages for constraint violations
4. **Performance**: Ensure validation doesn't impact performance

### 5.3 Regression Testing

```bash
# Run test suite focusing on person linking
npm test -- --grep "person.*link"

# Test specific linking scenarios  
node scripts/process-movie-analysis-links.js --test --contributors
```

**Success Criteria**:
- ✅ Zero malformed person links in database
- ✅ All scripts generate valid links only
- ✅ Validation system catches future issues
- ✅ No performance degradation

---

## Rollback Procedures

### Emergency Rollback (If Critical Issues Arise)

1. **Disable Constraints**:
```sql
ALTER TABLE movie_analyses DROP CONSTRAINT IF EXISTS chk_valid_person_links;
```

2. **Restore Data** (if needed):
```bash
psql $DATABASE_URL < movie_analyses_backup_YYYYMMDD.sql
```

3. **Revert Code Changes**:
```bash
git revert [commit-hash-of-validation-changes]
```

### Partial Rollback (Constraint Only)

```sql
-- Just remove constraint, keep monitoring
ALTER TABLE movie_analyses DROP CONSTRAINT IF EXISTS chk_valid_person_links;
```

---

## Post-Migration Monitoring

### Daily Monitoring

```bash
# Check for any new bad links (should be zero)
psql $DATABASE_URL -c "
SELECT COUNT(*) as daily_violations 
FROM movie_analyses 
WHERE claude_response::text ~ 'href=\"/person/[^0-9]'
  AND updated_at > NOW() - INTERVAL '24 hours';
"
```

### Weekly Health Checks

```sql
-- Comprehensive health report
SELECT * FROM person_link_health_summary;
SELECT * FROM check_person_link_health();
```

### Monthly Audits

```bash
# Full person link audit
node scripts/validate-person-links-audit.js --full-scan
```

---

## Risk Assessment and Mitigation

### High Risk Items

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Constraint blocks valid operations | High | Low | Thorough testing phase |
| Data loss during sanitization | High | Low | Full backup before changes |
| Performance degradation | Medium | Medium | Optimize validation queries |

### Medium Risk Items

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Some links unresolvable | Medium | Medium | Manual review process |
| Script compatibility issues | Medium | Low | Comprehensive testing |
| Monitoring overhead | Low | Medium | Efficient query design |

---

## Success Metrics

### Technical Metrics
- **Data Quality**: 100% of person links use numeric ID format
- **Validation Coverage**: All insertion points protected by validation
- **Performance**: <5% overhead from validation system
- **Monitoring**: Real-time visibility into person link health

### Business Metrics
- **Zero Future Incidents**: No new malformed person links
- **Reliable Person Pages**: All person links resolve correctly
- **Maintainability**: Clear process for handling person link issues

---

## Implementation Timeline

| Phase | Duration | Dependencies | Risk Level |
|-------|----------|--------------|------------|
| Phase 1: Database Constraints | 1 day | Database access | Low |
| Phase 2: Monitoring Setup | 2 days | Phase 1 complete | Very Low |
| Phase 3: Application Updates | 3 days | Code review complete | Medium |
| Phase 4: Data Sanitization | 2 days | Phase 3 deployed | Medium |
| Phase 5: Validation | 2 days | Phase 4 complete | Low |

**Total Duration**: 10 days
**Go-Live**: After Phase 1 (constraints prevent new bad data)
**Full Resolution**: After Phase 4 (all existing bad data cleaned)

---

## Conclusion

This comprehensive migration plan addresses the person link data corruption issue through:

1. **Immediate Protection**: Database constraints prevent future bad data
2. **Full Visibility**: Monitoring system tracks person link health
3. **Root Cause Fix**: Application code generates only valid links
4. **Data Cleanup**: Existing malformed links are corrected
5. **Long-term Assurance**: Validation and monitoring prevent regression

The phased approach minimizes risk while ensuring complete resolution of the issue.