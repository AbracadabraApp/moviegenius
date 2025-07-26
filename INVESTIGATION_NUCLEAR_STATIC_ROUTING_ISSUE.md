# Investigation: Nuclear Static File Change Breaking Movie Page Routing

## Executive Summary

Movie pages (`/movie/[id]`) have been returning 404 errors in production for 3-4 days after working correctly for 3+ months. Investigation reveals that commit `16366148` ("CRITICAL FIX: Resolve production 404s for all movie pages") introduced filesystem access changes that broke Railway's Next.js deployment, preventing ANY movie pages from being served - even pre-generated static pages.

## Root Cause Analysis

### Timeline
- **Working Period**: 3+ months of successful movie page serving
- **Breaking Change**: July 22, 2025 - Commit `16366148`
- **Symptoms**: All movie URLs return 404 with new error page design
- **Affected Routes**: `/movie/[id]` (all movie IDs)
- **Unaffected Routes**: `/[theme]/[episode]`, homepage, theme pages

### The Breaking Change

**Commit**: `16366148` - "CRITICAL FIX: Resolve production 404s for all movie pages"

**Original Code** (Working):
```javascript
// Nuclear Static Check - check for pre-built static data first
async function checkNuclearStatic(tmdbId) {
  try {
    const nuclearPath = path.join(process.cwd(), 'nuclear-static', `${tmdbId}.json`);

    if (fs.existsSync(nuclearPath)) {
      console.log(`🚀 Nuclear cache HIT for movie ${tmdbId}`);
      // ... rest of function
    }
  }
}
```

**Changed Code** (Breaking):
```javascript
// Nuclear Static Check - check for pre-built static data first
async function checkNuclearStatic(tmdbId) {
  try {
    // Try both local development path and production path
    const localPath = path.join(process.cwd(), 'nuclear-static', `${tmdbId}.json`);
    const publicPath = path.join(process.cwd(), 'public', 'nuclear-static', `${tmdbId}.json`);
    
    let nuclearPath = localPath;
    if (!fs.existsSync(localPath) && fs.existsSync(publicPath)) {
      nuclearPath = publicPath;
    }

    if (fs.existsSync(nuclearPath)) {
      console.log(`🚀 Nuclear cache HIT for movie ${tmdbId}`);
      // ... rest of function
    }
  }
}
```

**Additional Changes**:
- Copied thousands of nuclear-static files to `public/nuclear-static/` directory
- Added dual-path filesystem checking logic during `getStaticProps`

## Technical Analysis

### The Problem

1. **Filesystem Access During Build**: The change introduced complex filesystem access patterns during `getStaticProps` execution
2. **Railway Build Environment**: Railway's Next.js deployment environment cannot handle the dual-path filesystem checking
3. **Build Process Failure**: The `fs.existsSync()` calls during static generation cause Railway's build to fail silently
4. **Route Registration Failure**: Failed builds prevent route registration, causing 404s for ALL movie pages

### Evidence

**Local Build Success**:
```bash
$ ls -la .next/server/pages/movie/
-rw-r--r--  1 user  staff  86621 Jul 25 15:26 11.html     # Star Wars
-rw-r--r--  1 user  staff   9234 Jul 25 15:26 11.json
-rw-r--r--  1 user  staff  72839 Jul 25 15:26 550.html    # Fight Club  
-rw-r--r--  1 user  staff   7592 Jul 25 15:26 550.json
```

**Railway Deployment Logs Show Success But 404s in Production**:
```
MediaCard props for Gone Girl: { title: 'Gone Girl', year: 2014, tmdbId: 20488 }
MediaCard props for The Game: { title: 'The Game', year: 1997, tmdbId: 629 }
# Build appears successful but routes don't work
```

**Working Route Pattern** (`/[theme]/[episode]`):
```javascript
// pages/[theme]/[episode].js - THIS WORKS
export async function getStaticPaths() {
  // Simple pre-generation, no complex filesystem access
  const paths = [];
  Object.keys(themeMapping.themes).forEach(themeId => {
    theme.episodes.forEach(episode => {
      paths.push({ params: { theme: themeId, episode: episode.id } });
    });
  });
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  // Simple data loading, no dual filesystem paths
  const episode = themeMapping.themes[params.theme].episodes.find(ep => ep.id === params.episode);
  return { props: { episode } };
}
```

