# Entity Linking Broken - Complete Trace

## Problem Statement
Movie and contributor entity links are not appearing in the refactored movie page, despite working in the original page.

## Data Flow Trace

### 1. Database Storage (Verified Working)
```javascript
// movie_analyses.claude_response JSONB structure:
{
  raw_content: '{"content": [...], "featuredMovies": [...]}',  // Original JSON from Claude
  processed_content: 'Text with <a href="/movie/123">Movie</a>...'  // HTML with entity links
}

// Links are added at creation time by processAnalysisContent()
// Stored in processed_content field with <a> tags
```

**Status:** ✅ Working - confirmed by API endpoint code (lines 189-208 in movie-analysis.js)

### 2. API Endpoint Returns (/api/movie-analysis)
```javascript
// pages/api/movie-analysis.js lines 312-329
claudeText = analysis.claude_response.raw_content || '';           // Original JSON
displayText = analysis.claude_response.processed_content || claudeText;  // With HTML links

// Response format:
{
  analysis: displayText,      // ← This has the HTML links!
  rawAnalysis: claudeText,    // Original JSON
  movie: {...},
  cached: true
}
```

**Status:** ✅ Working - API returns `processed_content` in the `analysis` field

### 3. Refactored Loader Receives API Data
```javascript
// lib/movie-page-loader.js loadFromDatabase() - lines 118-161
const [tmdbRes, analysisRes, streamingRes] = await Promise.all([...]);
const analysisData = analysisRes.ok ? await analysisRes.json() : null;

// analysisData structure:
{
  analysis: "Text with <a href='/movie/123'>links</a>",  // ← HTML with links!
  rawAnalysis: '{"content": [...]}',                      // JSON string
  movie: {...}
}
```

**Status:** ✅ Working - loader receives correct data from API

### 4. 🚨 THE BREAK: parseAnalysisResponse()
```javascript
// lib/movie-page-loader.js lines 176-228
function parseAnalysisResponse(analysisData) {
  // Creates rawFormat object:
  const rawFormat = {
    claude_response: {
      raw_content: analysisData.rawAnalysis || analysisData.analysis || '',  // JSON
      processed_content: analysisData.analysis || ''  // ← This should have links!
    },
    entity_linking_data: analysisData.entityData ? {...} : null,
    entityData: analysisData.entityData || null
  };

  // Then tries to parse content as JSON:
  const content = analysisData.analysis || analysisData.rawAnalysis || '';
  let sections = [];

  try {
    const jsonData = JSON.parse(content);  // ← PROBLEM: Tries to parse HTML as JSON!
    if (jsonData.content || jsonData.sections) {
      sections = transformSections(jsonData.content || jsonData.sections);
    }
  } catch (e) {
    // Falls back to legacy text format
    sections = parseLegacyTextFormat(content);
  }

  return {
    sections,           // Parsed sections WITHOUT links
    featuredMovies,
    whyWatch: null,
    moreIdeas: [],
    exploreTopics: [],
    rawData: rawFormat  // ← Has processed_content but not used!
  };
}
```

**Status:** ❌ BROKEN - Two problems:
1. Tries to parse `analysisData.analysis` (HTML with links) as JSON - fails
2. Returns parsed `sections` array that loses the HTML links
3. `rawData` has correct `processed_content` but sections are parsed separately

### 5. Component Receives Data
```javascript
// pages/movie/[id].js lines 129-133
const { header, analysis, contributors, streaming, source } = movieData;

// analysis structure from loader:
{
  sections: [...],          // Plain text sections (no links)
  featuredMovies: [...],
  whyWatch: null,
  moreIdeas: [],
  exploreTopics: [],
  rawData: {
    claude_response: {
      raw_content: '{"content": [...]}',
      processed_content: 'Text with <a href="/movie/123">links</a>'  // ← Links are here!
    }
  }
}

const formattedAnalysis = analysis.rawData || null;  // Passes rawData to component
```

**Status:** ⚠️ Partial - `rawData` has links but sections don't

### 6. MovieAnalysisWithEntities Renders
```javascript
// components/MovieAnalysisWithEntities.js lines 850-867
// renderJsonAnalysis() function:

let textSections = jsonData.content || [];

// Check if we have processed content with links
if (jsonData.processed_content && jsonData.processed_content.trim()) {
  try {
    const processedData = JSON.parse(jsonData.processed_content);  // ← Tries to parse HTML!
    if (processedData.content && Array.isArray(processedData.content)) {
      textSections = processedData.content;
      console.log('✅ Using processed content with HTML links');
    }
  } catch (e) {
    // If processed_content isn't JSON, treat it as a single text block
    textSections = [{ type: 'text', text: jsonData.processed_content }];
    console.log('✅ Using processed content as single text block');
  }
}
```

