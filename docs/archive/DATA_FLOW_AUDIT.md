# Actual Data Flow - Claude to Display

## Database Structure (VERIFIED)

```javascript
movie_analyses table:
{
  claude_response: {
    raw_content: '{"content": [{"text": "...paragraph..."}], "featuredMovies": [...]}',  // JSON string
    processed_content: 'Text with <a href="/movie/123">links</a>...',                   // HTML string with links
    model: 'claude-3-5-sonnet',
    version: '2.0',
    enhanced_format: true
  },
  has_links: true,
  link_count: 4,
  enhanced_sections: {...},  // JSON
  enhanced_key_elements: {...}  // JSON
}
```

## Flow 1: Claude Generation (NEW analysis)

1. **Claude generates** → Returns JSON with structured content
2. **processAnalysisContent()** → Adds HTML links to movie/person mentions  
3. **Saved to DB**:
   - `raw_content` = JSON string (structured content from Claude)
   - `processed_content` = Plain text with HTML `<a>` tags added

## Flow 2: API Returns Data

`/api/movie-analysis?tmdbId=X` returns:
```javascript
{
  analysis: processedContent,      // String with HTML links
  rawAnalysis: rawContent,          // JSON string  
  entityData: {...},                // Featured movies
  cached: true/false
}
```

## Flow 3: Original Page Transforms

```javascript
// pages/movie/[id].js (WORKING)
const formattedAnalysis = {
  claude_response: {
    raw_content: apiData.rawAnalysis  // JSON string
  },
  entity_linking_data: {
    entityData: apiData.entityData
  }
};
```

Then passes to `<MovieAnalysisWithEntities analysis={formattedAnalysis} />`

## Flow 4: Component Renders

`MovieAnalysisWithEntities`:
1. Checks if `raw_content` is JSON or text format
2. If JSON: Parses and renders sections
3. Applies entity links from `processed_content`  
4. Renders featured movies from `entityData`

## Refactored Flow (BROKEN)

`lib/movie-page-loader.js`:
1. ❌ Fetches API
2. ❌ Calls `parseAnalysisResponse(analysisData)`  
3. ❌ Returns `{ sections: [], featuredMovies: [] }` (loses processed_content with links)
4. ❌ Passes to NEW simple `MovieAnalysis` component (not MovieAnalysisWithEntities)
5. ❌ Loses all entity linking, proper formatting

## The Problem

Refactored loader strips out `processed_content` (the text WITH links) and only extracts sections.
Then passes to a simplified component that doesn't handle links/formatting.

## The Fix

Refactored page should:
1. Use `MovieAnalysisWithEntities` (existing component)
2. Pass data in the format it expects:
```javascript
{
  claude_response: { 
    raw_content: analysisData.rawAnalysis,
    processed_content: analysisData.analysis  // Keep the HTML with links!
  },
  entity_linking_data: {
    entityData: analysisData.entityData
  }
}
```
