# Legacy Component Archive

This directory contains archived versions of components from the text-based parsing system, preserved for reference during the JSON format migration.

## Archived Files

### `movie-page.legacy.js`
- **Original**: `pages/movie/[id].js`
- **Purpose**: Main movie detail page with client-side API fetching
- **Key Features**: 
  - Dynamic rendering with useEffect hooks
  - API calls for movie data, streaming data, and analysis
  - Error boundary integration
  - PhoneFrame layout with SimpleSearch

### `MovieAnalysisWithEntities.legacy.js`
- **Original**: `components/MovieAnalysisWithEntities.js`
- **Purpose**: Movie analysis display with entity linking and alternating layout
- **Key Features**:
  - Text-based parsing with `parseModernAnalysisContent()`
  - Alternating layout: Text → Featured Films → Explore Further → Repeat
  - Self-referential movie filtering
  - SUBHEAD styling with gold color (#d4af37)
  - MediaCard and ExplorePromptCard integration
  - Entity linking with EntityLinkedText component

### `MediaCard.legacy.js`
- **Original**: `components/MediaCard.js`
- **Purpose**: Interactive movie card with favorites management
- **Key Features**:
  - Self-contained data fetching for posters/TMDB IDs
  - Favorites management (hearted/bookmarked states)
  - Streaming data display
  - Navigation to movie detail pages
  - Claude slug validation (no TMDB plot summaries)

### `ExplorePromptCard.legacy.js`
- **Original**: `components/ExplorePromptCard.js`
- **Purpose**: Interactive prompt card for exploration topics
- **Key Features**:
  - Routing to static explore pages
  - Context prefix integration
  - Gradient background styling
  - Arrow indicator for navigation

## Text-Based Parsing Logic

The legacy system used regex-based parsing of text content with markers:
- `MOVIES:` → MediaCard data with pipe-separated fields
- `SUBHEAD:` → Gold-styled section headers
- `EXPLORE_FURTHER:` → ExplorePromptCard topics
- `MORE_IDEAS:` → Additional movie recommendations

### Alternating Layout Pattern
The legacy system implemented sophisticated content boundary detection:
1. Text paragraphs
2. FEATURED FILMS section with MediaCards
3. Single EXPLORE FURTHER card
4. Repeat pattern
5. Remaining EXPLORE FURTHER cards
6. MORE IDEAS section
7. DiscoveryFooter

## Migration Notes

These files are preserved for:
- **Reference**: Understanding the original alternating layout logic
- **Fallback**: Emergency rollback if JSON migration fails
- **Learning**: Component interface patterns and styling approaches
- **Documentation**: Historical record of text-based parsing system

## Usage

**DO NOT import or use these files in active code.** They are for reference only.

The active JSON-based system should replace all functionality while maintaining the same user experience and component interfaces.

---

*Archived on: $(date)*
*Purpose: Reference during JSON format migration*
*Status: Legacy - Do not use in production*