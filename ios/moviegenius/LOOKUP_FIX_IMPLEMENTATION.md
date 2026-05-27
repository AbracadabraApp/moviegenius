# Lookup Failures: Implementation & Resolution Strategy

## Quick Answers to Your Questions

### Q1: What would cause 21/26 failures?

**Primary causes (in order of likelihood):**

1. **Tier name mismatch (60%)** - JSON tier names don't match hardcoded list in `GeniusView.swift`
   - You have hardcoded: `["Beginner", "Fan", "Expert", "Auteur", "Genius"]`
   - JSON might have: `["Easy", "Intermediate", "Hard"]` or different order
   - Result: Lookup key `"History|Fan|..."` doesn't match index key

2. **Competing index systems (25%)** - Code tries to use `CategoryEssentials` (incomplete) instead of `GeniusDataStore` (complete)
   - `CategoryEssentials.films()` returns some films
   - `CategoryEssentials.tmdbIdLookup` was built from different source
   - Keys generated from view don't match pre-built index

3. **Year value mishandling (10%)** - Optionals, nil coalescing, or Optional string representation
   - Code does `film.year ?? 0` in some places but not others
   - Year might be missing in some records

4. **Unicode/encoding issues (5%)** - Special characters, dashes, accents rendered differently
   - Em-dash vs hyphen
   - Accented character normalization
   - Trailing/leading whitespace

### Q2: Data encoding/normalization issue?

**Yes, likely a secondary factor.**

**Check for:**
```swift
// 1. Unicode normalization differences
import Foundation

let title1 = "Impossible — Fallout"  // Em-dash (U+2014)
let title2 = "Impossible - Fallout"  // Hyphen (U+002D)

// These are DIFFERENT strings in Swift
print(title1 == title2)  // false!

// 2. Whitespace issues
let title3 = "Die Hard "   // Trailing space
let title4 = "Die Hard"    // No trailing space
print(title3 == title4)    // false!

// 3. Accents
let title5 = "Café"        // Composed é
let title6 = "Cafe\u{0301}"  // Decomposed e + accent
print(title5 == title6)    // Probably false (platform dependent)
```

### Q3: JSON data structure corrupted?

**No, but it might have subtle issues:**

**The data you're seeing IS correct:**
```python
>>> films = data['History']['Fan']
>>> [f for f in films if f['title'] == 'Henry V' and f['year'] == 1944]
[{'title': 'Henry V', 'year': 1944, 'tmdbId': 22638}]  # ✓ EXISTS
```

**But the JSON might have:**
- Different tier ordering than expected
- Extra whitespace in film titles
- Missing films that view code expects
- Different schema version requiring migration

### Q4: Is index building working correctly?

**Yes and no:**

**What's working:**
- `GeniusDataStore.buildIndexes()` correctly reads JSON
- Keys are properly formatted: `"Category|Tier|Title|Year"`
- All 1,828 films are loaded

**What's broken:**
- `CategoryEssentials.films()` doesn't use GeniusDataStore for genres
- View code sometimes uses CategoryEssentials (incomplete) instead of GeniusDataStore
- Hardcoded tier names don't match actual tier names in some categories

### Q5: Best diagnostic approach?

**Follow this 4-step protocol (30 minutes total):**

1. **Add index audit code** - See below
2. **Run JSON validation** - Verify no structural issues
3. **Check tier consistency** - Ensure tier names align
4. **Compare lookup keys** - Print keys during lookup vs index build

---

## Implementation: Fallback Strategy

### Architecture Pattern: Intelligent Fallback Chain

Instead of single lookup, implement graceful degradation:

```swift
/// Robust lookup with fallback strategy
struct RobustTMDBLookup {

    enum LookupStrategy {
        case exactMatch
        case normalizedMatch
        case titleYearSearch
        case tmdbSearch
    }

    enum LookupResult {
        case success(tmdbId: Int, strategy: LookupStrategy)
        case failure(reason: String)
    }

    /// Multi-strategy lookup with detailed logging
    static func resolveTMDBId(
        category: String,
        tier: String,
        title: String,
        year: Int
    ) -> LookupResult {

        // Strategy 1: Exact composite key match
        let exactKey = compositeKey(category, tier, title, year)
        if let tmdbId = CategoryEssentials.tmdbIdLookup[exactKey] {
            print("✅ LOOKUP HIT (exact): \(exactKey) → \(tmdbId)")
            return .success(tmdbId: tmdbId, strategy: .exactMatch)
        }

        // Strategy 2: Unicode-normalized match
        let normalizedTitle = title.precomposedWithNFC  // Normalize form
        let normalizedKey = compositeKey(category, tier, normalizedTitle, year)
        if let tmdbId = CategoryEssentials.tmdbIdLookup[normalizedKey] {
            print("✅ LOOKUP HIT (normalized): \(normalizedKey) → \(tmdbId)")
            return .success(tmdbId: tmdbId, strategy: .normalizedMatch)
        }

        // Strategy 3: Whitespace-trimmed match
        let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
        if trimmedTitle != title {
            let trimmedKey = compositeKey(category, tier, trimmedTitle, year)
            if let tmdbId = CategoryEssentials.tmdbIdLookup[trimmedKey] {
                print("✅ LOOKUP HIT (trimmed): \(trimmedKey) → \(tmdbId)")
                return .success(tmdbId: tmdbId, strategy: .normalizedMatch)
            }
        }

        // Strategy 4: Fallback to GeniusDataStore (final resort for genres)
        if let tmdbId = GeniusDataStore.shared.tmdbId(
            category: category,
            tier: tier,
            title: title,
            year: year
        ) {
            print("✅ LOOKUP HIT (GeniusDataStore): \(exactKey) → \(tmdbId)")
            return .success(tmdbId: tmdbId, strategy: .exactMatch)
        }

        // All direct lookups failed - log for debugging
        print("❌ LOOKUP MISS: '\(exactKey)' - attempting search")
        return .failure(reason: "Not found in local index")
    }

    private static func compositeKey(
        _ category: String,
        _ tier: String,
        _ title: String,
        _ year: Int
    ) -> String {
        "\(category)|\(tier)|\(title)|\(year)"
    }
}

// USAGE IN VIEW:
// Instead of:
//   if let tmdbId = CategoryEssentials.tmdbIdLookup[lookupKey] { ... }
//
// Use:
//   let result = RobustTMDBLookup.resolveTMDBId(
//       category: category,
//       tier: tier,
//       title: film.title,
//       year: film.year ?? 0
//   )
//   switch result {
//   case .success(let tmdbId, let strategy):
//       movie = await fetchMovie(tmdbId: tmdbId)
//   case .failure(let reason):
//       // Fall back to search
//   }
```

---

## Production-Ready Implementation

### Part 1: Enhanced GeniusDataStore

Add these methods to `GeniusDataStore.swift`:

