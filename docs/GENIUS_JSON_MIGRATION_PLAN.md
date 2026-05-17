# Genius JSON Migration Plan

**Last Updated:** 2025-05-16
**Status:** Ready for implementation
**Estimated Time:** 5-6 hours

---

## Overview

Migrate 287 films from hardcoded Swift (6,136 lines across 2 files) to JSON, then collapse 10 tiers → 5 levels with forgiving gold thresholds (85% not 100%).

**User data preservation:** NOT required (no UserDefaults migration needed)

**Key changes:**
- Extract hardcoded data to single JSON file (~330KB)
- Replace 10 tiers with 5 levels using simple 2-tier merges
- Change gold threshold: 100% → 85% completion
- Change category gold: all tiers → 4 of 5 levels (80%)

---

## Tier Mapping (10 → 5)

| Old Tier 1 | Old Tier 2 | → | New Level | New Name |
|------------|------------|---|-----------|----------|
| Essential | Foundational | → | Level 1 | Essential |
| Classics | Well-Versed | → | Level 2 | Foundational |
| Devotee | Connoisseur | → | Level 3 | Deep Cut |
| Deep Cuts | Specialist | → | Level 4 | Connoisseur |
| Archivist | Master | → | Level 5 | Master |

**Pattern:** Always combine 2 tiers (never 1+2+2+2+3)

---

## Phase 1: Pre-Flight Validation

### Task 1.1: Check for `.slug` usage

**Run:**
```bash
cd /Users/josh.petersen/moviegenius/ios/moviegenius
grep -r "\.slug" . --include="*.swift"
```

**Decision:**
- If slug only appears in `EssentialMovie` struct definition → safe to remove
- If used in storage/analytics/progress tracking → document usage and adjust plan

**Output:** Save results to `SLUG_USAGE_REPORT.txt`

---

### Task 1.2: Verify tier names

**Run:**
```bash
grep -A 1 'case.*"Essential"' ios/moviegenius/moviegenius/Views/GeniusView.swift | head -50
```

**Confirm:**
- All categories use same 10 tier names
- Tier order is consistent (Essential → Master)
- No special cases for Actors/Actresses/Directors

---

## Phase 2: Create Migration Scripts

### Task 2.1: Write `extract_genius_to_json.py`

**Location:** `/Users/josh.petersen/moviegenius/scripts/extract_genius_to_json.py`

**Inputs:**
- `ios/moviegenius/moviegenius/Views/GeniusView.swift` (film data)
- `ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift` (TMDB IDs)

**Output:**
- Single file: `ios/moviegenius/moviegenius/Resources/genius_data.json`
- Reconciliation report (printed to console)

**Requirements:**
1. Parse Swift case statements: `case ("Crime", "Essential"):`
2. Extract film tuples: `("The Godfather", 1972)`
3. Match TMDB lookup keys: `"Crime|Essential|The Godfather|1972": 238`
4. Handle special characters (apostrophes, colons, ellipses, question marks)
5. Validate: 287 total films across 22 categories
6. Report any films in one source but not the other

**Schema output:**
```json
{
  "schemaVersion": 1,
  "categories": [
    {
      "category": "Crime",
      "tiers": [
        {
          "name": "Essential",
          "order": 0,
          "films": [
            {
              "title": "The Godfather",
              "year": 1972,
              "tmdbId": 238
            }
          ]
        }
      ]
    }
  ]
}
```

---

### Task 2.2: Update `validate_genius_json.py`

**Location:** Use provided file at `/Users/josh.petersen/Downloads/files/validate_genius_json.py`

**Enhancements needed:**
1. Add total film count check: `assert total_films == 287`
2. Add category count check: `assert len(data["categories"]) == 22`
3. Add known category names validation (Crime, Drama, Action, etc.)
4. Ensure all TMDB IDs > 0 (no sentinel values)

**Usage:**
```bash
python validate_genius_json.py ios/moviegenius/moviegenius/Resources/
```

**Exit codes:**
- `0` = PASSED (all checks passed)
- `1` = FAILED (errors found)
- `2` = Usage error

---

## Phase 3: Swift Implementation

### Task 3.1: Create `GeniusModels.swift`

**Location:** `ios/moviegenius/moviegenius/Models/GeniusModels.swift`

