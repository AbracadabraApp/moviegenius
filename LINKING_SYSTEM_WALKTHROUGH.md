# Linking System Walkthrough - Database Interaction Flow

**Date:** 2025-09-29
**Purpose:** Visual guide to how movie-analysis-linker.js interacts with the database

---

## 📊 Database Schema: `movie_analyses` Table

```sql
CREATE TABLE movie_analyses (
  id                      UUID PRIMARY KEY,
  movie_id                UUID REFERENCES movies(id),
  query_text              TEXT,
  claude_response         JSONB,           -- ⭐ Main content field
  analysis_type           VARCHAR,

  -- Link tracking fields
  has_links               BOOLEAN,          -- ⭐ Link processed flag
  linked_at               TIMESTAMP,        -- ⭐ When links were added
  link_count              INTEGER,          -- ⭐ Number of links added

  -- Enhanced format fields
  enhanced_sections       JSONB,
  enhanced_key_elements   JSONB,
  enhanced_format         BOOLEAN,
  enhanced_processed_at   TIMESTAMP,

  created_at              TIMESTAMP,
  updated_at              TIMESTAMPTZ
);
```

---

## 🎯 The `claude_response` JSONB Structure

This is the **main content container**. It stores the analysis in different states:

### **State 1: Fresh from Claude (No Links)**
```json
{
  "raw_content": "PARAGRAPH: **Fight Club** (1999) explores toxic masculinity...\n\nMOVIES: The Matrix|1999|Mind-bending reality questioning\n\nPARAGRAPH: Director **David Fincher** creates...\n\nKEY_CONTRIBUTORS: Director: David Fincher, Star: Brad Pitt, Star: Edward Norton",
  "generated_at": "2025-09-29T10:00:00Z",
  "cost_estimate": 0.05,
  "input_tokens": 1000,
  "output_tokens": 2000,
  "model": "claude-3-5-sonnet-20241022"
}
```

### **State 2: After Link Processing**
```json
{
  "raw_content": "PARAGRAPH: <a href=\"/movie/550\" class=\"movie-title\" data-tmdb-id=\"550\">Fight Club</a> (1999) explores toxic masculinity...\n\nMOVIES: The Matrix|1999|Mind-bending reality questioning\n\nPARAGRAPH: Director <a href=\"/person/7467\" class=\"person-name\">David Fincher</a> creates...\n\nKEY_CONTRIBUTORS: Director: David Fincher, Star: Brad Pitt, Star: Edward Norton",
  "generated_at": "2025-09-29T10:00:00Z",
  "linked_at": "2025-09-29T10:05:00Z",
  "has_links": true,
  "cost_estimate": 0.05,
  "input_tokens": 1000,
  "output_tokens": 2000,
  "model": "claude-3-5-sonnet-20241022"
}
```

**Key Changes:**
- `**Fight Club**` → `<a href="/movie/550">Fight Club</a>`
- `Director **David Fincher**` → `Director <a href="/person/7467">David Fincher</a>`
- Added `linked_at` timestamp
- Added `has_links: true` flag

---

## 🔄 Complete Flow: From Database to Browser

### **Step 1: User Requests Movie Page**
```
Browser → GET /movie/550 → Next.js Page Component
```

### **Step 2: Page Fetches Analysis**
```javascript
// pages/movie/[id].js (line 166)
const analysisResponse = await fetch(`/api/movie-analysis?tmdbId=${finalMovieId}`);
```

### **Step 3: API Queries Database**
```javascript
// pages/api/movie-analysis.js (line 134)
const analysis = await MovieService.getMovieAnalysis(movie.id);

// This queries:
SELECT claude_response, has_links, linked_at
FROM movie_analyses
WHERE movie_id = '...' AND analysis_type = 'movie_analysis'
```

**Database Returns:**
```json
{
  "claude_response": {
    "raw_content": "PARAGRAPH: **Fight Club** (1999)..."
  },
  "has_links": false,
  "linked_at": null
}
```

### **Step 4: API Processes Links** ⭐ NEW!
```javascript
// pages/api/movie-analysis.js (line 309)
processedContent = await processAnalysisContent(
  analysisContent,              // Input: "**Fight Club** (1999)..."
  movie.title,                  // Current movie: "Fight Club"
  `API response for TMDB ${tmdbId}`,
  analysisContent,              // Full content for KEY_CONTRIBUTORS
  {
    processMovies: true,        // Enable movie linking
    processContributors: true   // Enable person linking
  }
);
```

### **Step 5: Link Processing Deep Dive**

#### **5a. Extract Movie Mentions**
```javascript
// lib/movie-analysis-linker.js (line 30-85)
function extractMovieMentions(content) {
  // Pattern 1: **Movie Title** (Year)
  const boldWithYearPattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;

  // Pattern 2: **Movie Title** (no year)
  const boldWithoutYearPattern = /\*\*([^*]+)\*\*/g;
}
```

