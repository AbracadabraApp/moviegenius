# Movie Page Refactor - Deployment Checklist

**Date:** 2025-10-04
**Status:** ✅ READY TO DEPLOY
**Risk Level:** 🟢 LOW (parallel deployment, easy rollback)

---

## ✅ Pre-Deployment Validation

- [x] **Code validation passed** (19/19 checks)
- [x] **Data types defined and validated**
- [x] **Unified loader created with all transforms**
- [x] **Refactored page component created**
- [x] **Migration documentation written**
- [x] **Validation script created**

---

## 📋 Deployment Steps

### Phase 1: Deploy Refactored Route (Parallel)

**What:** Deploy new route alongside existing route
**Risk:** ZERO - original route unchanged
**Time:** ~5 minutes

```bash
# 1. Commit all new files
git add lib/types/movie-page-data.js
git add lib/movie-page-loader.js
git add pages/movie/[id]-refactored.js
git add scripts/validate-refactor.js
git add MOVIE_PAGE_REFACTOR.md
git add DEPLOYMENT_CHECKLIST.md

# 2. Commit with descriptive message
git commit -m "Add refactored movie page (parallel deployment)

- New unified data loader with single output format
- Simplified page component (388 lines → 180 lines)
- Comprehensive validation and type checking
- Zero changes to existing /movie/[id] route
- Ready for A/B testing"

# 3. Push to production
git push
```

**Verify deployment:**
```bash
# Check Railway dashboard for successful deploy
# Logs should show: "✓ Built in ..."
# No errors in build output
```

### Phase 2: Test in Production

**What:** Test refactored route with real traffic
**Risk:** LOW - only affects -refactored route
**Time:** ~10 minutes

```bash
# Visit refactored pages on production:
https://yoursite.com/movie/550-refactored    # Fight Club
https://yoursite.com/movie/680-refactored    # Pulp Fiction
https://yoursite.com/movie/238-refactored    # The Godfather

# Check browser DevTools console for:
# "🔍 Loading movie 550..."
# "✅ Loaded from [source] in [X]ms"
# No JavaScript errors

# Check Railway logs for any errors:
# Railway Dashboard → Logs → filter for "movie-page-loader"
```

**Success criteria:**
- [ ] Pages load without errors
- [ ] Movie data displays correctly
- [ ] Images load properly
- [ ] Links work
- [ ] Performance <2 seconds
- [ ] No console errors

### Phase 3: Monitor for 24 Hours

**What:** Observe real usage patterns
**Risk:** LOW - only monitoring
**Time:** 24 hours (passive)

**Check:**
- [ ] Error rate (should be 0%)
- [ ] Load times (should be faster)
- [ ] No user complaints
- [ ] Railway logs clean

### Phase 4: Cutover (When Ready)

**What:** Make refactored version the default
**Risk:** MEDIUM - changes production route
**Time:** ~5 minutes
**Rollback:** 30 seconds

```bash
# 1. Backup original file
git mv pages/movie/[id].js pages/movie/[id]-legacy.js

# 2. Rename refactored to main
git mv pages/movie/[id]-refactored.js pages/movie/[id].js

# 3. Commit
git commit -m "Switch to refactored movie page

- Original preserved as [id]-legacy.js
- Can rollback instantly if needed"

# 4. Push
git push
```

**Monitor for 2 hours:**
- [ ] Traffic flows normally
- [ ] Error rate unchanged or better
- [ ] Load times improved
- [ ] No user reports

### Phase 5: Cleanup (After 1 Week)

**What:** Remove legacy code and obsolete files
**Risk:** NONE - if week was stable
**Time:** 2 minutes

```bash
# Only if Phase 4 was stable for 1 full week:

# Remove legacy movie page
git rm pages/movie/[id]-legacy.js

# Remove nuclear static infrastructure (no longer used)
git rm -r public/nuclear-static/  # Only 6 files, not worth maintaining
git rm scripts/nuclear-static-generator.js
git rm scripts/optimized-nuclear-batch.js
git rm lib/nuclear-*.js
git rm pages/api/nuclear-*.js
git rm pages/nuclear-dashboard.js

git commit -m "Clean up legacy code and nuclear static system

- Remove legacy movie page (refactored version stable for 7 days)
- Remove nuclear static system (only 6 files, not worth maintaining)
- Database has 21,275 complete analyses - use that instead
- Focus on enhanced static generation for popular movies"

git push
```