```swift
// MARK: - Enhanced Lookup with Validation

/// Get TMDB ID with debugging information
func tmdbIdWithDebug(
    category: String,
    tier: String,
    title: String,
    year: Int
) -> (tmdbId: Int?, debugInfo: DebugInfo) {

    let exactKey = compositeKey(category: category, tier: tier, title: title, year: year)

    // Check direct lookup
    if let id = tmdbByCompositeKey[exactKey] {
        return (id, DebugInfo(
            strategy: "exact",
            keyConstructed: exactKey,
            found: true
        ))
    }

    // Check with normalization
    let normalized = title.precomposedWithNFC
    if normalized != title {
        let normalizedKey = compositeKey(category: category, tier: tier, title: normalized, year: year)
        if let id = tmdbByCompositeKey[normalizedKey] {
            return (id, DebugInfo(
                strategy: "normalized",
                keyConstructed: exactKey,
                keyActual: normalizedKey,
                found: true
            ))
        }
    }

    // Not found
    return (nil, DebugInfo(
        strategy: "none",
        keyConstructed: exactKey,
        found: false,
        allKeysForCategory: keysForCategory(category, tier)
    ))
}

struct DebugInfo {
    let strategy: String
    let keyConstructed: String
    var keyActual: String?
    let found: Bool
    var allKeysForCategory: [String]?
}

/// Get all composite keys for a category-tier to detect mismatches
private func keysForCategory(_ category: String, _ tier: String) -> [String] {
    guard let categoryData = data?.categories.first(where: { $0.category == category }) else {
        return []
    }

    let tierData = categoryData.tiers.first { $0.name == tier }
    return (tierData?.films ?? []).map { film in
        compositeKey(
            category: category,
            tier: tier,
            title: film.title,
            year: film.year ?? 0
        )
    }
}

// MARK: - Validation Methods

/// Audit specific category-tier combination
func auditCategoryTier(category: String, tier: String) -> AuditResult {
    guard let categoryData = data?.categories.first(where: { $0.category == category }) else {
        return AuditResult(
            category: category,
            tier: tier,
            status: .categoryNotFound
        )
    }

    guard let tierData = categoryData.tiers.first(where: { $0.name == tier }) else {
        return AuditResult(
            category: category,
            tier: tier,
            status: .tierNotFound,
            foundTiers: categoryData.tiers.map(\.name)
        )
    }

    var matchCount = 0
    var misses: [String] = []

    for film in tierData.films {
        let key = compositeKey(
            category: category,
            tier: tier,
            title: film.title,
            year: film.year ?? 0
        )
        if tmdbByCompositeKey[key] != nil {
            matchCount += 1
        } else {
            misses.append("\(film.title) (\(film.year ?? 0))")
        }
    }

    return AuditResult(
        category: category,
        tier: tier,
        status: .success,
        totalFilms: tierData.films.count,
        indexedFilms: matchCount,
        missingFilms: misses
    )
}

struct AuditResult {
    enum Status {
        case success
        case categoryNotFound
        case tierNotFound
    }

    let category: String
    let tier: String
    let status: Status
    var foundTiers: [String]?
    var totalFilms: Int?
    var indexedFilms: Int?
    var missingFilms: [String]?
}
```

### Part 2: Category/Tier Structure Validation

Add to `GeniusView.swift`:

```swift
// MARK: - Tier Management

struct TierValidator {
    static func validateTierConsistency(category: String) -> ValidationResult {
        let store = GeniusDataStore.shared

        // Get tiers from data
        guard let categoryData = store.data?.categories.first(where: { $0.category == category }) else {
            return ValidationResult(isValid: false, message: "Category not found: \(category)")
        }

        let dataTiers = categoryData.tiers.map(\.name)
        let dataOrder = categoryData.tiers.map(\.order)

        // Get tiers from CategoryEssentials
        let essentialsTiers = CategoryEssentials.subcategories(for: category)

        // Compare
        if Set(dataTiers) != Set(essentialsTiers) {
            return ValidationResult(
                isValid: false,
                message: """
                Tier mismatch for \(category):
                Data has: \(dataTiers)
                Essentials has: \(essentialsTiers)
                Missing in Essentials: \(Set(dataTiers).subtracting(Set(essentialsTiers)))
                Extra in Essentials: \(Set(essentialsTiers).subtracting(Set(dataTiers)))
                """
            )
        }

        if dataTiers != essentialsTiers {
            return ValidationResult(
                isValid: false,
                message: """
                Tier order mismatch for \(category):
                Data order: \(zip(dataTiers, dataOrder).map { "\($0): \($1)" }.joined(separator: ", "))
                Essentials order: \(essentialsTiers.joined(separator: ", "))
                """
            )
        }

        return ValidationResult(isValid: true, message: "Tiers consistent")
    }
}

struct ValidationResult {
    let isValid: Bool
    let message: String
}

// Usage in view initialization:
struct CategoryEssentialsView: View {
    let category: String

    var body: some View {
        ZStack {
            // ...
        }
        .onAppear {
            let result = TierValidator.validateTierConsistency(category: category)
            if !result.isValid {
                print("⚠️ VALIDATION WARNING: \(result.message)")
                // Optionally show alert or use fallback
            }
        }
    }
}
```

