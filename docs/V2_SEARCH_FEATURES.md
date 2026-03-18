# V2 Search Features (Deferred from V1)

## Overview
V1 focuses on direct navigation via word wheel dropdown. Full search result browsing is deferred to V2 for enhanced discovery experience.

## V1 Implementation (Current)
**SimpleSearch with Word Wheel Dropdown**
- Type 3+ characters → see top 8 suggestions
- Small poster thumbnails (40×60px)
- Title + year display
- Click suggestion → navigate to `/movie/[id]`
- Enter key → selects first result
- Fast, direct navigation

## V2 Features (To Implement)

### 1. Full Search Results Page
**Component**: `SearchResultCard.js` (currently exists)
- Large poster (200px)
- Action buttons (Add to List, Mark as Seen, Play Trailer)
- Why Watch section with 3 reasons
- Analysis preview (3 lines of text)
- "View Full Analysis" button

**Use Case**: Browse and explore multiple search results
- Compare multiple movies
- Read quick summaries before diving deeper
- Manage watchlist from search results

### 2. Grid/List View Toggle
**Component**: `SearchResults.js` (currently exists)
- Grid view: Larger cards with posters
- List view: Compact rows with metadata
- User preference stored in localStorage
- Better for different browsing contexts

### 3. Advanced Search Features
- Filter by year range
- Filter by genre
- Sort by popularity, year, rating
- "Show me similar" from search results
- Search within specific collections

### 4. Search Results Page Routes
- `/search?q={query}` - Full results page
- `/search?category={genre}` - Genre browsing
- `/search?year={year}` - Year-based search

## Migration Notes

### Existing Components to Restore
1. **SearchResultCard.js** - Already built, just needs re-integration
2. **SearchResults.js** - Grid/list toggle, needs MediaCard integration
3. **Homepage search results** - Currently shows background, needs result cards

### Integration Points
- Update SimpleSearch Enter key behavior
- Add "View All Results" link to dropdown
- Restore `/search` page with SearchResultCard rendering
- Add search results header with count

## User Flow Comparison

### V1 (Word Wheel Only)
```
User types "jaw" → Dropdown shows "Jaws (1975)" → Click → Movie page
```

### V2 (Full Search)
```
User types "jaw" → Dropdown shows suggestions →
  Option A: Click suggestion → Movie page
  Option B: Press Enter → Search results page with cards → Browse → Select movie
```

## Technical Debt
- SearchResultCard currently uses deprecated `onMovieClick` prop pattern
- Need to standardize routing with `router.push` directly
- Consider infinite scroll for large result sets
- Add skeleton loading states for search results
