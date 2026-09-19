# Documentation Lessons Learned
**Extracted from:** MovieGenius Documentation Review (2026-05-18)
**Purpose:** Key patterns, mistakes, and principles for future reference
**For:** CLAUDE.md integration after consolidation

---

## Executive Summary

After reviewing 50 documentation files, clear patterns emerged about **how documentation debt accumulates** and **how to prevent it**. This document extracts the most important lessons for developers and AI agents working on MovieGenius.

**Key Insight:** Documentation fragments not from laziness, but from **normal development cycles** (incident → analysis → fix → migration → best practices). Without active curation, each cycle adds 3-5 docs that never get consolidated or archived.

---

## 🔴 Mistake Pattern #1: Fighting The Platform

### The iOS Navigation Incident (May 2026)

**What Happened:**
1. Developer created custom `AppHeader` component
2. Required `.navigationBarHidden(true)` to work
3. This broke iOS native swipe-back gestures
4. Team tried UIKit introspection to force-enable gesture
5. Eventually reverted to native `NavigationStack` patterns
6. Incident spawned **5 separate documentation files**

**Why It Happened:**
- Web-influenced thinking (overlay headers are normal in web)
- Desire for pixel-perfect control
- Didn't test swipe-back until too late
- Platform conventions seemed "limiting"

**True Cost:**
- 2-3 days of development time
- 5 documentation files (2,532 lines total)
- Fragile code requiring maintenance
- User-facing broken gestures
- Need to revert and retest

**The Lesson:**

> **"Fight the platform = 5 docs explaining why. Use the platform = 0 docs needed."**

**Practical Rules:**

```markdown
## Platform Convention Indicators

✅ **You're using the platform correctly when:**
- Features work without UIKit/AppKit introspection
- Standard gestures work automatically (swipe-back, pull-to-refresh)
- Documentation explains WHAT to use, not HOW to work around
- Code is concise (< 50 lines for standard features)
- Other SwiftUI devs would recognize the pattern

❌ **You're fighting the platform when:**
- Need UIViewControllerRepresentable for standard features
- Docs describe "hacks", "workarounds", or "introspection"
- Code has comments like "// Force enable gesture"
- Standard iOS features stop working (gestures, navigation, etc.)
- Solution requires multiple files to explain

**When you notice platform fighting:**
1. STOP immediately
2. Search for native SwiftUI solution
3. Ask: "How does Apple's [Mail/Photos/etc] do this?"
4. Prefer 80% solution with platform over 100% custom solution
```

**iOS Specifics:**

| Custom Pattern (Wrong) | Native Pattern (Right) | Why It Matters |
|------------------------|------------------------|----------------|
| `AppHeader` + `.navigationBarHidden(true)` | `NavigationStack` + `.toolbar()` | Preserves swipe-back |
| Custom search overlay | `.searchable(text: $query)` | Keyboard management, iOS 15+ features |
| ZStack with manual positioning | `.navigationTitle()` + `.navigationBarTitleDisplayMode()` | Safe area handling |
| Manual back button | NavigationStack's automatic back button | Maintains navigation stack |

---

## 🟡 Mistake Pattern #2: Documentation Debt Accumulation

### The Natural Lifecycle (Without Curation)

**What Happens:**

```
Day 1: Feature works correctly
  └─ 0 docs (code is self-explanatory)

Day 10: User reports broken gestures
  └─ 1 doc: "IOS_NAVIGATION_FIX_PLAN.md" (problem statement)

Day 11: Architectural analysis
  └─ 2 docs: + "IOS_NAVIGATION_ARCHITECTURE_REVIEW.md"

Day 12: Migration guide created
  └─ 3 docs: + "NAVIGATION_MIGRATION_GUIDE.md"

Day 13: Quick start for devs who just need TL;DR
  └─ 4 docs: + "NAVIGATION_FIX_QUICKSTART.md"

Day 20: Migration complete, best practices extracted
  └─ 5 docs: + "IOS_NAVIGATION_BEST_PRACTICES.md"

Day 21-365: All 5 docs remain, no one sure which is current
```

**Why It Happens:**
- Each doc serves a purpose AT THE TIME
- No one wants to delete "useful" information
- Fear of losing context if we consolidate
- No clear owner of documentation curation
- "If it might be useful, keep it"