**Content:**
```swift
import Foundation

// MARK: - Genius JSON Data Models
//
// Single source of truth for MovieGenius canon data. Replaces hardcoded
// switch statement in GeniusView.swift and static dictionary in
// TierTmdbLookup.swift — film entry and TMDB id now live together.

struct GeniusFilm: Codable, Identifiable, Hashable {
    let title: String
    let year: Int
    let tmdbId: Int

    // Stable identity for SwiftUI lists. TMDB id is unique per film.
    var id: Int { tmdbId }

    enum CodingKeys: String, CodingKey {
        case title, year, tmdbId
    }
}

struct GeniusTier: Codable, Identifiable, Hashable {
    let name: String          // e.g. "Essential", "Master"
    let order: Int            // 0-based rank, low = easier
    let films: [GeniusFilm]

    var id: String { name }
}

struct GeniusCategory: Codable, Identifiable, Hashable {
    let category: String      // e.g. "Drama", "Crime"
    let tiers: [GeniusTier]

    var id: String { category }
}

struct GeniusData: Codable {
    let schemaVersion: Int
    let categories: [GeniusCategory]
}
```

---

### Task 3.2: Create `GeniusDataStore.swift`

**Location:** `ios/moviegenius/moviegenius/Services/GeniusDataStore.swift`

**Content:**
```swift
import Foundation

// MARK: - GeniusDataStore
//
// Loads canon data from bundled JSON and exposes the SAME two lookups the
// old hardcoded code provided, so call sites don't have to change:
//
//   Old:  switch (category, tier) -> [EssentialMovie]
//   New:  store.films(category:tier:) -> [GeniusFilm]
//
//   Old:  tmdbLookup["Crime|Essential|Network|1976"] -> 8392
//   New:  store.tmdbId(category:tier:title:year:) -> 8392

final class GeniusDataStore {

    enum LoadError: Error {
        case fileNotFound
        case decodeFailed(Error)

        var userMessage: String {
            switch self {
            case .fileNotFound:
                return "Genius data file not found. Please reinstall the app."
            case .decodeFailed:
                return "Failed to load Genius data. Please check for updates."
            }
        }
    }

    static let shared = GeniusDataStore()

    private(set) var data: GeniusData?
    private(set) var loadError: LoadError?
    private(set) var isLoaded = false

    // Fast indexes built once at load
    private var filmsByKey: [String: [GeniusFilm]] = [:]
    private var tmdbByKey: [String: Int] = [:]

    private init() {
        load()
    }

    // MARK: Loading

    private func load() {
        guard let url = Bundle.main.url(
            forResource: "genius_data",
            withExtension: "json",
            subdirectory: "Resources"
        ) else {
            loadError = .fileNotFound
            return
        }

        do {
            let jsonData = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            let parsed = try decoder.decode(GeniusData.self, from: jsonData)

            self.data = parsed
            buildIndexes(from: parsed)
            self.isLoaded = true

        } catch {
            loadError = .decodeFailed(error)
        }
    }

    private func buildIndexes(from data: GeniusData) {
        filmsByKey.removeAll()
        tmdbByKey.removeAll()

        for category in data.categories {
            for tier in category.tiers {
                let key = compositeKey(category: category.category, tier: tier.name)
                filmsByKey[key] = tier.films

                for film in tier.films {
                    let tmdbKey = compositeKey(
                        category: category.category,
                        tier: tier.name,
                        title: film.title,
                        year: film.year
                    )
                    tmdbByKey[tmdbKey] = film.tmdbId
                }
            }
        }
    }

    // MARK: Public lookups (mirror the old API)

    /// Films for a (category, tier) pair. Empty array if none.
    func films(category: String, tier: String) -> [GeniusFilm] {
        filmsByKey[compositeKey(category: category, tier: tier)] ?? []
    }

    /// TMDB id for a specific film
    func tmdbId(category: String, tier: String, title: String, year: Int) -> Int? {
        tmdbByKey[compositeKey(category: category, tier: tier, title: title, year: year)]
    }

    /// All category names
    var categoryNames: [String] {
        data?.categories.map(\.category) ?? []
    }

    /// Tier names for a category (sorted by order)
    func tierNames(category: String) -> [String] {
        guard let cat = data?.categories.first(where: { $0.category == category }) else {
            return []
        }
        return cat.tiers.sorted { $0.order < $1.order }.map(\.name)
    }

    // MARK: Key helpers

    private func compositeKey(category: String, tier: String) -> String {
        "\(category)|\(tier)"
    }

    private func compositeKey(category: String, tier: String, title: String, year: Int) -> String {
        "\(category)|\(tier)|\(title)|\(year)"
    }
}
```

