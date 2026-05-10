# 🔌 MovieGenius API Reference

This document provides a comprehensive reference for all MovieGenius API endpoints.

## 🚀 Base URLs

- **Production**: `https://moviegenius.ai`
- **Development**: `http://localhost:3000`

## 📡 Core API Endpoints

### Unified Movie Endpoint (v1) ⭐ **PRIMARY**

#### GET `/api/v1/movie/{tmdbId}`
**Recommended for all new integrations** - Replaces 4 waterfall API calls with a single optimized query. Returns complete movie data including metadata, WhyWatch recommendations, MoreIdeas, and contributors.

**Performance:**
- 67% faster than legacy endpoints (1,800ms → 600ms)
- Single database query with optimized JOINs
- Returns all data needed for movie detail pages

**Parameters:**
- `tmdbId` (required, path parameter): TMDB movie ID

**Response:**
```json
{
  "movie": {
    "tmdb_id": 153,
    "title": "Lost in Translation",
    "year": 2003,
    "official_title": "Lost in Translation",
    "release_date": "2003-09-18",
    "slug": "tagline-text-30-100-chars",
    "poster_url": "https://image.tmdb.org/t/p/w500/...",
    "trailer_url": "https://www.youtube.com/watch?v=...",
    "streaming_data": { /* JustWatch data */ },
    "has_analysis": true,
    "has_linked_analysis": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  },
  "whyWatch": {
    "id": "uuid",
    "recommendation": "YES",
    "reasons": [
      "Murray's restrained performance carries every quiet scene",
      "Dialogue feels genuinely overheard, not written",
      "Redefined American indie romance for the 2000s"
    ],
    "context": "Coppola shot guerrilla-style in real Tokyo locations without permits...",
    "model": "claude-sonnet-4-6",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "moreIdeas": [
    {
      "tmdbId": 152601,
      "title": "Her",
      "year": 2013,
      "connection": "Spike Jonze's film about loneliness in modern Tokyo..."
    }
    // ... 14 more related movies
  ],
  "contributors": {
    "cast": [
      {
        "id": 1234,
        "name": "Bill Murray",
        "character": "Bob Harris",
        "profile_path": "/path.jpg"
      }
    ],
    "crew": [
      {
        "id": 5678,
        "name": "Sofia Coppola",
        "job": "Director",
        "department": "Directing",
        "profile_path": "/path.jpg"
      }
    ]
  },
  "analysis": {
    "id": "uuid",
    "query_text": "Analyze Lost in Translation",
    "claude_response": "Full analysis text...",
    "analysis_type": "standard",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Field Notes:**
- `whyWatch` can be `null` if movie hasn't been analyzed (15% of catalog)
- `moreIdeas` can be `null` for ~40% of movies - hide section when null
- `analysis` is legacy data (deprecated 400-word format) - not used on production pages
- `contributors` contains full cast/crew from TMDB
- `streaming_data` is JustWatch format (where to watch)

**Coverage (32,950 movies total):**
- WhyWatch: 28,156 (85%)
- MoreIdeas: 19,915 (60%)
- Contributors: 13,645 (41%)

**Example:**
```bash
curl "https://moviegenius.ai/api/v1/movie/153"
```

**Changelog:**
- **2026-05-08**: Upgraded to `enhanced_why_watch_v3` table (adds `context` field, +8,208 movies)
- **2026-05-08**: Fixed MoreIdeas JOIN bug (now returns for 19,915 movies)
- **2026-05-03**: Initial release (Week 1)

---

### Movie Analysis (Legacy)

#### GET `/api/movie-analysis`
Get or generate AI analysis for a specific movie.

**Parameters:**
- `tmdbId` (required): TMDB movie ID

**DEPRECATION NOTE:** Legacy 500-word analysis format is deprecated. Current movie pages use WhyWatch content instead (binary YES/NO recommendations with 3 reasons). This endpoint remains for backward compatibility only.

**Response:**
```json
{
  "analysis": "Rich AI-generated movie analysis...",
  "movie": {
    "tmdb_id": 550,
    "title": "Fight Club",
    "year": 1999,
    "poster_url": "...",
    "streaming_data": "..."
  },
  "sections": [
    {
      "type": "text",
      "content": "Analysis text..."
    },
    {
      "type": "movies", 
      "movies": [...]
    }
  ],
  "exploreFurther": ["topic1", "topic2"],
  "moreIdeas": [...],
  "cached": true
}
```

**Example:**
```bash
curl "https://moviegenius.ai/api/movie-analysis?tmdbId=550"
```

### Search

#### POST `/api/health`
Multi-purpose endpoint handling both health checks and movie search.

**GET Request (Health Check):**
```bash
curl "https://moviegenius.ai/api/health"
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-07-24T12:00:00.000Z"
}
```

**POST Request (Movie Search):**
```bash
curl -X POST "https://moviegenius.ai/api/health" \
  -H "Content-Type: application/json" \
  -d '{"query": "Fight Club"}'
