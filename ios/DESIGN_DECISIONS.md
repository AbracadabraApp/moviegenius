# iOS Design Decisions

**Purpose:** Document design choices to avoid reverting decisions based on real user testing.

---

## Favorite Buttons Placement (2026-05-12)

**Decision:** Buttons positioned BELOW poster (not overlaid), right-aligned

### Location Details:
- **Movie Detail Page:** Below poster, 4pt spacing, right-aligned, full-size ("Seen it"/"Watch")
- **More Ideas Cards:** Bottom-right of card (below connection text), full-size buttons

### Why NOT other placements:

❌ **Overlaid on poster (bottom-left/center)**
- **Problem:** Obscures poster artwork, especially faces/key visuals
- **Testing showed:** Users browse visually first, buttons competed with imagery

❌ **Inside WhyWatch card (after reasons)**
- **Problem:** Too buried - users don't scroll that far
- **User pattern:** Most skim rather than read full WhyWatch content
- **Testing showed:** "Visual browsers" (majority) never saw buttons

❌ **On More Ideas poster overlays**
- **Problem:** Obscures small poster thumbnails
- **Testing showed:** Buttons felt visually cluttered on compact cards

### Why THIS placement works:

✅ **Below poster, immediately visible**
- Users see poster → Buttons appear without scrolling
- No visual interference with poster art
- Right-aligned matches web UX patterns

✅ **Supports both user flows:**
1. **Visual browsers (majority):** See poster → Click Watch → Browse
2. **More Ideas markers:** Click movie → See buttons → Mark Seen → Back

✅ **Glass styling on light background**
- `onDarkBackground: false` - Dark text on white glass
- Better contrast than white-on-poster overlay

### Button Sizing:

**Current:**
- Icon: 15pt
- Height: 36pt (reduced from 44pt per user feedback)
- Padding: 10pt horizontal
- Font: `.mgCaption` (smaller than previous `.mgCallout`)
- Labels: Full text ("Seen it", "Watch it")

**More Ideas: Full-size (not compact)**
- Originally tried compact (icons only)
- **Testing showed:** Users didn't understand icon-only buttons
- Full labels are clearer and worth the space
- **Size adjustment (2026-05-12):** Reduced from 44pt to 36pt height after user reported buttons "too large"

---

## Search Bar Position (2026-05-12)

**Decision:** Below notch (respects safe area)

### Why:
- Respects iOS safe area guidelines
- Doesn't obscure status bar
- Simple implementation without GeometryReader
- Custom back button in toolbar (gold chevron + "Back" text)

### Implementation:
```swift
VStack(spacing: 0) {
    SearchBarView()  // Natural safe area handling
    ScrollView { ... }
}
.toolbar {
    ToolbarItem(placement: .navigationBarLeading) {
        // Custom back button
    }
}
.toolbarBackground(.hidden, for: .navigationBar)
```

**Custom back button:**
- Simple chevron arrow only (no "Back" text, no circle)
- Gold color to match brand
- Size 18pt with medium weight
- 12pt leading padding to position tight to search bar
- `.navigationBarBackButtonHidden(true)` alone can break swipe gesture
- Toolbar approach preserves SwiftUI navigation infrastructure
- Swipe-back gesture still works

---

## WhyWatch Context Text Color (2026-05-12)

**Decision:** Primary color (dark), not secondary (grey)

### Why:
- Context paragraph provides valuable cultural/historical insight
- Grey suggests optional/skippable, but it's important content
- Better accessibility (higher contrast ratio)
- Visual hierarchy already clear from structure (position, bullets)

**Example:** "Doug Liman transformed a Japanese light novel into a Hollywood blockbuster with genuine heart" deserves full readability.

---

## Tab Re-tap Behavior (2026-05-12)

**Decision:** Tapping active tab pops to root (standard iOS pattern)

### Implementation:
```swift
private var selectedTabBinding: Binding<Int> {
    Binding(
        get: { selectedTab },
        set: { newValue in
            if newValue == selectedTab {
                popToRoot(for: newValue)
            }
            selectedTab = newValue
        }
    )
}
```

### Why:
- Matches Apple Music, App Store, etc.
- Users expect this behavior
- Quick way to return to home from deep navigation

---

## View All Link Styling (2026-05-12)

**Decision:**
- Font: `.mgCallout` (not `.mgSubheadline`)
- Weight: `.semibold` (not `.medium`)
- Top padding: 2pt

### Why:
- More prominent = easier to tap
- Increased weight improves legibility
- Matches importance of action

---

## More Ideas Text Wrapping (2026-05-12)

**Decision:** Connection text MUST NOT truncate - use `.lineLimit(nil)` + `.fixedSize()`

### Implementation:
```swift
Text(idea.connection)
    .font(.mgSubheadline)
    .foregroundStyle(Color.mgSecondary)
    .lineLimit(nil)  // ← Required: No truncation
    .fixedSize(horizontal: false, vertical: true)  // ← Expand vertically
```

### Why:
- Connection slugs are the core value proposition ("why this recommendation")
- User specifically requested: "When there is text - do not truncate"
- Text can be long (e.g., "Spike Jonze's film about loneliness in modern Tokyo, with similar themes of isolation and connection")
- Wrapping is better than truncation for readability

### What NOT to do:
❌ Remove `.lineLimit(nil)` - SwiftUI may truncate by default
❌ Add `.lineLimit(2)` or any fixed limit - defeats the purpose
❌ Remove `.fixedSize()` - frame constraints may clip text

**This has been fixed twice - do not revert.**

---

## Notes for Future Changes

**Before reverting any design:**
1. Check this document first
2. Review user testing notes
3. Consider that iterations were based on real behavior patterns
4. Document new testing if making changes

**Red flags that suggest reverting without reason:**
- "Let's try buttons on the poster again" ← Already tested, didn't work
- "Grey text is prettier" ← Accessibility > aesthetics
- "Compact buttons save space" ← Clarity > space savings

---

Last updated: 2026-05-12
