# Documentation Cleanup Plan

**Created:** 2025-03-22
**Goal:** Reduce from 106 active docs to ~15-20 essential docs
**Reduction:** 85% fewer files while preserving critical information

---

## Essential Documents for V3 Execution (Keep These)

### Tier 1: CRITICAL (5 must-have)
1. ✅ `MOVIEGENIUS_V3_ARCHITECTURE.md` - Master plan (JUST CREATED)
2. ✅ `strategies/RELEASE_TODO.md` - Production status
3. ✅ `CLAUDE.md` - User instructions (root)
4. ✅ `API_REFERENCE.md` - API documentation
5. ⚠️ **MISSING:** Database schema documentation (need to create)

### Tier 2: IMPORTANT (6 context docs)
6. ✅ `architecture/LOCKED_COMPONENTS.md`
7. ✅ `CODE_LOCKING_STRATEGY.md`
8. ✅ `testing/ENGINEERING-DECISION-RULES.md` (keep this one, delete duplicate)
9. ✅ `TERMINOLOGY_STANDARD.md`
10. ✅ `GIT-SAFETY-GUIDE.md`
11. ✅ `PREVENTING_BUILD_ERRORS.md`

### Tier 3: REFERENCE (4 helpful docs)
12. ✅ `features/YOU_PAGE_VISION.md`
13. ✅ `V2_SEARCH_FEATURES.md`
14. ✅ `TROUBLESHOOTING.md`
15. ✅ `guides/DEVELOPMENT_SETUP.md` (keep this one, delete duplicate)

---

## Phase 1: DELETE Obsolete Files (8 files)

### Episode-Related (Episodes Cancelled)
```bash
rm docs/40_SERIES_ARCHITECTURE.md
rm docs/EDUCATIONAL_SERIES_SYSTEM.md
rm docs/EPISODE_MIGRATION_GUIDE.md
rm docs/episode-template.md
rm docs/episode-mapping-65.md  # if exists
rm docs/episode-index.md
rm docs/EPISODE_LOCKS.md  # if exists
```

**Rationale:** Episodes feature was cancelled. These docs provide no value.

---

## Phase 2: REMOVE Duplicates (5 files - keep newest)

### Check Timestamps and Remove Older Copies

1. **DEVELOPMENT_SETUP.md** (2 copies)
   - Keep: `docs/guides/DEVELOPMENT_SETUP.md`
   - Delete: Other copy

2. **ENGINEERING-DECISION-RULES.md** (2 copies)
   - Keep: `docs/testing/ENGINEERING-DECISION-RULES.md`
   - Delete: Other copy

3. **RAILWAY_DEPLOYMENT_STATUS.md** (2 copies)
   - Keep: `docs/operations/RAILWAY_DEPLOYMENT_STATUS.md`
   - Delete: `docs/reference/RAILWAY_DEPLOYMENT_STATUS.md`

4. **ROLLBACK_PROCEDURES.md** (2 copies)
   - Keep: Newest version
   - Delete: Older copy

5. **LAUNCH_READINESS_STATUS.md** (2 copies)
   - Keep: `docs/strategies/LAUNCH_READINESS_STATUS.md`
   - Delete: Other copy

---

## Phase 3: CONSOLIDATE Browse Docs (6 → 1 file)

### Keep: `BROWSE_SYSTEM.md`

### Merge Content From:
- `BROWSE_SYSTEM_INTEGRATION.md`
- `BROWSE_BUILD_PROCESS.md`
- `PRODUCTION_BROWSE_SYSTEM.md`
- `MOVIE_BROWSING_SYSTEM_COMPLETE.md`

### Delete After Merging:
- `BROWSE_BUILD_STATUS.md` (stale status)
- `BROWSE_DATA_CORRUPTION_ISSUE.md` (archive - historical issue)

**Action Plan:**
1. Read all 6 browse docs
2. Identify unique information in each
3. Create consolidated `BROWSE_SYSTEM.md` with sections:
   - Architecture Overview
   - Database Schema
   - API Integration
   - Build Process
   - Production Status
4. Delete old files

---

## Phase 4: CONSOLIDATE Deployment Docs (10 → 2 files)

### Keep These 2:
1. **`operations/DEPLOYMENT_COMPLETE_GUIDE.md`** - Comprehensive guide
2. **`guides/RAILWAY_ENV_CHECKLIST.md`** - Quick reference checklist

### Merge and Delete:
```bash
# Review content, merge unique info into DEPLOYMENT_COMPLETE_GUIDE.md
rm docs/guides/DEPLOYMENT_CHECKLIST.md
rm docs/operations/DEPLOYMENT_SOLUTION.md
rm docs/guides/MINIMAL_DEPLOY_INSTRUCTIONS.md
rm docs/guides/RAILWAY_SETUP_COMMANDS.md
rm docs/guides/RAILWAY_CACHE_CLEAR.md
rm docs/guides/CACHE_DEPLOYMENT_GUIDE.md
```

---

