# API Update Required for iOS More Ideas Posters

**Date:** 2026-05-10
**Priority:** HIGH - Blocks iOS production quality

---

## Issue

The `/api/v1/movie/{tmdbId}` endpoint's `moreIdeas` array **does not include poster URLs**.

**Current API Response:**
```json
{
  "moreIdeas": [
    {
      "tmdbId": 152601,
      "title": "Her",
      "year": 2013,
      "connection": "Spike Jonze's film about loneliness in modern Tokyo..."
    }
  ]
}
```

**iOS needs:**
```json
{
  "moreIdeas": [
    {
      "tmdbId": 152601,
      "title": "Her",
      "year": 2013,
      "poster_url": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "connection": "Spike Jonze's film about loneliness in modern Tokyo..."
    }
  ]
}
```

---

## Backend Implementation

### Option 1: Join movies table (RECOMMENDED)
```javascript
// pages/api/v1/movie/[id].js

const moreIdeasQuery = `
  SELECT
    m.tmdb_id,
    m.title,
    m.year,
    m.poster_url,
    mai.connection
  FROM movie_analyses_ideas mai
  JOIN movies m ON m.tmdb_id = mai.related_tmdb_id
  WHERE mai.tmdb_id = $1
  ORDER BY mai.position ASC
  LIMIT 5
`;

const moreIdeasResult = await pool.query(moreIdeasQuery, [tmdbId]);
const moreIdeas = moreIdeasResult.rows.map(row => ({
  tmdbId: row.tmdb_id,
  title: row.title,
  year: row.year,
  poster_url: row.poster_url,  // ← ADD THIS
  connection: row.connection
}));
```

### Option 2: Build poster URL from tmdb_id
```javascript
// If movies table doesn't have poster_url stored
const moreIdeas = moreIdeasResult.rows.map(row => ({
  tmdbId: row.tmdb_id,
  title: row.title,
  year: row.year,
  poster_url: `https://image.tmdb.org/t/p/w500${row.poster_path}`,  // ← BUILD URL
  connection: row.connection
}));
```

---

## Testing

**Before change:**
```bash
curl https://moviegenius.ai/api/v1/movie/153 | jq '.moreIdeas[0]'
# Missing: poster_url
```

**After change:**
```bash
curl https://moviegenius.ai/api/v1/movie/153 | jq '.moreIdeas[0].poster_url'
# Output: "https://image.tmdb.org/t/p/w500/..."
```

---

## Impact

**iOS:**
- ✅ Will display real movie posters (not placeholder icons)
- ✅ Matches web app quality
- ✅ Essential for production release

**Web:**
- No breaking change (web doesn't use moreIdeas poster currently)
- Future enhancement opportunity

---

## Files Changed (iOS)

- `/ios/moviegenius/moviegenius/Models/MoreIdea.swift` - Added `posterUrl` field
- `/ios/moviegenius/moviegenius/Views/MoreIdeasView.swift` - Redesigned as vertical cards with posters

**Status:** iOS implementation complete, waiting for API update.
