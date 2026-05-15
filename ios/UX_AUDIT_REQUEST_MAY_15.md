# iOS UX Audit Request - May 15, 2026

**Requester:** MovieGenius Development Team
**Date:** 2026-05-15
**Context:** Follow-up to May 11 design audit after major implementation work
**Purpose:** Validate fixes, review new features, prepare for TestFlight launch

---

## Executive Summary

The MovieGenius iOS app underwent significant changes since the May 11 design audit:

**✅ RESOLVED (May 11 audit):**
- Design system overhaul (glass materials, semantic fonts/colors/spacing)
- GeniusView rewritten from 52-line placeholder to 6,134-line full-featured page
- Typography chaos fixed (all hardcoded fonts → `.mg*` system)
- Color violations fixed (all hardcoded colors → semantic system)

**🆕 NEW FEATURES ADDED (not in May 11 audit):**
- Watch Queue system (WatchQueueView + ViewModel)
- Sign-In with Apple (SignInPromptView + AuthManager)
- Trailer player (TrailerView + YouTubePlayerView)
- Unified AppHeader component with centered search
- Genre Expertise tracking system

**⚠️ OUTSTANDING CONCERNS:**
- Dark mode COMPLETELY UNTESTED (high risk)
- 14 issues from May 11 audit remain open
- 6,134-line GeniusView may need architectural review
- New features need expert UX validation

---

## What Changed Since May 11

### Critical Issues Addressed (4/5 fixed)

**✅ Issue #1-3: Design System, Typography, Color System**
- Commit 372213dbf (May 12): "Enhance iOS design system with native patterns"
- Added `.mgGlassCard()`, `.mgProminentCard()` modifiers
- Added semantic colors: `.mgDestructive`, `.mgSuccess`, `.mgWarning`
- Added corner radius constants: `.mgCornerTiny` through `.mgCornerLarge`
- Global find/replace: ALL hardcoded fonts → `.mgHeadline`, `.mgBody`, etc.
- Global find/replace: ALL hardcoded colors → semantic color system
- Applied glass materials (`.ultraThinMaterial`, `.regularMaterial`) throughout app

**✅ Issue #4: GeniusView Web Parity Gap**
- Commit 6185f9ff8 (May 12): Complete rewrite
- **Scale:** 52 lines → 6,134 lines (118× larger)
- **Features added:**
  - 3-tab navigation (Journey/Loved/Queue)
  - Journey stage tracking with dynamic insights
  - Stats grid with icon badges
  - "What We're Learning" educational section
  - "Learning Opportunities" cards
  - Empty states for all tabs
- **Result:** GeniusView now matches web UX patterns

### New Features Added (Post May 11)

**🆕 Watch Queue System (Commit 4d80ca94d - May 13)**

Files created:
- `WatchQueueView.swift` (187 lines)
- `WatchQueueViewModel.swift` (ViewModel pattern)

Features:
- Vertical list of "Watch it" marked movies
- Horizontal card layout: 140×210 poster (left) + trailer button (right)
- Favorite buttons at bottom of each card
- Empty state with clear CTA
- Pull-to-refresh
- Glass material cards (`.regularMaterial`)
- Navigation to MovieDetailView

**🆕 Sign-In System (Commit 4d80ca94d - May 13)**

Files created:
- `SignInPromptView.swift` (113 lines)
- `AuthManager.swift` (backend integration)
- `ios/moviegenius/moviegenius/Managers/` directory

Features:
- Native Apple Sign-In button
- Face ID support messaging
- Loading/error states
- Privacy messaging ("Your data is encrypted and private")
- "Not Now" dismissal option
- Lazy sign-in UX (only prompts on favorite interaction)

**🆕 Trailer Player (Commit bfe81d48d - May 13)**

Files created:
- `TrailerView.swift` (264 lines)
- `YouTubePlayerView.swift` (WKWebView wrapper, 143 lines)

Features:
- Full-screen trailer experience
- Multiple trailer selection grid
- Official badge indicators
- 16:9 aspect ratio player
- Loading/error states
- Dismiss with X button