## Phase 5: ARCHIVE Old Implementation Docs

Move to `docs/archive/`:
- `SIMPLE_STATIC_PLAN.md` (superseded by V3 architecture)
- `NUCLEAR_STATIC_DECISION.md` (historical decision)
- `STATIC_GENERATION_STRATEGY.md` (old strategy)
- `PHASE-1-COMPLETE.md` (historical)
- `PHASE-2-COMPLETE.md` (historical)
- `MOVIE_PAGE_CREATION_ARCHITECTURE.md` (old architecture)

---

## Phase 6: Create Missing Essential Docs

### 1. Database Schema Documentation
**File:** `docs/DATABASE_SCHEMA.md`

**Content:**
- movies table (tmdb_id, title, year, poster_url, etc.)
- movie_analyses table (old format)
- analysis_data_v3 column (new MVF/V3 format)
- enhanced_why_watch table
- browse_lists tables
- persons table (39,606 entries)

### 2. README.md Consolidation
Ensure root `README.md` points to essential docs:
- Quick start
- Links to Tier 1 docs
- Development setup link

---

## Final Structure (After Cleanup)

```
moviegenius/
├── CLAUDE.md ⭐ (Tier 1)
├── README.md
├── CODE-STANDARDS.md
│
├── docs/
│   ├── MOVIEGENIUS_V3_ARCHITECTURE.md ⭐ (Tier 1 - MASTER PLAN)
│   ├── API_REFERENCE.md ⭐ (Tier 1)
│   ├── DATABASE_SCHEMA.md ⭐ (Tier 1 - TO CREATE)
│   ├── BROWSE_SYSTEM.md (consolidated)
│   ├── CODE_LOCKING_STRATEGY.md (Tier 2)
│   ├── GIT-SAFETY-GUIDE.md (Tier 2)
│   ├── PREVENTING_BUILD_ERRORS.md (Tier 2)
│   ├── TERMINOLOGY_STANDARD.md (Tier 2)
│   ├── TROUBLESHOOTING.md (Tier 3)
│   ├── V2_SEARCH_FEATURES.md (Tier 3)
│   │
│   ├── strategies/
│   │   ├── RELEASE_TODO.md ⭐ (Tier 1)
│   │   └── FEATURE_SCOPE.md
│   │
│   ├── architecture/
│   │   └── LOCKED_COMPONENTS.md (Tier 2)
│   │
│   ├── testing/
│   │   └── ENGINEERING-DECISION-RULES.md (Tier 2)
│   │
│   ├── features/
│   │   └── YOU_PAGE_VISION.md (Tier 3)
│   │
│   ├── guides/
│   │   ├── DEVELOPMENT_SETUP.md (Tier 3)
│   │   └── RAILWAY_ENV_CHECKLIST.md (deployment quick ref)
│   │
│   ├── operations/
│   │   └── DEPLOYMENT_COMPLETE_GUIDE.md (deployment comprehensive)
│   │
│   └── archive/
│       └── [47+ historical docs]
```

**Total Active Docs:** ~20 files (vs 106 current)

---

## Execution Checklist

### Pre-Flight Checks
- [ ] Commit current state (safety backup)
- [ ] Create feature branch: `docs/cleanup-march-2025`
- [ ] Run tests to ensure nothing breaks

### Phase 1: Delete Obsolete
- [ ] Remove 8 episode-related files
- [ ] Verify no code references deleted files

### Phase 2: Remove Duplicates
- [ ] Identify newest version of each duplicate
- [ ] Delete 5 duplicate files
- [ ] Update any references

### Phase 3: Consolidate Browse
- [ ] Create comprehensive `BROWSE_SYSTEM.md`
- [ ] Delete 5 old browse docs

### Phase 4: Consolidate Deployment
- [ ] Merge content into `DEPLOYMENT_COMPLETE_GUIDE.md`
- [ ] Delete 6 redundant deployment docs

### Phase 5: Archive Old Docs
- [ ] Move 6 historical docs to archive/

### Phase 6: Create Missing Docs
- [ ] Create `DATABASE_SCHEMA.md`
- [ ] Update root `README.md`

### Post-Flight Verification
- [ ] All Tier 1 docs exist and complete
- [ ] No broken internal links
- [ ] Run `npm run build` (verify build still works)
- [ ] Commit cleanup: "Consolidate documentation: 106 → 20 essential files"
- [ ] Create PR for review

---

## Success Metrics

**Before:**
- 106 active .md files
- 47 archived files
- Confusing navigation
- Duplicate/conflicting information

**After:**
- ~20 active .md files (81% reduction)
- Clear Tier 1/2/3 organization
- No duplicates
- Single source of truth for each topic

---

## Risk Mitigation

1. **All changes in Git** - Easy rollback if needed
2. **Feature branch** - Review before merge
3. **No code changes** - Only documentation
4. **Preserve archive/** - Historical docs still accessible
5. **Test build** - Ensure no broken references

---

**Ready to execute:** Yes (pending approval)
