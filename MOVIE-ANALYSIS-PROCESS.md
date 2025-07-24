# Movie Analysis Process

## Overview

The Movie Analysis system generates AI-powered film analysis using Claude API and integrates movie references with our database. The system supports both individual movie analysis and bulk batch processing.

## Database Architecture

### Movies Table
- `id` - Primary key
- `title` - Movie title
- `year` - Release year
- `tmdb_id` - TMDB identifier
- `slug` - Marketing tagline
- `poster_url` - Poster image URL
- `streaming_data` - Streaming availability
- `has_analysis` - Boolean flag for batch processing tracking

### Movie Analyses Table
- `id` - Primary key
- `movie_id` - Foreign key to movies table
- `analysis_type` - Type of analysis ('page_analysis')
- `content` - Generated analysis content
- `created_at` - Timestamp

## Individual Analysis Process

### 1. Movie Discovery
- User visits `/movie/[tmdb_id]`
- System checks local database first
- Falls back to TMDB API if not found
- Creates basic movie entry if discovered via TMDB

### 2. Analysis Generation
- `AnalysisService.getOrGenerate()` checks for cached analysis
- If none exists, generates new analysis via Claude API
- Analysis includes text sections and movie recommendations
- Movie references are processed and linked to database entries

### 3. Content Processing
- `processAnalysisContent()` identifies movie mentions in text
- Movie titles are linked to database entries where possible
- Enhanced Featured Films section combines MOVIES: lines and **bold** references
- Content is split at SUBHEAD boundaries for proper formatting

## Bulk Processing System

### 1. Candidate Identification
Movies eligible for bulk processing have:
- `has_analysis = FALSE` (never been processed)
- No existing entries in `movie_analyses` table
- Valid TMDB data for analysis generation

### 2. Batch Processing Flag Management
```sql
-- Add has_analysis column
ALTER TABLE movies ADD COLUMN has_analysis BOOLEAN DEFAULT FALSE;

-- Mark existing movies with analysis
UPDATE movies 
SET has_analysis = TRUE 
WHERE id IN (
  SELECT DISTINCT movie_id 
  FROM movie_analyses 
  WHERE analysis_type = 'page_analysis'
);
```

### 3. Batch Processing Workflow
1. **Query Candidates**: Find movies with `has_analysis = FALSE`
2. **Generate Analysis**: Use Claude Batch API for 50% cost savings
3. **Process Content**: Apply movie linking and content processing
4. **Store Results**: Save to `movie_analyses` table
5. **Update Flag**: Set `has_analysis = TRUE` when complete

### 4. Zero-Waste Architecture
- Prevents continuous regeneration of existing content
- Cached analysis is served immediately
- New analysis only generated for unprocessed movies
- Nuclear static files provide fastest serving for popular movies

## API Endpoints

### `/api/movie-analysis`
- Query parameter: `tmdbId`
- Returns existing analysis or generates new if missing
- Handles both cached and real-time generation

### `/api/admin/add-has-analysis-column`
- Admin endpoint for batch flag management
- Adds `has_analysis` column and syncs with existing data
- Returns statistics on processing candidates

## Files and Components

### Core Services
- `lib/services/analysis-service.js` - Main analysis logic
- `lib/services/database-search.js` - Movie database operations
- `lib/movie-analysis-linker.js` - Content processing and movie linking

### Database Scripts
- `sql/add_has_analysis_column.sql` - Batch flag setup
- `scripts/add-has-analysis-column.js` - Node.js batch management

### Page Components
- `pages/movie/[id].js` - Movie detail page with SSG
- `components/EnhancedFeaturedFilmsSection.js` - Integrated movie display

## Performance Considerations

### Cost Optimization
- Claude Batch API provides 50% cost savings for bulk processing
- Cached analysis prevents redundant API calls
- Nuclear static files for fastest page loads

### Database Efficiency
- `has_analysis` flag enables efficient candidate queries
- Indexed TMDB IDs for fast lookups
- Batch processing reduces individual API overhead

## Current Status

- **Total Movies**: ~17K+ in database
- **Movies with Analysis**: Several thousand processed
- **Batch Candidates**: Movies with `has_analysis = FALSE`
- **Processing Rate**: Optimized for bulk operations via Batch API

## Next Steps

1. **Batch Script Development**: Create automated bulk processing script
2. **Flag Synchronization**: Ensure `has_analysis` accurately reflects analysis state
3. **Monitoring**: Track processing progress and success rates
4. **Optimization**: Fine-tune batch sizes and processing intervals