**The Lesson:**

> **"Point-in-time docs need expiration dates. Incidents become history."**

**Practical Rules:**

```markdown
## Document Lifecycle Management

### Active Documents (No Expiration)
- BEST_PRACTICES - Updated as lessons learned
- SETUP_GUIDE - Updated as process changes
- ARCHITECTURE - Updated as system evolves
- README - Updated as project changes

### Point-in-Time Documents (Archive After Completion)
- FIX_PLAN - Archive after fix is implemented
- MIGRATION_GUIDE - Archive after migration is complete
- AUDIT_REPORT - Archive after recommendations are implemented
- INCIDENT_ANALYSIS - Archive after lessons are extracted to BEST_PRACTICES

### Archival Criteria

**Archive when:**
- Document describes completed work (migration, fix, audit)
- References specific commits/dates as "the problem"
- Says "we need to" but work is done
- Best practices have been extracted to living doc

**Archive means:**
- Move to `/archive/[context]/`
- Add README explaining what happened and when
- Extract lessons to living docs first
- Preserve git history (use `git mv`)
```

**Red Flags for Overdue Archival:**

- ❌ "MIGRATION_GUIDE" but migration completed 6 months ago
- ❌ "FIX_PLAN" but issue is fixed and deployed
- ❌ "AUDIT_REQUEST" and "AUDIT_REPORT" both exist (keep report, archive request)
- ❌ Multiple docs on same incident from different angles

---

## 🟡 Mistake Pattern #3: Duplicate Without Clarity

### The Firebase Setup Case

**What Happened:**
- Initially: `FIREBASE_SETUP_GUIDE.md` (detailed, 354 lines)
- Later: `FIREBASE_QUICK_START.md` (concise, 235 lines)
- Both current and actively maintained
- 80% content overlap
- No indication which to use when

**Why It Happened:**
- Developer needed quick reference
- Creating new doc was faster than refactoring existing
- Both docs serve slightly different audiences
- No clear "this supersedes that" marker

**The Lesson:**

> **"Quick starts should be sections, not separate files."**

**Practical Rules:**

```markdown
## When to Split vs Consolidate Documentation

### Split Into Separate Files WHEN:
- Different audiences (user guide vs developer guide)
- Different scopes (feature A vs feature B)
- Different lifecycles (living guide vs historical analysis)
- References would create circular dependencies

### Keep as Sections WHEN:
- Same topic, different depth (quick start vs detailed)
- Same workflow, different steps (setup vs configuration)
- Same audience, different entry points (tutorial vs reference)
- One document is subset of other (quick start is chapters 1-2 of guide)

### Format for Combined Docs:

```markdown
# Feature Setup Guide

## Quick Start (5 minutes)
For experienced developers who just need the commands.
[Condensed steps]

## Detailed Setup (30 minutes)
For first-time setup with explanations.
[Full walkthrough]

## Troubleshooting
Common issues and solutions.

## Reference
API details, configuration options.
```

**Indicators You Need to Consolidate:**

- ❌ Two docs with >70% content overlap
- ❌ Doc names like "QUICK_START" and "COMPLETE_GUIDE" on same topic
- ❌ Confusion about which version is "right"
- ❌ Updates applied to one doc but not the other
- ❌ Both docs describing same steps in different order
```

---

## 🟢 Mistake Pattern #4: Unclear Document Status

### The Problem

**Observed:**
- 27 iOS docs with no status indicators
- Can't tell if doc is current, historical, or deprecated
- Filename doesn't indicate status ("IOS_NAVIGATION_FIX_PLAN" - is fix planned or completed?)
- Dates in filename help but not sufficient ("UX_AUDIT_REQUEST_MAY_15" - is it 2025 or 2026?)

**The Lesson:**

> **"Every document needs a status header. Reader should know immediately if doc is current."**

**Practical Template:**

```markdown
# Document Title

**Status:** ✅ CURRENT | 📝 COMPLETED | 🔴 DEPRECATED | 🟡 DRAFT
**Last Updated:** 2026-05-18
**Last Verified:** 2026-05-18 (tested against production)
**Supersedes:** [Previous doc name, if applicable]
**Related:** [Links to related docs]
**For Questions:** @username or #slack-channel

---

[Document content]
```