---

### Task 3.3: Add error UI to GeniusView

**Modification:** Add error state handling at top of `body`:

```swift
var body: some View {
    // Check for load errors first
    if let error = GeniusDataStore.shared.loadError {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.red)
            Text("Data Load Error")
                .font(.title2)
                .fontWeight(.semibold)
            Text(error.userMessage)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
        }
        .padding()
        return AnyView(/* error view */)
    }

    // Normal UI continues...
}
```

---

## Phase 4: Migration Steps

### Step 1: Extract to JSON (10 tiers, unchanged)

**Execute:**
```bash
cd /Users/josh.petersen/moviegenius
python scripts/extract_genius_to_json.py \
  --geniusview ios/moviegenius/moviegenius/Views/GeniusView.swift \
  --tmdblookup ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift \
  --out ios/moviegenius/moviegenius/Resources/genius_data.json
```

**Verify:**
```bash
python scripts/validate_genius_json.py ios/moviegenius/moviegenius/Resources/
```

**Must print:** `PASSED: no errors.`

**Spot check:** Manually verify 5 random films have correct TMDB IDs

**Checkpoint:** JSON file created with 287 films, all validation passing

---

### Step 2: Wire up loader (prove parity)

**2.1: Add to Xcode**
- Add `GeniusModels.swift` to project
- Add `GeniusDataStore.swift` to project
- Add `Resources/` folder as **folder reference** (blue folder, not yellow group)

**2.2: Update call sites**

**Find all usage:**
```bash
grep -n "getMovies(for:" ios/moviegenius/moviegenius/Views/GeniusView.swift
grep -n "tierTmdbLookup\[" ios/moviegenius/moviegenius/
```

**Replace:**
```swift
// OLD
let movies = getMovies(for: selectedGenre, tier: selectedTier)

// NEW
let films = GeniusDataStore.shared.films(
    category: selectedGenre,
    tier: selectedTier
)
```

```swift
// OLD
if let tmdbId = tierTmdbLookup["\(genre)|\(tier)|\(title)|\(year)"] {
    // ...
}

// NEW
if let tmdbId = GeniusDataStore.shared.tmdbId(
    category: genre,
    tier: tier,
    title: title,
    year: year
) {
    // ...
}
```

**2.3: Test thoroughly**
- Build must pass with no warnings
- App must behave identically
- All 22 categories load
- All tier navigation works
- Film details display correctly

**Checkpoint:** App works identically, no regressions

---

### Step 3: Delete hardcoded data

**3.1: Create safety tag**
```bash
git add .
git commit -m "Wire up GeniusDataStore (JSON loader)"
git tag pre-hardcode-removal
git push origin main --tags
```

**3.2: Delete hardcoded Swift**

Delete from `GeniusView.swift`:
- Lines ~1,300-6,000 (all `case (genre, tier):` statements)
- `getMovies(for:tier:)` function
- `EssentialMovie` struct (if only used here)

Delete entire file:
- `ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift`

**3.3: Verify build**
```bash
cd ios/moviegenius
xcodebuild -scheme moviegenius -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15 Pro' clean build
```

**Must:** Build passes with no errors

**Checkpoint:** Hardcoded data removed, app still works

---

### Step 4: Collapse 10 → 5 tiers

**4.1: Edit JSON file**

For each category in `genius_data.json`:

**Merge tiers:**
```python
# Pseudocode for merging
new_tiers = [
    {
        "name": "Essential",
        "order": 0,
        "films": old_tier_1_films + old_tier_2_films
    },
    {
        "name": "Foundational",
        "order": 1,
        "films": old_tier_3_films + old_tier_4_films
    },
    {
        "name": "Deep Cut",
        "order": 2,
        "films": old_tier_5_films + old_tier_6_films
    },
    {
        "name": "Connoisseur",
        "order": 3,
        "films": old_tier_7_films + old_tier_8_films
    },
    {
        "name": "Master",
        "order": 4,
        "films": old_tier_9_films + old_tier_10_films
    }
]
```

