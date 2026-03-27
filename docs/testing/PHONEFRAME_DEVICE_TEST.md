# PhoneFrame Removal — Device Test Checklist

**Change:** PhoneFrame replaced with CSS app shell (`.app-shell-*` classes).
**Build verified:** Compiled clean. Run on real device to confirm no regressions.

---

## Setup

- `npm run dev` running on your Mac
- iPhone on same Wi-Fi, navigate to `http://[mac-local-ip]:3000`
- Or deploy branch to Railway staging before merging to main

---

## Critical — No Flash on Load

On every page below, do a **hard refresh** (hold reload icon → "Reload Without Content Blockers" on Safari):

- [ ] `/` — Homepage (carousels)
- [ ] `/movie/[any-id]` — Movie page
- [ ] `/collection/[any-id]` — Collection page
- [ ] `/genius` — Genius page
- [ ] `/person/[any-id]` — Person page
- [ ] `/search` — Search
- [ ] `/what-to-watch` — What to Watch

**Pass criteria:** No visible resize/shrink of the white frame before content renders. The page should appear immediately at full-width — no "shrunken iPhone frame" artifact.

---

## NavBar

- [ ] NavBar appears fixed at bottom of screen on every page
- [ ] NavBar does not overlap content (last item on page is visible above NavBar)
- [ ] Active tab highlights correctly when navigating between pages
- [ ] Tapping a NavBar tab navigates correctly
- [ ] NavBar respects home indicator safe area (bottom bar not clipped on iPhone X+)

---

## Scroll

- [ ] **Homepage** (`/`) — carousels scroll horizontally; page does not bounce/double-scroll
- [ ] **Movie page** (`/movie/[id]`) — page scrolls smoothly top-to-bottom; no stuck scroll
- [ ] **Collection page** (`/collection/[id]`) — poster grid scrolls; tap a poster
- [ ] **Person page** (`/person/[id]`) — filmography scrolls
- [ ] **What to Watch** (`/what-to-watch`) — page scrolls; no stuck scroll
- [ ] **Search** — results scroll after typing
- [ ] Scroll position restored after Back navigation on homepage

---

## Safe Area (iPhone X+ notch/home indicator)

- [ ] Content does not hide behind the notch at the top
- [ ] Content does not hide behind the home indicator at the bottom
- [ ] NavBar is above the home indicator, not under it

---

## Desktop (Chrome, Safari — at max-width)

- [ ] App is centered, max 430px wide, white background on both sides
- [ ] No iPhone chrome visible (rounded corners, device bezel)
- [ ] NavBar appears at bottom of the 430px column, not bottom of viewport

---

## Landscape Mode (rotate iPhone)

- [ ] No layout break in landscape on any live page
- [ ] Content reflows correctly; NavBar still anchored to bottom

---

## Rollback Procedure (if any check fails)

```bash
git checkout components/PhoneFrame.js styles/globals.css
npm run build
```

Both files revert to pre-change state. No other files were modified.

---

**Tested by:** _______________  **Date:** _______________