**Optional:** Keep nuclear infrastructure if you want to understand it historically.
But operationally, it's adding complexity for minimal benefit (6 files vs 21K in database).

---

## 🚨 Rollback Procedures

### If Phase 2 Fails (Refactored route broken)

```bash
# Option A: Just fix the issue (if minor)
# Edit pages/movie/[id]-refactored.js
git add pages/movie/[id]-refactored.js
git commit -m "Fix refactored page issue"
git push

# Option B: Remove refactored route temporarily
git rm pages/movie/[id]-refactored.js
git commit -m "Temporarily remove refactored route"
git push
```

### If Phase 4 Fails (Production route broken)

```bash
# Option A: Quick revert (30 seconds)
git revert HEAD --no-edit
git push

# Option B: Manual rollback
git mv pages/movie/[id].js pages/movie/[id]-broken.js
git mv pages/movie/[id]-legacy.js pages/movie/[id].js
git commit -m "Rollback to legacy movie page"
git push

# Option C: Hard reset (if multiple bad commits)
git log --oneline  # Find last good commit
git reset --hard <commit-hash>
git push --force-with-lease
```

---

## 📊 Success Metrics

### Performance Improvements
- **Target:** 10-25% faster load times
- **Measure:** Browser DevTools Network tab
- **Compare:** Original vs refactored route

### Code Quality Improvements
- **Original:** 388 lines, 5 data shapes, 3 fallback paths
- **Refactored:** 180 lines, 1 data shape, clear flow
- **Complexity:** 50% reduction

### Maintainability Improvements
- **Before:** Data transforms in 3 places
- **After:** All transforms in 1 loader
- **Testing:** Mock 1 function vs 3 endpoints

---

## 🔍 Monitoring

### What to Watch

**Error Logs (Railway Dashboard):**
```
Filter for:
- "Could not load movie"
- "Invalid movie page data"
- "Failed to parse URL"
```

**Performance Metrics:**
```
Compare:
- Original route: /movie/550
- Refactored route: /movie/550-refactored

Metrics:
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
```

**User Experience:**
```
Check for:
- Missing content
- Broken images
- Failed redirects
- 404 errors
```

---

## 📞 Support

### If Something Goes Wrong

**Immediate actions:**
1. Check Railway logs for error messages
2. Test the specific failing movie ID
3. Check browser console for JavaScript errors
4. If widespread: rollback immediately
5. If isolated: investigate and fix

**Debug commands:**
```bash
# Test data loader directly (if server running)
curl https://yoursite.com/api/movie-analysis?tmdbId=550

# Check static file exists
curl -I https://yoursite.com/data/enhanced-movies/movie-550.json

# View Railway logs
railway logs --tail
```

**Common Issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Could not load movie" | All data sources failed | Check API endpoints are working |
| "Invalid movie page data" | Data shape mismatch | Check transform functions |
| Blank page | JavaScript error | Check browser console |
| Slow loading | No static files | Generate static files or accept dynamic |

---

## ✅ Final Checklist Before Phase 4 Cutover

Before making refactored version the default:

- [ ] Phase 2 completed successfully
- [ ] Tested on 10+ different movies
- [ ] 24+ hours of monitoring complete
- [ ] Zero errors in logs
- [ ] Performance equal or better
- [ ] Team approval obtained
- [ ] Backup plan confirmed
- [ ] Rollback tested

**If all checked:** Proceed with Phase 4
**If any unchecked:** Investigate and resolve first

---

## 📝 Post-Deployment Tasks

After successful cutover:

1. **Update internal links** (if any hardcoded to old route)
2. **Monitor for 1 week** before cleanup
3. **Document learnings** for future refactors
4. **Consider next refactors** (components, other pages)

---

**Ready to deploy?** Start with Phase 1 above.

**Questions?** Read MOVIE_PAGE_REFACTOR.md for details.
