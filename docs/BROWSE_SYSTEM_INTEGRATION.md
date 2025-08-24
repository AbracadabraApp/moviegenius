# Browse System Integration Guide

This document outlines how the Browse Build Process and Production Browse System work together to deliver curated movie collections to users.

## System Relationship

```
[Build Process] → [Quality Filter] → [Production System] → [User Interface]
```

The two systems are **architecturally separate** but **data dependent**:
- **Build Process**: Generates raw thematic collections 
- **Production System**: Serves filtered, high-quality collections to users

## Data Pipeline

### Stage 1: Build Generation
**Input**: Genre movies (e.g., 9,531 Drama movies)  
**Process**: AI-powered thematic analysis  
**Output**: Raw collections (e.g., 847 Drama collections)

```json
// Build output example
{
  "category": "Drama",
  "totalLists": 847,
  "allLists": [
    {
      "name": "Family Secrets Unveiled",
      "movieIds": ["uuid1", "uuid2", "uuid3"] // 3 movies - too small
    },
    {
      "name": "Corporate Corruption Thrillers", 
      "movieIds": ["uuid4", "uuid5", ...] // 12 movies - production ready
    }
  ]
}
```

### Stage 2: Quality Filtering
**Filter criteria**: Collections with ≥6 movies  
**Musical example**: 501 raw collections → ~95 production collections

```javascript
// Filtering logic
const productionReady = buildOutput.allLists.filter(collection => 
  collection.movieIds.length >= 6
);

// Result: 847 raw Drama collections → ~150 production Drama collections
```

### Stage 3: Production Transformation  
**Process**: Convert filtered collections to production database format
**Components**: Generate UUIDs, descriptions, relevance scores

```sql
-- Production database structure
INSERT INTO browse_lists (id, title, description, total_movies) 
VALUES ('uuid-123', 'Corporate Corruption Thrillers', '...', 12);

INSERT INTO list_movies (list_id, movie_id, relevance_score, display_order)
VALUES ('uuid-123', 'movie-db-id-1', 0.95, 1);
```

### Stage 4: User Interface Integration
**Movie pages**: Display browse collection membership  
**Browse pages**: Display collection contents and navigation

## Transformation Process

### Data Format Conversion

#### Build Format
```json
{
  "name": "Neo-Noir Masterpieces",
  "movieIds": ["550e8400-e29b", "6ba7b810-9dad", ...],
  "createdAt": "2025-08-21T10:00:00Z"
}
```

#### Production Format  
```javascript
{
  id: "browse-uuid-123",
  title: "Neo-Noir Masterpieces",
  description: "Modern takes on classic film noir themes and aesthetics...",
  total_movies: 18,
  status: "active",
  movies: [
    {
      movie_id: "db-id-1", // Database UUID, not build UUID
      tmdb_id: 680,
      title: "Pulp Fiction", 
      relevance_score: 0.98,
      display_order: 1
    }
  ]
}
```

### UUID Mapping Challenge
**Issue**: Build process uses categorization UUIDs, production uses database UUIDs

**Solution**: Transformation script maps UUIDs during conversion
```javascript
// Map build UUIDs to database IDs
const movieMapping = await queryDatabase(`
  SELECT id as db_id, tmdb_id, title, year 
  FROM movies 
  WHERE id = ANY($1::uuid[])
`, buildMovieUuids);
```

## File Organization

### Build Process Files
```
/build-system/
├── browse-collection-generator.js    # Main build processor
├── genre-browse-automation.js        # Multi-genre orchestration
└── build-outputs/
    ├── drama-build-lists.json        # Raw Drama collections
    ├── comedy-build-lists.json       # Raw Comedy collections
    └── musical-build-lists.json      # Raw Musical collections
```

### Production System Files
```  
/production-system/
├── build-to-production-transformer.js   # Build → Production conversion
├── pages/api/movie-browse-lists.js      # Movie page API
├── pages/api/browse-list-movies.js      # Browse page API
└── docs/
    ├── PRODUCTION_BROWSE_SYSTEM.md      # Production system docs
    └── BROWSE_BUILD_PROCESS.md          # Build process docs
```

## Workflow Integration

