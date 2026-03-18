# Movie Linking System Refactor - Scaffolding & Architecture

## Core Architecture Principles (From Principal Engineer)

1. **2-Tier Architecture**: Database → Component (eliminate middleware complexity)
2. **Single Responsibility**: Each component <100 lines, one clear purpose
3. **Fail-Fast Errors**: Every operation succeeds or fails loudly with context
4. **No Silent Failures**: Clear path from failure to root cause

---

## Simplified Data Flow Design

```
[Database] → [API] → [Component Tree] → [User]
     ↓           ↓           ↓           ↓
processed_content → parse once → render → clickable links
```

**Key Change**: Eliminate 4-tier fallback logic. One content source, one parsing path.

---

## New File Structure

```
lib/
  movie-analysis/
    ├── content-parser.js      # Single parsing logic
    ├── link-detector.js       # HTML link validation  
    ├── error-types.js         # Structured error handling
    └── __tests__/
        ├── content-parser.test.js
        └── link-detector.test.js

components/
  movie-analysis/
    ├── MovieAnalysisContainer.js    # <100 lines - orchestration only
    ├── AnalysisContent.js          # <100 lines - text rendering
    ├── FeaturedMovies.js           # <100 lines - movie cards
    ├── WhyWatchSection.js          # <100 lines - reasons section  
    ├── SubheadSection.js           # <100 lines - subhead rendering
    └── __tests__/
        ├── MovieAnalysisContainer.test.js
        └── AnalysisContent.test.js

pages/api/
  movie-analysis.js              # <50 lines - simple data serving
```

---

## Pseudo Code Architecture

### 1. Simplified API Layer (`pages/api/movie-analysis.js`)

```javascript
// PSEUDO CODE - Simplified API
export default async function movieAnalysisHandler(req, res) {
  try {
    // Single responsibility: Get data from database
    const movie = await MovieService.getMovieByTMDBId(tmdbId);
    const analysis = await MovieService.getMovieAnalysis(movie.id);
    
    // Single content path - no fallback tiers
    if (!analysis?.claude_response?.processed_content) {
      return res.status(404).json({ 
        error: 'NO_PROCESSED_CONTENT',
        debug: { movieId: movie.id, hasRawContent: !!analysis?.claude_response?.raw_content }
      });
    }
    
    // Return structured data - let component handle parsing
    return res.status(200).json({
      success: true,
      movie: { title: movie.title, year: movie.year, tmdb_id: movie.tmdb_id },
      processedContent: analysis.claude_response.processed_content,
      contributorsJson: movie.contributors_json
    });
    
  } catch (error) {
    // Fail-fast with context
    return res.status(500).json({
      error: 'API_ERROR',
      message: error.message,
      debug: { tmdbId, stack: error.stack }
    });
  }
}
```

### 2. Content Parser Service (`lib/movie-analysis/content-parser.js`)

```javascript
// PSEUDO CODE - Single parsing responsibility
export class ContentParser {
  
  static parse(processedContent) {
    try {
      // Single parsing path
      const parsed = JSON.parse(processedContent);
      
      // Validate structure 
      const validation = this.validateStructure(parsed);
      if (!validation.valid) {
        throw new ContentParseError(`Invalid structure: ${validation.reason}`, {
          processedContent: processedContent.substring(0, 200),
          validationErrors: validation.errors
        });
      }
      
      return {
        success: true,
        data: {
          content: parsed.content || [],
          featuredMovies: parsed.featuredMovies || [],
          whyWatch: parsed.whyWatch || [],
          moreIdeas: parsed.moreIdeas || []
        }
      };
      
    } catch (error) {
      // Fail-fast with debugging context
      throw new ContentParseError(`Parse failed: ${error.message}`, {
        originalError: error,
        contentPreview: processedContent.substring(0, 200),
        contentLength: processedContent.length
      });
    }
  }
  
  static validateStructure(parsed) {
    // Explicit validation with detailed errors
    const errors = [];
    if (!Array.isArray(parsed.content)) errors.push('content must be array');
    if (!Array.isArray(parsed.featuredMovies)) errors.push('featuredMovies must be array');
    
    return {
      valid: errors.length === 0,
      errors,
      reason: errors.join(', ')
    };
  }
}
```

### 3. Link Detector Service (`lib/movie-analysis/link-detector.js`)

```javascript
// PSEUDO CODE - HTML link validation
export class LinkDetector {
  
  static detectMovieLinks(htmlText) {
    const movieLinkPattern = /<a href="\/movie\/(\d+)"[^>]*>([^<]+)<\/a>/g;
    const links = [];
    let match;
    
    while ((match = movieLinkPattern.exec(htmlText)) !== null) {
      links.push({
        type: 'movie',
        tmdbId: parseInt(match[1]),
        text: match[2],
        originalHtml: match[0]
      });
    }
    
    return links;
  }
  
  static detectPersonLinks(htmlText) {
    const personLinkPattern = /<a href="\/person\/(\d+)"[^>]*>([^<]+)<\/a>/g;
    const links = [];
    let match;
    
    while ((match = personLinkPattern.exec(htmlText)) !== null) {
      links.push({
        type: 'person',
        personId: parseInt(match[1]),
        text: match[2],
        originalHtml: match[0]
      });
    }
    
    return links;
  }
  
  static validateLinks(htmlText) {
    const movieLinks = this.detectMovieLinks(htmlText);
    const personLinks = this.detectPersonLinks(htmlText);
    
    return {
      valid: movieLinks.length > 0 || personLinks.length > 0,
      movieLinks,
      personLinks,
      totalLinks: movieLinks.length + personLinks.length
    };
  }
}
```

