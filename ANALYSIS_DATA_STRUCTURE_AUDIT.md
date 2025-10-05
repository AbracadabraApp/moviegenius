# Analysis Data Structure Audit

**Date:** 2025-09-29
**Purpose:** Document all the ways "analysis" data is structured and used in the codebase

---

## 🗄️ Database Structure (Railway PostgreSQL)

### Table: `movie_analyses`

```sql
CREATE TABLE movie_analyses (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES movies(id),
  analysis_type VARCHAR(50),
  claude_response JSONB,
  query_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `claude_response` JSONB Structure

The `claude_response` field can contain multiple formats:

#### **Format 1: Raw Content (Legacy)**
```json
{
  "raw_content": "PARAGRAPH: Analysis text here...\nMOVIES: Title|Year|Description|Streaming",
  "generated_at": "2025-09-29T10:00:00Z",
  "cost_estimate": 0.05,
  "input_tokens": 1000,
  "output_tokens": 2000,
  "model": "claude-3-5-sonnet-20241022"
}
```

#### **Format 2: Raw Content with Links (Current)**
```json
{
  "raw_content": "PARAGRAPH: Analysis with <a href='/movie/550'>Fight Club</a> mentions...",
  "generated_at": "2025-09-29T10:00:00Z",
  "has_links": true,
  "linked_at": "2025-09-29T10:05:00Z",
  "cost_estimate": 0.05,
  "input_tokens": 1000,
  "output_tokens": 2000,
  "model": "claude-3-5-sonnet-20241022"
}
```

#### **Format 3: JSON Structured (New/Enhanced)**
```json
{
  "raw_content": "{\"content\": [{\"type\": \"text\", \"text\": \"Analysis here\", \"subhead\": \"Plot & Characters\"}], \"featuredMovies\": [...], \"whyWatch\": {...}, \"moreIdeas\": [...]}",
  "processed_content": "{\"content\": [{\"type\": \"text\", \"text\": \"Analysis with <a href='/movie/550'>links</a>\"}], \"featuredMovies\": [...]}",
  "generated_at": "2025-09-29T10:00:00Z",
  "has_links": true,
  "linked_at": "2025-09-29T10:05:00Z",
  "cost_estimate": 0.05,
  "input_tokens": 1000,
  "output_tokens": 2000,
  "model": "claude-3-5-sonnet-20241022"
}
```

---

## 📡 API Response Formats

### `/api/movie-analysis?tmdbId=550`

**Response Structure:**
```json
{
  "success": true,
  "analysis": "Content with or without links",
  "rawAnalysis": "Original content without links",
  "movie": {
    "title": "Fight Club",
    "year": 1999,
    "tmdb_id": 550
  },
  "cached": true,
  "source": "railway-postgresql",
  "hasLinks": true,
  "performance": {
    "total_time": 150,
    "movie_query_time": 50,
    "analysis_query_time": 100
  }
}
```

**Content Variants:**
- `analysis`: Processed content (with HTML links if available)
- `rawAnalysis`: Original raw_content from database

---

## 🎨 Component Data Expectations

### `MovieAnalysisWithEntities.js`

**Expected Props:**
```javascript
{
  analysis: {
    claude_response: {
      raw_content: "string (text or JSON)",
      processed_content: "string (optional, with HTML links)"
    },
    entity_linking_data: {
      entityData: {
        featuredMovies: [...],
        people: [...]
      },
      processedAt: "ISO timestamp"
    },
    isJsonFormat: boolean,
    jsonData: {
      content: [...],
      featuredMovies: [...],
      whyWatch: {...},
      moreIdeas: [...],
      exploreTopics: [...]
    }
  },
  movie: {
    id: number,
    title: string,
    year: number,
    tmdb_id: number
  }
}
```

**Processing Logic:**
1. Check if `raw_content` is JSON string → Parse to `jsonData`
2. If JSON, use `renderJsonAnalysis()`
3. If text, use `parseModernAnalysisContent()` for legacy format

---

## 🔗 Linking System Integration Points

### `movie-analysis-linker.js`

**Function:** `processAnalysisContent(content, currentMovieTitle, context, rawContent, options)`

**Input:**
- `content`: Text content to process
- `currentMovieTitle`: Current movie title (for self-reference prevention)
- `context`: Description for logging
- `rawContent`: Full raw content (for KEY_CONTRIBUTORS extraction)
- `options`: `{ processMovies: true, processContributors: true }`

**Output:**
- Text with HTML links: `<a href="/movie/123" class="movie-title">Movie Title</a>`
- Contributor links: `<a href="/person/456" class="person-name">Director Name</a>`

**Link Patterns Detected:**
- `**Movie Title** (Year)` → Movie link
- `**Movie Title**` → Movie link (no year)
- Contributor names from `KEY_CONTRIBUTORS:` line → Person links

---

## 📊 Data Flow Diagram

```
1. Claude API Response (raw text)
   ↓
2. Database Storage (raw_content in JSONB)
   ↓
3. Link Processing (movie-analysis-linker.js)
   ↓
4. Updated Database (raw_content with HTML links, has_links=true)
   ↓
