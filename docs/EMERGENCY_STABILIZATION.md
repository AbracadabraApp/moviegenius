# MovieGenius Emergency Stabilization Plan

**Created:** 2026-05-13
**Status:** ACTIVE - PROJECT FREEZE IN EFFECT
**Priority:** CRITICAL

---

## Situation Assessment

**Symptoms:**
- 50 commits in 2 weeks (churn rate too high)
- Reversion cycles on iOS design
- Incomplete/contradictory design documents
- TestFlight shipped but quality concerns
- Divergence from Apple UX standards
- 90% of educational content missing (59 of 65 episodes)

**Root causes:**
1. No locked baseline - everything is in flux
2. Parallel work on web V3 + iOS without coordination
3. Feature additions while architecture unstable
4. Documentation doesn't match implementation reality
5. iOS design system incomplete (47 documented issues)

---

## BROKEN FEATURES & ISSUES (Prioritized)

### 🔴 CRITICAL - Must Fix for V1

#### 1. iOS Design System Incomplete (47 issues)
**Impact:** App feels web-like, not native iOS
**File:** `/ios/DESIGN_AUDIT_ISSUE.md`

**Core Problems:**
- Glass morphism missing (only 1 instance of `.ultraThinMaterial` in entire codebase)
- Typography chaos: 15+ hardcoded fonts instead of semantic `.mg*` system
- Color system violations: Hardcoded colors break dark mode
- Shadows/spacing hardcoded instead of using DesignSystem constants
- Not tested in dark mode

**Files Needing Major Work:**
- `/ios/moviegenius/moviegenius/DesignSystem.swift` - Add glass materials, corner radius constants
- 12+ view files with hardcoded typography/colors

**Estimate:** 3-4 weeks to properly implement
**Decision Needed:** Ship V1 with current design OR delay for proper iOS polish?

---

#### 2. iOS/Web Feature Divergence - GeniusView
**Impact:** Platform confusion, maintenance burden
**Files:** `/ios/moviegenius/moviegenius/Views/GeniusView.swift` vs `/pages/you.js`

**iOS Has:**
- Tab system (Watched/Favorites/Browse)
- Genre expertise tracking
- Stats display
- Collection system

**Web Has:**
- Educational episode cards
- Different layout/interaction patterns
- Different content strategy

**Problem:** Same feature, completely different implementations. Which is correct?

**Decision Needed:**
- Option A: Make iOS match web
- Option B: Make web match iOS
- Option C: Intentionally different (document why)

---

#### 3. Dark Mode Not Tested
**Impact:** iOS app may break in dark mode (hardcoded colors)
**Files:** 12+ iOS view files, `/ios/moviegenius/moviegenius/DesignSystem.swift`

**Problem:**
- Hardcoded hex colors throughout views (e.g., `Color(hex: "#1a1a1a")`)
- Won't adapt to system dark mode
- Shadows hardcoded (will look wrong in dark mode)
- No dark mode testing done

**Decision Needed:**
- Option A: Test in dark mode, fix critical issues before V1
- Option B: Ship V1 in light mode only (disable dark mode support)
- Option C: Accept bugs, fix in V1.1

---

### 🟡 MEDIUM - Acceptable for V1, Fix in V1.1

#### 4. Search V2 Features Deferred
**Impact:** Search feels limited (dropdown only)
**File:** `/docs/V2_SEARCH_FEATURES.md`

**Built But Not Integrated:**
- `SearchResultCard.js` - Grid view with actions
- `SearchResults.js` - Grid/list toggle
- Full results page at `/search?q={query}`
- Advanced filters (year, genre, sort)

**Current:** Word wheel dropdown (3+ chars → 8 suggestions → click → movie page)
**V2 Vision:** Full results page with browsing, comparison, watchlist

**Decision:** Intentionally deferred (acceptable for V1)

---

#### 5. Contributors Feature Deprecated
**Impact:** Feature exists but paused at 41% coverage
**File:** `/docs/CONTRIBUTORS_DEPRECATED.md`

**Status:**
- 13,645 movies have contributors (41% of catalog)
- Scripts archived to `/archive/contributors-scripts/`
- API endpoints work (read-only)
- Low value vs WhyWatch (85%) and MoreIdeas (60%)

**Decision:** Accept 41% coverage, deprioritize (acceptable)

---

### 🟢 LOW - Documentation/Cleanup

#### 6. Stale Documentation
**Impact:** Confusion, wasted debugging time
**Files:**
- `/ios/API_UPDATE_NEEDED.md` - Claims API missing poster URLs (ACTUALLY FIXED in code)
- `/ios/DESIGN_AUDIT_ISSUE.md` - Claims GeniusView is "placeholder" (ACTUALLY IMPLEMENTED)

**Action:** Archive stale docs, mark resolved issues

---

#### 7. Legacy Analysis System Deprecated
**Impact:** None (correctly replaced)
**File:** `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md`

