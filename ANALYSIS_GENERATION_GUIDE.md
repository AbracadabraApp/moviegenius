# Movie Analysis Generation & Build System Guide

## Overview

The MovieGenius platform uses AI-powered movie analysis generation with multiple build strategies for optimal performance. This guide consolidates all analysis generation processes and documentation.

## Database Architecture

### Railway PostgreSQL (Production Database)
- **Connection**: `DATABASE_URL` environment variable
- **Total Analyses**: 21,275+ complete movie analyses (as of Aug 2025)
- **Analysis Type**: `'general'` (current schema uses this instead of `'page_analysis'`)
- **Creation Timeline**: Most analyses created August 13, 2025

### Schema Structure
```sql
-- Movies table
movies (
  id UUID PRIMARY KEY,
  tmdb_id INTEGER,
  title VARCHAR,
  year INTEGER,
  has_analysis BOOLEAN DEFAULT FALSE  -- Batch processing flag
)

-- Movie Analyses table  
movie_analyses (
  id UUID PRIMARY KEY,
  movie_id UUID REFERENCES movies(id),
  analysis_type VARCHAR DEFAULT 'general',
  claude_response JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Analysis Generation Scripts

### 1. Railway PostgreSQL Batch Processor ⭐ **PRIMARY SCRIPT**

**File**: `scripts/railway-batch-processor.js`

**Purpose**: Generate new movie analyses with updated prompts using Railway PostgreSQL database

**Key Features**:
- ✅ Railway PostgreSQL integration via `DATABASE_URL`
- ✅ Individual API mode (fast iteration)  
- ✅ Batch API mode (50% cost savings - fallback implementation)
- ✅ Progress tracking and resume capability
- ✅ Test mode with essential movies
- ✅ Production mode for full database processing

**Usage Examples**:
```bash
# Production analysis generation (recommended)
node scripts/railway-batch-processor.js --production --individual-api --count 1000

# Test with essential movies
node scripts/railway-batch-processor.js --test --individual-api

# Resume previous session
node scripts/railway-batch-processor.js --resume --individual-api

