# Navigation Regression Incident - May 2026
**Archived:** 2026-05-18
**Status:** HISTORICAL - Incident complete, migration finished
**Current Guide:** `/ios/IOS_NAVIGATION_GUIDE.md`

---

## What Happened

On May 15, 2026, a custom `AppHeader` overlay component was introduced to MovieGenius iOS app. This component required hiding the native navigation bar with `.navigationBarHidden(true)`, which broke iOS native swipe-back gestures across all detail views.

A UIKit introspection workaround (`.enableSwipeBack()`) was added to force-enable the gesture, but this was fragile and unreliable.

On May 18, 2026, the team reverted to native iOS navigation patterns, deleting AppHeader and restoring standard NavigationStack + toolbar modifiers.

---

## Archived Documents

These 5 documents were created during the incident lifecycle:

1. **IOS_NAVIGATION_BEST_PRACTICES.md** (308 lines)
   - Created: During incident
   - Purpose: Document correct patterns to prevent recurrence
   - **Merged into:** `/ios/IOS_NAVIGATION_GUIDE.md` (Best Practices section)

2. **IOS_NAVIGATION_ARCHITECTURE_REVIEW.md** (597 lines)
   - Created: May 18, 2026
   - Purpose: Architectural analysis of what went wrong
   - **Merged into:** `/ios/IOS_NAVIGATION_GUIDE.md` (Incident section)

3. **IOS_NAVIGATION_FIX_PLAN.md** (134 lines)
   - Created: May 15-18, 2026
   - Purpose: Problem statement and solution overview
   - **Merged into:** `/ios/IOS_NAVIGATION_GUIDE.md` (Incident section)

4. **NAVIGATION_FIX_QUICKSTART.md** (179 lines)
   - Created: May 18, 2026
   - Purpose: TL;DR version for quick reference
   - **Merged into:** `/ios/IOS_NAVIGATION_GUIDE.md` (Quick Reference section)

5. **NAVIGATION_MIGRATION_GUIDE.md** (688 lines)
   - Created: May 18, 2026
   - Purpose: Step-by-step migration instructions
   - **Merged into:** `/ios/IOS_NAVIGATION_GUIDE.md` (Migration Guide section)

---

## Why Archive Instead of Delete?

These documents provide valuable historical context:

1. **Incident documentation** - What went wrong and why
2. **Decision rationale** - Why we chose to revert vs patch
3. **Migration record** - How the revert was performed
4. **Lessons learned** - Platform conventions vs custom solutions

The information has been extracted and consolidated into:
- `/ios/IOS_NAVIGATION_GUIDE.md` - Current navigation patterns
- `/DOCUMENTATION_LESSONS_LEARNED.md` - Broader lessons and principles

---

## Key Commits

- **`ac5a2ae52`** (2026-05-13) - ✅ Last correct implementation (native navigation)
- **`9237ed047`** (2026-05-15) - ❌ AppHeader introduced (regression)
- **`813101bde`** (2026-05-15) - ❌ UIKit hack added (wrong solution)
- **[migration commit]** (2026-05-18) - ✅ Reverted to native patterns

---

## Lessons Learned

**Key Takeaways:**

1. **Fight the platform = technical debt**
   - Custom overlay required 5 docs, native patterns require 0
   - UIKit introspection is fragile and requires maintenance

2. **Test gestures immediately**
   - Swipe-back not tested until after deployment
   - Physical device testing essential (simulator differs)

3. **Documentation debt accumulates naturally**
   - Each phase of incident created 1-2 docs
   - Without curation, 5 docs remained after completion
   - Should have consolidated during incident, not months later

4. **Revert quickly when fighting platform**
   - 3 days of work discarded, but correct decision
   - Custom solution would have created ongoing maintenance burden

**See:** `/DOCUMENTATION_LESSONS_LEARNED.md` for detailed analysis and prevention strategies.

---

## For Current Development

**DO NOT** follow the docs in this archive for current development.

**Instead, use:**
- `/ios/IOS_NAVIGATION_GUIDE.md` - Single source of truth for navigation patterns
- `/DOCUMENTATION_LESSONS_LEARNED.md` - Principles and decision frameworks

These archived docs are preserved for historical reference only.

---

## Related

- **Consolidated Guide:** `/ios/IOS_NAVIGATION_GUIDE.md`
- **Lessons Learned:** `/DOCUMENTATION_LESSONS_LEARNED.md`
- **Consolidation Plan:** `/DOCUMENTATION_CONSOLIDATION_PLAN.md`
