# Static System Deployment TODO

## Overview
Multi-source static generator is ready for production deployment. System generates enhanced static files that enable TIER 1 serving (zero API calls) for movie pages.

## Completed ✅
- Enhanced static format with `enhancedFormat: true` flag
- New contextual analysis format (4 dynamic sections, 375-425 words)
- Why Watch integration from `enhanced_why_watch` table
- Graceful degradation (component failures isolated)
- Resilient architecture (Analysis → Streaming → Why Watch → Browse → Contributors → More Ideas)

## Deployment TODOs

### 1. Create Database Tables
```sql
CREATE TABLE IF NOT EXISTS enhanced_why_watch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES movie_analyses(id) ON DELETE CASCADE,
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
  tmdb_id INTEGER,
  recommendation VARCHAR(10), -- 'YES' or 'NO'
  reasoning TEXT,
  why_watch_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Run Component Builds
- **Why Watch**: `node scripts/batch-generate-why-watch.js` (21,275 movies)
- **More Ideas**: Create/run More Ideas batch generator 
- **Streaming**: Verify streaming data in database
- **Browse Collections**: Verify browse lists in `/public/data/movie-lists/`

### 3. Generate Static Files
```bash
# Generate enhanced static files for all 21,275 movies
node scripts/multi-source-static-generator.js --all --no-skip
```

### 4. Deploy Static Files
```bash
# Copy to public serving directory
node scripts/deploy-enhanced-static.js
```

### 5. Test TIER 1 Serving
- Movie page should show `🔍 Attempting enhanced static fetch` in console
- Should see `⚡ TIER 1: Using enhanced static file - zero API calls`
- Verify: Analysis sections, Why Watch, Browse Collections, Contributors display

## Cost Estimate
- Why Watch generation: ~$213 (21,275 × $0.01)
- More Ideas generation: ~$213 (21,275 × $0.01) 
- **Total: ~$426** for full static system deployment

## Performance Target
- **<100ms load time** for static pages (vs 2000ms+ for API calls)
- **Zero database calls** for TIER 1 serving
- **Graceful fallback** to TIER 2 (API) when static file missing

## Next Steps
1. Create `enhanced_why_watch` table
2. Run Why Watch batch generation 
3. Implement streaming data loading (TODO in multi-source generator)
4. Run full static generation
5. Deploy and test