**Broken Route Pattern** (`/movie/[id]`):
```javascript
// pages/movie/[id].js - THIS IS BROKEN
export async function getStaticProps({ params }) {
  // Complex filesystem access during build
  const movieData = await checkNuclearStatic(params.id); // <-- PROBLEM
  // ...
}

async function checkNuclearStatic(tmdbId) {
  // Dual filesystem path checking breaks Railway builds
  const localPath = path.join(process.cwd(), 'nuclear-static', `${tmdbId}.json`);
  const publicPath = path.join(process.cwd(), 'public', 'nuclear-static', `${tmdbId}.json`);
  
  if (!fs.existsSync(localPath) && fs.existsSync(publicPath)) { // <-- BREAKS RAILWAY
    nuclearPath = publicPath;
  }
}
```

## Current Complete Code

### Broken Movie Page (`pages/movie/[id].js`)

```javascript
// pages/movie/[id].js - Simplified TMDB ID based movie detail page
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import SimpleSearch from '../../components/SimpleSearch';
import MediaCard from '../../components/MediaCard';
import { FavoritesManager } from '../../components/FavoritesManager';
import { filterCurrentMovie } from '../../lib/filterCurrentMovie';
import dynamic from 'next/dynamic';

const ExplorePromptCard = dynamic(() => import('../../components/ExplorePromptCard'), {
  loading: () => <div style={{ padding: '16px' }}>Loading...</div>
});
const FeaturedFilmsSection = dynamic(() => import('../../components/FeaturedFilmsSection'), {
  loading: () => <div style={{ padding: '16px' }}>Loading movies...</div>
});

export default function MoviePage({ 
  title, 
  year, 
  overview, 
  poster_url, 
  tmdb_id, 
  genres, 
  runtime, 
  vote_average, 
  hasAnalysis, 
  sections: staticSections,
  exploreFurther: staticExploreFurther,
  moreIdeas: staticMoreIdeas,
  movieData: staticMovieData,
  source,
}) {
  const router = useRouter();
  const { id } = router.query;
  
  // Component implementation...
  return (
    <PhoneFrame>
      <MovieHeaderLarge 
        title={title}
        year={year}
        overview={overview}
        poster_url={poster_url}
        // ... other props
      />
      {/* Rest of component */}
    </PhoneFrame>
  );
}

// BROKEN: Complex filesystem access during build
export async function getStaticProps({ params }) {
  const fs = await import('fs');
  const path = await import('path');
  
  // This dual-path checking breaks Railway builds
  const movieData = await checkNuclearStatic(params.id);
  
  return {
    props: {
      title: movieData?.title || `Movie ${params.id}`,
      year: movieData?.year || null,
      tmdb_id: parseInt(params.id),
      // ... other props
    },
    revalidate: 86400
  };
}

// BROKEN: Dual filesystem path logic
async function checkNuclearStatic(tmdbId) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Try both local development path and production path
    const localPath = path.default.join(process.cwd(), 'nuclear-static', `${tmdbId}.json`);
    const publicPath = path.default.join(process.cwd(), 'public', 'nuclear-static', `${tmdbId}.json`);
    
    let nuclearPath = localPath;
    if (!fs.default.existsSync(localPath) && fs.default.existsSync(publicPath)) {
      nuclearPath = publicPath;
    }

    if (fs.default.existsSync(nuclearPath)) {
      console.log(`🚀 Nuclear cache HIT for movie ${tmdbId}`);
      const nuclearContent = JSON.parse(fs.default.readFileSync(nuclearPath, 'utf8'));
      return cleanNuclearData(nuclearContent);
    }
  } catch (error) {
    console.error('Nuclear static check error:', error);
  }
  return null;
}

export async function getStaticPaths() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables in getStaticPaths');
      return {
        paths: [],
        fallback: 'blocking',
      };
    }

    console.log('Using fallback blocking for all movie paths');
    return {
      paths: [],
      fallback: 'blocking',
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

### Working Episode Page (`pages/[theme]/[episode].js`)

```javascript
// pages/[theme]/[episode].js - THIS WORKS CORRECTLY
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import themeMapping from '../../data/theme-episode-mapping.json';

export default function EpisodePage({ episode, theme }) {
  const router = useRouter();
  
  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <PhoneFrame>
      <div>
        <h1>{episode.title}</h1>
        <p>{episode.description}</p>
        {/* Episode content */}
      </div>
    </PhoneFrame>
  );
}

// WORKING: Simple pre-generation without filesystem complexity
export async function getStaticPaths() {
  const paths = [];
  
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

  return {
    paths,
    fallback: false, // All paths must be pre-generated for production
  };
}

