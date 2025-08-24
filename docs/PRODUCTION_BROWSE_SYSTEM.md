# Production Browse System

The Production Browse System provides curated thematic movie collections for user discovery and exploration. This system serves as the final, user-facing layer of browse collections displayed throughout the application.

## System Overview

The Production Browse System is **separate** from the Browse Build Process. Build processes generate raw thematic lists, while the Production Browse System serves filtered, high-quality collections to users.

### Key Principles

- **Quality over quantity**: Only collections with ≥6 movies
- **User-focused**: Optimized for discovery and exploration
- **Performance-first**: Fast lookups for movie pages and browse pages
- **Genre-organized**: Collections organized within genre contexts

## Database Schema

### Core Tables

#### `browse_lists`
Primary table for production browse collections.

```sql
CREATE TABLE browse_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    total_movies INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `list_movies`  
Many-to-many relationship between browse collections and movies.

```sql
CREATE TABLE list_movies (
    list_id UUID REFERENCES browse_lists(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) NOT NULL,
    display_order INTEGER,
    added_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (list_id, movie_id)
);
```

### Performance Indexes

```sql
-- Movie → Browse Collections lookup
CREATE INDEX idx_movie_to_browse ON list_movies(movie_id);

-- Browse Collection → Movies lookup  
CREATE INDEX idx_browse_to_movies ON list_movies(list_id, display_order);

-- Browse title search
CREATE INDEX idx_browse_title_search ON browse_lists USING gin(to_tsvector('english', title));

-- Active collections only
CREATE INDEX idx_browse_active ON browse_lists(status) WHERE status = 'active';
```

## API Endpoints

### Movie Browse Collections
**Endpoint**: `GET /api/movie-browse-lists`  
**Purpose**: Return browse collections for a specific movie

```javascript
// Query: What browse collections is this movie in?
GET /api/movie-browse-lists?tmdbId=12345

// Response:
{
  "success": true,
  "tmdb_id": 12345,
  "browse_lists": [
    {
      "id": "uuid-123",
      "title": "Neo-Noir Masterpieces", 
      "description": "Modern takes on classic film noir...",
      "total_movies": 24,
      "relevance_score": 0.95
    }
  ],
  "count": 3,
  "query_time_ms": 15
}
```

### Browse Collection Movies
**Endpoint**: `GET /api/browse-list-movies`  
**Purpose**: Return movies in a specific browse collection

```javascript
// Query: What movies are in this browse collection?
GET /api/browse-list-movies?listId=uuid-123&limit=20&offset=0

// Response:
{
  "success": true,
  "browse_list": {
    "id": "uuid-123",
    "title": "Neo-Noir Masterpieces",
    "description": "Modern takes on classic film noir...",
    "total_movies": 24
  },
  "movies": [
    {
      "tmdb_id": 680,
      "title": "Pulp Fiction",
      "year": 1994,
      "relevance_score": 0.98,
      "display_order": 1
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 24
  }
}
```

## Data Flow

### Input Sources
Production browse collections are populated from filtered build data:

1. **Build Process Output**: Raw thematic lists (e.g., 501 Musical lists)
2. **Quality Filtering**: Remove lists with <6 movies
3. **Data Transformation**: Convert to production format
4. **Database Population**: Insert into production schema

### Lookup Patterns

#### Movie Page Integration
```javascript
// Movie component loads browse collections
const response = await fetch(`/api/movie-browse-lists?tmdbId=${movie.tmdb_id}`);
const { browse_lists } = await response.json();

// Display: "This movie appears in 3 browse collections"
browse_lists.forEach(list => {
  renderBrowseLink(list.title, list.id);
});
```

#### Browse Page Integration  
```javascript
// Browse page loads collection movies
const response = await fetch(`/api/browse-list-movies?listId=${listId}`);
const { browse_list, movies } = await response.json();

// Display: Collection title + movie grid
renderCollectionHeader(browse_list.title, browse_list.description);
renderMovieGrid(movies);
```

## Quality Standards

### Collection Criteria
- **Minimum size**: 6 movies per collection
- **Thematic coherence**: Clear, focused theme
- **Unique value**: Distinct from other collections
- **User utility**: Valuable for discovery

### Performance Requirements
- **Movie lookup**: <50ms average response time
- **Collection lookup**: <100ms average response time  
- **Search queries**: <200ms average response time
- **Database size**: Support 1000+ active collections

## Content Management

### Collection Lifecycle
1. **Active**: User-facing, appears in searches and recommendations
2. **Draft**: Under review, not user-facing
3. **Archived**: Removed from user interface, data preserved
4. **Merged**: Combined with another collection

### Maintenance Operations
- **Quality review**: Periodic assessment of collection relevance
- **Performance monitoring**: Query performance tracking
- **Content updates**: Addition/removal of movies from collections
- **Collection merging**: Combine similar or overlapping collections

## Integration Points

### Movie Pages
Movie pages query their browse collection membership and display:
- "Featured in X collections" summary
- Links to relevant browse collections
- Contextual collection recommendations

### Browse/Discovery Pages
Browse pages use production collections for:
- Genre-based collection browsing
- Thematic exploration paths
- User discovery recommendations
- Search result organization

### Search Integration
Browse collections enhance search through:
- Collection title matching
- Semantic theme discovery
- Related collection suggestions
- Advanced filtering options

## Monitoring & Analytics

### Key Metrics
- **Collection usage**: View counts per collection
- **Discovery effectiveness**: Click-through rates from movie pages
- **Search performance**: Query response times
- **Content quality**: User engagement per collection

### Health Checks
- **Database connectivity**: Connection pool status
- **Query performance**: Slow query detection
- **Data integrity**: Collection-movie relationship validation
- **Content freshness**: Last update timestamps

## Future Enhancements

### Planned Features
- **User ratings**: Allow users to rate collection quality
- **Personalization**: Customized collection recommendations
- **Dynamic collections**: Algorithm-generated collections
- **Collection sharing**: User-shareable collection links

### Scalability Considerations
- **Caching layer**: Redis for frequently accessed collections
- **CDN integration**: Static collection metadata
- **Database sharding**: Horizontal scaling for large datasets
- **Read replicas**: Separate read/write database instances