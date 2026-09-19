# MovieGenius iOS Pull Request Checklist

## Navigation Changes (Required for ALL PRs touching Views/)

### Anti-Pattern Detection
- [ ] ❌ No `.navigationBarHidden(true)` on pushed views
- [ ] ❌ No `.toolbar(.hidden)` modifiers
- [ ] ❌ No `AppHeader` or custom overlay headers
- [ ] ❌ No `ZStack` overlays that cover navigation area
- [ ] ❌ No UIKit introspection to "fix" swipe-back

### Native Pattern Usage
- [ ] ✅ Uses `.navigationTitle()` for all screens
- [ ] ✅ Uses `.navigationBarTitleDisplayMode(.inline)` if custom sizing needed
- [ ] ✅ Uses `.searchable()` for search UI (not custom TextField overlays)
- [ ] ✅ Uses `.toolbar { }` for action buttons
- [ ] ✅ NavigationStack handles all navigation (not manual sheet/fullScreenCover for detail views)

### Manual Testing (Physical Device Required)
- [ ] ✅ Swipe-back gesture works from left edge → navigates back
- [ ] ✅ Back button appears with correct parent title
- [ ] ✅ Tab bar auto-hides on detail push, shows on root
- [ ] ✅ Search bar appears in correct location (navigation area)
- [ ] ✅ No visual glitches during navigation transitions

### Automated Testing
- [ ] ✅ `NavigationRegressionTests` pass
- [ ] ✅ `ViewModifierLintTests` pass
- [ ] ✅ SwiftLint reports 0 errors
- [ ] ✅ Pre-commit hook passes

## General Code Quality
- [ ] ✅ Follows MovieGenius terminology (movie/analysis/collection/streaming)
- [ ] ✅ No TODOs or placeholder comments
- [ ] ✅ Complete implementation (no "part 1 of 3" commits)
- [ ] ✅ Tested on iPhone 15 Pro simulator AND physical device

## If Modifying Locked Components
- [ ] ⚠️ Explicit approval from Josh for changes to:
  - MediaCard.swift
  - NavigationStack hierarchy in MainTabView
  - Database schema
  - Core data models

## Documentation
- [ ] Updated relevant docs in `/ios/` if architecture changed
- [ ] Added code comments for non-obvious decisions
- [ ] Updated `IOS_NAVIGATION_BEST_PRACTICES.md` if new pattern introduced

---

**Reviewer:** Before approving, physically test swipe-back gesture on device. Simulator gestures don't always match hardware behavior.