**Status Meanings:**

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ CURRENT | Actively maintained, reflects production | Use this |
| 📝 COMPLETED | Describes finished work, kept for reference | Read for context only |
| 🔴 DEPRECATED | DO NOT USE, superseded by another doc | See "Superseded By" link |
| 🟡 DRAFT | Work in progress, not production-ready | Verify before using |

**When to Update Status:**

- ✅ → 📝: When described work is complete (migration done, fix deployed)
- ✅ → 🔴: When superseded by better doc (V1 → V2)
- 🟡 → ✅: When draft is reviewed and production-ready
- 📝 → Archive: When no longer needed for reference

---

## 🟢 Mistake Pattern #5: No Clear Decision Framework

### The Problem

When 5 navigation docs exist, which do you follow?

**Observed Developer Behavior (Time-Wasting):**
1. Read first doc found (might be wrong one)
2. Implement based on that doc
3. Another dev says "that's not how we do it"
4. Read second doc, which contradicts first
5. Read all remaining docs trying to find truth
6. Ask in Slack, wait for response
7. Total time lost: 2-4 hours

**The Lesson:**

> **"Provide a decision tree, not a file list."**

**Decision Framework for Doc Conflicts:**

```markdown
## When Multiple Docs Exist on Same Topic

**Step 1: Check Document Headers**
- Status: CURRENT > COMPLETED > DEPRECATED
- Last Updated: More recent (if both CURRENT)
- Supersedes: Follow the chain

**Step 2: Apply Title Priority**
BEST_PRACTICES > GUIDE > ARCHITECTURE > MIGRATION > FIX > PLAN

**Step 3: Check Content Type**
- "How to X correctly" > "How we fixed X" > "Why X broke"
- "Current architecture" > "Migration from old to new"
- "Setup guide" > "Quick start" (for learning)
- "Quick start" > "Setup guide" (for reference)

**Step 4: Verify Against Code**
- If doc says X but code does Y → code is truth
- Open PR to fix the doc
- Don't assume doc is wrong, but verify

**Step 5: When Still Unsure**
- Ask: "Docs X and Y conflict - which reflects current architecture?"
- Don't guess
- Don't read all versions hoping to synthesize truth
- Surface the ambiguity

**Special Case: Incident Documentation**

When you find multiple docs about same incident:
- ARCHITECTURE_REVIEW → Why it happened
- FIX_PLAN → What we decided to do
- MIGRATION_GUIDE → How to implement the fix
- BEST_PRACTICES → How to avoid in future

**Use:** BEST_PRACTICES for current work
**Read:** Others for context if needed
```

---

## 🔵 Success Pattern: Clear Scope Separation

### What Worked Well

**Observed in codebase:**

| Directory | Purpose | Clear Scope |
|-----------|---------|-------------|
| `/scripts/` | CLI tools and batch processing | ✅ Yes - all scripts, clear |
| `/ios/testing/` | iOS testing docs | ✅ Yes - test-specific |
| `/components/` | Component documentation | ✅ Yes - component-level |
| `/ios/` | All iOS documentation | ⚠️ Too broad - mix of current, historical, testing, setup |

**The Lesson:**

> **"Directories should group by purpose/lifecycle, not just by technology."**

**Better iOS Structure:**

```
/ios/
├── README.md (overview + navigation)
├── guides/
│   ├── SETUP.md (getting started)
│   ├── BEST_PRACTICES.md (how to code well)
│   └── TROUBLESHOOTING.md (common issues)
├── architecture/
│   ├── DESIGN_DECISIONS.md (why we built it this way)
│   ├── NAVIGATION.md (nav system architecture)
│   └── GENIUS_SYSTEM.md (Genius feature design)
├── testing/
│   ├── MANUAL_CHECKLIST.md
│   ├── SMOKE_TESTS.md
│   └── TESTFLIGHT_CHECKLIST.md
└── archive/
    └── [incident-name]/
        └── [historical docs]
```

**Benefits:**
- Clear where to look for current practices
- Clear where historical docs live
- Clear scope for each directory
- Easy to archive incidents without cluttering main docs

---

## 🔵 Success Pattern: Linking Over Duplication

### What Would Have Prevented Duplication

