# Namespace Collision Analysis - MovieGenius Analysis System

**Date:** 2025-09-29
**Severity:** ⚠️ HIGH - Multiple field name collisions detected

---

## 🚨 Critical Collisions

### 1. **`analysis` Field Name Overload**

**Problem:** The word "analysis" is used in **7 different contexts**:

```javascript
// Context 1: Database table name
movie_analyses

// Context 2: API response field (processed content)
{ analysis: "content with links" }

// Context 3: Component prop name
<MovieAnalysisWithEntities analysis={...} />

// Context 4: Raw database field
analysis.claude_response

// Context 5: Function parameter
processAnalysis(analysis)

// Context 6: File naming
movie-analysis-linker.js
/api/movie-analysis

// Context 7: Variable naming
const analysis = await getAnalysis()
```

**Risk:** Developers can't distinguish between database records, processed content, or component props without deep context.

---

### 2. **`content` Field Ambiguity**

**Problem:** Multiple "content" fields with different meanings:

```javascript
// In database JSONB
{
  raw_content: "...",      // Original Claude response
  processed_content: "..." // Content with HTML links
}

// In API response
{
  analysis: "content",     // Sometimes called "content"
  rawAnalysis: "content"   // Original content
}

// In JSON format
{
  "content": [             // Array of sections
    { "type": "text", "text": "..." }
  ]
}

// In component parsing
const { content } = parseAnalysis() // Parsed sections array
```

**Risk:** `content` could mean:
- Raw text
- Processed text
- Sections array
- Individual section text

---

### 3. **`processed` Namespace Collision**

**Problem:** "Processed" used in multiple incompatible ways:

```javascript
// Database field: Content with HTML links
processed_content: "<a href='/movie/123'>Movie</a>"

// Component state: Parsed and structured data
const [processedAnalysis, setProcessedAnalysis] = useState({
  sections: [...],
  entities: {...}
})

// Function return: Enhanced movie data
const processedMovies = await enhanceMoviesWithTmdbIds(movies)
```

**Risk:** "Processed" means different things at different layers.

---

### 4. **`raw` Namespace Collision**

**Problem:** Multiple "raw" fields:

```javascript
// Database field
raw_content: "PARAGRAPH: Analysis text..."

// API response
rawAnalysis: "Original content"

// Component prop
analysis.claude_response.raw_content

// Variable naming
const rawContent = analysis.claude_response.raw_content
```

**Risk:** Is "raw" before or after link processing? Ambiguous.

---

### 5. **`movie` Object Collision**

**Problem:** Different `movie` objects with different schemas:

```javascript
// Database record
movie = { id, title, year, tmdb_id, poster_url, created_at, ... }

// API response
movie = { title, year, tmdb_id } // Minimal version

// Component prop
movie = { id, title, year, tmdb_id, slug, poster_path, ... }

// Featured movie in analysis
movie = { title, year, slug, poster_url, streaming, tmdb_id }
```

**Risk:** Same variable name, completely different structure depending on context.

---

## ⚠️ Medium Priority Collisions

### 6. **`entity` / `entityData` Confusion**

```javascript
// Old entity linking system
entity_linking_data: { entityData: { featuredMovies, people } }

// Component state
entityData: featuredMovies || null

// Legacy props
entities: { featuredMovies, people }

// Current entity reference
currentEntity: { type: 'movie', slug, title }
```

**Risk:** Old entity linking system conflicts with new linking approach.

---

### 7. **`sections` Array Ambiguity**

```javascript
// Parsed from raw text
sections = [{ type: 'text', content: '...' }, { type: 'movies', movies: [...] }]

// JSON format content array
content = [{ type: 'text', text: '...', subhead: '...' }]

// Static file format
sections = [{ content: '...', type: 'paragraph' }]
```

**Risk:** Three different "sections" structures that can't be used interchangeably.

---

## 🎯 Collision Impact Matrix

| Field Name | Contexts | Collision Risk | Breaking Change Risk |
|-----------|----------|----------------|---------------------|
| `analysis` | 7 | 🔴 CRITICAL | 🟡 MEDIUM |
| `content` | 4 | 🔴 CRITICAL | 🔴 HIGH |
| `processed` | 3 | 🟠 HIGH | 🟡 MEDIUM |
| `raw` | 4 | 🟠 HIGH | 🟢 LOW |
| `movie` | 4 | 🟠 HIGH | 🔴 HIGH |
| `entity` | 4 | 🟡 MEDIUM | 🟢 LOW |
| `sections` | 3 | 🟡 MEDIUM | 🟡 MEDIUM |

---

## 🛡️ Recommended Disambiguation Strategy

### **Phase 1: Field Prefixing (Low Risk)**

Add context prefixes to clarify meaning:

