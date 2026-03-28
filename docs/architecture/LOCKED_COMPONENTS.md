# 🔒 LOCKED COMPONENTS - DO NOT MODIFY

## Movie Page Architecture - LOCKED 2025-07-02

**CRITICAL**: These components are LOCKED against modification to prevent
architectural reversions.

### Core Movie Page Components (LOCKED)

#### 1. `/pages/movie/[id].js`

- **Lock Date**: 2025-07-02
- **Status**: PRODUCTION READY
- **Features**: ISR, TMDB discovery, analysis integration
- **DO NOT MODIFY**: Core routing, getStaticProps, getStaticPaths

**CRITICAL — Line 194:**
```jsx
initialSlug={streaming?.slug || movie?.overview}
```
`streaming?.slug` is the app's own database slug (curated description).
`movie?.overview` is the TMDB plot summary — **fallback only**.
Do NOT revert this to `movie?.overview` alone. Doing so causes the You page to display TMDB summaries instead of app slugs for all hearted/bookmarked movies. This regression has occurred before (2025-03-28).

#### 2. `/components/MovieHeaderLarge.js`

- **Lock Date**: 2025-07-02
- **Status**: PRODUCTION READY
- **Features**: Trailer integration, Add/Seen buttons, poster display
- **DO NOT MODIFY**: Layout, button functionality, trailer logic

#### 3. `/components/MediaCard.js`

- **Lock Date**: 2025-07-02
- **Status**: PRODUCTION READY
- **Features**: Two-row layout, organic slug generation, favorites
- **DO NOT MODIFY**: Card structure, favorites integration

#### 4. `/lib/services/analysis-service.js`

- **Lock Date**: 2025-07-02
- **Status**: PRODUCTION READY
- **Features**: TMDB lookup enhancement, caching, batch processing
- **DO NOT MODIFY**: Core analysis logic, TMDB integration

### API Endpoints (LOCKED)

#### 1. `/pages/api/generate-organic-slug.js`

- **Lock Date**: 2025-07-02
- **Purpose**: Organic tagline generation
- **DO NOT MODIFY**: Prevents TMDB summary contamination

#### 2. `/pages/api/enhance-movie-data.js`

- **Lock Date**: 2025-07-02
- **Status**: DEPRECATED - LOCKED AGAINST USE
- **Purpose**: Protected API to prevent summary contamination

#### 3. `/pages/api/tmdb-trailer.js`

- **Lock Date**: 2025-07-02
- **Purpose**: YouTube trailer integration
- **DO NOT MODIFY**: Trailer fetching logic

### Configuration (LOCKED)

#### 1. `next.config.js`

- **Lock Date**: 2025-07-02
- **Status**: OPTIMIZED FOR RAILWAY
- **DO NOT MODIFY**: Performance optimizations, caching headers

## Protection Mechanism

### Before ANY modification to locked components:

1. **Create backup**: `cp component.js component.js.BACKUP-$(date +%Y%m%d)`
2. **Document reason**: Update this file with justification
3. **Test thoroughly**: Run full test suite
4. **Get approval**: Confirm changes won't break production

### Recovery Commands

```bash
# If locked component gets corrupted, restore from git:
git checkout HEAD~1 -- pages/movie/[id].js
git checkout HEAD~1 -- components/MovieHeaderLarge.js
git checkout HEAD~1 -- components/MediaCard.js

# Or restore from backup:
cp components/MovieHeaderLarge.js.BACKUP-20250702 components/MovieHeaderLarge.js
```

### Violation Detection

If you see unexpected behavior in movie pages:

1. Check git diff against locked components
2. Restore from this commit: `MOVIE_PAGE_LOCK_2025_07_02`
3. Document what caused the reversion

## Emergency Override

Only in production emergencies:

1. Create issue documenting the emergency
2. Make minimal changes only
3. Update lock date and version
4. Re-test entire movie page workflow

**Remember**: These locks exist because of "runaway evolutionary architecture"
that caused months of reversions.
