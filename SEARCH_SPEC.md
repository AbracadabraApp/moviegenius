# MovieGenius Search Specification

## Architecture (Single Entry Point)

**The ONLY valid search path:**
1. **Entry Point:** Search icon as tab #3 in bottom navigation (between Genius and Watchlist)
2. **Search Interface:** Standard Apple `.searchable()` modifier inside SearchView
3. **Results Display:** Horizontal scrollable carousel of movie posters (136px wide, "More Ideas" sized)
4. **Result Format:** Poster image with title and year below each card

## Backend Logic

**Search Strategy: Database-First with TMDB Fallback**
- Primary: Search local PostgreSQL database first (curated 35K+ movies)
- Fallback: Only call TMDB API if database returns zero results
- API Endpoint: `POST /api/v1/search` with `strategy: 'database-first'`

## Explicit Non-Features

These elements must NOT exist anywhere in the app:
- ❌ No AppHeader with search functionality
- ❌ No decorative search boxes in headers
- ❌ No inline search dropdowns
- ❌ No search entry points except the bottom nav tab
- ❌ No search buttons in navigation bars or toolbars

## Implementation Status

**Feature Branch (`feature/genius-json-migration`):**
- ✅ Has 4-tab navigation with Search as tab #3
- ✅ SearchView uses `.searchable()` modifier
- ✅ Carousel layout for results
- ✅ API supports database-first strategy

**Main Branch:**
- ⚠️ Missing Search tab (only 3 tabs)
- ⚠️ Has broken AppHeader with decorative search

## Rationale

This specification follows standard iOS design patterns:
- Tab-based navigation for primary features
- Native `.searchable()` for familiar UX
- Database-first for performance (avoid unnecessary API calls)
- Single entry point for clarity and simplicity

## Enforcement

Any deviation from this specification requires explicit approval and documentation. This includes:
- Adding search functionality to any other view
- Changing the search backend strategy
- Modifying the results display format
- Adding search entry points beyond the tab bar

---

*Last Updated: May 26, 2026*
*Version: 1.0*