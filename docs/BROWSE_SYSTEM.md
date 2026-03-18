# Browse System - Complete Reference

## Overview

The Browse System is a curated collection-based movie discovery feature with **3,365 active thematic collections** containing over 100,000 movie assignments. This is the foundation for V2's primary discovery experience.

**Last Updated**: 2025-03-18

---

## Current State (V1)

### Database Statistics
- **Total Collections**: 3,365 active browse collections
- **Movie Assignments**: 101,718 total
- **Coverage**: 35 genres processed
- **Quality Threshold**: ≥4 movies per collection
- **Database Tables**: `browse_lists`, `list_movies`

### Largest Collections (by movie count)
1. Identity Shifting Dramas (127 movies)
2. Modern Social Commentary (118 movies)
3. Parent-Child Transformation Stories (98 movies)
4. Hidden Identity Thrillers (94 movies)
5. Moral Crisis Films (80 movies)
6. Modern Magical Realism (78 movies)
7. Cross-Cultural Social Commentary (73 movies)
8. Modern Romance Deconstruction (72 movies)
9. Modern Urban Romance (71 movies)
10. Criminal Mishap Comedies (68 movies)

### Recent Collections (most recently added)
- Professional Identity Crisis (10 movies)
- Youth Sexual Identity (3 movies)
- Sibling Relationships (1 movie)
- Classical Music Culture (1 movie)
- Boxing Culture Films (2 movies)
- Native American Identity Stories (4 movies)
- Political Identity Stories (2 movies)
- Industrial Era Transformation Stories (1 movie)
- Aristocratic Decline Films (5 movies)
- Political Power Dynamics (6 movies)

---

## Database Schema

### `browse_lists` Table
```sql
CREATE TABLE browse_lists (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_movies INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `list_movies` Table (Junction Table)
```sql
CREATE TABLE list_movies (
  id SERIAL PRIMARY KEY,
  list_id UUID REFERENCES browse_lists(id) ON DELETE CASCADE,
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) DEFAULT 0.8,
  display_order INTEGER,
  is_featured BOOLEAN DEFAULT FALSE,
  is_gateway BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(list_id, movie_id)
);
```

**Key Fields:**
- `relevance_score`: AI-assigned relevance (0.0-1.0)
- `display_order`: Manual curation order (lower = higher priority)
- `is_featured`: Highlight in collection hero section
- `is_gateway`: Entry point movies for collection discovery

---

## API Endpoints

### Get Browse List Movies
**Endpoint**: `GET /api/browse-list-movies`

**Query Parameters:**
- `listId` (required): UUID of browse collection
- `limit` (optional): Number of movies to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "browse_list": {
    "id": "uuid",
    "title": "Hidden Identity Thrillers",
    "description": "...",
    "total_movies": 94,
    "created_at": "..."
  },
  "movies": [
    {
      "id": "uuid",
      "tmdb_id": 550,
      "title": "Fight Club",
      "year": 1999,
      "poster_url": "https://...",
      "slug": "fight-club-1999",
      "relevance_score": 0.95,
      "display_order": 1,
      "is_featured": true,
      "is_gateway": false,
      "added_at": "..."
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "returned": 50,
    "total": 94
  },
  "query_time_ms": 145
}
```

**File**: `pages/api/browse-list-movies.js`

---

## Components

### CategoryBrowse Component
**File**: `components/CategoryBrowse.js`

Displays genre-based browse buttons (Action, Drama, Comedy, etc.)

**Usage:**
```jsx
<CategoryBrowse title="Browse by Category" />
<CategoryBrowse title="Explore Movies" compact={true} />
```

**Features:**
- 18 genre categories (Action, Drama, Comedy, Horror, etc.)
- 2 popularity categories (Most Popular All Time, Top Rated)
- Grid layout (2 columns default, 3 columns compact)
- Links to `/search?category={slug}`

**Current Categories:**
- Most Popular All Time
- Top Rated Movies
- Action, Adventure, Animation, Comedy, Crime, Documentary
- Drama, Family, Fantasy, History, Horror, Music
- Mystery, Romance, Science Fiction, Thriller, War, Western

### BrowseCollectionsSection Component
**File**: `components/BrowseCollectionsSection.js`

Displays which browse collections a movie belongs to (shown on movie pages)

**Usage:**
```jsx
<BrowseCollectionsSection
  collections={['Film Noir Essentials', 'Hollywood Golden Age']}
  totalCollections={12}
  title="Featured In Collections"
/>
```

