# Navigation Test Verification

## Before Refactoring - Run These Tests

Before making any changes to the navigation code, run these tests to establish a baseline:

```bash
# Run all navigation tests
npm test -- __tests__/navigation.test.js __tests__/routes.test.js __tests__/navbar.test.js

# Or run them individually
npm test -- __tests__/navigation.test.js
npm test -- __tests__/routes.test.js  
npm test -- __tests__/navbar.test.js
```

## What These Tests Verify

### Navigation Flow Tests (`navigation.test.js`)
- ✅ Homepage contains all 10 theme routes with `/themes/` prefix
- ✅ All theme page files exist
- ✅ ThemeFooter uses correct `/themes/` routes
- ✅ EssentialMovies uses correct episode patterns
- ✅ EpisodeFooter uses correct theme/episode patterns
- ✅ Movie navigation uses correct patterns
- ✅ No components use old broken routes

### Route Validation Tests (`routes.test.js`)
- ✅ All theme page files exist and are structured correctly
- ✅ Static route files exist (/, /movies, /genius, /you)
- ✅ Dynamic route handlers exist ([theme]/[episode], movie/[id])
- ✅ Theme episode mapping data is valid
- ✅ No old theme route files exist in wrong locations
- ✅ All components have required dependencies

### NavBar Tests (`navbar.test.js`)
- ✅ Active state detection logic works for all route types
- ✅ Theme path detection correctly identifies `/themes/` routes
- ✅ Episode path detection correctly identifies theme episodes
- ✅ Invalid paths are not incorrectly marked as active
- ✅ Component renders without errors for all route types

## Expected Test Results

All tests should **PASS** with the current code. If any tests fail, it indicates:

1. **Navigation is already broken** - Fix before refactoring
2. **Test assumptions are wrong** - Update tests to match working behavior
3. **Missing dependencies** - Install required packages

## If Tests Fail

### Common Issues & Solutions

**Missing Dependencies:**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

**File Path Issues:**
- Check that all expected files exist
- Verify theme names match between components and files

**Route Pattern Mismatches:**
- Check if navigation patterns have changed
- Update test expectations to match working behavior

## After Refactoring

Run the same tests after each change to ensure no regressions:

```bash
# After updating each component
npm test -- __tests__/navigation.test.js

# Before committing changes
npm test
```

## Continuous Testing

Once refactoring is complete, integrate these tests into CI/CD:

```bash
# Add to GitHub Actions or similar
npm run test:ci
```

This ensures navigation never breaks again in future deployments.