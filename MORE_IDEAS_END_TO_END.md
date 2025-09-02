# More Ideas End-to-End Process Documentation

## 🎯 Overview
The More Ideas system generates personalized movie recommendations using AI analysis, batch processing, and dynamic display integration.

## 📋 Complete Process Flow

### 1. **Prompt Design & Generation**
**Location:** `lib/prompts/more-ideas-generator.js`

**Key Components:**
- **Input:** Movie title + year (e.g., "Fight Club (1999)")
- **Prompt Structure:** Streamlined for 40% token reduction
- **Output Format:** JSON with 15 movie recommendations
- **Validation:** `validateMoreIdeasResponse()` ensures quality

**Sample Prompt:**
```javascript
export function buildMoreIdeasPrompt(movieTitle) {
  return `Generate 15 movie recommendations for someone who enjoyed ${movieTitle}.
  
  Focus on:
  - Similar themes, directors, or genres
  - Progression from accessible (1-5) to challenging (11-15)
  - Mix of eras and styles
  
  JSON format:
  {
    "moreIdeas": [
      {"title": "Movie Title", "year": 2020, "connection": "Brief reason"}
    ]
  }`;
}
```

### 2. **Batch Processing Script**
**Location:** `scripts/batch-generate-more-ideas.js`

**Features:**
- **Unicode Safety:** Sanitizes movie titles (fixes "Nausicaä" → "Nausica")
- **Batch Size:** 50 movies per batch (reduced from 200)
- **Cost Optimization:** 95% savings through batch API + prompt caching
- **Error Handling:** Debug mode with small batches to isolate issues
- **Progress Tracking:** 5-minute polling intervals

**Key Functions:**
```javascript
// Sanitize titles to prevent JSON errors
function sanitizeMovieTitle(title) {
  return title
    .replace(/[\u2018\u2019]/g, "'")  // Smart quotes
    .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes  
    .replace(/[\u2013\u2014]/g, '-')  // Em/en dashes
    .replace(/\u2026/g, '...')        // Ellipsis
    .replace(/[^\x00-\x7F]/g, '')     // Remove non-ASCII
    .trim();
}

// Debug problematic characters
function findProblematicCharacters(movieList) {
  movieList.forEach((movie, index) => {
    try {
      JSON.stringify({ title: movie.title });
    } catch (error) {
      console.log(`🚨 Problematic movie at index ${index}:`, movie.title);
    }
  });
}
```

**Execution:**
```bash
# Debug mode (10 movies per batch)
DOTENV_CONFIG_PATH=.env.local node scripts/batch-generate-more-ideas.js --limit=50 --debug

# Production (50 movies per batch, all 20K movies)
DOTENV_CONFIG_PATH=.env.local node scripts/batch-generate-more-ideas.js
```

### 3. **Database Storage**
**Location:** Railway PostgreSQL Database
**Table:** `more_ideas`

**Schema:**
```sql
CREATE TABLE more_ideas (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  ideas JSONB NOT NULL,           -- Array of 15 movie recommendations
  metadata JSONB,                 -- Processing metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Sample Data:**
```json
{
  "tmdb_id": 550,
  "ideas": [
    {"title": "American Beauty", "year": 1999, "connection": "Dark suburban satire"},
    {"title": "Requiem for a Dream", "year": 2000, "connection": "Psychological intensity"},
    // ... 13 more recommendations
  ],
  "metadata": {
    "processing_time": 1200,
    "cost": 0.00012,
    "batch_id": "msgbatch_xyz123"
  }
}
```

### 4. **Multi-Source Static Generation**
**Location:** `scripts/multi-source-static-generator.js` (Referenced)

**Integration Process:**
1. **Query Database:** Fetch movie analysis + More Ideas
2. **Combine Data Sources:**
   - Movie analysis from `movie_analyses` table
   - More Ideas from `more_ideas` table
   - Movie metadata (poster, streaming) from TMDB
3. **Generate Static Files:** Create JSON files in `public/data/enhanced-movies/`

**Static File Structure:**
```json
{
  "tmdbId": 550,
  "title": "Fight Club",
  "year": 1999,
  "analysis": {
    "sections": [...],
    "keyElements": {...}
  },
  "moreIdeas": [
    {"title": "American Beauty", "year": 1999, "connection": "Dark suburban satire"},
    // ... 14 more
  ],
  "streaming": [...],
  "poster": "https://image.tmdb.org/t/p/w500/...",
  "generated_at": "2025-08-27T16:30:00Z"
}
```

### 5. **Frontend Integration & Display**
**Location:** Movie page components

**Component Flow:**
```
MovieAnalysisWithEntities.js (Main container)
├── Analysis sections display
├── Featured Films sections
├── Explore Further sections
└── MORE IDEAS section ← More Ideas integration
    └── MediaCards for recommended movies
```

**More Ideas Section Display:**
- **Title:** "MORE IDEAS" section header
- **Cards:** Each recommendation as a MediaCard component
- **Data Source:** Static JSON file or API fallback
- **Responsive:** Grid layout adapting to screen size

### 6. **Performance & Scaling**

**Current Status (August 2025):**
- **Total Movies:** 20,328 in database
- **More Ideas Generated:** 43+ movies (actively growing)
- **Remaining:** 20,285 movies to process
- **Estimated Cost:** $2.03 total for all movies
- **Processing Time:** ~406 batches × 5-8 minutes = 34-54 hours total

**Optimization Features:**
- **Prompt Caching:** 90% cost savings on repeated prompts
- **Batch API:** 50% cost savings vs individual calls
- **Static Generation:** Pre-built files for instant loading
- **Fallback System:** API calls for movies without static files

### 7. **Quality Assurance**

**Validation Steps:**
1. **JSON Structure:** Validates response format
2. **Content Quality:** Ensures 15 recommendations with connections
3. **Title Sanitization:** Removes problematic Unicode characters
4. **Database Integrity:** Unique constraints prevent duplicates
5. **Error Logging:** Tracks failures for manual review

**Monitoring:**
- **Batch Progress:** Real-time status updates
- **Cost Tracking:** Per-batch and total cost monitoring  
- **Success Rates:** Successful vs failed processing stats
- **Data Quality:** Validation errors and sanitization reports

## 🚀 Current Production Status

**Active Processing:**
- Batch script running with Unicode fixes
- 50 movies per batch, 5-minute polling
- Debug mode tested and working
- Ready for full 20K movie processing

**Next Steps:**
1. Monitor current test batch completion
2. Launch full production batch processing
3. Integrate with static file generation
4. Update movie page display components

## 🔧 Troubleshooting

**Common Issues:**
- **Unicode Errors:** Fixed with `sanitizeMovieTitle()`
- **JSON Serialization:** Handled by character detection
- **Batch Timeouts:** 6-hour maximum with 5-minute polling
- **API Rate Limits:** Batch API reduces request frequency

**Debug Commands:**
```bash
# Check batch status
node -e "const {Anthropic} = require('@anthropic-ai/sdk'); ..."

# Test small batch
node scripts/batch-generate-more-ideas.js --limit=10 --debug --dry-run

# Check database status
node -e "console.log('More Ideas count:', await pool.query('SELECT COUNT(*) FROM more_ideas'))"
```