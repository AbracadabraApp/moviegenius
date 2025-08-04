# Code Review: Fix Movie Page 404 Errors in Production

## Problem Statement

**Issue**: Movie pages work perfectly in development but return "An error 404 occurred on server" in production, while episode pages work fine in both environments.

**Symptoms**:
- Development: `http://localhost:3000/movie/11` loads Star Wars page successfully
- Production: `https://moviegenius.ai/movie/11` returns HTML with "An error 404 occurred on server"
- Test pages: Even minimal Hello World test pages fail with same pattern

**Root Cause**: Railway production environment does not support Next.js runtime static generation (`fallback: 'blocking'`). Movie pages rely on on-demand generation while episode pages pre-generate all paths at build time.

## Current Code Analysis

### 🟢 Working Implementation (Episode Pages)

**File: `pages/[theme]/[episode].js`**

```javascript
// Working episode page getStaticPaths (lines 507-530)
export async function getStaticPaths() {
  const paths = [];

  // Generate paths for all theme/episode combinations
  Object.keys(themeMapping.themes).forEach(themeId => {
    const theme = themeMapping.themes[themeId];
    theme.episodes.forEach(episode => {
      paths.push({
        params: {
          theme: themeId,
          episode: episode.id,
        },
      });
    });
  });

  console.log(`🚀 Generated ${paths.length} static episode paths`);

  return {
    paths,
    fallback: false, // All paths must be pre-generated for production
  };
}

export async function getStaticProps({ params }) {
  const { theme, episode } = params;

  try {
    // Validate theme exists
    const themeData = themeMapping.themes[theme];
    if (!themeData) {
      return { notFound: true };
    }

    // Find the episode in the theme
    const episodeInfo = themeData.episodes.find(ep => ep.id === episode);
    if (!episodeInfo) {
      return { notFound: true };
    }

    // Load episode content from JSON file
    const fs = await import('fs');
    const path = await import('path');

    const episodeFilePath = path.default.join(process.cwd(), 'data', 'episodes', episodeInfo.file);

    if (!fs.default.existsSync(episodeFilePath)) {
      console.error(`Episode file not found: ${episodeInfo.file}`);
      return { notFound: true };
    }

    const episodeContent = JSON.parse(fs.default.readFileSync(episodeFilePath, 'utf8'));

    // Merge episode info with content
    const episodeData = {
      ...episodeInfo,
      ...episodeContent,
      theme: themeData,
    };

    return {
      props: {
        theme,
        episode,
        episodeData,
        themeData,
      },
      revalidate: 86400, // Revalidate once per day
    };
  } catch (error) {
    console.error('Error loading episode data:', error);
    return { notFound: true };
  }
}
```

**Why it works**: 
- Pre-generates all possible paths at build time from `theme-episode-mapping.json`
- Uses `fallback: false` - no runtime generation needed
- Creates static HTML files during build process

### 🔴 Broken Implementation (Movie Pages)

**File: `pages/movie/[id].js` (Current - Lines 572-598)**

```javascript
// Broken movie page getStaticPaths
export async function getStaticPaths() {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables in getStaticPaths');
      return {
        paths: [],
        fallback: 'blocking',
      };
    }

    // Skip database paths for now due to Supabase client issues in getStaticPaths
    // Use fallback: 'blocking' to generate paths on demand
    console.log('Using fallback blocking for all movie paths');
    return {
      paths: [],        // PROBLEM: Empty paths array
      fallback: 'blocking', // PROBLEM: Relies on runtime generation
    };
  } catch (error) {
    console.error('Static paths error:', error);
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
}
```

**Complex getStaticProps (Lines 154-570)** - 400+ lines handling:
- Nuclear static file checking
- Dynamic imports
- Database queries
- TMDB API fallbacks
- Analysis generation
- Movie link processing

**Why it fails**:
- Empty `paths: []` array - no static files generated at build time
- `fallback: 'blocking'` requires runtime static generation
- Railway production doesn't support runtime static generation
- Results in 404 because no static files exist and can't generate at runtime

### 🔴 Test Pages (Also Broken)

**Files: `pages/test-movie/step1-hello/[id].js`, `step2-static-title/[id].js`, `step3-static-poster/[id].js`**

```javascript
// Current test page getStaticPaths (all three files)
export async function getStaticPaths() {
  return {
    paths: [
      { params: { id: '11' } },   // Star Wars
      { params: { id: '550' } },  // Fight Club  
      { params: { id: '238' } }   // Godfather
    ],
    fallback: 'blocking'  // PROBLEM: Should be 'false' for known paths
  };
}
```

**Why they fail**: Using `fallback: 'blocking'` unnecessarily when all paths are known.

## Proposed Fixes

### Fix 1: Update Test Pages (Immediate Validation)

**Change all test page `getStaticPaths` from:**
```javascript
fallback: 'blocking'
```

**To:**
```javascript
fallback: false  // All paths are pre-defined
```

**Complete fixed test page example:**

```javascript
// Fixed: pages/test-movie/step1-hello/[id].js
export async function getStaticPaths() {
  return {
    paths: [
      { params: { id: '11' } },   // Star Wars
      { params: { id: '550' } },  // Fight Club  
      { params: { id: '238' } }   // Godfather
    ],
    fallback: false // Pre-generate these exact paths only
  };
}
```

### Fix 2: Movie Pages - Pre-generate Popular Movies

**Replace current `getStaticPaths` (lines 572-598) with:**

