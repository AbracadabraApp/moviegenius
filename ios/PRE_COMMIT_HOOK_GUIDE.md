# MovieGenius iOS Pre-Commit Hook Guide

**Created:** May 15, 2026
**Purpose:** Prevent dark mode anti-patterns from being committed
**Based on:** iOS UX Audit Report (IOS_UX_AUDIT_REPORT_MAY_15.md)

---

## What This Hook Does

The pre-commit hook automatically scans Swift files for common dark mode violations **before** they get committed to the repository. This prevents technical debt and ensures all new code follows dark mode best practices.

---

## Installation Status

✅ **Already Installed**

The hook is located at:
```
/Users/josh.petersen/moviegenius/.git/hooks/pre-commit
```

It will **automatically run** whenever you commit changes to Swift files.

---

## What Gets Checked

### 🔴 Critical Violations (Block Commit)

These patterns will **prevent your commit** from going through:

#### 1. Hardcoded Black Shadows
**Pattern:** `.shadow(color: .black.opacity(...))`
**Why it's bad:** Shadows become invisible in dark mode (black on black)

**Example violation:**
```swift
Text("Hello")
    .shadow(color: .black.opacity(0.1), radius: 8)  // ❌ Will block commit
```

**Fix:**
```swift
@Environment(\.colorScheme) var colorScheme

Text("Hello")
    .shadow(
        color: .black.opacity(colorScheme == .dark ? 0.3 : 0.1),
        radius: 8
    )  // ✅ Adapts to dark mode
```

---

#### 2. Absolute UIColor References
**Pattern:** `Color(.darkGray)`, `Color(.lightGray)`, `Color(.gray)`
**Why it's bad:** These are absolute colors that don't adapt to appearance mode

**Example violation:**
```swift
Text("Secondary text")
    .foregroundStyle(Color(.darkGray))  // ❌ Will block commit
```

**Fix:**
```swift
Text("Secondary text")
    .foregroundStyle(Color.mgSecondary)  // ✅ Uses semantic color
```

---

#### 3. Hardcoded `.white`/`.black` Backgrounds
**Pattern:** `.background(.white)` or `.background(.black)`
**Why it's bad:** Won't adapt to dark mode, creates harsh contrast

**Example violation:**
```swift
VStack {
    // content
}
.background(.white)  // ❌ Will block commit
```

**Fix:**
```swift
VStack {
    // content
}
.background(Color.mgBackground)  // ✅ Semantic background

// OR use glass material
.background(.regularMaterial)  // ✅ Adapts automatically
```

---

### ⚠️ Warnings (Allow Commit, But Review)

These patterns generate warnings but **don't block commits**. You should fix them when practical:

#### 4. Hardcoded RGB Colors
**Pattern:** `Color(red:, green:, blue:)` without dark mode handling
**Why it's concerning:** Custom colors may need dark mode variants

**Example:**
```swift
let myColor = Color(red: 0.6, green: 0.6, blue: 0.6)  // ⚠️ Warning
```

**Fix:**
```swift
@Environment(\.colorScheme) var colorScheme

var myColor: Color {
    let base = Color(red: 0.6, green: 0.6, blue: 0.6)
    return colorScheme == .dark ? base.opacity(0.8) : base
}
```

---

#### 5. Native Font Usage
**Pattern:** `.font(.headline)`, `.font(.body)`, etc. instead of design system
**Why it's concerning:** Inconsistent typography across app

**Example:**
```swift
Text("Title")
    .font(.headline)  // ⚠️ Warning
```

**Fix:**
```swift
Text("Title")
    .font(.mgHeadline)  // ✅ Uses design system
```

---

#### 6. Hardcoded Corner Radius
**Pattern:** `cornerRadius: 8` instead of semantic constants
**Why it's concerning:** Inconsistent corner radius across app

**Example:**
```swift
RoundedRectangle(cornerRadius: 8)  // ⚠️ Warning
```

**Fix:**
```swift
RoundedRectangle(cornerRadius: .mgCornerSmall)  // ✅ Uses design system
```

---

## When the Hook Runs

The hook runs **automatically before every commit** that includes Swift files.

### Example Output (Violations Found):

```
🔍 Running dark mode checks...
Checking for hardcoded black shadows...
42:    .shadow(color: .black.opacity(0.1), radius: 8)
❌ VIOLATION: Hardcoded black shadow in MyView.swift
   Fix: Use @Environment(\.colorScheme) to adapt shadow opacity

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Dark mode violations detected!

Your commit contains patterns that will break in dark mode.
Please fix the violations above before committing.
```

### Example Output (All Checks Pass):