**Finds:**
```javascript
[
  {
    original: "**Fight Club** (1999)",
    title: "Fight Club",
    year: 1999,
    type: "bold_with_year"
  },
  {
    original: "**The Matrix**",
    title: "The Matrix",
    year: null,
    type: "bold_without_year"
  }
]
```

#### **5b. Database Lookup for Each Mention**
```javascript
// lib/movie-analysis-linker.js (line 92-130)
async function lookupMovieInDB(title, year = null) {
  // Query 1: Exact title + year match
  const exactMovie = await MovieService.getMovie(title, year);

  // Query 2: Fuzzy title match (if no year)
  SELECT tmdb_id, title, year, poster_url
  FROM movies
  WHERE LOWER(title) = LOWER($1)
  ORDER BY year DESC
  LIMIT 1
}
```

**Returns:**
```javascript
{
  tmdb_id: 550,
  title: "Fight Club",
  year: 1999,
  poster_url: "https://image.tmdb.org/t/p/w500/..."
}
```

#### **5c. Extract Contributors from KEY_CONTRIBUTORS**
```javascript
// lib/movie-analysis-linker.js (line 177-210)
function extractContributorsFromKeyElements(rawContent) {
  // Parse: "KEY_CONTRIBUTORS: Director: David Fincher, Star: Brad Pitt"
  const keyElementsMatch = rawContent.match(/KEY_CONTRIBUTORS:\s*(.*?)(?:\n|$)/);

  // Returns:
  [
    { name: "David Fincher", role: "director" },
    { name: "Brad Pitt", role: "star" },
    { name: "Edward Norton", role: "star" }
  ]
}
```

#### **5d. Database Lookup for Contributors**
```javascript
// lib/movie-analysis-linker.js (line 136-149)
async function lookupPersonInDB(name) {
  return await PersonService.getPersonByName(name);

  // Queries:
  SELECT id, name, tmdb_id
  FROM people
  WHERE LOWER(name) = LOWER($1)
  LIMIT 1
}
```

**Returns:**
```javascript
{
  id: 7467,
  name: "David Fincher",
  tmdb_id: 7467
}
```

#### **5e. Replace Text with HTML Links**
```javascript
// lib/movie-analysis-linker.js (line 329-378)
for (const mention of mentions) {
  // Skip self-references
  if (mention.title === currentMovieTitle) {
    processedContent = processedContent.replace(
      mention.original,
      `${mention.title} (${mention.year})` // Strip ** only
    );
    continue;
  }

  // Create link
  const link = `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a> (${mention.year})`;

  processedContent = processedContent.replace(mention.original, link);
}
```

### **Step 6: API Returns Processed Content**
```javascript
// pages/api/movie-analysis.js (line 341-358)
return res.json({
  success: true,
  analysis: processedContent,        // ⭐ WITH LINKS
  rawAnalysis: analysisContent,      // Original without links
  movie: { title, year, tmdb_id },
  hasLinks: true,                    // ⭐ Flag for component
  cached: true,
  source: 'railway-postgresql'
});
```

### **Step 7: Component Renders Links**
```javascript
// components/MovieAnalysisWithEntities.js (line 913-920)
const hasHtmlLinks = section.text && section.text.includes('<a href=');

if (hasHtmlLinks) {
  // Render HTML directly
  <div dangerouslySetInnerHTML={{ __html: section.text }} />
} else {
  // Use EntityLinkedText for fallback
  <EntityLinkedText text={section.text} />
}
```

### **Step 8: Browser Shows Clickable Links**
```html
<div class="analysis-section">
  <p>
    <a href="/movie/550" class="movie-title" data-tmdb-id="550">Fight Club</a> (1999)
    explores toxic masculinity through the lens of
    director <a href="/person/7467" class="person-name">David Fincher</a>...
  </p>
</div>
```

---

## 🔍 Database Interaction Points

### **Read Operations (3 types)**

1. **Get Analysis**
```sql
-- API queries for existing analysis
SELECT claude_response, has_links, linked_at, link_count
FROM movie_analyses
WHERE movie_id = $1 AND analysis_type = 'movie_analysis'
```

2. **Lookup Movie for Linking**
```sql
-- During link processing
SELECT tmdb_id, title, year, poster_url
FROM movies
WHERE LOWER(title) = LOWER($1) AND year = $2
```

3. **Lookup Person for Linking**
```sql
-- During contributor linking
SELECT id, name, tmdb_id
FROM people
WHERE LOWER(name) = LOWER($1)
```

### **Write Operations (2 types)**

1. **Save Fresh Analysis**
```sql
-- After Claude API call
INSERT INTO movie_analyses (
  movie_id,
  analysis_type,
  claude_response,
  query_text
) VALUES ($1, $2, $3, $4)
```