5. API Response (analysis field with links)
   ↓
6. Component Rendering (EntityLinkedText or dangerouslySetInnerHTML)
```

---

## 🔍 Analysis Content Types by Location

### **Database (`movie_analyses.claude_response`)**
- ✅ **`raw_content`**: Always present, can be text or JSON string
- ⚠️ **`processed_content`**: Optional, used for JSON format with pre-processed links
- ✅ **`has_links`**: Boolean flag indicating if content has been processed
- ✅ **`linked_at`**: Timestamp when links were added
- ✅ **`generated_at`**: Timestamp when analysis was created
- ✅ **Cost/token metadata**: `cost_estimate`, `input_tokens`, `output_tokens`, `model`

### **API Responses**
- ✅ **`analysis`**: Primary content field (processed with links if available)
- ✅ **`rawAnalysis`**: Backup/original content without links
- ⚠️ **`hasLinks`**: Boolean indicating if analysis contains HTML links
- ⚠️ **`entityData`**: Legacy field for old entity linking system

### **Component State**
- ✅ **`processedAnalysis`**: Component-level processed state
- ✅ **`isJsonFormat`**: Flag for JSON vs text format
- ✅ **`jsonData`**: Parsed JSON structure if format is JSON
- ⚠️ **`entities`**: Legacy entity data from old linking system

---

## 🎯 Current State Summary

### ✅ **Working Systems**
1. **Database storage** with `raw_content` in JSONB format
2. **Link processing** for movie titles `**Movie** (Year)` patterns
3. **Contributor linking** using `KEY_CONTRIBUTORS:` metadata
4. **API integration** in `/api/movie-analysis` endpoint
5. **Component rendering** via `EntityLinkedText` and `dangerouslySetInnerHTML`

### ⚠️ **Inconsistencies Found**
1. **Multiple naming conventions**: `raw_content`, `rawAnalysis`, `analysis`, `processed_content`
2. **Format detection logic**: Scattered across multiple files
3. **Link processing timing**: Sometimes at API level, sometimes at component level
4. **JSON vs Text handling**: Different code paths with duplicated logic

### ❌ **Not Currently Working**
1. **Static file linking**: Enhanced static files don't have pre-processed links
2. **Contributor links in browser**: Person linking only works in Node.js context
3. **Batch link processing**: No automated system to add links to existing analyses

---

## 🚀 Recommended Standardization

### **Unified Field Naming Convention**

```javascript
// Database (JSONB structure)
{
  content: {
    raw: "Original Claude response without links",
    processed: "Content with HTML links added",
    format: "text" | "json"
  },
  metadata: {
    generated_at: "ISO timestamp",
    linked_at: "ISO timestamp",
    has_links: boolean,
    cost_estimate: number,
    tokens: { input: number, output: number },
    model: string
  }
}

// API Response
{
  analysis: {
    content: "Processed content with links",
    rawContent: "Original content without links",
    format: "text" | "json",
    hasLinks: boolean
  },
  movie: { title, year, tmdb_id },
  cached: boolean,
  performance: { ... }
}

// Component Props
{
  analysis: {
    content: "Processed content to render",
    format: "text" | "json",
    hasLinks: boolean,
    jsonData: { ... } // if format is json
  },
  movie: { id, title, year, tmdb_id }
}
```

---

## 📝 Migration Path

### **Phase 1: API Layer** ✅ COMPLETED
- [x] Add link processing to `/api/movie-analysis`
- [x] Return both `analysis` (with links) and `rawAnalysis` (without)
- [x] Add `hasLinks` flag to response

### **Phase 2: Component Layer** 🔄 IN PROGRESS
- [ ] Verify `EntityLinkedText` handles HTML links correctly
- [ ] Test with various movie pages
- [ ] Ensure no XSS vulnerabilities with `dangerouslySetInnerHTML`

### **Phase 3: Database Migration** 📅 FUTURE
- [ ] Standardize field naming across all records
- [ ] Add migration script to update existing analyses
- [ ] Add database indexes for `has_links` flag

### **Phase 4: Static File Generation** 📅 FUTURE
- [ ] Integrate link processing into nuclear static generation
- [ ] Pre-process links at build time for enhanced static files
- [ ] Update enhanced static format to include `processed_content`

---

## 🔧 Code Locations

### **Core Files**
- `/lib/movie-analysis-linker.js` - Main linking system
- `/pages/api/movie-analysis.js` - API endpoint with link processing
- `/components/MovieAnalysisWithEntities.js` - Analysis rendering component
- `/components/EntityLinkedText.js` - Text rendering with HTML link support

### **Supporting Files**
- `/lib/services/analysis-service.js` - Analysis generation and management
- `/lib/railway-db.js` - Database access layer
- `/lib/prompts/builder.js` - Claude prompt configuration

### **Test/Utility Files**
- `/link-movies-1-100.js` - Batch link processing script
- `/find_html_links.js` - Link detection utility
- `/check-raw-content.cjs` - Content structure validation

---

**Last Updated:** 2025-09-29
**Maintainer:** MovieGenius Engineering Team