### 4. Container Component (`components/movie-analysis/MovieAnalysisContainer.js`)

```javascript
// PSEUDO CODE - Orchestration only, <100 lines
export default function MovieAnalysisContainer({ movie, processedContent, contributorsJson }) {
  
  // Single parsing attempt with clear error handling
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    try {
      const result = ContentParser.parse(processedContent);
      setParsedData(result.data);
      
      // Validate links are present
      const linkValidation = LinkDetector.validateLinks(processedContent);
      if (!linkValidation.valid) {
        console.warn('No links detected in processed content', linkValidation);
      }
      
    } catch (parseError) {
      setError({
        type: 'PARSE_ERROR',
        message: parseError.message,
        debug: parseError.context
      });
    }
  }, [processedContent]);
  
  // Fail-fast rendering
  if (error) {
    return <AnalysisError error={error} />;
  }
  
  if (!parsedData) {
    return <AnalysisLoading />;
  }
  
  // Simple orchestration - each component has single responsibility
  return (
    <div className="movie-analysis-container">
      <WhyWatchSection reasons={parsedData.whyWatch} />
      <AnalysisContent sections={parsedData.content} />
      <FeaturedMovies movies={parsedData.featuredMovies} />
      <MoreIdeasSection ideas={parsedData.moreIdeas} />
    </div>
  );
}
```

### 5. Content Component (`components/movie-analysis/AnalysisContent.js`)

```javascript
// PSEUDO CODE - Text rendering only, <100 lines
export default function AnalysisContent({ sections }) {
  
  return (
    <div className="analysis-content">
      {sections.map((section, index) => (
        <div key={index} className="analysis-section">
          
          {/* Subhead detection */}
          {section.type === 'technicalAnalysis' && (
            <SubheadSection text="TECHNICAL EXCELLENCE" />
          )}
          
          {/* HTML content rendering */}
          <div 
            className="section-text"
            dangerouslySetInnerHTML={{ __html: section.text }}
          />
          
        </div>
      ))}
    </div>
  );
}
```

---

## Error Handling Strategy

### Structured Error Types

```javascript
// lib/movie-analysis/error-types.js
export class ContentParseError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'ContentParseError';
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export class LinkValidationError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'LinkValidationError';
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}
```

### Error Component

```javascript
// components/movie-analysis/AnalysisError.js
export default function AnalysisError({ error }) {
  return (
    <div className="analysis-error">
      <h3>Analysis Loading Error</h3>
      <p><strong>Type:</strong> {error.type}</p>
      <p><strong>Message:</strong> {error.message}</p>
      
      {process.env.NODE_ENV === 'development' && error.debug && (
        <details>
          <summary>Debug Information</summary>
          <pre>{JSON.stringify(error.debug, null, 2)}</pre>
        </details>
      )}
      
      <button onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests Structure

```javascript
// components/movie-analysis/__tests__/ContentParser.test.js
describe('ContentParser', () => {
  
  test('parses valid processed content', () => {
    const mockProcessedContent = `{
      "content": [{"type": "intro", "text": "Movie analysis with <a href='/movie/76'>Before Sunrise</a>"}],
      "featuredMovies": [],
      "whyWatch": ["Great performances"]
    }`;
    
    const result = ContentParser.parse(mockProcessedContent);
    
    expect(result.success).toBe(true);
    expect(result.data.content).toHaveLength(1);
    expect(result.data.whyWatch).toEqual(["Great performances"]);
  });
  
  test('fails fast on invalid JSON', () => {
    const invalidContent = `{ invalid json }`;
    
    expect(() => ContentParser.parse(invalidContent))
      .toThrow(ContentParseError);
  });
  
  test('validates HTML links are present', () => {
    const contentWithLinks = `<a href="/movie/76">Before Sunrise</a>`;
    const validation = LinkDetector.validateLinks(contentWithLinks);
    
    expect(validation.valid).toBe(true);
    expect(validation.movieLinks).toHaveLength(1);
    expect(validation.movieLinks[0].tmdbId).toBe(76);
  });
  
});
```

---

## Migration Plan

### Phase 1: Create New Structure (No Breaking Changes)
1. Create new service files (`lib/movie-analysis/`)
2. Create new component files (`components/movie-analysis/`)  
3. Add comprehensive tests
4. Keep old system running

### Phase 2: Switch API to New System
1. Modify `pages/api/movie-analysis.js` to use new 2-tier logic
2. Add feature flag to switch between old/new components
3. Test with subset of movies

### Phase 3: Replace Component System
1. Update `pages/movie/[id].js` to use new components
2. Remove old 1000+ line component
3. Clean up unused files

### Phase 4: Cleanup
1. Remove old linking logic
2. Remove 4-tier content serving
3. Update documentation

---

## Success Metrics

1. **API Response Time**: <100ms (currently variable due to complex logic)
2. **Component Load Time**: <50ms (currently slow due to 1000+ line processing)
3. **Error Rate**: <1% (currently high due to silent failures)
4. **Debuggability**: Every error includes context for root cause analysis
5. **Code Complexity**: Each file <100 lines, single responsibility

This scaffolding provides a clean, maintainable architecture that addresses the principal engineer's guidance while solving the core linking problems.