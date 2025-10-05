# Entity Linking Fix - The Complete Solution

## The Root Cause

The API returns:
```javascript
{
  analysis: "Text with <a href='/movie/123'>links</a>",  // HTML with links
  rawAnalysis: '{"content": [...]}',                      // JSON string
  entityData: {...}
}
```

### Original Page (Working)
```javascript
// pages/movie/[id]-original.js line 192
const formattedAnalysis = {
  claude_response: validatedContent,  // ← BOTH processed_content AND raw_content
  entity_linking_data: {...},
  entityData: {...}
};

// Where validatedContent is:
{
  processed_content: apiData.analysis,  // HTML with links
  raw_content: apiData.analysis          // Same content (HTML)
}
```

**Key insight:** Original page puts HTML in BOTH fields!

### Refactored Page (Broken)
```javascript
// lib/movie-page-loader.js line 190-200
const rawFormat = {
  claude_response: {
    raw_content: analysisData.rawAnalysis,  // ← JSON string
    processed_content: analysisData.analysis // ← HTML string
  },
  entity_linking_data: {...}
};
```

**The problem:** We put JSON in `raw_content` and HTML in `processed_content`

## Why It Breaks

The `MovieAnalysisWithEntities` component (line 56):
```javascript
const rawContent = analysis.claude_response.raw_content;
```

It reads `raw_content` first, then tries to parse it:

```javascript
// Line 60-72
try {
  analysisData = JSON.parse(unescapedContent);  // ← Works if raw_content is JSON
  console.log('✅ Detected JSON format analysis');
} catch (e) {
  console.log('📝 Using legacy text format analysis');
  analysisData = null;
}
```

**What happens:**
1. Original page: `raw_content` = HTML → JSON parse fails → uses legacy text format → renders HTML correctly
2. Refactored page: `raw_content` = JSON → JSON parse succeeds → tries to parse `processed_content` as JSON → fails → loses links

## The Fix

**Option 1: Match original page behavior exactly**
```javascript
// lib/movie-page-loader.js - modify parseAnalysisResponse()
function parseAnalysisResponse(analysisData) {
  if (!analysisData) {
    return {
      sections: [],
      featuredMovies: [],
      whyWatch: null,
      moreIdeas: [],
      exploreTopics: [],
      rawData: null
    };
  }

  // Match original page: put analysis (with HTML links) in BOTH fields
  const rawFormat = {
    claude_response: {
      processed_content: analysisData.analysis || '',  // HTML with links
      raw_content: analysisData.analysis || ''         // Same (HTML)
    },
    entity_linking_data: analysisData.entityData ? {
      entityData: analysisData.entityData,
      processedAt: new Date().toISOString()
    } : null,
    entityData: analysisData.entityData || null
  };

  // Don't try to parse - let component handle it
  return {
    sections: [],  // Not used
    featuredMovies: [],
    whyWatch: null,
    moreIdeas: [],
    exploreTopics: [],
    rawData: rawFormat
  };
}
```

**Why this works:**
- Component tries `JSON.parse(raw_content)` where `raw_content` = HTML
- Parse fails (expected)
- Falls back to legacy text format
- Renders HTML with `dangerouslySetInnerHTML`
- Links display correctly

**Option 2: Check if content is JSON or HTML first**
```javascript
function parseAnalysisResponse(analysisData) {
  if (!analysisData) return emptyResponse();

  const content = analysisData.analysis || '';

  // Check if content is HTML (has links) or JSON
  const isHtml = content.includes('<a href=');
  const isJson = content.trim().startsWith('{') && !isHtml;

  if (isHtml) {
    // HTML with links - use as-is in both fields
    return {
      rawData: {
        claude_response: {
          raw_content: content,
          processed_content: content
        },
        entity_linking_data: {...}
      }
    };
  } else if (isJson) {
    // JSON format - use rawAnalysis for structure
    return {
      rawData: {
        claude_response: {
          raw_content: analysisData.rawAnalysis || content,
          processed_content: content
        },
        entity_linking_data: {...}
      }
    };
  }
}
```

## Recommended: Option 1

**Why:** Simpler, matches working original page exactly, no guessing about format.

**Test cases:**
- Movie with HTML links: ✅ Works (parse fails, renders HTML)
- Movie with JSON: ⚠️ Won't work, but do we have these?
- Legacy text: ✅ Works (parse fails, renders text)

## Implementation

1. Modify `lib/movie-page-loader.js` parseAnalysisResponse()
2. Remove JSON parsing attempt
3. Put `analysisData.analysis` (with links) in both `raw_content` and `processed_content`
4. Deploy and test
