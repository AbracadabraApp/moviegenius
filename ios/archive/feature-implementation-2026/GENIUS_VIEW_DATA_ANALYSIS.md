# GeniusView Data Expansion Analysis

**Date:** 2026-05-15
**Commit:** 4d80ca94d (iOS tier progress tracking)
**Author:** Post-crash recovery analysis

---

## Changes Summary

### File Size Growth
- **GeniusView.swift:** 233 KB (6,136 lines, +3,062 lines)
- **TierTmdbLookup.swift:** 97 KB (1,846 lines) - NEW file
- **Total data:** 330 KB of embedded Swift code

### Embedded Film Data
- **287 film entries** in CategoryEssentials static data
- Format: `case (category, subcategory): [EssentialMovie(...), ...]`
- Includes: title, year, director, genres, themes

### New Architecture Components
1. **TierProgressTracker** - ObservableObject tracking completion % per tier
2. **Journey-based tab system** - Stage-based user progression
3. **Tier lookup system** - TMDB ID mapping (1,846 lines in separate file)
4. **CategoryEssentials expansion** - Massive film data addition

---

## Risk Assessment

### ⚠️ Concerns

1. **Code maintainability:**
   - 6,136 lines in a single View file
   - 287 film entries as static Swift code
   - Hard to update/maintain film data

2. **App bundle size:**
   - 330 KB of static data compiled into binary
   - Could be JSON/plist instead (~50% smaller compressed)

3. **Build time:**
   - Large Swift files slow compilation
   - Changes to ANY part rebuild entire file

4. **Git diff noise:**
   - Adding one film = massive git diff
   - Hard to review data changes

### ✅ Benefits

1. **Type safety:**
   - Swift compiler validates all film data
   - No runtime JSON parsing errors

2. **Performance:**
   - No disk I/O or JSON decoding at runtime
   - Immediate access to all data

3. **Simple architecture:**
   - No separate data loading layer needed
   - All data in one place

---

## Recommendations

### Short-term (Keep as-is)
- ✅ Already committed and safe
- ✅ Builds successfully
- ✅ Type-safe and performant
- ⚠️ Monitor build times

### Medium-term (Consider refactor)
If film data grows beyond 500 entries, consider:

1. **Extract to JSON/plist:**
   ```
   ios/moviegenius/moviegenius/Data/CategoryEssentials.json
   ```
   - Decode once at app launch
   - Cache in memory
   - Smaller bundle size

2. **Code generation:**
   - Keep data in JSON
   - Generate Swift code at build time
   - Best of both worlds (type safety + maintainability)

3. **Split by category:**
   ```
   Views/Genius/ActionEssentials.swift
   Views/Genius/DramaEssentials.swift
   ...
   ```
   - Separate files = faster builds
   - Load on-demand per category

### Long-term (If data exceeds 1000 entries)
- Move to Core Data or SQLite
- Bundle pre-populated database
- Query on demand

---

## Current Status: ✅ ACCEPTABLE

**Verdict:** The current implementation is fine for ~287 films.

**Action:** Monitor. If you plan to add 500+ more films, revisit this document.

**Threshold for refactor:**
- File size > 500 KB
- Film count > 500 entries
- Build time > 10 seconds incremental
- Git diffs become unmanageable

---

## Files Modified in Commit 4d80ca94d

**Major changes:**
- GeniusView.swift: +3,062 lines (tier progress tracking + film data)
- TierTmdbLookup.swift: +1,846 lines (NEW - TMDB ID lookup)
- AuthManager.swift: +189 lines (NEW - sign-in system)
- MovieDetailView.swift: +207 lines
- TrailerView.swift: +151 lines
- FavoritesManager.swift: +135 lines

**Total:** 24 files, +6,146 insertions, -742 deletions

---

## Related Documentation

- `/ios/DESIGN_DECISIONS.md` - iOS architecture decisions
- `/ios/QUICK_START.md` - Development setup
- `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md` - Overall system architecture