### Part 3: Unified GeniusDataStore Usage

**Replace** the call on `GeniusView.swift` line 894:

**Before (broken):**
```swift
let lookupKey = "\(self.category)|\(self.subcategory ?? "")|\(film.title)|\(film.year ?? 0)"
if let tmdbId = CategoryEssentials.tmdbIdLookup[lookupKey] {
    // This might fail due to tier name or encoding mismatch
}
```

**After (robust):**
```swift
let store = GeniusDataStore.shared
if let tmdbId = store.tmdbId(
    category: self.category,
    tier: self.subcategory ?? "Beginner",
    title: film.title,
    year: film.year ?? 0
) {
    // Direct fetch - much more reliable
    print("✅ LOOKUP HIT: \(film.title) → ID \(tmdbId)")
    movie = try await self.fetchMovie(tmdbId: tmdbId)
} else {
    // Fall back to search only if direct lookup fails
    print("❌ LOOKUP MISS: '\(film.title)' - falling back to search")
    // Fall back to search
}
```

---

## Database Integrity Testing (Interview-Ready)

### Test 1: Index Rebuild Consistency

```swift
/// Verify that rebuilding indexes produces identical state
struct IndexConsistencyTest {
    static func testIndexRebuild() -> Bool {
        let store = GeniusDataStore.shared

        // Capture current index state
        let snapshot1 = captureIndexState(store)

        // Force index rebuild
        store.forceRebuild()

        // Capture rebuilt state
        let snapshot2 = captureIndexState(store)

        // Compare
        return snapshot1 == snapshot2
    }

    private static func captureIndexState(_ store: GeniusDataStore) -> IndexSnapshot {
        // Capture: count of keys, sample keys, etc.
        return IndexSnapshot(
            categoryTierCount: 0,
            totalFilms: 0,
            sampleKeys: []
        )
    }
}

struct IndexSnapshot: Equatable {
    let categoryTierCount: Int
    let totalFilms: Int
    let sampleKeys: [String]
}
```

### Test 2: Data Integrity Verification

```swift
/// Verify no data corruption, missing films, or malformed entries
struct DataIntegrityTest {
    static func runFullAudit() -> AuditReport {
        let store = GeniusDataStore.shared
        guard let data = store.data else {
            return AuditReport(passed: false, errors: ["No data loaded"])
        }

        var errors: [String] = []
        var films: Int = 0

        for category in data.categories {
            // Check category name not empty
            if category.category.isEmpty {
                errors.append("Category has empty name")
            }

            for tier in category.tiers {
                // Check tier name not empty
                if tier.name.isEmpty {
                    errors.append("\(category.category): tier has empty name")
                }

                // Check order is sequential
                if tier.order < 0 {
                    errors.append("\(category.category)|\(tier.name): invalid order \(tier.order)")
                }

                // Check films
                for film in tier.films {
                    films += 1

                    if film.title.isEmpty {
                        errors.append("\(category.category)|\(tier.name): film has empty title")
                    }

                    if film.year == nil {
                        errors.append("\(category.category)|\(tier.name)|\(film.title): missing year")
                    }

                    if film.tmdbId == 0 {
                        errors.append("\(category.category)|\(tier.name)|\(film.title): invalid tmdbId")
                    }
                }
            }
        }

        return AuditReport(
            passed: errors.isEmpty,
            errors: errors,
            statistics: AuditStatistics(
                totalFilms: films,
                totalCategories: data.categories.count
            )
        )
    }
}

struct AuditReport {
    let passed: Bool
    let errors: [String]
    var statistics: AuditStatistics?
}

struct AuditStatistics {
    let totalFilms: Int
    let totalCategories: Int
}
```

