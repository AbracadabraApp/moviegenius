# Genius JSON Migration - Integration Steps

**Status:** Phase 3 Swift implementation complete - ready for Xcode integration

---

## Files Created

✅ **Swift Implementation:**
- `/ios/moviegenius/moviegenius/Models/GeniusModels.swift` (created)
- `/ios/moviegenius/moviegenius/Services/GeniusDataStore.swift` (created)

✅ **Data Files:**
- `/ios/moviegenius/moviegenius/Resources/genius_data.json` (248KB, 1,828 films)

---

## Xcode Integration Steps

### Step 1: Add Swift Files to Xcode Project

1. Open `moviegenius.xcodeproj` in Xcode
2. Right-click on the **Models** folder in the project navigator
3. Select "Add Files to 'moviegenius'..."
4. Navigate to and select `GeniusModels.swift`
5. Ensure these settings:
   - ✅ Copy items if needed: **UNCHECKED** (file already in correct location)
   - ✅ Added to targets: **moviegenius** (main app target)
6. Click "Add"
7. Repeat for **Services** folder:
   - Right-click **Services** → Add Files
   - Select `GeniusDataStore.swift`
   - Same settings as above

### Step 2: Add Resources Folder as Folder Reference

**CRITICAL:** Must be added as a **folder reference** (blue folder), NOT a group (yellow folder).

1. Right-click on the **moviegenius** target folder (top level)
2. Select "Add Files to 'moviegenius'..."
3. Navigate to `/ios/moviegenius/moviegenius/Resources/`
4. Select the **Resources** folder
5. **IMPORTANT** - Before clicking "Add":
   - ✅ Copy items if needed: **UNCHECKED**
   - ✅ Added to targets: **moviegenius**
   - ✅ Create groups: **CHANGE THIS TO "Create folder references"** (radio button)
6. Click "Add"
7. Verify the folder appears **BLUE** in project navigator (not yellow)

**Why folder reference?**
- Yellow group = Xcode tracks individual files
- Blue folder = Xcode includes entire directory contents at bundle time
- `Bundle.main.url(forResource:withExtension:)` requires folder reference

### Step 3: Verify Build

```bash
cd /Users/josh.petersen/moviegenius/ios/moviegenius
xcodebuild -scheme moviegenius -sdk iphonesimulator clean build
```

Expected output:
- ✅ Build succeeds
- ✅ No compiler errors for GeniusModels.swift
- ✅ No compiler errors for GeniusDataStore.swift
- ✅ genius_data.json bundled in app

### Step 4: Test Data Loading

Add temporary debug code to `GeniusView.swift` (will remove later):

```swift
// At the top of GeniusView body
.onAppear {
    let store = GeniusDataStore.shared
    if let error = store.loadError {
        print("❌ Genius data load error: \(error)")
    } else if let data = store.data {
        print("✅ Genius data loaded: \(data.categories.count) categories")
        print("   First category: \(data.categories.first?.category ?? "none")")
    }
}
```

Run in simulator - check console for load confirmation.

---

## Phase 4: Wire Up Call Sites (After Xcode Integration)

Once Xcode integration is complete and data loads successfully, proceed to Phase 4:

### Replace Hardcoded Data Usage

**Before (GeniusView.swift ~line 150):**
```swift
switch (selectedGenre, currentTier) {
case ("Crime", "Essential"):
    return [
        ("The Godfather", 1972),
        ("The Godfather Part II", 1974),
        // ... 100+ more hardcoded films
    ]
// ... 287 total cases
}
```

**After:**
```swift
// Get films from JSON data store
let geniusFilms = GeniusDataStore.shared.films(
    category: selectedGenre,
    tier: currentTier
)

// Convert to EssentialMovie (existing view model)
return geniusFilms.map { film in
    EssentialMovie(
        title: film.title,
        year: film.year,
        tmdbId: film.tmdbId,
        slug: ""  // Will be populated from API
    )
}
```

**Before (TierTmdbLookup.swift):**
```swift
let tierTmdbLookup: [String: Int] = [
    "Action|Essential|Die Hard|1988": 562,
    // ... 1,828 total entries
]
```

**After:**
```swift
// DELETE entire file - lookup now handled by GeniusDataStore
// Calls like:
//   tierTmdbLookup["Drama|Devotee|Network|1976"]
// Become:
//   GeniusDataStore.shared.tmdbId(category: "Drama", tier: "Devotee", title: "Network", year: 1976)
```

---

## Success Criteria (Phase 3)

- ✅ GeniusModels.swift compiles
- ✅ GeniusDataStore.swift compiles
- ✅ genius_data.json loads without error
- ✅ `.films(category:tier:)` returns expected film lists
- ✅ `.tmdbId(category:tier:title:year:)` returns correct IDs
- ⏳ **MANUAL STEP REQUIRED:** Xcode integration (Steps 1-4 above)

---

## Next Steps

**You are here:** ⏸️ Awaiting Xcode integration (manual steps required)

**After integration:**
1. Verify build succeeds
2. Test data loading in simulator
3. Wire up call sites (replace switch statement)
4. Delete hardcoded data
5. Verify app behaves identically
6. Proceed to Phase 5: 10→5 tier collapse

---

## Troubleshooting

### Build Error: "Cannot find type 'GeniusModels' in scope"
→ Files not added to Xcode project. Redo Step 1.

### Runtime Error: "genius_data.json not found in bundle"
→ Resources folder not added as folder reference (blue folder). Redo Step 2.

### Data Loads But Empty Categories
→ Check JSON schema version matches. Run validation script:
```bash
python scripts/validate_genius_json.py ios/moviegenius/moviegenius/Resources/
```

### "Category|Tier not found" at Runtime
→ Check category/tier spelling matches JSON exactly (case-sensitive).

---

## Files Reference

**Created in Phase 3:**
- `Models/GeniusModels.swift` - Codable schema
- `Services/GeniusDataStore.swift` - JSON loader with O(1) lookups
- `Resources/genius_data.json` - 1,828 films across 17 categories

**Will modify in Phase 4:**
- `Views/GeniusView.swift` - Replace switch statement with data store calls
- `Data/TierTmdbLookup.swift` - DELETE (replaced by data store)

**Will update in Phase 5:**
- `Resources/genius_data.json` - Collapse 10→5 tiers (data-only change)