Instead of creating 5 separate navigation docs, could have done:

```markdown
# iOS Navigation Best Practices

## Overview
Native SwiftUI navigation using NavigationStack + .toolbar().

## Quick Reference
[Standard patterns with code examples]

## Why These Patterns?
In May 2026, we tried custom AppHeader overlays (see [incident analysis](archive/navigation-2026/INCIDENT.md)). This broke swipe-back gestures. We reverted to native patterns.

**Key Lesson:** Use platform conventions. Custom overlays = fragile code.

## Related
- [Navigation Migration Guide](archive/navigation-2026/MIGRATION.md) - Historical (migration complete)
- [Architectural Review](archive/navigation-2026/ARCHITECTURE_REVIEW.md) - Why incident happened
```

**The Lesson:**

> **"One living doc + links to archived context > N living docs."**

---

## 📋 Principles Summary (For CLAUDE.md)

### 1. Platform Convention Over Custom Solutions
**Rule:** Fight the platform = technical debt. Use platform = works automatically.
**Indicator:** Need multiple docs to explain → probably fighting platform.

### 2. Archive Point-in-Time Documentation
**Rule:** Incident/migration/fix docs expire after completion.
**Action:** Extract lessons to living docs, archive the incident docs.

### 3. Sections Over Separate Files
**Rule:** Quick start = section of main guide, not separate file.
**Exception:** Different audiences or different lifecycles.

### 4. Status Headers Are Mandatory
**Rule:** Every doc needs: Status, Last Updated, Related Docs.
**Benefit:** Reader knows immediately if doc is current.

### 5. Decision Framework Over File Lists
**Rule:** Provide "when docs conflict, use this logic" not "read all docs."
**Benefit:** Save 2-4 hours of confused reading.

### 6. Directories = Purpose, Not Technology
**Rule:** Group by lifecycle (active/archive) and purpose (guide/architecture/testing).
**Benefit:** Clear navigation, easy archival.

### 7. Linking Over Duplication
**Rule:** One living doc + links to context > multiple living docs.
**Benefit:** Single source of truth, preserved context.

---

## 🎯 Practical Checklist for Future Development

### Before Creating a New Doc:

- [ ] Does doc for this topic already exist? (Search first)
- [ ] Is this point-in-time (fix/migration) or living (guide/architecture)?
- [ ] If quick reference, can it be section in existing guide?
- [ ] Add status header with CURRENT/DRAFT/etc.
- [ ] Add "Last Updated" date
- [ ] If describes incident, link to issue/PR for context

### After Completing a Migration/Fix:

- [ ] Extract lessons to BEST_PRACTICES doc
- [ ] Update ARCHITECTURE docs if design changed
- [ ] Change status of MIGRATION/FIX docs to COMPLETED
- [ ] Archive MIGRATION/FIX docs to `/archive/[incident-name]/`
- [ ] Add README in archive explaining context

### When Updating an Existing Doc:

- [ ] Update "Last Updated" date in header
- [ ] Check for duplicate docs on same topic
- [ ] If doc is superseded, mark as DEPRECATED and link to new doc
- [ ] Verify code examples still work

### When You Find Conflicting Docs:

- [ ] Report: "Docs X and Y conflict on Z"
- [ ] Don't silently choose one and hope it's right
- [ ] Don't read all versions trying to synthesize
- [ ] Ask which reflects current architecture
- [ ] Propose consolidation if appropriate

---

## 🔮 Predictions (To Validate Later)

Based on this review, these problems will likely recur:

1. **Next major iOS incident will spawn 3-5 docs** unless we actively consolidate
2. **Quick start docs will proliferate** if we don't enforce "section not file" rule
3. **Status headers won't be maintained** unless we add pre-commit check
4. **Archive directories will grow** without periodic review

**Mitigation:**
- Add consolidation to quarterly engineering review
- Add "Documentation Debt" section to sprint retros
- Create pre-commit hook to check for status headers
- Archive review every 6 months

---

**This document should be:**
- Referenced in CLAUDE.md as "the why behind our doc practices"
- Reviewed when creating consolidation plans
- Updated when new patterns emerge
- Used in code review: "This PR needs docs - follow DOCUMENTATION_LESSONS_LEARNED.md"