```javascript
export async function getStaticPaths() {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables in getStaticPaths');
      return {
        paths: [],
        fallback: 'blocking',
      };
    }

    // Import dependencies for build-time path generation
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get top 100 popular movies for pre-generation
    const { data: movies, error } = await supabase
      .from('movies')
      .select('tmdb_id')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (error) {
      console.error('Database query error in getStaticPaths:', error);
      return {
        paths: [],
        fallback: 'blocking',
      };
    }
    
    const paths = movies?.map(movie => ({
      params: { id: movie.tmdb_id.toString() }
    })) || [];
    
    console.log(`🚀 Pre-generating ${paths.length} popular movie paths`);
    
    return {
      paths,
      fallback: 'blocking' // Still needed for less popular movies
    };
  } catch (error) {
    console.error('getStaticPaths error:', error);
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
}
```

**Keep existing `getStaticProps`** - No changes needed (lines 154-570)

### Fix 3: Alternative - Hybrid Approach (If database query is unreliable)

```javascript
export async function getStaticPaths() {
  // Pre-generate known popular movie paths
  const popularMoviePaths = [
    { params: { id: '11' } },     // Star Wars
    { params: { id: '550' } },    // Fight Club
    { params: { id: '238' } },    // The Godfather
    { params: { id: '424' } },    // Schindler's List
    { params: { id: '389' } },    // 12 Angry Men
    { params: { id: '129' } },    // Spirited Away
    { params: { id: '19404' } },  // Dilwale Dulhania Le Jayenge
    { params: { id: '278' } },    // The Shawshank Redemption
    { params: { id: '372058' } }, // Your Name
    { params: { id: '122' } },    // The Lord of the Rings: The Return of the King
    // Add more popular movies as needed
  ];
  
  console.log(`🚀 Pre-generating ${popularMoviePaths.length} popular movie paths`);
  
  return {
    paths: popularMoviePaths,
    fallback: 'blocking' // For movies not in the list
  };
}
```

## Test Plan

### Phase 1: Validate Fix with Test Pages (Low Risk)

1. **Update test pages** to use `fallback: false`
   - Modify `pages/test-movie/step1-hello/[id].js`
   - Modify `pages/test-movie/step2-static-title/[id].js`
   - Modify `pages/test-movie/step3-static-poster/[id].js`

2. **Test locally**:
   ```bash
   npm run build
   npm run start
   # Test: http://localhost:3000/test-movie/step1-hello/11
   ```

3. **Deploy and test production**:
   - Test: `https://moviegenius.ai/test-movie/step1-hello/11`
   - Expected: Should work immediately

### Phase 2: Implement Movie Page Fix (Medium Risk)

1. **Apply Fix 2** (database approach) or **Fix 3** (hardcoded popular movies)

2. **Build locally and verify**:
   ```bash
   npm run build
   # Check: ls .next/server/pages/movie/
   # Should see: 11.html, 550.html, 238.html, etc.
   ```

3. **Deploy and test**:
   - Test known movies: `/movie/11`, `/movie/550`, `/movie/238`
   - Test unknown movie: `/movie/999999` (should work via fallback)

### Phase 3: Production Validation

1. **Performance testing**:
   - Pre-generated movies should load <200ms
   - Unknown movies should still work (slower via fallback)

2. **Monitor Railway logs** for build-time generation

3. **Verify static files** are being created and served

## Files to Modify

### Test Pages (Phase 1)
- `pages/test-movie/step1-hello/[id].js` - Change `fallback: 'blocking'` to `fallback: false`
- `pages/test-movie/step2-static-title/[id].js` - Same change
- `pages/test-movie/step3-static-poster/[id].js` - Same change

### Movie Pages (Phase 2)
- `pages/movie/[id].js` - Replace `getStaticPaths` function (lines 572-598)

## Risk Assessment

**Low Risk Changes**:
- Test page fixes (Phase 1)
- Easy to revert if issues occur

**Medium Risk Changes**:
- Movie page `getStaticPaths` modification
- Could affect database queries during build
- Maintains fallback for unknown movies

**Benefits**:
- ✅ Eliminates production 404 errors
- ✅ Improves performance for popular movies
- ✅ Maintains dynamic capability for new movies
- ✅ Follows proven episode page pattern

**Potential Issues**:
- Build time may increase (generating 100 static pages)
- Database queries during build (mitigated by try/catch)
- Memory usage during build (manageable for 100 pages)

## Success Criteria

**Phase 1 Success (Test Pages)**:
- ✅ `/test-movie/step1-hello/11` works in production
- ✅ `/test-movie/step2-static-title/11` works in production  
- ✅ `/test-movie/step3-static-poster/11` works in production
- ✅ No 404 errors, immediate loading

**Phase 2 Success (Movie Pages)**:
- ✅ Popular movie pages work in production without 404 errors
- ✅ Popular movies load instantly (<200ms)
- ✅ Unknown movies still work via fallback mechanism
- ✅ No regression in development experience
- ✅ Build completes successfully with pre-generated paths

**Overall Success**:
- ✅ Issue resolved: "HTML arrives but page redirects to error" eliminated
- ✅ Performance improved for popular content
- ✅ System maintains flexibility for new content
- ✅ Development workflow unchanged

## Conclusion

This fix addresses the fundamental mismatch between development (runtime generation works) and production (runtime generation fails) by adopting the proven episode page strategy of pre-generating static files at build time.

The solution is low-risk, testable in phases, and maintains backward compatibility while solving the core production 404 issue.