### Development Workflow
```bash
# 1. Generate build data for genre
node browse-collection-generator.js Musical

# 2. Transform to production (after quality review)  
node build-to-production-transformer.js --genre=Musical

# 3. Test production APIs
curl "/api/movie-browse-lists?tmdbId=12345"
curl "/api/browse-list-movies?listId=uuid-123"

# 4. Deploy to production
npm run deploy:browse-system
```

### Production Deployment
```bash
# Build generation (background process)
node genre-browse-automation.js --genres="Comedy,Drama,Horror"

# Quality review (manual step)
node analyze-build-quality.js --genre=Drama

# Production transformation (automated)
node build-to-production-transformer.js --batch --all-genres

# Database deployment
node deploy-browse-collections.js --environment=production
```

## API Integration Points

### Movie Page Integration
```javascript
// Movie component fetches browse collections
useEffect(() => {
  async function loadBrowseCollections() {
    const response = await fetch(`/api/movie-browse-lists?tmdbId=${movie.tmdb_id}`);
    const data = await response.json();
    setBrowseCollections(data.browse_lists);
  }
  
  loadBrowseCollections();
}, [movie.tmdb_id]);

// Render browse collection links
{browseCollections.map(collection => (
  <BrowseCollectionLink 
    key={collection.id}
    id={collection.id} 
    title={collection.title}
    relevance={collection.relevance_score}
  />
))}
```

### Browse Page Integration
```javascript
// Browse page loads collection movies
useEffect(() => {
  async function loadCollectionMovies() {
    const response = await fetch(
      `/api/browse-list-movies?listId=${collectionId}&limit=24`
    );
    const data = await response.json();
    setCollection(data.browse_list);
    setMovies(data.movies);
  }
  
  loadCollectionMovies();
}, [collectionId]);

// Render collection with movie grid
<CollectionHeader 
  title={collection.title}
  description={collection.description}
  totalMovies={collection.total_movies}
/>
<MovieGrid movies={movies} />
```

## Quality Assurance

### Build Quality Metrics
```javascript
// Analyze build output quality
const buildAnalysis = {
  totalCollections: buildData.allLists.length,
  averageCollectionSize: calculateAverageSize(buildData.allLists),
  sizeDistribution: {
    tooSmall: buildData.allLists.filter(list => list.movieIds.length < 6).length,
    productionReady: buildData.allLists.filter(list => list.movieIds.length >= 6).length,
    large: buildData.allLists.filter(list => list.movieIds.length >= 20).length
  }
};
```

### Production Quality Validation
```sql
-- Validate production data integrity
SELECT 
  COUNT(*) as total_collections,
  AVG(total_movies) as avg_collection_size,
  MIN(total_movies) as min_size,
  MAX(total_movies) as max_size
FROM browse_lists 
WHERE status = 'active';

-- Check for orphaned movies (should return 0)
SELECT COUNT(*) as orphaned_movies
FROM list_movies lm
LEFT JOIN browse_lists bl ON lm.list_id = bl.id
WHERE bl.id IS NULL;
```

## Monitoring & Alerting

### Build Process Monitoring
- **Processing rate**: Movies processed per hour
- **Cost tracking**: API expenses per genre
- **Error rates**: Failed movie assignments
- **Quality metrics**: Collections passing production filter

### Production System Monitoring  
- **API performance**: Response times for movie/browse endpoints
- **Database health**: Query performance and connection status
- **Content freshness**: Last update timestamps
- **User engagement**: Collection access patterns

### Alert Conditions
```javascript
// Build process alerts
if (processingRate < minimumExpectedRate) {
  alert("Build processing slower than expected");
}

if (errorRate > 5) {
  alert("High error rate in build process");  
}

// Production system alerts
if (apiResponseTime > 500) {
  alert("Slow API response times detected");
}

if (databaseConnectionErrors > 0) {
  alert("Database connectivity issues");
}
```

## Maintenance Procedures

### Regular Maintenance
1. **Weekly**: Review build quality metrics
2. **Monthly**: Analyze production collection performance  
3. **Quarterly**: Archive low-engagement collections
4. **As needed**: Rebuild collections for major catalog updates

### Emergency Procedures
1. **Build failure**: Restart from last checkpoint using progress files
2. **API outage**: Verify database connectivity and restart services
3. **Data corruption**: Restore from backup and replay recent changes
4. **Performance degradation**: Check database indexes and query performance

This integrated system provides a robust pipeline from AI-generated thematic collections to user-facing browse functionality, with clear separation of concerns and comprehensive quality controls.