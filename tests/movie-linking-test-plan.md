# Movie Linking System Test Plan

## Critical Test Categories

### 1. Data Integrity Protection Tests
```javascript
// Test existing linked content is never modified
test('preserves existing linked content unchanged', () => {
  const existingLinked = 'Analysis of <a href="/movie/100">Lock Stock</a> (1998) shows...';
  const result = processMovieLinks(existingLinked);
  expect(result).toBe(existingLinked); // Should be identical
});

// Test three-tier classification
test('correctly identifies content tiers', () => {
  expect(hasLinks('Contains <a href="/movie/123">Movie</a>')).toBe(true);
  expect(hasLinks('Contains **Movie** (1999) but no links')).toBe(false);
  expect(hasLinks('')).toBe(false);
});
```

### 2. Movie Detection & Matching Tests
```javascript
// Test exact title matching
test('links exact movie title matches', () => {
  const content = 'Analysis of **Lock, Stock and Two Smoking Barrels** (1998)';
  const result = processMovieLinks(content);
  expect(result).toContain('<a href="/movie/100"');
});

// Test title collision handling
test('handles movies with same title different years', () => {
  const content = '**Scarface** (1932) and **Scarface** (1983)';
  const result = processMovieLinks(content);
  expect(result).toContain('href="/movie/1932_id"');
  expect(result).toContain('href="/movie/1983_id"');
});

// Test format variations
test('handles multiple title formats', () => {
  const tests = [
    '**Movie Title** (1999)',     // Movie analysis format
    '"Movie Title" (1999)',       // Episode format  
    'Movie Title (1999)',         // Plain format
    '**Movie Title**'             // No year
  ];
  // Test each format appropriately
});
```

### 3. System Integration Tests
```javascript
// Test AnalysisService respects completion
test('getOrGenerate skips complete content', async () => {
  const mockMovie = { id: 100, hasLinks: true };
  const result = await AnalysisService.getOrGenerate(mockMovie);
  expect(claudeApiCall).not.toHaveBeenCalled();
});

// Test nuclear static includes linking
test('nuclear static generation includes linking', () => {
  const analysis = generateMovieAnalysis(movieData);
  expect(analysis.content).toMatch(/<a href="\/movie\/\d+"/);
});
```

### 4. Performance & Scale Tests
```javascript
// Test large content processing
test('processes large analysis content efficiently', () => {
  const largeContent = generateLargeAnalysis(5000); // 5KB content
  const startTime = Date.now();
  const result = processMovieLinks(largeContent);
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(1000); // Under 1 second
});

// Test database query optimization
test('minimizes database queries per content block', () => {
  const content = 'Multiple **Movie1** (1999) and **Movie2** (2000)';
  const result = processMovieLinks(content);
  expect(databaseQueryCount).toBeLessThan(5); // Reasonable limit
});
```

### 5. Edge Case Handling Tests
```javascript
// Test malformed content
test('handles malformed movie references gracefully', () => {
  const tests = [
    '**Incomplete Movie**',           // No year
    '** Spaced Title ** (1999)',      // Extra spaces
    '**Movie** (not_a_year)',         // Invalid year
    '**Very Very Very Long Movie Title That Exceeds Normal Length** (1999)'
  ];
  // Should not crash, handle gracefully
});

// Test non-movie false positives
test('avoids linking non-movie references', () => {
  const content = '**Important Document** (2023) was filed **Yesterday** (2019)';
  // Should not link these as they're not movies
});
```

## Test Data Fixtures Needed

### Content Samples:
1. **Tier 1 (Complete)**: Content with existing links
2. **Tier 2 (Unlinked)**: Analysis content without links  
3. **Tier 3 (Missing)**: No existing content
4. **Edge Cases**: Malformed, ambiguous, or complex content

### Database Fixtures:
1. Movies with title collisions (same name, different years)
2. Movies with special characters in titles
3. Movies missing TMDB IDs
4. Analysis records with various completion states

## Success Criteria
- ✅ Zero existing links are modified
- ✅ All valid movie mentions get linked
- ✅ Performance under 1 second for typical content
- ✅ No database integrity violations
- ✅ Graceful handling of all edge cases