**🆕 Unified AppHeader (Commit 9237ed047 - May 13)**

File created:
- `AppHeader.swift` (100 lines)

Features:
- Reusable header component
- Centered search bar (240px fixed width)
- Glass material search bar (`.ultraThinMaterial`)
- Back button (conditional)
- Full-screen search modal on tap
- Consistent spacing (keeps search centered)

**🆕 Genre Expertise Tracking (Commits 4eadf1304, aa8be6081 - May 13-14)**

Files created:
- `GenreMasteryCard.swift`
- `GenreExpertiseManager.swift`
- 110 curated filmographies for mastery tracking

Features:
- Tier-based progress (Essential → Master)
- Per-genre completion tracking
- Mystery tier optimization

### High Priority Issues Addressed (3/10 fixed)

**✅ Issue #7: Navigation Bar Standardization**
- YouView changed from `.inline` to `.large` (commit 372213dbf)

**✅ Issue #11: Haptic Feedback Consistency**
- FavoriteButtons now use `.selection()` for toggles (was `.light()`)
- CollectionDetailView bookmark uses `.selection()`
- Added `HapticManager.medium()` and `.warning()` methods

**✅ Issue #10: Accessibility Labels (Partial)**
- CollectionCarousel movie cards have `.accessibilityElement(children: .combine)`
- Trailer buttons have accessibility labels

### Medium Priority Issues Addressed (2/8 fixed)

**✅ Issue #18: Trailer Player Implementation**
- Full implementation with TrailerView + YouTubePlayerView
- Professional player experience with multiple trailer support

---

## Current iOS App Architecture

**Total View Files:** 20

### Core Navigation Views
- `MainTabView.swift` - 3-tab system (Movies/Genius/Watch)
- `HomeView.swift` - Browse collections
- `GeniusView.swift` - **6,134 lines** (Journey/Loved/Queue tabs) ⭐
- `YouView.swift` - Stats and journey stage
- `SearchView.swift` - Full-screen search

### Detail Views
- `MovieDetailView.swift` - WhyWatch + Analysis + Streaming + More Ideas
- `CollectionDetailView.swift` - Collection grid with bookmarks
- `PersonDetailView.swift` - Cast/crew filmography

### Component Views
- `AppHeader.swift` - Reusable header with centered search 🆕
- `MoviePosterView.swift` - Poster with trailer button
- `WhyWatchView.swift` - YES/NO recommendation
- `MoreIdeasView.swift` - Horizontal recommendations
- `FavoriteButtons.swift` - "Seen it ❤️" / "Watch it 📌"
- `CollectionCarousel.swift` - Horizontal poster grid

### New Feature Views 🆕
- `SignInPromptView.swift` - Apple sign-in modal (113 lines)
- `WatchQueueView.swift` - Queue management (187 lines)
- `TrailerView.swift` - Trailer player (264 lines)
- `YouTubePlayerView.swift` - YouTube wrapper (143 lines)
- `GenreMasteryCard.swift` - Genre progress cards

### Utility Views
- `ProjectorBeamIcon.swift` - Custom icon

---

## Outstanding Issues from May 11 Audit

### 🔴 CRITICAL - Still Open

**Issue #5: YouView Missing Features**
- Status: PARTIAL
- ✅ Has journey stages + stats grid
- ❌ Missing tab bar navigation (Journey/Loved/Queue)
- ❌ Missing educational content from web
- Decision needed: Implement web's tab system OR document intentional iOS divergence

### 🟠 HIGH PRIORITY - Still Open

**Issue #8: Dark Mode Not Tested** ⚠️ HIGH RISK
- Status: **COMPLETELY UNTESTED**
- Risk: Hardcoded shadows may be invisible/too harsh
- Views needing testing: ALL 20 Views
- Fix pattern available in May 11 audit (conditional shadow opacity)
- **Blocker for TestFlight launch**

**Issue #9: Corner Radius Inconsistencies**
- Status: MOSTLY FIXED
- Commit 372213dbf added `.mgCornerTiny` through `.mgCornerLarge` constants
- Action: Verify all Views use `.mgCorner*` not hardcoded values

