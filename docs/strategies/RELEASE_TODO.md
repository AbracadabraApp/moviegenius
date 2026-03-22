# MovieGenius Site Release Todo List

**Updated:** 2025-01-XX
**Status:** 4 Active Production Issues
**Progress:** 20/24 Complete (83.3%)

## ✅ All Critical Issues Resolved!

No blocking issues remain. Ready to proceed to MVF or V3.

## ✅ Completed Items (22 items)

### Core System

- #1 - Update homepage theme name from 'Cinema's Cultural Impact' to 'Hollywood
  Transformed'
- #2 - Create theme-to-episode mapping configuration
- #3 - Redesign all 10 theme pages to list episodes
- #4 - Create episode detail page routing and display
- #5 - Test complete navigation flow (home → theme → episode)

### Movie Link System

- #6 - Analyze movie links in episode content
- #7 - Fix movie link processing in episode pages
- #8 - Select test episodes with different movie mention patterns
- #9 - Review current episode display and layout
- #10 - Build test function for movie link processing
- #11 - Test TMDB lookup quality and accuracy
- #12 - Review link styling and layout integration

### Search System Overhaul

- #14 - Implement keyword-based search with popularity ranking using TMDB API
- #15 - Replace AskInputBar with SimpleSearch in all page files (13 files)
- #16 - Replace AskInputBar with SimpleSearch in component files (3 files)

### Production Verification

- #22 - Fix SimpleSearch functionality not working in production (verified working)
- #32 - MediaCards poster size verification (125×188px confirmed correct)

### UI Cleanup

- #17 - Remove episode number displays (Episode 1-6) from all theme pages and
  components
- #18 - Remove back icon from film-noir page and site-wide
- #19 - Remove breadcrumb trails from all episode pages
- #20 - Remove gear/settings icon and skip button from themes page

## ❌ Cancelled/Deferred (13 items)

**Episodes work cancelled** - Removed from scope:
- #13 - Convert all 65 episodes to static with processed links
- #24 - Fix missing hero banners on episode pages in production
- #25 - Review and fix camelCase URLs in episode routing
- #26 - Fix film-noir theme page styling
- #27 - Fix broken covers/images on episode pages
- #28 - Fix missing movie links in episode content
- #29 - Fix missing site branding/string at top of episode pages
- #30 - Add missing footers with related series and themes navigation
- #31 - Fix missing 'Explore Further' section on episode pages

**UI/UX features cancelled:**
- #21 - Remove skip button from platforms modal (feature no longer exists)
- #23 - Fix movie browse buttons not working on search results (feature deprecated)
- #33 - Fix inconsistent theme box formatting (theme pages deprecated)

**Infrastructure deferred:**
- #34 - Create automated deployment monitoring system (deferred)

## 📊 Summary

**Total Items:** 34
**Completed:** 22 (100% of active items)
**High Priority Pending:** 0
**Medium Priority Pending:** 0
**Cancelled/Deferred:** 13

## 🎯 Next Steps

**All production issues resolved!** ✅

Ready to proceed with:

1. **MVF (Minimum Viable Fix)** - $158, 2 weeks
   - Fix 17K+ broken movie analysis links
   - New concise 200-word format
   - Client-side linking (no post-processing)
   - Add `analysis_data_v3` column (safe, reversible)

2. **V3 (Complete Redesign)** - $182.50, 4-6 weeks
   - Everything from MVF
   - Simplified components (1,900 → 400 lines)
   - Unified API (1 call vs 4)
   - iOS-ready `/api/v1/*` endpoints
   - WhyWatch-first page hierarchy

3. **Browse Enhancement (Optional)** - $12-141
   - Sparse lists: $12.40 (827 lists with ≤10 movies)
   - Comprehensive: $135.96 (Claude-level coverage)

## 📝 Decision Required

Choose your path:
- **Conservative:** MVF → Validate → Consider V3 later
- **iOS-Ready:** V3 + Sparse Browse ($194.50 total)

See `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md` for complete details.

---

**Note:** This list represents the current state of production issues identified
through systematic testing of the live MovieGenius site. No new development
should proceed until these foundational issues are resolved.