**Status:** ⚠️ Partial fallback - tries to parse HTML as JSON, catches error, uses as text block

### 7. Component Renders Links
```javascript
// lines 913-934
const hasHtmlLinks = section.text && section.text.includes('<a href=');

if (hasHtmlLinks) {
  <div dangerouslySetInnerHTML={{ __html: section.text }} />
} else {
  <EntityLinkedText text={section.text} ... />
}
```

**Status:** ✅ Working - **IF** `hasHtmlLinks` is true, will render HTML

## Root Cause Analysis

### Primary Issue: JSON vs HTML Confusion
The system stores TWO formats in `claude_response`:
1. `raw_content` = JSON string `'{"content": [...]}'`
2. `processed_content` = HTML string `'Text with <a>links</a>'`

**The bug:** Code tries to use BOTH as JSON:
- `parseAnalysisResponse()` tries `JSON.parse(analysisData.analysis)` where `analysis` = HTML
- `renderJsonAnalysis()` tries `JSON.parse(jsonData.processed_content)` where `processed_content` = HTML

### Why Original Page Works
```javascript
// pages/movie/[id]-original.js (working version)
const formattedAnalysis = {
  claude_response: {
    raw_content: apiData.rawAnalysis      // JSON string
  },
  entity_linking_data: {
    entityData: apiData.entityData
  }
};

// Component receives:
// - raw_content = JSON (gets parsed as structured content)
// - processed_content = NOT PASSED (component uses EntityLinkedText to add links)
```

**The difference:** Original page ONLY passes `raw_content` (JSON). Component parses it and uses `EntityLinkedText` to add links dynamically.

### Why Refactored Page Fails
Refactored page tries to pass BOTH:
- `raw_content` = JSON (for structure)
- `processed_content` = HTML (for pre-rendered links)

But component logic expects:
- **Either** JSON in `raw_content` (parse and link dynamically)
- **Or** HTML in `processed_content` (render as-is)

Not both at the same time!

## The Fix Options

### Option 1: Use processed_content as primary (fastest)
```javascript
// lib/movie-page-loader.js - modify parseAnalysisResponse()
return {
  sections: [],  // Empty - not used
  featuredMovies: [],
  whyWatch: null,
  moreIdeas: [],
  exploreTopics: [],
  rawData: {
    claude_response: {
      raw_content: analysisData.analysis,  // HTML with links (primary)
      processed_content: analysisData.analysis  // Same
    },
    entity_linking_data: analysisData.entityData ? {...} : null
  }
};
```

Then component needs to detect HTML vs JSON:
```javascript
// components/MovieAnalysisWithEntities.js
if (rawContent.startsWith('{') && !rawContent.includes('<a href=')) {
  // It's JSON - parse and render
  const parsed = JSON.parse(rawContent);
  return renderJsonAnalysis(parsed);
} else {
  // It's HTML - render as-is
  return <div dangerouslySetInnerHTML={{ __html: rawContent }} />;
}
```

### Option 2: Parse processed_content to extract linked sections
```javascript
// Create a new function to parse HTML back into sections
function parseHtmlToSections(htmlContent) {
  // Split by <a> tags, preserve links
  // Return sections array with HTML intact
}
```

### Option 3: Don't use processed_content, use dynamic linking
```javascript
// Just use raw_content (JSON), let EntityLinkedText add links
return {
  rawData: {
    claude_response: {
      raw_content: analysisData.rawAnalysis  // JSON only
    },
    entity_linking_data: analysisData.entityData ? {...} : null
  }
};
```

## Recommended Solution

**Option 3** - Match original page behavior:
1. Don't try to parse `processed_content` (HTML) as JSON
2. Use `rawAnalysis` (JSON) as `raw_content`
3. Let `MovieAnalysisWithEntities` component handle linking via `EntityLinkedText`
4. This is what the original working page does

**Why this works:**
- Original page: ✅ works
- Uses same component: `MovieAnalysisWithEntities`
- Same linking logic: `EntityLinkedText`
- Only difference: Refactored tries to use `processed_content`, original doesn't

**The confusion:** We thought `processed_content` (HTML) was needed for links, but actually the component generates links itself via `EntityLinkedText`. The `processed_content` HTML was for a DIFFERENT rendering path that isn't being used.
