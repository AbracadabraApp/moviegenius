# 🔌 MovieGenius API Reference

This document provides a comprehensive reference for all MovieGenius API endpoints.

## 🚀 Base URLs

- **Production**: `https://moviegenius.ai`
- **Development**: `http://localhost:3000`

## 📡 Core API Endpoints

### Movie Analysis

#### GET `/api/movie-analysis`
Get or generate AI analysis for a specific movie.

**Parameters:**
- `tmdbId` (required): TMDB movie ID

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

*Last updated: July 24, 2025*