```

**Response:**
```json
{
  "results": [
    {
      "id": 550,
      "title": "Fight Club",
      "release_date": "1999-10-15",
      "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "overview": "A ticking-time-bomb insomniac...",
      "media_type": "movie"
    }
  ]
}
```

### Nuclear Static System

#### GET `/api/nuclear-status`
Get comprehensive status of the nuclear static generation system.

**Response:**
```json
{
  "total_movies": 17333,
  "total_analyses": 6065,
  "nuclear_files": 6024,
  "conversion_rate": 99.3,
  "pending_movies": 41,
  "recent_activity": [...],
  "cost_estimates": {
    "completed_cost": 3024.50,
    "remaining_cost": 20.50
  },
  "next_actions": [
    "Convert 41 remaining movies with analysis",
    "Generate analysis for top 1000 candidates"
  ]
}
```

#### POST `/api/nuclear-autonomous`
Control the autonomous nuclear generation system.

**Actions:**
- `start`: Start autonomous processing
- `stop`: Stop autonomous processing
- `restart`: Restart autonomous processing
- `status`: Get current status

**Example:**
```bash
curl -X POST "https://moviegenius.ai/api/nuclear-autonomous" \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### TMDB Integration

#### GET `/api/tmdb-poster`
Get optimized movie poster with caching.

**Parameters:**
- `tmdbId` (required): TMDB movie ID

**Example:**
```bash
curl "https://moviegenius.ai/api/tmdb-poster?tmdbId=550"
```

#### GET `/api/tmdb-trailer`
Get movie trailer information.

**Parameters:**
- `tmdbId` (required): TMDB movie ID

**Response:**
```json
{
  "results": [
    {
      "key": "SUXWAEX2jlg",
      "name": "Fight Club - Official Trailer",
      "site": "YouTube",
      "type": "Trailer"
    }
  ]
}
```

### Cache Management

#### POST `/api/cache-warming`
Warm cache with popular movie content.

**Parameters:**
```json
{
  "type": "popular" | "series" | "posters" | "all",
  "limit": 100
}
```

**Example:**
```bash
curl -X POST "https://moviegenius.ai/api/cache-warming" \
  -H "Content-Type: application/json" \
  -d '{"type": "popular", "limit": 50}'
```

## 🔒 Authentication

Most endpoints are public, but some administrative endpoints require authentication:

```bash
curl -X POST "https://moviegenius.ai/api/nuclear-autonomous" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

## 📊 Rate Limits

- **Public Endpoints**: 100 requests/minute
- **Search Endpoints**: 50 requests/minute  
- **Admin Endpoints**: 20 requests/minute

## 🛡️ Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "timestamp": "2025-07-24T12:00:00.000Z"
}
```

**Common Error Codes:**
- `MOVIE_NOT_FOUND`: Movie not found in database
- `TMDB_API_ERROR`: TMDB API request failed
- `ANALYSIS_GENERATION_ERROR`: Claude AI analysis failed
- `CACHE_ERROR`: Redis cache operation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests

## 🚀 Performance Features

### Caching Strategy
- **Redis TTL**: 30-90 days for static content
- **HTTP Headers**: Aggressive caching with stale-while-revalidate
- **Edge Caching**: Cloudflare integration for global performance

### Nuclear Static Files
Direct access to pre-generated static content:
```
GET /nuclear-static/{tmdbId}.json
```

Example:
```bash
curl "https://moviegenius.ai/nuclear-static/550.json"
```

## 🧪 Testing Endpoints

### Development Only

#### GET `/api/test-nuclear`
Test nuclear static generation for specific movies (development only).

#### POST `/api/validate-links` 
Validate movie links in analysis content (development only).

## 📈 Analytics & Monitoring

### Health Monitoring
```bash
# Check overall system health
curl "https://moviegenius.ai/api/health"

# Check nuclear system status
curl "https://moviegenius.ai/api/nuclear-status"

# Check cache performance
curl "https://moviegenius.ai/api/cache-status"
```

### Performance Metrics
- Response times tracked via Railway logs
- Cache hit rates monitored via Redis
- Analysis generation costs tracked per API call

## 🔄 Integration Examples

### React/Next.js Integration
```javascript
// Fetch movie analysis
const response = await fetch(`/api/movie-analysis?tmdbId=${tmdbId}`);
const data = await response.json();

// Search movies
const searchResponse = await fetch('/api/health', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'Fight Club' })
});
const searchData = await searchResponse.json();
```

### curl Examples
```bash
# Get movie analysis
curl "https://moviegenius.ai/api/movie-analysis?tmdbId=550"

# Search for movies
curl -X POST "https://moviegenius.ai/api/health" \
  -H "Content-Type: application/json" \
  -d '{"query": "Inception"}'

# Check nuclear system status
curl "https://moviegenius.ai/api/nuclear-status"

# Warm cache with popular movies
curl -X POST "https://moviegenius.ai/api/cache-warming" \
  -H "Content-Type: application/json" \
  -d '{"type": "popular", "limit": 100}'
```

---

*This API reference covers all public endpoints. For additional technical details, see the [Nuclear Static Generation Process](architecture/NUCLEAR_STATIC_GENERATION_PROCESS.md) and [Performance Analysis](architecture/PERFORMANCE-ANALYSIS.md) documentation.*

*Last updated: May 8, 2026*