# Force reprocess existing analyses  
node scripts/railway-batch-processor.js --production --force-reprocess --count 100
```

**Arguments**:
- `--production`: Process all movies from Railway database needing analysis
- `--individual-api`: Fast iteration with immediate feedback (default)
- `--batch-api`: 50% cost savings using Claude Batch API 
- `--count N`: Limit processing to N movies
- `--test`: Use essential movies list for testing
- `--resume`: Resume from previous progress (default)
- `--restart`: Start fresh, ignoring previous progress
- `--force-reprocess`: Regenerate existing analyses

### 2. Original Supabase Batch Processor (Legacy)

**File**: `scripts/batch-processor.js`

**Status**: ❌ **OBSOLETE** - Uses Supabase instead of Railway PostgreSQL

**Issues**: 
- Uses `createClient` from `@supabase/supabase-js`
- Targets `analysis_type = 'page_analysis'` (schema mismatch)
- Cannot connect to Railway production database

**Replacement**: Use `scripts/railway-batch-processor.js` instead

### 3. Static File Generation Scripts

**Purpose**: Convert existing database analyses to static JSON files for faster serving

#### Multi-Source Static Generator
**File**: `scripts/multi-source-static-generator.js`
- **Database**: Railway PostgreSQL via `DATABASE_URL`
- **Output**: `/public/data/enhanced-movies/`
- **Function**: Pulls existing analyses, doesn't generate new ones
- **Usage**: `node scripts/multi-source-static-generator.js --all`

#### Nuclear Static Generators
**Files**: 
- `scripts/nuclear-static-generator.js`
- `scripts/nuclear-static-generator-v2.js`

**Output**: `/nuclear-static/` directory
**Function**: Static file generation with range support (`--start=N`)

## Analysis Generation Process

### Individual Movie Analysis Flow
1. **Input**: Movie TMDB ID
2. **Database Lookup**: Query `movies` table for movie details  
3. **Existing Check**: Check `movie_analyses` table for existing analysis
4. **Prompt Generation**: Use `buildPrompt('MOVIE_ANALYSIS')` 
5. **Claude API Call**: Generate analysis via Anthropic API
6. **Database Save**: Insert into `movie_analyses` with `analysis_type = 'general'`
7. **Cost Tracking**: Track input/output tokens and costs

### Batch Processing Flow  
1. **Movie Discovery**: Query Railway database for all movies needing analysis
2. **Filtering**: Remove movies with existing analyses (unless `--force-reprocess`)
3. **Batch Creation**: Group movies into batches of 50 (Claude API limit: 100)
4. **API Processing**: Submit to Claude Batch API or Individual API
5. **Result Processing**: Parse responses and extract analysis content  
6. **Database Storage**: Bulk insert results into `movie_analyses` table
7. **Progress Tracking**: Save progress to resume files

## Static Page Generation

### Current Architecture: 2-Tier System

#### Tier 1: Static JSON Files (Fastest)
- **Location**: `/public/data/production/movie_TMDBID.json`
- **Example**: `movie_550.json` (Fight Club)
- **Load Time**: <100ms
- **Content**: Pre-processed analysis with links, streaming data, trailers
- **Count**: ~6 enhanced static files exist (Aug 2025)

#### Tier 2: Dynamic Database Fallback
- **Source**: Railway PostgreSQL `movie_analyses` table
- **API**: `/api/movie-analysis?tmdbId=XXXX`
- **Processing**: Real-time content linking and formatting
- **Count**: 21,275+ analyses available

### Static File Structure
```json
{
  "tmdbId": 550,
  "title": "Fight Club", 
  "year": 1999,
  "lastUpdated": "2025-08-20T18:15:00Z",
  "analysis": {
    "raw_content": "...",
    "processed_content": "...",
    "featuredMovies": [...],
    "whyWatch": { "recommendation": "YES", "reasons": [...] },
    "moreIdeas": [...]
  }
}
```

## Analysis Content Processing

### Movie Linking System
**File**: `lib/analysis-movie-linker.js`
- **Function**: Converts movie mentions in text to clickable links
- **Database Integration**: Links to existing movies in Railway database
- **Output**: HTML with `<a href="/movie/TMDBID">Movie Title</a>` format

### Content Sections
1. **Raw Content**: Original Claude API response
2. **Processed Content**: Linked text with movie references
3. **Featured Movies**: Extracted MOVIES: lines with database lookups
4. **Why Watch**: Binary YES/NO recommendation with reasons
5. **More Ideas**: Related movie suggestions and topics

## Performance Optimization

### Cost Management
- **Individual API**: $0.003/1K input + $0.015/1K output tokens
- **Batch API**: 50% savings on Claude API costs
- **Prompt Caching**: 90% savings on repeated content (where applicable)
- **Target Limit**: $100 default cost limit with $80 warning threshold

### Processing Efficiency
- **Concurrency**: 2 parallel requests (configurable)
- **Batch Size**: 50 movies per batch (Claude limit: 100)  
- **Error Handling**: Exponential backoff with jitter
- **Resume Capability**: Progress files for interrupted sessions

## Current Status & Metrics

### Database Content (August 2025)
- **Total Analyses**: 21,275 in Railway PostgreSQL
- **Analysis Type**: `'general'` (current schema)
- **Creation Date**: Majority created August 13, 2025
- **Database**: Railway PostgreSQL via `DATABASE_URL`

### Static Files  
- **Enhanced Static**: ~6 files in `/public/data/production/`
- **Nuclear Static**: Various counts in `/nuclear-static/`
- **Target**: Convert all 21K+ analyses to static files for optimal performance

### Processing Capability
- **Script**: `railway-batch-processor.js` (Railway PostgreSQL compatible)
- **Mode**: Individual API (tested) + Batch API (fallback implementation)
- **Capacity**: Unlimited with cost controls and progress tracking

## Usage Recommendations

### For New Analysis Generation (Regenerate with New Prompts):
```bash
# Recommended: Production analysis with new prompts
node scripts/railway-batch-processor.js --production --individual-api --count 1000
```

### For Static File Generation (Convert Existing Analyses):
```bash  
# Convert existing Railway analyses to static files
node scripts/multi-source-static-generator.js --all --more-ideas
```

### For Testing:
```bash
# Test essential movies with new analysis generation
node scripts/railway-batch-processor.js --test --individual-api
```

## Integration Points

### API Endpoints
- `/api/movie-analysis?tmdbId=XXX` - Main analysis serving endpoint
- Checks static files first, falls back to Railway database
- Handles both cached and real-time analysis generation

### Components
- `MovieAnalysisWithEntities.js` - Main analysis display component
- `EnhancedFeaturedFilmsSection.js` - Movie recommendations display
- Movie linking components for content processing

### Database Services
- `lib/services/analysis-service.js` - Analysis retrieval and caching
- `lib/railway-db.js` - Railway PostgreSQL connection pool and services
- `lib/analysis-movie-linker.js` - Content processing and movie linking

## Migration Notes

### Schema Differences
- **Documentation**: Specifies `analysis_type = 'page_analysis'`  
- **Reality**: Railway database uses `analysis_type = 'general'`
- **Recommendation**: Update constraints and documentation to align with actual schema

### Script Evolution
- **Original**: `batch-processor.js` (Supabase-based, obsolete)
- **Current**: `railway-batch-processor.js` (Railway PostgreSQL compatible)
- **Future**: Full Batch API implementation for cost optimization

This guide consolidates all analysis generation processes and serves as the definitive reference for movie analysis build operations.