**Status:**
- Old 500-word analysis format replaced by WhyWatch + description
- `movie_analyses` table still exists (21,275 legacy records)
- Production correctly uses WhyWatch system
- No action needed

---

## DECISION FRAMEWORK

### Decision #1: iOS Design System
**When:** This week
**Options:**
- **A. Ship V1 as-is** (accept web-like design, fix in V1.1)
  - Pro: Ship faster
  - Con: Apple may reject TestFlight for HIG violations
- **B. Delay V1 for proper iOS polish** (3-4 weeks)
  - Pro: Native-quality app
  - Con: Delays launch

**Recommendation:** Option B - Apple HIG compliance is non-negotiable for App Store

---

### Decision #2: Dark Mode Support
**When:** This week
**Options:**
- **A. Test & fix dark mode** (before V1)
  - Pro: Complete feature, better UX
  - Con: 3-5 days additional work
- **B. Ship light mode only** (disable dark mode)
  - Pro: No surprises, controlled experience
  - Con: Users expect dark mode in iOS apps
- **C. Ship with bugs, fix in V1.1**
  - Pro: Fastest to ship
  - Con: Bad first impressions, potential App Store rejection

**Recommendation:** Option A - Dark mode is expected in modern iOS apps, worth the 3-5 days

---

### Decision #3: iOS/Web GeniusView Parity
**When:** After Decision #1 + #2
**Options:**
- **A. iOS matches web** (episode cards, educational focus)
  - Pro: Consistent cross-platform
  - Con: Rebuild iOS GeniusView (tab system wasted)
- **B. Web matches iOS** (tabs, stats, genre tracking)
  - Pro: iOS work preserved
  - Con: Rebuild web `/pages/you.js`
- **C. Intentionally different** (iOS = stats, Web = education)
  - Pro: Platform-optimized
  - Con: Maintenance complexity

**Recommendation:** Option C + document the intentional difference

---

## IMMEDIATE ACTIONS (Today)

### 1. PROJECT FREEZE

**STOP all new feature work:**
- ❌ No new iOS features
- ❌ No web enhancements
- ❌ No UI experiments
- ❌ No database changes
- ❌ No YouTube trailer improvements
- ❌ No Firebase integrations

**ALLOWED work only:**
- ✅ Critical bug fixes (crashes, data loss)
- ✅ Security issues
- ✅ Stabilization work from this document

### 2. Create Baseline Branch

```bash
# Freeze current state
git checkout -b baseline-2026-05-13
git push -u origin baseline-2026-05-13

# Tag as reference point
git tag v0.9-baseline
git push --tags
```

**This branch is LOCKED** - no changes except emergency patches.

### 3. Make Three Decisions

Use decision framework above to choose:
1. iOS Design System: Ship as-is OR delay for polish?
2. Episode Content: Hide OR generate OR pivot to 6?
3. GeniusView Parity: Match iOS OR match web OR intentionally different?

**Document decisions in:**
```
/docs/STABILIZATION_DECISIONS.md
```

---

## PHASE 1: Documentation Cleanup (2 days)

### Archive Stale Docs

```bash
mkdir -p docs/archive/pre-stabilization

# Move stale docs
mv ios/API_UPDATE_NEEDED.md docs/archive/pre-stabilization/
mv docs/archive/LINKING_BROKEN_TRACE.md docs/archive/pre-stabilization/
mv docs/archive/REPEATED-FLAWS-IN-RESOLVING-BROKEN-CODE.md docs/archive/pre-stabilization/
```

### Create Master Design Spec

**Create:**
```
/docs/MASTER_DESIGN_SPEC.md
```

**Contents:**
- iOS design decisions from DESIGN_DECISIONS.md
- Apple HIG compliance status
- Platform differences (iOS vs Web) with rationale
- Locked component specs
- What's in TestFlight vs what needs fixing

---

## PHASE 2: iOS Stabilization (Based on Decision #1)

### If Decision = "Delay for Polish" (3-4 weeks)

**Week 1: Design System Foundation**
- Implement glass materials (`.ultraThinMaterial` on cards, overlays)
- Create semantic typography system (`.mgHeadline`, `.mgBody`, etc.)
- Fix color system (semantic colors, dark mode support)
- Define spacing/corner radius constants

**Week 2: View Refactoring**
- Update 12+ views to use DesignSystem
- Remove all hardcoded fonts/colors/spacing
- Add dark mode testing

**Week 3: Apple HIG Compliance**
- Navigation patterns audit
- Button styles/sizes
- Gesture handling (swipe-back, pull-to-refresh)
- Loading states (iOS spinners)

**Week 4: Polish & Testing**
- Visual QA across all screens
- Dark mode validation
- TestFlight submission

### If Decision = "Ship As-Is"

**Week 1: Critical Fixes Only**
- Fix any crashes
- Fix data integrity issues
- Document HIG violations as known issues
- Ship to TestFlight

**Week 2+: V1.1 Polish**
- Schedule design system work for after launch

---