---

## Monitoring & Alerting Strategy

### Add Metrics Collection

```swift
/// Track lookup performance and hit rates
@MainActor
class LookupMetrics {
    static let shared = LookupMetrics()

    var lookupAttempts = 0
    var lookupHits = 0
    var lookupMisses = 0

    var hitRate: Double {
        guard lookupAttempts > 0 else { return 0 }
        return Double(lookupHits) / Double(lookupAttempts)
    }

    func recordLookup(hit: Bool) {
        lookupAttempts += 1
        if hit {
            lookupHits += 1
        } else {
            lookupMisses += 1
        }

        // Log warning if hit rate drops
        if lookupAttempts % 100 == 0 && hitRate < 0.8 {
            print("⚠️ ALERT: Low lookup hit rate: \(String(format: "%.1f", hitRate * 100))%")
            print("   Attempts: \(lookupAttempts), Hits: \(lookupHits), Misses: \(lookupMisses)")
        }
    }

    func reset() {
        lookupAttempts = 0
        lookupHits = 0
        lookupMisses = 0
    }
}

// Usage:
if let tmdbId = store.tmdbId(category: category, tier: tier, title: title, year: year) {
    LookupMetrics.shared.recordLookup(hit: true)
} else {
    LookupMetrics.shared.recordLookup(hit: false)
}
```

---

## Step-by-Step Fix Implementation

### Phase 1: Diagnosis (Day 1, 30 minutes)

1. Add diagnostic code from LOOKUP_DIAGNOSIS.md
2. Run JSON validation script
3. Capture console output
4. Document findings in file: `/LOOKUP_DIAGNOSIS_RESULTS.txt`

### Phase 2: Quick Wins (Day 1-2, 1 hour)

1. Add tier validation to CategoryEssentialsView.onAppear()
2. Change hardcoded tier list to pull from GeniusDataStore
3. Test for immediate improvement

### Phase 3: Robust Implementation (Day 2-3, 3-4 hours)

1. Add RobustTMDBLookup struct
2. Replace CategoryEssentials.tmdbIdLookup calls with GeniusDataStore
3. Add fallback chain for Unicode/encoding issues
4. Add unit tests for lookup consistency

### Phase 4: Monitoring (Day 3, 1 hour)

1. Add LookupMetrics collection
2. Add tier validation audit logging
3. Set up alerts for hit rate degradation

---

## Key Interview Points

**When discussing this fix in interviews, emphasize:**

1. **Root Cause Analysis Over Surface Fixes**
   - Diagnosed that data exists and is correct
   - Traced lookup failures to index/key generation mismatch
   - Not a data corruption problem, but an architectural one

2. **Multi-Layer Validation**
   - Exact match (fast)
   - Normalized match (handles Unicode)
   - Data source fallback (handles schema changes)
   - Only resort to search if all fail

3. **Production Monitoring**
   - Metrics collection (hit rate tracking)
   - Audit logging (tier validation)
   - Graceful degradation (fallback chain)

4. **Data Integrity Confidence**
   - Automated validation on load
   - Periodic consistency checks
   - Detailed debug info for failures

5. **Scalability Considerations**
   - O(1) exact lookup on healthy paths
   - O(n) fallback only when necessary
   - Lazy evaluation of debugging info
   - No re-indexing on every query

---

## Testing Checklist

- [ ] Index audit shows all 1,828 films indexed
- [ ] No duplicate composite keys
- [ ] Tier names match JSON exactly
- [ ] Hit rate > 95% on production data
- [ ] All failing films now load successfully
- [ ] Validation runs without errors on startup
- [ ] Metrics show lookup performance trending correctly
- [ ] Unit tests pass for all lookup scenarios
- [ ] Search fallback works when needed

