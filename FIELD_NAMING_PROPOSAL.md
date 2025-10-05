# Field Naming Proposal - Clear & Unambiguous

## Current Confusing Names ❌

```javascript
{
  raw_content: "PARAGRAPH: **Movie** (Year)...",      // What's "raw"?
  processed_content: "<a href='/movie/123'>Movie</a>" // What was "processed"?
}
```

**Problems:**
- "raw" is ambiguous (raw from Claude? raw before rendering?)
- "processed" doesn't say what processing was done
- Can't tell which one to use for display

---

## Proposed Clear Names ✅

### **Option 1: Intent-Based (RECOMMENDED)**

```javascript
{
  claude_text: "PARAGRAPH: **Movie** (Year)...",           // Direct from Claude API
  display_text: "<a href='/movie/123'>Movie</a> (Year)"   // Ready to render in browser
}
```

**Why this is better:**
- ✅ `claude_text` = exactly what Claude returned
- ✅ `display_text` = what the user sees
- ✅ Clear which one to use when
- ✅ Self-documenting

---

### **Option 2: Process-Based**

```javascript
{
  unlinked_text: "PARAGRAPH: **Movie** (Year)...",     // Before linking
  linked_text: "<a href='/movie/123'>Movie</a> (Year)" // After linking
}
```

**Why this works:**
- ✅ Explicit about the one difference (links)
- ✅ Clear transformation path
- ❌ Doesn't explain the **Movie** pattern

---

### **Option 3: Format-Based**

```javascript
{
  text_format: "PARAGRAPH: **Movie** (Year)...",       // Text with markup
  html_format: "<a href='/movie/123'>Movie</a> (Year)" // HTML with links
}
```

**Why this works:**
- ✅ Clear about format
- ❌ Both are technically "text"
- ❌ Doesn't explain the transformation

---

## Recommended Change (Minimal Risk)

### **Database Schema**
```javascript
// In claude_response JSONB:
{
  claude_text: "...",      // NEW NAME (was raw_content)
  display_text: "...",     // NEW NAME (was processed_content)

  // Keep metadata clear too:
  generated_at: "timestamp",
  linked_at: "timestamp",
  has_links: boolean,
  link_count: number
}
```

### **API Response**
```javascript
{
  analysis: displayText,           // Main field (was 'analysis')
  claude_original: claudeText,     // Backup (was 'rawAnalysis')
  movie: { title, year, tmdb_id },
  hasLinks: true,
  linkCount: 5
}
```

### **Code Comments**
```javascript
// GOOD (Self-documenting)
const claudeText = analysis.claude_response.claude_text;
const displayText = analysis.claude_response.display_text;

// BAD (Requires mental translation)
const rawContent = analysis.claude_response.raw_content;
const processedContent = analysis.claude_response.processed_content;
```

---

## Migration Strategy

### **Phase 1: Dual Support (No Breaking Changes)**

```javascript
// Support both old and new names
const claudeText =
  analysis.claude_response.claude_text ||      // NEW
  analysis.claude_response.raw_content;        // OLD (fallback)

const displayText =
  analysis.claude_response.display_text ||     // NEW
  analysis.claude_response.processed_content;  // OLD (fallback)
```

### **Phase 2: Write New, Read Both**

```javascript
// Write with new names
await saveAnalysis({
  claude_text: originalFromClaude,
  display_text: withLinks,

  // ALSO save with old names for backwards compat
  raw_content: originalFromClaude,
  processed_content: withLinks
});
```

### **Phase 3: Migrate Existing Records**

```sql
-- Add new fields with same data
UPDATE movie_analyses
SET claude_response = jsonb_set(
  jsonb_set(
    claude_response,
    '{claude_text}',
    claude_response->'raw_content'
  ),
  '{display_text}',
  claude_response->'processed_content'
);
```

### **Phase 4: Remove Old Fields (6 months later)**

```sql
-- Once all code uses new names
UPDATE movie_analyses
SET claude_response = claude_response - 'raw_content' - 'processed_content';
```

---

## Alternative: Just Add Comments (Zero Risk)

If renaming is too much work, just add clear comments:

```javascript
// CURRENT CODE WITH COMMENTS
{
  raw_content: "...",       // Direct from Claude API, no modifications
  processed_content: "..."  // HTML links added, ready for browser display
}

// API layer
const originalFromClaude = analysis.claude_response.raw_content;    // Backup/debugging
const readyForBrowser = analysis.claude_response.processed_content; // Primary display
```

---

## Recommendation

**Do this NOW (zero risk):**
```javascript
// Add clear variable names in code
const claudeText = analysis.claude_response.raw_content;           // From Claude API
const displayText = analysis.claude_response.processed_content;    // For browser
```

**Do this LATER (when bandwidth allows):**
- Rename database fields to `claude_text` and `display_text`
- Update all references
- Migrate existing records

---

**Impact:**
- Zero breaking changes (just better variable names)
- Makes code self-documenting
- Easy to understand 6 months from now

**Last Updated:** 2025-09-29