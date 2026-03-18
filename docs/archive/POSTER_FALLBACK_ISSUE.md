# Poster Fallback Issue - 2001: A Space Odyssey

**Date:** 2025-08-13  
**Issue:** Movies with missing posters incorrectly show 2001: A Space Odyssey poster instead of film clapperboard placeholder  
**Test Case:** http://localhost:3001/movie/1491901 (A One and a Two - 2000)  

## Problem Description

When movies don't have their own posters, the system incorrectly displays the 2001: A Space Odyssey poster as a fallback image. This should be removed and replaced with the blank film clapperboard placeholder.

## Expected Behavior
- Movies with missing/invalid posters should show: **Film clapperboard placeholder image**
- NOT: 2001: A Space Odyssey poster as fallback

## Investigation Needed
1. Find where 2001: A Space Odyssey poster (TMDB ID 62) is set as fallback
2. Locate the correct film clapperboard placeholder image path
3. Replace the fallback logic to use clapperboard instead of 2001 poster

## Likely Locations to Check
- `components/MediaCard.js` - Poster display logic
- `components/MovieHeaderLarge.js` - Main movie poster display  
- `components/MoviePlaceholder.js` - Placeholder component
- `lib/poster-validation-utils.js` - Poster validation logic
- `pages/api/tmdb-poster.js` - Poster API logic

## Status
🔍 **IDENTIFIED** - Issue confirmed, needs code fix to remove 2001 fallback

## Next Steps
1. Locate 2001: A Space Odyssey fallback code
2. Find film clapperboard placeholder image path  
3. Replace fallback logic
4. Test with missing poster movies

**Priority: Medium** - Affects user experience with incorrect poster displays