**Re-validate:**
```bash
python scripts/validate_genius_json.py ios/moviegenius/moviegenius/Resources/
```

**4.2: Update Swift constants**

In `GeniusView.swift`:
```swift
let allTiers = ["Essential", "Foundational", "Deep Cut", "Connoisseur", "Master"]
```

**4.3: Update progress thresholds**

Wherever tier completion is calculated:
```swift
// OLD
var isComplete: Bool { progress >= 1.0 }  // 100%

// NEW
var isComplete: Bool { progress >= 0.85 }  // 85% for gold
```

For category-level gold:
```swift
// OLD
var categoryGold: Bool { completedTiers == allTiers.count }  // All tiers

// NEW
var categoryGold: Bool { completedLevels >= 4 }  // 4 of 5 levels
```

**4.4: Test new tier structure**
- All 5 levels display
- Film counts per level correct
- 85% threshold works (gray → bronze → gold)
- Category gold at 4/5 levels

**Checkpoint:** 10→5 tier collapse complete

---

## Success Criteria

**Data integrity:**
- ✅ 287 films extracted (no missing/duplicate)
- ✅ All TMDB IDs > 0 (no sentinel values)
- ✅ Validation script passes

**Architecture:**
- ✅ App works identically after JSON migration
- ✅ Load time < 100ms (measured on iPhone 12)
- ✅ Error UI tested (corrupt JSON scenario)

**Tier system:**
- ✅ 5 levels display correctly
- ✅ Film distribution balanced (merge verified)
- ✅ Gold threshold at 85% works
- ✅ Category gold at 4/5 levels works

**Code quality:**
- ✅ Build passes with no warnings
- ✅ No hardcoded data remains
- ✅ Error handling comprehensive

---

## Files Created/Modified

### New files:
1. `scripts/extract_genius_to_json.py` (extraction script)
2. `scripts/validate_genius_json.py` (validation, enhanced)
3. `ios/moviegenius/moviegenius/Models/GeniusModels.swift`
4. `ios/moviegenius/moviegenius/Services/GeniusDataStore.swift`
5. `ios/moviegenius/moviegenius/Resources/genius_data.json`

### Modified files:
1. `ios/moviegenius/moviegenius/Views/GeniusView.swift`
   - Delete 4,700 lines of hardcoded data
   - Update call sites to use GeniusDataStore
   - Add error UI handling
   - Update tier constants (10→5)
   - Update progress thresholds

2. Other call sites using `tierTmdbLookup` or `getMovies(for:tier:)`

### Deleted files:
1. `ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift` (entire file, 1,846 lines)

---

## Rollback Strategy

**If migration fails at any step:**

```bash
# Rollback to before JSON migration
git revert --hard pre-hardcode-removal

# Or rollback entire feature branch
git checkout main
git branch -D genius-json-migration
```

**Restore points:**
- `pre-json-migration` tag (before any changes)
- `pre-hardcode-removal` tag (JSON working, hardcode still present)

---

## Risk Mitigation

**Risks identified:**

1. **Missing `.slug` field**
   - Mitigation: Grep check in Phase 1 before removal
   - If used: Add to GeniusFilm struct

2. **Silent load failures**
   - Mitigation: LoadError enum with user-facing messages
   - Test corrupted JSON scenarios

3. **Performance degradation**
   - Mitigation: Pre-built indexes (O(1) lookup)
   - Benchmark on old devices

4. **Film count mismatch**
   - Mitigation: Extraction validation + manual spot checks
   - Reconciliation report must match

---

## Timeline Estimate

- **Phase 1:** 15 minutes (pre-flight checks)
- **Phase 2:** 2-3 hours (write scripts, test extraction)
- **Phase 3:** 1 hour (Swift implementation)
- **Phase 4:** 2 hours (4-step migration + testing)
- **Total:** ~5-6 hours

---

## Next Steps

1. Review this plan
2. Get approval to proceed
3. Start with Phase 1 (pre-flight validation)
4. Execute sequentially (no skipping phases)

---

## Notes

- **User data preservation:** NOT required per user confirmation
- **Single JSON file:** Chosen over 22 files for atomic loading
- **Error handling:** Explicit LoadError enum, not silent failures
- **Thread safety:** Singleton loads once at init, then read-only
- **Schema version:** Future-proofs for format changes

---

**Status:** Ready for implementation
**Last Updated:** 2025-05-16