**Features:**
- Shows up to 5 collection names
- Gold divider styling (matches section headers)
- Displays "+N more collections" if over 5
- Returns null if no collections

---

## Collection Naming Patterns

### Current State (Sample of 100 random collections)
**Analysis Date**: 2025-03-18

#### Naming Suffix Distribution:
- **11% end with "Films"** (e.g., "Revenge Horror Films", "Naval Aviation Films")
- **8% end with "Thrillers"** (e.g., "Home Invasion Thrillers", "Postwar Identity Thrillers")
- **9% end with "Stories"** (e.g., "Coming-of-Age Stories", "Wilderness Survival Stories")
- **2% end with "Dramas"** (e.g., "Media Trial Dramas", "Concert Hall Dramas")
- **0% end with "Movies"**
- **70% have no suffix** (e.g., "Service Industry Dignity", "Fish-Out-of-Water")

#### Pattern Categories:

**A. Genre-Specific Plurals (Good)**
- "Home Invasion Thrillers" ✅
- "Coming-of-Age Stories" ✅
- "Revenge Horror Films" ✅

**B. Abstract Noun Phrases (Inconsistent)**
- "Service Industry Dignity" (feels incomplete?)
- "Energy Industry Debates" (editorial tone unclear)
- "Police Corruption Evidence" (awkward?)

**C. Descriptive Phrases (Mixed)**
- "Fish-Out-of-Water" (needs "Stories"?)
- "Concert Tour Chronicles" (sounds good)
- "Stop-Motion Comedy Adventures" (clear and descriptive)

**D. Hybrid Genre Labels**
- "Fantasy SciFi Hybrids" ✅
- "Surrealist Dream Fantasy" ✅

### Naming Convention Issues

1. **Inconsistent suffixes**: No clear rule for when to use "Films", "Stories", genre plurals, or nothing
2. **Editorial voice varies**: Some sound academic, some casual, some incomplete
3. **Pluralization unclear**: "Fish-Out-of-Water" vs "Fish-Out-of-Water Stories"

### Proposed Editorial Standards (TO BE DECIDED)

**Option A: Always use "Films"**
- Pro: Consistent, clear
- Con: Can feel redundant ("Coming-of-Age Films" vs "Coming-of-Age Stories")

**Option B: Genre-specific plurals**
- Thrillers → "Home Invasion Thrillers"
- Stories → "Coming-of-Age Stories"
- Films → "Japanese Counterculture Films"
- Chronicles → "Concert Tour Chronicles"
- Pro: Natural language feel
- Con: Requires human curation

**Option C: Smart suffix rules**
- Thematic collections: no suffix ("Service Industry Dignity")
- Genre-based: use genre plural ("Home Invasion Thrillers")
- Narrative-focused: use "Stories" ("Coming-of-Age Stories")
- Pro: Context-appropriate
- Con: Complex to implement programmatically

**Decision needed**: Which option aligns with brand voice?

---

## Creative Collection Names (Sample from genre-categories.json)

The `data/genre-categories.json` file contains 175 playful/creative collection names:

- "Main Character Energy Movies"
- "Villain Era Films"
- "Gaslight Gatekeep Girlboss Thrillers"
- "Touch Grass Cinema"
- "No Thoughts Head Empty Comedies"
- "It's Giving Prestige Drama"
- "Comfort Movies That Hit Different"
- "Big Brain Energy Sci-Fi"
- "Emotional Damage: The Collection"
- "Movies That Live Rent-Free"
- "That's So Valid Horror"
- "Certified Banger Action Films"

**Note**: These are different from the 3,365 database collections. These 175 are more casual/Gen-Z voice, while database collections are thematic/analytical.

---

## V2 Browse Features (Planned)

### 1. Browse Discovery Homepage
**Priority**: HIGH

Transform homepage from empty search page to browse-first discovery:
- Featured collections with movie carousels
- "Trending Collections" section
- "Recently Updated" section
- Random daily featured collection
- Search box remains but secondary

**User Flow:**
```
Homepage → See "Hidden Identity Thrillers" carousel
         → Click collection title → Collection page with all 94 movies
         → OR click movie poster → Movie page
```

### 2. Collection Pages (`/browse/[listId]`)
**Priority**: HIGH

Full-page experience for each collection:
- Hero section with collection title/description
- Movie grid with large posters (150-200px)
- Pagination (50 movies per page)
- Featured movies highlighted at top
- Gateway movies section
- "Similar Collections" recommendations