**Issue #12: Skeleton Loading States**
- Status: PARTIAL
- ✅ HomeView has skeleton
- ❌ CollectionDetailView uses `ProgressView()`
- ❌ MovieDetailView uses `ProgressView()`
- Action: Extract HomeView's skeleton pattern to DesignSystem for reuse

**Issue #13: Search Bar Needs Glass Style**
- Status: PARTIALLY ADDRESSED
- ✅ AppHeader uses `.ultraThinMaterial` with prominent styling
- ⚠️ HomeView and GeniusView still use default `.searchable()` modifier
- Action: Consider replacing native search with AppHeader pattern everywhere

**Issue #14: Button Styles Not Consistent**
- Status: MOSTLY FIXED
- DesignSystem now has `MGListRowButtonStyle`
- Action: Verify YouView list buttons use this style

**Issue #15: Tab Bar Needs Custom Appearance**
- Status: NOT ADDRESSED
- MainTabView uses default tab bar styling
- Action: Add custom UITabBarAppearance on appear

### 🟡 MEDIUM PRIORITY - Still Open

**Issue #16: Missing Animations**
- Status: NOT ADDRESSED
- List insertion/deletion animations not added
- Tab switching uses basic transitions
- Recommendation: Defer to future enhancement

**Issue #17: Empty States**
- Status: IMPROVED
- ✅ GeniusView has rich empty states (all 3 tabs)
- ✅ WatchQueueView has empty state
- ❌ CollectionDetailView needs empty state (only has error state)

---

## Uncommitted Changes (As of May 15)

### MainTabView.swift
**Change:** Watch Queue tab icon changed
```swift
- Label("Watch", systemImage: "play.rectangle")
+ Label("Watch", systemImage: "bookmark.fill")
```
**Reason:** "bookmark.fill" better represents saved/queued items than play button
**Question for expert:** Which icon semantically represents "Watch Queue" better?

### WatchQueueView.swift
**Change:** Empty state icon color
```swift
- .foregroundStyle(Color.mgSecondary)
+ .foregroundStyle(Color(.darkGray))
```
**Status:** Minor change, ready for commit

---

## Questions for iOS Expert

### Priority 1: New Features

1. **GeniusView Scale:** Is 6,134 lines for a single View sustainable? Should this be split into smaller components (e.g., JourneyTabView, LovedTabView, QueueTabView)?

2. **Watch Queue Layout:** Does the horizontal card layout (poster left, trailer button right, favorites bottom) work well on small screens (iPhone SE)? Test on Pro Max as well.

3. **Sign-In Prompting:** When should the sign-in modal appear? Is the "lazy sign-in" pattern (prompt on first favorite tap) appropriate or annoying?

4. **Trailer UX:** Full-screen modal with X button vs standard navigation with back button - which is more iOS-native for video players?

5. **AppHeader Usage:** Which Views should use AppHeader vs native navigation? Concerns about consistency if only some views use it?

### Priority 2: Outstanding Issues

6. **Dark Mode Priority:** Should dark mode testing be done NOW before more features are added? This is a potential TestFlight blocker.

7. **Glass Material Usage:** Are we overusing or underusing `.ultraThinMaterial` and `.regularMaterial`? Original audit said we only had 1 instance - now we have many.

8. **Tab Icon Semantics:** Which icon better represents "Watch Queue":
   - `play.rectangle` (current committed version)
   - `bookmark.fill` (uncommitted change)
   - Or suggest alternative?

### Priority 3: Architecture

9. **Genre Mastery Visibility:** Should genre expertise be more prominent in GeniusView Journey tab?

10. **Design System Completeness:** Are there missing patterns in DesignSystem.swift that would prevent future inconsistencies?

---

## Recommended Review Workflow

### Stage 1: Fresh Eyes on New Features (15 min)
- Open iOS app on device (no code reading yet)
- Navigate through Watch Queue, Sign-In, Trailer player, GeniusView tabs
- Note any UX friction, confusion, or delight
- Test on iPhone SE (small) and Pro Max (large)
- Record first impressions before reading code