```javascript
// Database JSONB structure
{
  claude_raw_text: "Original response",
  claude_linked_text: "Text with HTML links",
  claude_format: "text" | "json"
}

// API Response
{
  rendered_content: "Final content to display",
  original_content: "Backup without links",
  content_format: "text" | "json",
  content_has_links: boolean
}

// Component Props
{
  display_content: "What to render",
  source_format: "text" | "json",
  parsed_data: { sections, featuredMovies, ... } // if JSON
}
```

**Benefits:**
- No breaking changes to existing APIs
- Clear semantic meaning
- Easy to grep/search codebase

---

### **Phase 2: Namespace Isolation (Medium Risk)**

Use nested objects to isolate concerns:

```javascript
// Database structure
{
  source: {
    raw: "Original Claude response",
    linked: "With HTML links added",
    format: "text" | "json"
  },
  metadata: {
    generated_at: "ISO timestamp",
    linked_at: "ISO timestamp",
    has_links: boolean,
    cost_estimate: number
  }
}

// API Response
{
  content: {
    display: "Rendered content",
    original: "Backup",
    format: "text" | "json",
    hasLinks: boolean
  },
  movie: {
    identity: { id, tmdb_id },
    display: { title, year, poster_url }
  }
}
```

**Benefits:**
- Clear object boundaries
- Type-safe access patterns
- Reduces top-level namespace pollution

---

### **Phase 3: Typed Interfaces (High Value, High Risk)**

Define strict TypeScript interfaces:

```typescript
// Domain types
type AnalysisSource = {
  raw: string;
  linked: string;
  format: 'text' | 'json';
}

type AnalysisMetadata = {
  generated_at: string;
  linked_at?: string;
  has_links: boolean;
  cost_estimate: number;
  tokens: { input: number; output: number };
  model: string;
}

type DatabaseAnalysis = {
  id: number;
  movie_id: number;
  source: AnalysisSource;
  metadata: AnalysisMetadata;
  created_at: string;
}

type APIAnalysisResponse = {
  content: {
    display: string;
    original: string;
    format: 'text' | 'json';
    hasLinks: boolean;
  };
  movie: {
    id: number;
    tmdb_id: number;
    title: string;
    year: number;
  };
  cached: boolean;
  performance: {
    total_time: number;
    movie_query_time: number;
    analysis_query_time: number;
  };
}
```

**Benefits:**
- Compile-time safety
- Self-documenting
- IDE autocomplete support

---

## 🔧 Immediate Action Items

### **Quick Wins (No Breaking Changes)**

1. **Add comments** to clarify each "content" usage:
```javascript
// BAD
const content = analysis.raw_content;

// GOOD
const originalClaudeResponse = analysis.raw_content; // Raw text from Claude API
```

2. **Rename internal variables** to be more specific:
```javascript
// BAD
const analysis = await getAnalysis();
const content = analysis.content;

// GOOD
const analysisRecord = await getAnalysis();
const displayContent = analysisRecord.linked_content;
```

3. **Add JSDoc type hints**:
```javascript
/**
 * @param {Object} analysis - Database analysis record
 * @param {string} analysis.raw_content - Original Claude response
 * @param {string} [analysis.processed_content] - Content with HTML links
 */
async function renderAnalysis(analysis) { ... }
```

---

### **Medium-Term Refactoring**

1. **Create domain-specific types** in `/lib/types/analysis.js`
2. **Migrate API responses** to use nested `content` object
3. **Update components** to use prefixed prop names
4. **Add migration script** for database field renaming

---

### **Long-Term Architecture**

1. **Implement TypeScript** across the codebase
2. **Use branded types** for IDs (MovieID, TMDBID, AnalysisID)
3. **Strict interface contracts** between layers
4. **Runtime validation** with Zod or similar

---

## 🚀 Risk Mitigation Strategy

### **If We Do Nothing**
- ❌ Bugs from variable shadowing
- ❌ Confusion for new developers
- ❌ Difficult to add new features
- ❌ Harder to debug issues

### **If We Refactor Aggressively**
- ❌ Breaking changes across codebase
- ❌ Need to update all API consumers
- ❌ Risk of introducing new bugs
- ❌ Significant dev time investment

### **Recommended Balanced Approach**
1. ✅ Start with comments and JSDoc (1 day)
2. ✅ Add prefixes to new code only (ongoing)
3. ✅ Gradually migrate API responses (2 weeks)
4. ✅ Full TypeScript migration (2-3 months)

---

## 📊 Collision Detection Checklist

When adding new code, check:
- [ ] Does this field name already exist in another layer?
- [ ] Is the meaning clear without context?
- [ ] Could this be confused with an existing field?
- [ ] Is there a more specific name available?
- [ ] Have I added JSDoc comments?

---

**Priority:** 🔴 HIGH
**Next Review:** After API response format is standardized
**Owner:** Engineering Team