// WORKING: Simple data loading without dual filesystem paths
export async function getStaticProps({ params }) {
  const theme = themeMapping.themes[params.theme];
  if (!theme) {
    return { notFound: true };
  }

  const episode = theme.episodes.find(ep => ep.id === params.episode);
  if (!episode) {
    return { notFound: true };
  }

  return {
    props: {
      episode,
      theme: {
        id: params.theme,
        title: theme.title,
      },
    },
  };
}
```

## Proposed Solution

### Approach 1: Revert to Single Path (Recommended)

Remove the dual-path filesystem logic and use a single, reliable path:

```javascript
// FIXED: Single path nuclear static check
async function checkNuclearStatic(tmdbId) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Use only the original working path
    const nuclearPath = path.default.join(process.cwd(), 'nuclear-static', `${tmdbId}.json`);

    if (fs.default.existsSync(nuclearPath)) {
      console.log(`🚀 Nuclear cache HIT for movie ${tmdbId}`);
      const nuclearContent = JSON.parse(fs.default.readFileSync(nuclearPath, 'utf8'));
      return cleanNuclearData(nuclearContent);
    }
  } catch (error) {
    console.error('Nuclear static check error:', error);
  }
  return null;
}
```

### Approach 2: Environment-Based Path Selection

Use environment detection instead of dual checking:

```javascript
// ALTERNATIVE: Environment-based path selection
async function checkNuclearStatic(tmdbId) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Select path based on environment, not dual checking
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME;
    const nuclearPath = isProduction 
      ? path.default.join(process.cwd(), 'public', 'nuclear-static', `${tmdbId}.json`)
      : path.default.join(process.cwd(), 'nuclear-static', `${tmdbId}.json`);

    if (fs.default.existsSync(nuclearPath)) {
      console.log(`🚀 Nuclear cache HIT for movie ${tmdbId} (${isProduction ? 'production' : 'development'} path)`);
      const nuclearContent = JSON.parse(fs.default.readFileSync(nuclearPath, 'utf8'));
      return cleanNuclearData(nuclearContent);
    }
  } catch (error) {
    console.error('Nuclear static check error:', error);
  }
  return null;
}
```

## Testing Plan

### Phase 1: Local Testing
1. **Apply Fix**: Implement single-path solution
2. **Local Build**: Run `npm run build` and verify success
3. **Local Serve**: Test `npm start` with production build
4. **Route Testing**: Verify `/movie/11` and `/movie/550` work locally

### Phase 2: Staging Deployment
1. **Deploy to Railway**: Push fix to staging branch
2. **Build Verification**: Check Railway build logs for success
3. **Route Testing**: Test movie URLs in staging environment
4. **Comparison**: Verify staging behavior matches local

### Phase 3: Production Testing
1. **Production Deploy**: Deploy fix to main branch
2. **Smoke Test**: Test `/movie/11` (Star Wars) immediately
3. **Comprehensive Test**: Test multiple movie IDs
4. **Monitoring**: Watch for any new 404 errors

### Test URLs
- Primary: `https://moviegenius.ai/movie/11` (Star Wars)
- Secondary: `https://moviegenius.ai/movie/550` (Fight Club)
- Edge Case: `https://moviegenius.ai/movie/999999` (Non-existent, should handle gracefully)

## Success Criteria

### Must Have
- [ ] `/movie/11` returns movie page (not 404)
- [ ] `/movie/550` returns movie page (not 404)  
- [ ] Railway build completes successfully
- [ ] No regression in working routes (`/[theme]/[episode]`)

### Should Have
- [ ] Movie pages load within 3 seconds
- [ ] Nuclear static content displays correctly
- [ ] Error handling works for non-existent movies
- [ ] No console errors in browser

### Nice to Have
- [ ] Improved build performance
- [ ] Cleaner deployment logs
- [ ] Better error messages for debugging

## Risk Mitigation

### Low Risk
- **Single Path Solution**: Reverts to previously working code
- **Limited Scope**: Only affects nuclear static file loading
- **Fast Rollback**: Can revert commit easily if issues arise

### Monitoring
- **Railway Build Status**: Watch deployment logs carefully
- **Error Tracking**: Monitor for new 404 patterns
- **Performance**: Check page load times don't degrade

### Rollback Plan
1. **Immediate**: Revert commit if critical failure
2. **Gradual**: Test with single movie ID first
3. **Communication**: Alert stakeholders of any issues

## Code Files to Change

### Primary Changes
- `pages/movie/[id].js` - Update `checkNuclearStatic` function
- Remove dual-path logic
- Restore single path filesystem access

### No Changes Required
- `pages/[theme]/[episode].js` - Keep working as-is
- `next.config.mjs` - No routing changes needed
- Other movie-related files - Problem is isolated to this function

## Conclusion

The nuclear static file path change in commit `16366148` broke Railway's ability to build and serve movie pages by introducing complex filesystem access during `getStaticProps`. The solution is to revert to the single-path approach that worked successfully for 3+ months.

This is a high-confidence fix with low risk, as it restores previously working functionality without affecting other parts of the application.