**Design:**
- PhoneFrame mobile-first
- Poster grid: 2 columns on mobile
- Hover effects with quick info
- Smooth scrolling

### 3. Collection Directory (`/browse`)
**Priority**: MEDIUM

Browse all 3,365 collections:
- Search/filter collections by name
- Filter by size (10+ movies, 20+, 50+)
- Filter by genre/theme
- Sort by: Most movies, Recently updated, Alphabetical
- Preview: Show 4-6 movie posters per collection

### 4. Better Visuals
**Priority**: HIGH

Upgrade from simple list (V1) to rich presentation:
- Large poster grids (150-200px posters vs current 40px thumbnails)
- Rich movie cards with hover states
- Collection hero images/banners
- Smooth transitions and loading states
- Skeleton loaders

### 5. Collection Search
**Priority**: MEDIUM

Allow users to search within collections:
- `/browse/[listId]?q=fight`
- Filter movies within collection
- Fuzzy matching on movie titles

### 6. Collection Recommendations
**Priority**: LOW

"If you like this collection, try these":
- AI-powered similar collection recommendations
- Based on thematic overlap
- User behavior tracking (future)

---

## Build Process (How Collections Were Created)

### AI-Powered Generation
**File**: `browse-collection-generator.js`

Collections were generated using Claude AI to:
1. Analyze each movie's themes, tone, narrative style
2. Assign movies to existing collections
3. Create new collections when needed
4. Score relevance (0.0-1.0)

**Processing Stats:**
- 35 genres processed (Drama, Comedy, Musical, etc.)
- 9,531 Drama movies analyzed
- 555 Musical movies analyzed
- Sequential processing (1 movie at a time to avoid timeouts)
- Cost: $124.50 for Drama, $3.37 for Musical

### Quality Filtering
**Threshold**: ≥4 movies per collection

**Available thresholds:**
- ≥3 movies: 4,127 collections (38.3%)
- ≥4 movies: 3,488 collections (32.4%) ← **Current**
- ≥5 movies: 3,095 collections (28.7%)
- ≥6 movies: 2,807 collections (26.1%)

**Decision**: Started with ≥4 as balance between coverage and quality

### Documentation
- `docs/BROWSE_BUILD_PROCESS.md` - AI generation details
- `docs/BROWSE_BUILD_STATUS.md` - Processing status by genre
- `scripts/BROWSE_DATA_CONFIG.md` - Configuration options
- `scripts/INSERT_BROWSE_DATA.md` - Database insertion guide

---

## Integration Points

### Movie Page Integration
**Current**: ✅ Implemented

Movie pages show which collections they belong to:
```jsx
<BrowseCollectionsSection
  collections={movie.browseCollections}
  totalCollections={movie.totalBrowseCollections}
/>
```

### Search Page Integration
**Current**: ❌ Not implemented
**V2 Plan**: Add "Browse Collections" tab to search results

### Homepage Integration
**Current**: ❌ Empty homepage with search only
**V2 Plan**: Replace with featured browse collections

---

## Technical Debt & Issues

### 1. Naming Inconsistency
**Status**: OPEN
**Issue**: 70% of collections have no standardized suffix
**Impact**: Medium (affects discoverability and UX coherence)
**Solution**: Establish editorial guidelines and run normalization script

### 2. Missing Collection Descriptions
**Status**: OPEN
**Issue**: Most collections have NULL description field
**Impact**: High (reduces user understanding of collections)
**Solution**: Generate descriptions using AI (cost: ~$20 for all 3,365)

### 3. No Collection Search
**Status**: OPEN
**Issue**: Users can't search through 3,365 collections
**Impact**: High (limits discoverability)
**Solution**: Implement `/api/browse-search` endpoint with fuzzy matching

### 4. No Featured Collections System
**Status**: OPEN
**Issue**: No way to promote high-quality collections
**Impact**: Medium (editorial curation needed)
**Solution**: Add `featured` flag to browse_lists table, create curation workflow

### 5. Display Order Not Utilized
**Status**: PARTIAL
**Issue**: `display_order` field exists but not exposed in UI
**Impact**: Low (manual curation ready but not user-facing)
**Solution**: Use display_order in collection pages for optimal movie ordering

---

## Cost Estimates

### AI Generation (Already Completed)
- Drama genre: $124.50 (9,531 movies)
- Musical genre: $3.37 (555 movies)
- **Total spent**: ~$500-800 (estimated for all 35 genres)

