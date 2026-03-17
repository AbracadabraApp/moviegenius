# What to Watch - Simplified Watchlist Prototype

**Date:** March 16, 2026
**Purpose:** Replace complex "You" section with clean, focused watchlist

---

## 🎯 **Design Philosophy**

**Before:** Complex "You" section with multiple features
**After:** Simple watchlist - "What should I watch next?"

**Core Principle:** Show me what I saved. Let me watch it or remove it. Nothing else.

---

## 📱 **Visual Layout**

```
┌─────────────────────────────────────────┐
│                                         │
│         What to Watch                   │
│   Your curated collection of            │
│      must-watch films                   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ❤️  Favorites (12)  │  🔖 Watch Later (8) │
│  ════════════════    │                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌───┐                                  │
│  │   │  Fight Club (1999)          ▶️  ✕  │
│  │ 📽 │  Reality isn't what          │
│  │   │  it seems                    │
│  └───┘                                  │
│                                         │
│  ┌───┐                                  │
│  │   │  The Matrix (1999)          ▶️  ✕  │
│  │ 📽 │  What if reality is          │
│  │   │  a simulation                │
│  └───┘                                  │
│                                         │
│  ┌───┐                                  │
│  │   │  Blade Runner (1982)        ▶️  ✕  │
│  │ 📽 │  Sci-fi noir masterpiece    │
│  └───┘                                  │
│                                         │
└─────────────────────────────────────────┘
```

---

## ✨ **Features**

### **Two Simple Tabs**
1. **Favorites (❤️)** - Movies you loved
2. **Watch Later (🔖)** - Movies you want to see

### **Clean Movie Cards**
- **Poster thumbnail** (60x90px)
- **Title + Year**
- **Slug** (1-2 line description)
- **Two actions:**
  - ▶️ **Watch** - Go to movie detail page
  - ✕ **Remove** - Delete from list

### **Empty States**
- Friendly prompts when lists are empty
- Show icon + message explaining how to add movies

---

## 🎨 **Design Tokens**

**Colors:**
- Gold accent: `#d4af37` (MovieGenius brand)
- Text primary: `#111827`
- Text secondary: `#6b7280`
- Background: `#ffffff`
- Card background: `#f9fafb`
- Border: `#e5e7eb`

**Typography:**
- Title: 32px, bold
- Subtitle: 16px, regular
- Movie title: 16px, semibold
- Slug: 14px, regular
- Tab: 15px, medium

**Spacing:**
- Card gap: 12px
- Internal padding: 12px
- Section margins: 24-32px

---

## 🔄 **User Flow**

### **Adding Movies (Existing Behavior)**
```
User on movie detail page
  → Taps ❤️ (heart icon)
  → Movie added to Favorites
  → Can view in "What to Watch"

User on movie detail page
  → Taps 🔖 (bookmark icon)
  → Movie added to Watch Later
  → Can view in "What to Watch"
```

### **Using Watchlist**
```
User visits "What to Watch" page
  → Sees Favorites tab (default)
  → Scrolls through saved movies
  → Taps ▶️ on a movie
  → Goes to movie detail page
  → Watches trailer, reads analysis

OR

  → Taps ✕ to remove movie
  → Movie disappears with fade animation
  → Continues browsing
```

### **Switching Tabs**
```
User on Favorites tab
  → Taps "Watch Later" tab
  → List smoothly transitions
  → Shows bookmarked movies
  → Same card layout
```

---

## 💾 **Data Storage**

**Uses existing FavoritesManager:**
- localStorage-based (no backend needed)
- Methods already implemented:
  - `getAllHeartedMovies()`
  - `getAllBookmarkedMovies()`
  - `removeFromHearted(mediaId)`
  - `removeFromBookmarked(mediaId)`

**Movie data includes:**
```javascript
{
  id: "fight-club-1999",
  title: "Fight Club",
  year: 1999,
  slug: "Reality isn't what it seems",
  poster: "https://image.tmdb.org/t/p/w500/...",
  tmdbId: 550
}
```

---

## 📊 **Comparison: Old vs New**

| Feature | Old "You" Section | New "What to Watch" |
|---------|-------------------|---------------------|
| **Complexity** | High | Minimal |
| **Features** | Multiple tabs, settings, etc. | Just watchlist |
| **Purpose** | Unclear | Crystal clear |
| **User benefit** | Confusing | Instant value |
| **Load time** | Slower | Instant (localStorage) |
| **Maintenance** | Complex | Simple |

---

## 🚀 **Implementation Plan**

### **Phase 1: Replace Existing "You" Page** (1-2 hours)
1. Create `/pages/what-to-watch.js` using prototype
2. Update navigation to point to new page
3. Test with FavoritesManager integration

### **Phase 2: Polish** (30 min)
1. Add smooth animations (fade in/out)
2. Test empty states
3. Test with real movie data

### **Phase 3: Deploy** (15 min)
1. Remove old "You" section code
2. Update any links/references
3. Deploy to production

---

## 📝 **Code Location**

**Prototype:** `/components/WhatToWatch.prototype.js`

**To use:**
```javascript
// pages/what-to-watch.js
import WhatToWatch from '../components/WhatToWatch.prototype';

export default function WhatToWatchPage() {
  return <WhatToWatch />;
}
```

---

## ✅ **Benefits**

1. **Clear purpose** - "What should I watch next?"
2. **No complexity** - Just saved movies
3. **Fast** - localStorage, no API calls
4. **Familiar** - Standard watchlist pattern
5. **Maintainable** - Simple code, easy to debug
6. **Scalable** - Easy to add features later if needed

---

## 🎯 **Success Metrics**

- ✅ Users understand what the page does immediately
- ✅ Page loads in <100ms (localStorage only)
- ✅ Zero API calls required
- ✅ Works offline (localStorage persists)
- ✅ Easy to maintain (single component)

---

**Document Status:** Ready for review
**Prototype Status:** Complete
**Next Step:** Review design → Implement → Deploy
