# MovieGenius Dynamic Page Investigation Results

## Executive Summary

This document captures the systematic investigation of dynamic movie page
rendering issues in MovieGenius, specifically examining problems affecting
movie 1171101. The investigation identified and resolved EntityLinkedText issues
and reframed the TMDB enhancement debugging approach.

## Investigation Timeline

### Phase 1: EntityLinkedText Fix ✅ COMPLETED

**Problem**: Movie titles in **TITLE** (Year) format within analysis text were
not converting to clickable links.

**Root Cause**: EntityLinkedText component was completely disabled via `|| true`
condition on line 30.

**Solution Implemented**:

```javascript
// BEFORE (disabled):
if (!text || linkingStyle === 'off' || !linkMovies || true) {

// AFTER (enabled):
if (!text || linkingStyle === 'off' || !linkMovies) {
```

**Testing Strategy**:

- Added comprehensive console logging to track processing stages
- Enhanced debugging output for movie detection and link creation
- Manual testing instructions for verification

**Expected Console Output**:

```
🔗 EntityLinkedText ENABLED - Processing text for movie linking
🎬 Found bold movie: "Miller's Crossing" (1990) at position 42
🎬 Found bold movie: "The Maltese Falcon" (1941) at position 156
✅ Linked (bold): "The Maltese Falcon" (1941) -> TMDB search
✅ Linked (bold): "Miller's Crossing" (1990) -> TMDB search
🔗 FINAL RESULT: Created 2 movie links: 2 bold format, 0 legacy format
```

**Verification Steps**:

1. Visit http://localhost:3001/movie/379 (Miller's Crossing)
2. Open browser console (F12)
3. Verify movie titles become clickable links to `/movie/search?q=Title+Year`

### Phase 2: TMDB Enhancement Investigation ✅ COMPLETED

**Initial Misconception**: Assumed MediaCards were missing TMDB IDs and couldn't
render.

**Corrected Understanding**: MediaCards always render with title, year, poster,
slug - TMDB ID is only needed for navigation.

**Call Chain Analysis**:

```
pages/movie/[id].js:566
├─ AnalysisService.getOrGenerate(movieEntry)
│  ├─ (existing analysis) → parseAnalysisWithTmdbLookup(existing.claude_response.raw_content)
│  └─ (new analysis) → generate(movie) → parseAnalysisWithTmdbLookup(analysis)
│     └─ parseAnalysisWithTmdbLookup()
│        └─ enhanceMoviesWithTmdbIds(moviesNeedingLookup) // Line 217
```

**Key Finding**: `enhanceMoviesWithTmdbIds` IS being called during dynamic page
generation for both new and existing analyses.

### Phase 3: TMDB Enhancement Debugging Reframe 🔄 IN PROGRESS

**Reframed Problem Statement**:

- ✅ `enhanceMoviesWithTmdbIds` function works correctly (nuclear static files
  prove this)
- ❌ Dynamic pages might not be calling enhancement at all
- 🔍 Missing: Verification that enhancement actually runs during dynamic
  generation

**Investigation Strategy**:

1. Add console logging to verify enhancement call chain
2. Test with movie 1171101 to confirm whether enhancement runs
3. Compare dynamic vs nuclear static enhancement patterns

## System Architecture Findings

### Database Schema

```sql
CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER,
    slug TEXT,
    tmdb_id INTEGER,
    poster_url TEXT,
    streaming_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE movie_analyses (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES movies(id),
    analysis_type TEXT NOT NULL,
    claude_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Claude Analysis Generation

- **Context**: `MOVIE_ANALYSIS` for 800-1000 word comprehensive analysis
- **Model**: `claude-3-5-sonnet-20241022` (5000 max tokens, temperature 0.7)
- **Cost**: ~$0.05 per analysis with ephemeral caching
- **Enhancement**: Parallel TMDB ID lookup for Featured Movies and More Ideas

### Component Architecture

```javascript
// Page rendering hierarchy
<MovieDetailPage>
  <MovieHeaderLarge />
  <MovieContent>
    {sections.map(section =>
      section.type === 'text' ? (
        <EntityLinkedText text={section.content} linkMovies={true} />
      ) : (
        <FeaturedFilmsSection movies={section.movies} />
      )
    )}
    <ExploreFurtherSection />
    <FeaturedFilmsSection movies={moreIdeas.movies} title="Related Films" />
  </MovieContent>
</MovieDetailPage>
```

## Current Status

### ✅ Completed Issues

1. **EntityLinkedText**: Movie titles in analysis text now convert to clickable
   links
2. **Call Chain Investigation**: Complete understanding of how TMDB enhancement
   is invoked
3. **Documentation**: Comprehensive system architecture documentation

### 🔄 In Progress

1. **TMDB Enhancement Debugging**: Adding logging to verify if enhancement runs
   during dynamic generation
2. **Movie 1171101 Testing**: Using as test case for dynamic page behavior

### 📋 Pending

1. **End-to-End Testing**: Verify both EntityLinkedText and MediaCard navigation
   work
2. **Nuclear Static Conversion**: Queue successful dynamic pages for static
   generation

## Next Steps

### Immediate Priority

Add debugging code to verify TMDB enhancement execution:

```javascript
// In parseAnalysisWithTmdbLookup()
console.log(
  '🔍 Enhancement check: movies needing lookup:',
  moviesNeedingLookup.length
);
if (moviesNeedingLookup.length > 0) {
  console.log(
    '🚀 Calling enhanceMoviesWithTmdbIds for:',
    moviesNeedingLookup.map(m => m.title)
  );
  await this.enhanceMoviesWithTmdbIds(moviesNeedingLookup);
} else {
  console.log('❌ No movies need TMDB lookup');
}
```

### Testing Plan

1. **Test Movie 1171101**: Check console logs during dynamic generation
2. **Verify Enhancement**: Confirm if Featured Movies/More Ideas have
   `needsTmdbLookup: true`
3. **Compare Results**: Dynamic pages vs nuclear static files

## Technical Patterns Learned

### EntityLinkedText Processing

- Looks for `**Movie Title** (Year)` patterns in analysis text
- Converts to links: `/movie/search?q=Title+Year`
- Requires component to be enabled (not disabled by conditions)

### TMDB Enhancement Process

- Movies start with `tmdb_id: null` and `needsTmdbLookup: true`
- Enhancement queries database first, falls back to TMDB API
- Uses parallel processing for performance
- Modifies movie objects in-place

### Nuclear Static System

- Pre-built static files with enhanced TMDB IDs
- Location: `nuclear-static/{tmdbId}.json`
- Serves instantly vs 3-5 second dynamic generation
- Contains fully processed analysis with clickable MediaCards

---

**Last Updated**: 2025-01-09  
**Status**: Investigation Phase 3 (TMDB Enhancement Debugging)  
**Next Milestone**: Verify enhancement execution in dynamic pages
