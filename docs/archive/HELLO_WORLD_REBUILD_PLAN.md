# Hello World Movie Page Rebuild Plan

## Strategy: Incremental Complexity Addition

Start with absolute minimal working page, add one piece at a time until we find what breaks production.

## Phase 0: Ultra-Minimal Test
- **File**: `pages/movie/[id]-static.js` 
- **Test**: Visit `/movie/11-static`
- **Contains**: No getStaticProps, no imports, just basic JSX
- **Tests**: Whether the issue is in Next.js routing itself

## Phase 0.5: Minimal getStaticProps
- **File**: `pages/movie/[id]-minimal.js`
- **Test**: Visit `/movie/11-minimal` 
- **Contains**: Basic getStaticProps with just params
- **Tests**: Whether getStaticProps structure is the issue

## Phase 1: Hello World with PhoneFrame
- **File**: `pages/movie/[id]-hello.js`
- **Test**: Visit `/movie/11-hello` in both dev and production
- **Contains**: PhoneFrame import + basic content
- **Tests**: Whether PhoneFrame component causes issues

## Phase 2: Add Basic Movie Data
```javascript
// Add to getStaticProps:
const basicMovieData = {
  title: tmdbId === 11 ? 'Star Wars' : `Movie ${tmdbId}`,
  year: tmdbId === 11 ? '1977' : '2024'
};
```

## Phase 3: Add Database Connection
```javascript
// Import Supabase client
// Query basic movie record only
const { data: movie } = await supabase
  .from('movies')
  .select('title, year')
  .eq('tmdb_id', tmdbId)
  .single();
```

## Phase 4: Add Error Handling
```javascript
// Add try/catch around database calls
// Add error state rendering
```

## Phase 5: Add PhoneFrame Styling
```javascript
// Add the existing styles object
// Verify styling doesn't break anything
```

## Phase 6: Add SimpleSearch Component
```javascript
// Import and add SimpleSearch
// Test search functionality
```

## Phase 7: Add Movie Analysis Logic
```javascript
// Import AnalysisService
// Add nuclear static check
// Add analysis fetching
```

## Phase 8: Add Content Rendering
```javascript
// Add sections rendering
// Add movie header
// Add featured films
```

## Phase 9: Add Client-Side Features
```javascript
// Add search results handling
// Add movie navigation
// Add action buttons
```

## Phase 10: Add Debug Information
```javascript
// Add debug overlay
// Add comprehensive error reporting
```

## Testing Protocol for Each Phase

### Development Testing
```bash
npm run dev
# Visit http://localhost:3000/movie/11-hello
# Check browser console for errors
# Verify page renders correctly
```

### Production Testing  
```bash
npm run build
# Deploy to Railway
# Visit https://moviegenius.ai/movie/11-hello
# Compare with development version
```

## Breakpoint Identification

At each phase, if production breaks but development works:

1. **Immediate rollback** to previous working phase
2. **Isolate the exact change** that caused the break
3. **Test variations** of that change to find root cause
4. **Document the specific issue** before proceeding

## Expected Findings

Based on your symptoms ("HTML arrives but page redirects to error"):

- **Most likely break point**: Phase 7 (Analysis Logic) or Phase 8 (Content Rendering)
- **Suspected causes**: 
  - Console.log statements in render (already fixed)
  - Dynamic imports failing in production
  - Database connection issues
  - Nuclear static file loading
  - Hydration mismatches in content rendering

## Commands to Execute Plan

```bash
# Create hello world version
# Already created: pages/movie/[id]-hello.js

# Test Phase 1
npm run dev &
curl http://localhost:3000/movie/11-hello

# Build and test in production
npm run build
# Deploy and test https://moviegenius.ai/movie/11-hello

# For each subsequent phase:
# 1. Modify [id]-hello.js with next phase additions
# 2. Test development
# 3. Test production  
# 4. If production breaks, isolate and document the breaking change
```

## Success Criteria

- ✅ Each phase works in both development and production
- ✅ We can identify the exact component/logic that breaks production
- ✅ We have a minimal reproduction case for the production issue
- ✅ We can fix the root cause instead of adding more debugging

This approach should break you out of the circular debugging pattern and give you a definitive answer about what's causing the production redirects.