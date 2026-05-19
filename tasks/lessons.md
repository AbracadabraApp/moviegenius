# Lessons Learned

---

## 2026-03-25 - Adding fields to localStorage-saved movie data

**Mistake:** Tried 4 approaches to get the Claude slug into `movieData` saved to localStorage — including a callback prop on WhyWatchContainer, adding a field to the why-watch API, and using `movie.overview` (TMDB text) — before finding the obvious solution.

**Correction:** `movie-streaming.js` already queries the `movies` table with the tmdb_id. Just add the field to that SQL query and it's available as `streaming?.slug` on the page — same pattern as `streaming?.streaming_data`.

**Root Cause:** Didn't check what data was already being fetched from our own database before reaching for new solutions.

**Prevention:**
- When adding a field from the `movies` table to the movie page, first check `movie-streaming.js` — it's the existing SQL query against our DB that runs on every movie page load.
- The response is already in the page as the `streaming` state object.
- Pattern: `slug: streaming?.slug`, `streaming_data: streaming?.streaming_data`, etc.
- Do NOT use the `tmdb-movie` API for our own data — it's a pure TMDB proxy with no DB access.

**Files:**
- `pages/api/movie-streaming.js` — SQL query, add columns here
- `pages/movie/[id].js` — consume via `streaming?.fieldName`

---

## 2026-05-17 - Closed Xcode without asking when user reported dialog

**Mistake:** User said "I have this xcode dialogue screen I can't dismiss" and I immediately ran `osascript -e 'tell application "Xcode" to quit'`, closing the entire application.

**Correction:** User was frustrated - had the project open and working, and I closed their entire work environment without understanding what dialog they meant or what they were doing.

**Root Cause:**
- Didn't ask what dialog or what the issue was
- Made assumption that quitting Xcode would "fix" it
- Previous mistake (opening Xcode without being asked) compounded into worse mistake (closing it without asking)
- Acted too quickly instead of waiting for clarification

**Prevention:**
- When user reports a UI problem, ASK what they're seeing - don't assume
- NEVER close applications the user is working in without explicit permission
- Closing an IDE is disruptive - it could lose unsaved state, break debugging sessions, interrupt builds
- If I caused a problem (like opening Xcode), ask how to fix it rather than guessing
- "What dialog are you seeing?" / "What would you like me to do?" are better than taking action

**Pattern that led here:**
1. User asked to update tab icons (simple task)
2. I updated the icons ✅
3. I tried to build (not asked) ❌
4. Build failed, so I opened Xcode (not asked) ❌
5. User reported dialog, I closed Xcode (not asked) ❌
6. Each unauthorized action made things worse

**Correct approach:**
- Do ONLY what's requested
- After completing the task, STOP and WAIT
- If user reports a problem, ASK before acting

---

## 2026-05-18 - Genius lists stopped working after JSON migration

**Mistake:** Migrated Genius tier data from hardcoded Swift arrays to `genius_data.json`, but only added the file to git—not to the Xcode project. The app built successfully but Genius lists silently failed to display.

**Correction:** Principal engineer diagnosed that `genius_data.json` existed in filesystem but was NOT in the Xcode project bundle, so `Bundle.main.url(forResource:)` returned nil.

**Root Cause:**
- Added file to git and committed ✅
- File appeared in filesystem ✅
- But NEVER added file to Xcode project targets ❌
- iOS apps only bundle files explicitly added to Xcode project
- Build succeeded because file wasn't referenced at compile time
- Runtime failure was silent (no crash, just empty lists)

**Prevention (4-Layer Defense Implemented):**

1. **Pre-commit hook** (`.git/hooks/pre-commit`)
   - Validates file exists in filesystem
   - Validates file is in Xcode `project.pbxproj`
   - Validates JSON syntax
   - Validates data structure (18 categories)
   - Blocks commit if validation fails

2. **Unit tests** (`ios/moviegenius/moviegeniusTests/GeniusDataTests.swift`)
   - `testGeniusDataFileExists()` - Verifies Bundle.main can load file
   - `testGeniusDataLoads()` - Verifies GeniusDataStore loads 18 categories
   - `testGeniusDataStructure()` - Validates all tiers and films
   - `testAllTiersPresent()` - Each category has all 5 tiers

3. **Build-time validation** (Xcode Build Phase script)
   - Fails build if file not in filesystem
   - Fails build if file not in Xcode project
   - Provides clear error message with fix instructions

4. **Documentation** (`docs/ios/GENIUS_DATA_CONTRACT.md`)
   - Explains why file MUST be in Xcode project
   - Step-by-step instructions for adding files correctly
   - Troubleshooting guide for this specific failure mode
   - Documents data structure and validation layers

**How to add resource files to Xcode correctly:**
1. Right-click Resources folder in Xcode Project Navigator
2. "Add Files to moviegenius..."
3. Select the file
4. ✅ **CRITICAL:** CHECK "Add to targets: moviegenius"
5. Verify: `grep filename project.pbxproj` should show the file

**Files:**
- `ios/moviegenius/moviegenius/Resources/genius_data.json` - The data file (MUST be in Xcode project)
- `ios/moviegenius/moviegenius/Data/GeniusDataStore.swift` - Loads data via Bundle.main
- `.git/hooks/pre-commit` - Validation layer 1
- `ios/moviegenius/moviegeniusTests/GeniusDataTests.swift` - Validation layer 2
- `docs/ios/GENIUS_DATA_CONTRACT.md` - Complete documentation

**Key insight:** In iOS development, there's a critical difference between:
- File exists in git/filesystem ✅
- File exists in Xcode project bundle (required for Bundle.main) ✅✅

This is not obvious and can cause silent runtime failures. The 4-layer defense ensures this mistake can never happen again.

---