### Collection Descriptions (Future)
- 3,365 collections × $0.006 per description = **$20**
- 2-3 sentence descriptions using Claude Haiku

### Collection Hero Images (Future)
- 3,365 collections × $0.004 per image = **$13**
- Midjourney or similar for thematic collection art

---

## Query Examples

### Get all collections a movie belongs to
```sql
SELECT bl.id, bl.title, lm.relevance_score, lm.is_featured
FROM browse_lists bl
JOIN list_movies lm ON bl.id = lm.list_id
WHERE lm.movie_id = '550e8400-e29b-41d4-a716-446655440000'
  AND bl.status = 'active'
ORDER BY lm.relevance_score DESC;
```

### Find collections by theme keyword
```sql
SELECT id, title, total_movies
FROM browse_lists
WHERE status = 'active'
  AND (title ILIKE '%identity%' OR description ILIKE '%identity%')
ORDER BY total_movies DESC
LIMIT 20;
```

### Get movies in a collection with highest relevance
```sql
SELECT m.title, m.year, m.poster_url, lm.relevance_score, lm.is_featured
FROM movies m
JOIN list_movies lm ON m.id = lm.movie_id
WHERE lm.list_id = 'collection-uuid-here'
ORDER BY lm.display_order ASC, lm.relevance_score DESC
LIMIT 50;
```

### Collections needing descriptions
```sql
SELECT id, title, total_movies
FROM browse_lists
WHERE status = 'active'
  AND (description IS NULL OR description = '')
ORDER BY total_movies DESC
LIMIT 100;
```

---

## Files Reference

### Core Components
- `components/CategoryBrowse.js` - Genre browse buttons
- `components/BrowseCollectionsSection.js` - Movie page collection display

### API Routes
- `pages/api/browse-list-movies.js` - Get movies in collection

### Scripts
- `browse-collection-generator.js` - AI generation engine
- `scripts/transform-browse-data.js` - Quality filtering
- `scripts/insert-browse-data.js` - Database insertion

### Documentation
- `docs/BROWSE_BUILD_PROCESS.md` - How collections were built
- `docs/BROWSE_BUILD_STATUS.md` - Genre processing status
- `docs/BROWSE_SYSTEM_INTEGRATION.md` - Integration patterns
- `docs/PRODUCTION_BROWSE_SYSTEM.md` - Production deployment
- `scripts/BROWSE_DATA_CONFIG.md` - Configuration guide
- `scripts/INSERT_BROWSE_DATA.md` - Database insertion guide

### Data Files
- `data/genre-categories.json` - 175 playful collection names (separate from database)

---

## Next Steps

### Immediate (V1 Polish)
1. ✅ Search working with word wheel
2. ✅ Search results page with list view
3. ❌ Add browse collections to movie pages (component exists but needs data hookup)

### V2 Phase 1 (Core Browse)
1. Create `/browse` directory page (list all 3,365 collections)
2. Create `/browse/[listId]` collection pages
3. Implement collection search/filtering
4. Add collection descriptions ($20 AI cost)

### V2 Phase 2 (Discovery Homepage)
1. Replace empty homepage with browse discovery
2. Featured collections carousel
3. Trending/Recently updated sections
4. Random daily featured collection

### V2 Phase 3 (Visual Upgrade)
1. Large poster grids (150-200px)
2. Rich movie cards with hover effects
3. Collection hero images ($13 AI cost)
4. Smooth animations and transitions

### V2 Phase 4 (Advanced Features)
1. Collection recommendations
2. User collections (save/create custom)
3. Share collections
4. Collection analytics

---

## Questions / Decisions Needed

1. **Naming Convention**: Which editorial standard should we adopt?
   - Option A: Always "Films"
   - Option B: Genre-specific plurals
   - Option C: Smart suffix rules

2. **Homepage Priority**: Browse-first or search-first?
   - Current: Search-only (empty page)
   - Proposed: Browse discovery with search secondary

3. **Collection Descriptions**: Generate all now or progressively?
   - All at once: $20, consistent quality
   - Progressive: Free up initial costs, inconsistent timing

4. **Creative vs Analytical Names**: Use both systems?
   - 175 playful names from genre-categories.json
   - 3,365 analytical names in database
   - Keep separate or merge?

---

## Changelog

**2025-03-18**: Initial comprehensive documentation created
- Documented 3,365 active collections
- Analyzed naming patterns
- Defined V2 roadmap
- Identified technical debt