2. **Update with Links** (Currently in API, could be batch)
```sql
-- After link processing
UPDATE movie_analyses
SET
  claude_response = $1,  -- Updated with HTML links
  has_links = true,
  linked_at = NOW(),
  link_count = $2
WHERE movie_id = $3 AND analysis_type = 'movie_analysis'
```

---

## 🎯 Key Differences: Before vs After

### **Before (Without Linking)**
```
Database: raw_content = "**Movie** (Year)"
    ↓
API: Returns raw_content unchanged
    ↓
Component: Renders plain text "Movie (Year)"
    ↓
Browser: Shows unclickable text
```

### **After (With Linking)**
```
Database: raw_content = "**Movie** (Year)"
    ↓
API: Processes links → "<a href='/movie/123'>Movie</a> (Year)"
    ↓
Component: Detects HTML, uses dangerouslySetInnerHTML
    ↓
Browser: Shows clickable link to /movie/123
```

---

## 📈 Performance Considerations

### **Current Approach: Real-Time Processing**
- ✅ Always fresh links (no stale data)
- ✅ No storage overhead (links generated on demand)
- ❌ Slower response time (~100-300ms for link processing)
- ❌ Database queries on every request (not cached)

### **Alternative: Pre-Process and Store**
- ✅ Faster response time (<10ms, just read from DB)
- ✅ No processing on each request
- ❌ Links can become stale if movie database changes
- ❌ Requires storage for processed content
- ❌ Need batch job to update all analyses

### **Hybrid Approach (Recommended)**
```javascript
// Check if links are fresh
if (!analysis.has_links || needsRefresh(analysis.linked_at)) {
  // Re-process links
  processedContent = await processAnalysisContent(...);

  // Update database (async, don't block response)
  updateAnalysisWithLinks(movie.id, processedContent);
}

// Return cached processed content if fresh
return analysis.claude_response.raw_content;
```

---

## 🛡️ Minimum Refactoring Needed

### **Option 1: No Changes (Current State)**
**Pros:**
- Works right now
- No breaking changes

**Cons:**
- Link processing happens on every request
- Slower page loads
- More database queries

### **Option 2: Add Processed Content Field (Recommended)**
**Changes:**
```javascript
// In API, after processing links
const response = {
  claude_response: {
    raw_content: originalContent,      // Original text
    processed_content: processedContent, // WITH LINKS ⭐ NEW
    has_links: true,
    linked_at: new Date().toISOString()
  }
}

// Update database
await updateAnalysis(movieId, response);
```

**Benefits:**
- Process links once, serve many times
- Faster subsequent requests
- Backwards compatible (raw_content still exists)

**Migration:**
```sql
-- Check current state
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN has_links THEN 1 ELSE 0 END) as with_links,
  SUM(CASE WHEN claude_response->>'processed_content' IS NOT NULL THEN 1 ELSE 0 END) as has_processed
FROM movie_analyses;
```

### **Option 3: Separate Links Table (Future)**
**Schema:**
```sql
CREATE TABLE analysis_links (
  id UUID PRIMARY KEY,
  analysis_id UUID REFERENCES movie_analyses(id),
  link_type VARCHAR(20), -- 'movie' or 'person'
  source_text VARCHAR(255),
  target_id INTEGER,
  position INTEGER,
  created_at TIMESTAMP
);
```

**Benefits:**
- Track individual links
- Easier to update stale links
- Can analyze link patterns

**Complexity:**
- More tables to maintain
- More complex queries
- Overkill for current needs

---

## 🎯 Recommended Minimum Refactoring

**Step 1:** Add `processed_content` to existing structure (1 line change)
```javascript
// pages/api/movie-analysis.js
{
  raw_content: analysisContent,           // Original
  processed_content: processedContent,    // ⭐ NEW
  has_links: processedContent.includes('<a href='),
  linked_at: new Date().toISOString()
}
```

**Step 2:** Check for processed content before re-processing (3 lines)
```javascript
// Check if already processed
if (analysis.claude_response.processed_content && analysis.has_links) {
  processedContent = analysis.claude_response.processed_content;
} else {
  processedContent = await processAnalysisContent(...);
}
```

**Step 3:** Update database after first processing (async, non-blocking)
```javascript
// Don't wait for this
if (!analysis.has_links) {
  updateAnalysisWithLinks(movie.id, {
    processed_content: processedContent,
    has_links: true,
    linked_at: new Date()
  }).catch(err => console.error('Link update failed:', err));
}
```

**Result:**
- First request: ~300ms (processes links)
- Subsequent requests: ~50ms (uses cached processed_content)
- Zero breaking changes
- Backwards compatible

---

**Last Updated:** 2025-09-29
**Complexity:** Minimal (3 line changes)
**Impact:** High (10x faster subsequent loads)