### Stage 2: Side-by-Side Web Comparison (10 min)
- Open web version at moviegenius.app
- Compare GeniusView (iOS) to "You" page (web)
- Note feature parity, divergences, UX differences
- Check if iOS improvements should be backported to web

### Stage 3: Dark Mode Stress Test (20 min) ⚠️ CRITICAL
- Enable dark mode on iOS device
- Go through EVERY View systematically
- Check shadows, colors, text contrast, glass materials
- Document any issues with screenshots
- **This is the highest-risk area for TestFlight**

### Stage 4: Code Review of May 11 Fixes (15 min)
- Review commit 372213dbf (design system enhancement)
- Verify semantic styles applied correctly across all Views
- Check for any hardcoded values that slipped through
- Grep for: `.font(.headline)`, `.foregroundColor(.yellow)`, hardcoded `16`, `8`, etc.

### Stage 5: Design System Audit (10 min)
- Review `/ios/moviegenius/moviegenius/DesignSystem.swift`
- Check for missing patterns, inconsistent naming, gaps
- Suggest additional modifiers or styles needed
- Verify all semantic constants are being used

### Stage 6: Accessibility Testing (15 min)
- Enable VoiceOver, test all interactive elements (especially new features)
- Enable Larger Text, check Dynamic Type support
- Test with Reduce Motion enabled
- Document accessibility improvements needed

**Total estimated time:** 85 minutes

---

## Success Criteria for Audit

The expert review should deliver:

### ✅ Assessment of New Features
- UX quality rating for Watch Queue, Sign-In, Trailer, GeniusView
- Layout issues on different screen sizes (SE vs Pro Max)
- Suggestions for improvement

### ✅ Dark Mode Testing Report
- Issues found with specific file:line references
- Screenshots showing problems
- Priority/severity of each issue
- Fix recommendations

### ✅ Verification of May 11 Fixes
- Confirmation semantic styles applied correctly
- Any regressions or incomplete fixes identified
- Remaining hardcoded values found

### ✅ Design System Recommendations
- Missing patterns to add
- Inconsistencies to fix
- Best practices to document

### ✅ Accessibility Findings
- VoiceOver label issues
- Dynamic Type problems
- Contrast/readability issues in dark mode

### ✅ Prioritized Issue List
- 🔴 Critical blockers (must fix before TestFlight)
- 🟠 High priority (should fix soon)
- 🟡 Medium priority (nice to have)
- ⚪ Low priority (future enhancements)

### ✅ Code Quality Assessment
- Is 6,134-line GeniusView sustainable?
- Component extraction opportunities
- Architecture recommendations
- Performance concerns

### ✅ TestFlight Readiness Assessment
- What's blocking launch?
- What can ship as-is?
- What should be fixed post-launch?

---

## Context for Expert

### Project Background
- **MovieGenius:** Movie recommendation app (web + iOS)
- **Web version:** Mature, full-featured
- **iOS app:** Catching up to web UX parity
- **Design philosophy:** WhyWatch-first, mobile-optimized, glass materials for iOS-native feel
- **Current focus:** Preparing for TestFlight launch

### Team Constraints
- Solo developer with Claude Code assistance
- Limited iOS expertise (designer/developer hybrid)
- High velocity: 27 commits in 4 days = potential quality trade-offs
- Need expert validation before TestFlight beta

### Why This Audit Matters
- May 11 audit identified "web port" feel (not native iOS)
- Since then: 6,000+ lines of new code added (especially GeniusView)
- Dark mode completely untested (high risk for TestFlight)
- Need expert validation that:
  1. Design system fixes worked
  2. New features are UX-sound
  3. No dark mode disasters
  4. Architecture is sustainable
- **TestFlight launch depends on this audit passing**