## PHASE 3: Dark Mode Validation (Based on Decision #2)

### If Decision = "Test & Fix Dark Mode"

**Day 1: Audit**
- Switch iOS simulator to dark mode
- Screenshot every screen
- Document color/shadow issues
- Prioritize by severity

**Day 2-3: Fix Design System**
```swift
// DesignSystem.swift
extension Color {
    static let mgBackground = Color(UIColor.systemBackground) // ✅ Adaptive
    static let mgText = Color(UIColor.label)                 // ✅ Adaptive
    static let mgSecondary = Color(UIColor.secondaryLabel)   // ✅ Adaptive
}
```

**Day 4-5: Update Views**
- Replace hardcoded colors with semantic colors
- Test shadows in both modes
- Validate all screens

**Timeline:** 3-5 days

### If Decision = "Ship Light Mode Only"

```swift
// Info.plist
<key>UIUserInterfaceStyle</key>
<string>Light</string>
```

**Timeline:** 5 minutes (but not recommended)

### If Decision = "Ship With Bugs"

No action, but document known issues for user support.

**Timeline:** 0 days (risky)

---

## PHASE 4: Platform Parity (Based on Decision #3)

### If Decision = "Intentionally Different"

**Document in MASTER_DESIGN_SPEC.md:**

```markdown
## Platform Strategy: Intentional Divergence

**iOS GeniusView:**
- Personal stats (watched count, favorites, genre expertise)
- Tab navigation (Watched/Favorites/Browse)
- Data-driven, user-focused

**Web YouPage:**
- Educational content (episode cards, film school)
- Scrolling feed format
- Learning-focused, content-driven

**Rationale:**
iOS optimizes for personal tracking/quick access.
Web optimizes for discovery/education.
Both serve different use cases for same user.
```

**Timeline:** 1 day (documentation only)

---

## ANTI-PATTERNS TO AVOID

**DO NOT:**
1. ❌ Add "one more feature" before stabilization done
2. ❌ Refactor working code for "cleanliness"
3. ❌ Change locked components without review
4. ❌ Create new design docs - update existing only
5. ❌ Work on multiple platforms simultaneously
6. ❌ Ship to TestFlight until HIG compliance checked
7. ❌ Generate content without quality review
8. ❌ Touch YouTube trailers, Firebase, or other recent additions

**DO:**
1. ✅ Fix bugs in isolation
2. ✅ Test every change thoroughly
3. ✅ Update ONE master document (not multiple)
4. ✅ Make decisions explicitly (document in STABILIZATION_DECISIONS.md)
5. ✅ Finish iOS before touching web
6. ✅ Lock components after validation
7. ✅ Ask "does this stabilize or destabilize?"

---

## SUCCESS CRITERIA

### Phase 1 Complete When:
- [ ] Three decisions made and documented
- [ ] Stale docs archived
- [ ] MASTER_DESIGN_SPEC.md created
- [ ] Baseline branch frozen

### Phase 2 Complete When:
- [ ] iOS design system complete (if chosen) OR
- [ ] iOS shipped as-is with known issues documented
- [ ] No outstanding iOS crashes
- [ ] TestFlight build stable

### Phase 3 Complete When:
- [ ] Dark mode tested in simulator
- [ ] Critical dark mode issues fixed OR light mode locked
- [ ] All screens render correctly in chosen mode(s)

### Phase 4 Complete When:
- [ ] Platform parity strategy documented
- [ ] iOS and web both stable
- [ ] No reversions for 1 week

---

## TIMELINE

**Day 1:** Make three decisions, create baseline
**Days 2-3:** Documentation cleanup
**Week 2-5:** iOS stabilization (based on Decision #1)
**Week 2:** Dark mode validation (based on Decision #2) - can run parallel with design work
**Week 4:** Platform parity documentation (based on Decision #3)

**Target:** Project under control in 3-5 weeks

---

## ACCOUNTABILITY

**This document is the CONTRACT.**

Every commit during stabilization period must reference:
- What it stabilizes
- Which phase it belongs to
- Why it's necessary

Example commit:
```
Stabilization Phase 2: Implement glass materials in iOS DesignSystem

Add .cardGlass and .overlayGlass to support native iOS feel.
Addresses Apple HIG compliance - Design Audit Issue #1.
```

---

## NEXT STEPS (RIGHT NOW)

1. **Read this document completely**
2. **Answer the 3 decisions:**
   - iOS Design: Ship as-is OR delay for polish?
   - Dark Mode: Test & fix OR ship light only OR ship with bugs?
   - Platform Parity: Match iOS OR match web OR intentionally different?
3. **Create `/docs/STABILIZATION_DECISIONS.md` with your answers**
4. **Create baseline branch + tag**
5. **Archive stale docs**

**Then STOP and wait for next instruction.**

---

**Document Status:** ACTIVE
**Last Updated:** 2026-05-13
**Owner:** Project Lead
**Review Frequency:** Daily until stabilization complete
