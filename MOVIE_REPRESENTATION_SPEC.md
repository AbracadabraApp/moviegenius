# Movie Representation Standards Specification

**Version:** 1.0
**Last Updated:** 2026-05-26
**Status:** Active

## Core Principles

### 1. No Text Truncation
- **NEVER truncate movie titles** - Display in full regardless of length
- **NEVER truncate descriptions/slugs** - Allow text to wrap naturally
- **NEVER truncate blurbs or any text content** - Cards expand vertically as needed
- **Truncated text is an indicator of unauthorized changes**

### 2. Dynamic Card Height
- Cards have **no fixed height** - They expand vertically to accommodate content
- Minimum heights ensure proper poster display (e.g., 210px on iOS to match poster)
- Cards grow downward as needed for long titles or descriptions

### 3. Consistent Button Placement
- Favorite buttons **ALWAYS bottom-right** of the card
- Buttons **NEVER overlap** poster or text content
- Buttons **ALWAYS have text labels** (never icons only)
- Buttons push card height down if needed (no overlapping)

---

## Display Types

### 1. Carousel Display (Homepage, Search Results)
**Used in:** Home page collections, Search results
**Characteristics:**
- **Poster with title/year below** - Not a complex card layout
- Horizontal scrolling layout
- Poster dimensions: 136px wide (web search), varies by context
- Title and year displayed below poster (also tappable for navigation)
- No favorite buttons on carousel items
- **All elements navigate:** Poster, title, and year all tap to movie detail

### 2. Movie Card (More Ideas, Genius, Watchlist)
**Used in:** More Ideas sections, Genius view, Watchlist/Queue
**Characteristics:**
- **Standard layout:**
  - Poster on left (125×188px web, 140×210px iOS)
  - Title and year to right of poster
  - Slug/description below title (when available)
  - Favorite buttons bottom-right corner
- **Card expands vertically** to fit all content
- **No text truncation** - All text wraps naturally

### 3. Watchlist Card (Special Case)
**Used in:** Watchlist/Queue views
**Characteristics:**
- Same as Movie Card PLUS:
- Delete "X" button in top-right corner (above title area)
- Delete button separate from favorite buttons
- iOS: Uses `StandardMovieCard` with `onDelete` callback

---

## Web Implementation (MediaCard.js)

### Layout Structure
```javascript
// Card structure (simplified)
<card>
  <topRow>
    <poster />  // 125×188px, left side
    <textContainer>
      <title />
      <year />
      <slug />  // Wraps naturally, no truncation
      <actionsRow>  // Bottom-right alignment
        <seenButton>Seen</seenButton>
        <addButton>Add</addButton>
      </actionsRow>
    </textContainer>
  </topRow>
</card>
```

### Key Specifications
- **Poster:** 125×188px (industry standard 2:3 ratio)
- **Buttons:** Right-aligned in `actionsRow`
- **Text:** No `overflow: hidden` or `text-overflow: ellipsis`
- **Height:** Dynamic based on content

### Locked Aspects (DO NOT CHANGE)
- Poster dimensions (125×188px)
- Button placement (bottom-right)
- Text wrapping behavior

---

## iOS Implementation (StandardMovieCard.swift)

### Layout Structure
```swift
VStack {
    // Main content - tappable for navigation
    NavigationLink {
        HStack {
            posterView      // 140×210px
            VStack {
                title       // .lineLimit(nil) - no truncation
                year
                slug        // .lineLimit(nil) - no truncation
                Spacer()
            }
        }
        .frame(minHeight: 210)  // Minimum to match poster
    }

    // Favorite buttons - below all content
    HStack {
        FavoriteButtons(...)  // "Seen it", "Add to list"
        Spacer()
        deleteButton?  // Optional, far right
    }
}
```

### Key Specifications
- **Poster:** 140×210px (slightly larger than web)
- **No line limits:** `.lineLimit(nil)` on all text
- **Fixed size:** `.fixedSize(horizontal: false, vertical: true)`
- **Buttons:** Below content, not overlaid

---

## Favorite Buttons Specification

### Requirements
1. **Always text labels:**
   - "Seen" / "Seen it" (web/iOS)
   - "Add" / "Add to list" (web/iOS)
2. **Position:** Bottom-right of card content
3. **Never icons-only** (user testing showed confusion)
4. **States:**
   - Inactive: Grey text/border
   - Active: Gold text/border (mgGold color)
5. **Size:**
   - iOS: 36pt height
   - Web: Responsive based on font size

### Web Button Implementation
```javascript
// In MediaCard.js actionsRow
<button>
  <Check size={16} />
  <span>Seen</span>
</button>
<button>
  <Plus size={16} />
  <span>Add</span>
</button>
```

### iOS Button Implementation
```swift
// In FavoriteButtons.swift
HStack {
    Image(systemName: "checkmark.circle")
    Text("Seen it")
}
.frame(minHeight: 36)
```

---

## Navigation Patterns

### Universal Navigation Rules
1. **Favorite buttons:** Simple toggle only - NEVER navigate
2. **Everything else navigates:** Posters, titles, descriptions/blurbs are ALL tappable
3. **Generous tap targets:** Make navigation easy and intuitive

### From Carousel Cards
- **Navigates:** Tap poster → Movie detail page
- **Note:** Carousel cards also show title/year below poster (these navigate too)
- No favorite buttons on carousel items

### From Movie Cards (More Ideas, Genius, Watchlist)
- **Navigates:**
  - Tap poster → Movie detail page
  - Tap title → Movie detail page
  - Tap slug/description → Movie detail page
  - Tap anywhere on card (except buttons) → Movie detail page
- **Toggles only (no navigation):**
  - Tap "Seen"/"Seen it" button → Toggle seen state
  - Tap "Add"/"Add to list" button → Toggle queue state
  - Tap delete "X" (Watchlist only) → Remove from list

---

## Testing Checklist

### Visual Verification
- [ ] Long movie titles display in full (e.g., "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb")
- [ ] Descriptions/slugs wrap to multiple lines without truncation
- [ ] Favorite buttons remain bottom-right regardless of content length
- [ ] Cards expand height to accommodate all content
- [ ] No text shows ellipsis (...) anywhere

### Functional Verification
- [ ] Favorite buttons have text labels
- [ ] Buttons don't overlap poster or text
- [ ] Card navigation works except when clicking buttons
- [ ] Delete button appears only in Watchlist view

---

## Common Violations to Avoid

### ❌ DO NOT:
- Add `.lineLimit(1)` or any line limits to text
- Use `text-overflow: ellipsis` in CSS
- Set fixed card heights
- Use icon-only buttons
- Position buttons overlapping content
- Hide overflow with `overflow: hidden` on text containers

### ✅ ALWAYS:
- Allow text to wrap naturally
- Let cards expand vertically
- Include text labels on buttons
- Position buttons bottom-right
- Test with long movie titles

---

## References

- iOS Component Guidelines: `/ios/COMPONENT_USAGE_GUIDELINES.md`
- Design Decisions: `/ios/DESIGN_DECISIONS.md`
- MediaCard Component: `/components/MediaCard.js`
- StandardMovieCard: `/ios/moviegenius/moviegenius/Components/StandardMovieCard.swift`

---

## Enforcement

This specification is **mandatory** for all movie representations in MovieGenius. Any deviation requires explicit approval and documentation. Truncated text or overlapping buttons indicate unauthorized changes that must be corrected immediately.

**Key Rule:** If you see "..." in any movie text, something is broken.