### Development Timeline
- **May 11:** Original design audit (47 issues identified)
- **May 12:** Design system overhaul (commit 372213dbf)
- **May 12:** GeniusView rewrite (commit 6185f9ff8)
- **May 13:** Watch Queue + Sign-In + Trailer player added
- **May 13:** AppHeader component created
- **May 13-14:** Genre expertise system added
- **May 15:** This audit request

**Velocity:** 27 commits, 5 new Views, 1 massive rewrite (GeniusView) in 4 days

---

## Metrics & Scale

### Issue Resolution (from May 11 audit)
- ✅ Critical issues: 4/5 addressed (80%)
- ✅ High priority: 3/10 addressed (30%)
- ✅ Medium priority: 2/8 addressed (25%)
- **Overall:** 9/23 priority issues resolved (39%)

### Code Volume
- **Total iOS View files:** 20
- **Largest View:** GeniusView.swift (6,134 lines)
- **New feature code:** ~900 lines (Sign-In + Watch Queue + Trailer + AppHeader)
- **Total Views added since May 11:** 5

### Still Outstanding
- **14 issues** from May 11 audit remain open
- **Dark mode:** COMPLETELY UNTESTED (highest risk)
- **Skeleton loading:** Incomplete (only 1/3 views)
- **Tab bar:** Not customized (default appearance)

---

## Files to Reference

### Must-read before review:
1. This document (`/ios/UX_AUDIT_REQUEST_MAY_15.md`)
2. `/ios/DESIGN_AUDIT_ISSUE.md` (original May 11 audit)
3. `/ios/moviegenius/moviegenius/DesignSystem.swift` (design system reference)

### View files to review (20 total):
4. `MainTabView.swift` - Tab navigation
5. `HomeView.swift` - Browse collections
6. `GeniusView.swift` - **6,134 lines** ⭐ NEEDS SPECIAL ATTENTION
7. `YouView.swift` - Stats and journey
8. `SearchView.swift` - Search experience
9. `MovieDetailView.swift` - Movie detail page
10. `CollectionDetailView.swift` - Collection detail
11. `PersonDetailView.swift` - Person detail
12. `AppHeader.swift` - Reusable header 🆕
13. `MoviePosterView.swift` - Poster component
14. `WhyWatchView.swift` - Recommendation component
15. `MoreIdeasView.swift` - Recommendations list
16. `FavoriteButtons.swift` - Action buttons
17. `CollectionCarousel.swift` - Poster carousel
18. `SignInPromptView.swift` - Sign-in modal 🆕
19. `WatchQueueView.swift` - Queue management 🆕
20. `TrailerView.swift` - Trailer player 🆕
21. `YouTubePlayerView.swift` - YouTube wrapper 🆕
22. `GenreMasteryCard.swift` - Genre progress 🆕
23. `ProjectorBeamIcon.swift` - Custom icon

### For comparison:
24. Web version: `pages/you.js` (for GeniusView parity check)
25. Web version: moviegenius.app (live comparison)

### Git history:
26. Commit 372213dbf (May 12): Design system enhancement
27. Commit 6185f9ff8 (May 12): GeniusView rewrite
28. Commit 4d80ca94d (May 13): Watch Queue + Sign-In
29. Commit bfe81d48d (May 13): Trailer player
30. Commit 9237ed047 (May 13): AppHeader

---

## TL;DR for Expert

**In 4 days since May 11 audit:**
- ✅ Design system overhauled (fonts, colors, spacing, glass materials)
- ✅ GeniusView rewritten (52 → 6,134 lines, now matches web)
- ✅ 4 major NEW features added (Watch Queue, Sign-In, Trailer, AppHeader)
- ⚠️ Dark mode COMPLETELY UNTESTED
- ⚠️ 14 issues from May 11 still open

**Need you to:**
1. **Validate** design system fixes worked (fonts, colors, spacing, glass)
2. **Review** 4 new features for UX quality
3. **Test** dark mode on all 20 Views (HIGHEST RISK)
4. **Assess** if 6K-line GeniusView needs refactoring
5. **Prioritize** remaining issues for TestFlight readiness

**Timeline:** Need audit before TestFlight launch. Ready when you are.

---

**End of Brief**