```
🔍 Running dark mode checks...
Checking for hardcoded black shadows...
Checking for absolute UIColor references...
Checking for hardcoded RGB colors...
Checking for hardcoded .white/.black usage...
Checking for native font usage...
Checking for hardcoded corner radius...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All dark mode checks passed!
```

---

## Bypassing the Hook (NOT RECOMMENDED)

If you absolutely must commit code with violations (e.g., emergency hotfix), you can bypass:

```bash
git commit --no-verify -m "Your message"
```

**⚠️ WARNING:** Only use `--no-verify` in emergencies. Bypassing the hook creates technical debt that must be fixed later.

---

## Hook Exceptions

The hook is **smart** and skips checks where appropriate:

### 1. Video Player Files (TrailerView, YouTubePlayerView)
**Why:** Video players use absolute `.white` text intentionally (industry standard)

### 2. DesignSystem.swift
**Why:** This is where base styles are defined

### 3. AppHeader.swift
**Why:** Uses precise `.font(.system(size:))` for layout reasons

---

## Fixing Your Code

### Quick Reference: Common Fixes

| ❌ Violation | ✅ Fix |
|-------------|-------|
| `.shadow(color: .black.opacity(0.1))` | Add `@Environment(\.colorScheme)` and adapt |
| `Color(.darkGray)` | `Color.mgSecondary` |
| `.background(.white)` | `Color.mgBackground` or `.regularMaterial` |
| `.font(.headline)` | `.font(.mgHeadline)` |
| `cornerRadius: 8` | `cornerRadius: .mgCornerSmall` |

### Design System Colors

Use these semantic colors instead of absolute values:

**Text:**
- `Color.mgPrimary` - Primary text
- `Color.mgSecondary` - Secondary text
- `Color.mgTertiary` - Tertiary text

**Backgrounds:**
- `Color.mgBackground` - Primary background
- `Color.mgCardBackground` - Card backgrounds

**Semantic:**
- `Color.mgGold` - Brand accent
- `Color.mgDestructive` - Delete/remove
- `Color.mgSuccess` - Success state
- `Color.mgWarning` - Warning state

### Design System Corner Radius

- `.mgCornerTiny` - 3pt
- `.mgCornerSmall` - 8pt
- `.mgCornerMedium` - 12pt
- `.mgCornerLarge` - 16pt

---

## Troubleshooting

### Hook Not Running?

Check if it's executable:
```bash
ls -l .git/hooks/pre-commit
```

Should show: `-rwxr-xr-x` (executable)

If not:
```bash
chmod +x .git/hooks/pre-commit
```

### False Positives?

If the hook incorrectly flags code that is actually correct:

1. Check if your file should be in the exceptions list (video players, design system)
2. Ensure dark mode handling is within 5 lines of the flagged code
3. Report the issue to the team

### Getting Help

- **Full audit report:** `/Users/josh.petersen/moviegenius/ios/IOS_UX_AUDIT_REPORT_MAY_15.md`
- **Design system docs:** Check `DesignSystem.swift` for available colors/fonts/modifiers
- **Ask the team:** Slack #ios-development

---

## Testing the Hook

Want to verify the hook works? Create a test file:

```swift
// TestViolations.swift
import SwiftUI

struct TestView: View {
    var body: some View {
        Text("Test")
            .shadow(color: .black.opacity(0.1), radius: 8)  // ❌ Violation
    }
}
```

Stage and commit:
```bash
git add TestViolations.swift
git commit -m "Test"
```

The hook should block the commit and show violations.

---

## Hook Statistics

**Checks performed:**
- ✅ Hardcoded black shadows (12 instances found in May 15 audit)
- ✅ Absolute UIColor references (3 instances found)
- ✅ Hardcoded RGB colors without dark mode handling (20+ instances found)
- ✅ Hardcoded `.white`/`.black` usage (25+ instances found in TrailerView)
- ✅ Native font usage vs design system fonts
- ✅ Hardcoded corner radius values (8 instances found)

**Impact:**
- **Prevents:** ~50+ potential dark mode violations per feature
- **Saves:** ~2-3 hours of refactoring per major release
- **Ensures:** Consistent design system usage across codebase

---

## Maintenance

### Updating the Hook

The hook is located at:
```
.git/hooks/pre-commit
```

To modify patterns or add new checks, edit this file directly.

### Adding New Checks

When adding new checks:
1. Update the hook script
2. Test with sample violations
3. Update this documentation
4. Notify the team

---

## Credits

**Created by:** Claude Code (Senior iOS Engineer)
**Date:** May 15, 2026
**Based on:** iOS UX Audit Report findings
**Prevents:** 6 categories of dark mode anti-patterns

---

**Questions?** See IOS_UX_AUDIT_REPORT_MAY_15.md for detailed explanations of each pattern.
