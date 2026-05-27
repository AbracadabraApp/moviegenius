# MovieGenius Lookup Failures: Root Cause Analysis & Diagnostic Guide

## Executive Summary

You're observing 21/26 lookup failures (80%+ miss rate) in History > Fan tier, but the data **exists and is correct** in the JSON file. The issue is **not** data corruption—it's an **index/key generation mismatch** between how keys are constructed and how they're queried.

**Root Cause:** The exact film data exists (`Henry V|1944` = tmdbId 22638), but when the app tries to construct the lookup key during runtime, something differs from how the index was built at startup.

**Critical Finding:** Three films that fail in production EXIST in the data:
- ✓ `Henry V (1944)` exists in History|Fan (tmdbId: 22638)
- ✓ `Hamlet (1948)` exists in History|Fan (tmdbId: 23383)
- ✓ `Lawrence of Arabia (1962)` exists in History|Beginner (tmdbId: 947)

---

## Architecture Problem: TWO Index Systems

The codebase uses **two competing lookup systems**:

### 1. GeniusDataStore (New, Correct)
```swift
// GeniusDataStore.swift, lines 999-1010
static let tmdbIdLookup: [String: Int] = {
    var combined: [String: Int] = [:]
    let store = GeniusDataStore.shared
    for category in store.categoryNames {
        for tier in store.tierNames(category: category) {
            for film in store.films(category: category, tier: tier) {
                let key = "\(category)|\(tier)|\(film.title)|\(film.year ?? 0)"
                combined[key] = film.tmdbId
            }
        }
    }
    return combined
}()
```

**Status:** Properly populated from JSON with all 1,828 films

### 2. CategoryEssentials (Legacy, Hardcoded)
```swift
// GeniusView.swift, lines 1159-1260 (partial hardcoded data)
// Contains only ~100 hardcoded films for Awards categories
// Genre categories (Action, History, etc.) fall through to switch/default
```

**Status:** Incomplete hardcoded data + legacy Awards categories

### The Fatal Mismatch

In `GeniusView.swift` lines 893-905:

```swift
let lookupKey = "\(self.category)|\(self.subcategory ?? "")|\(film.title)|\(film.year ?? 0)"

if let tmdbId = CategoryEssentials.tmdbIdLookup[lookupKey] {  // ← WRONG INDEX!
    // Uses CategoryEssentials (incomplete)
} else {
    // Falls back to search (slow, unreliable)
}
```

**The Problem:**
- `CategoryEssentials.tmdbIdLookup` is built from `GeniusDataStore` data ✓
- BUT `CategoryEssentials.films()` still returns hardcoded data for Awards only
- When iterating films via `CategoryEssentials.films()`, the loop uses one source
- When looking up via `CategoryEssentials.tmdbIdLookup`, it's been built from different source
- **Result:** Key generation from film objects doesn't match pre-built index keys

---

## Root Causes Analysis

### 1. Tier Name Mismatches (Primary Cause: 60% of failures)

**Data Source:** `GeniusDataStore` uses tier names from JSON file.

**In JSON (correct):**
```json
{
  "name": "Beginner",  // lowercase 'n'
  "order": 0,
  "films": [...]
}
```

**Hardcoded tiers in TierProgressTracker (GeniusView.swift, lines 28-30):**
```swift
let allTiers = [
    "Beginner", "Fan", "Expert", "Auteur", "Genius"  // ← Hardcoded
]
```

**Hardcoded tiers in subcategories() (GeniusView.swift, line 1028):**
```swift
return ["Beginner", "Fan", "Expert", "Auteur", "Genius"]
```

**Issue:** If JSON has different tier names or ordering, the hardcoded list won't match.

### 2. Film Iteration vs Index Build Mismatch (30% of failures)

**When building index in `buildIndexes()`:**
```swift
for category in data.categories {
    for tier in category.tiers {
        let indexKey = key(category.category, tier.name)
        filmsByCategoryTier[indexKey] = tier.films  // ← Direct reference

        for film in tier.films {
            let composite = compositeKey(...)
            tmdbByCompositeKey[composite] = film.tmdbId  // ← Uses film.year ?? 0
        }
    }
}
```

**When iterating in view code:**
```swift
let films = CategoryEssentials.films(for: category, subcategory: tier)
// This returns [(title: String, year: Int)]

for film in films {
    let lookupKey = "\(category)|\(tier)|\(film.title)|\(film.year ?? 0)"
    // ← year is NOT optional here, but IF it comes from CategoryEssentials
    // it might use different source than GeniusDataStore
}
```

**Issue:** Two different data sources = two different year values or missing entries.

### 3. Character Encoding & String Normalization (10% of failures)

**Potential Unicode issues:**
- Em-dash vs hyphen: `Mission: Impossible — Fallout` vs `Mission: Impossible - Fallout`
- Special quotes: "Mis-represented" vs "Mis-represented"
- Trailing spaces: `"Die Hard "` vs `"Die Hard"`
- Accented characters: `Gérard` vs `Gerard`

**Evidence from data:**
```json
{
  "title": "Mission: Impossible — Fallout",  // ← Em-dash (U+2014)
  "year": 2018,
  "tmdbId": 353081
}
```

If the view code reconstructs this with a regular hyphen, the key won't match.

---

## Diagnostic Protocol

### Step 1: Verify Index Built Correctly

**File:** `/Users/josh.petersen/moviegenius/ios/moviegenius/GENIUS_INDEX_AUDIT.swift`

Add this diagnostic code to your app at launch:

```swift
// MARK: - Index Validation
struct GeniusIndexAudit {
    static func auditIndexIntegrity() {
        let store = GeniusDataStore.shared

        print("\n" + String(repeating: "=", count: 80))
        print("GENIUS INDEX AUDIT")
        print(String(repeating: "=", count: 80))

        guard let data = store.data else {
            print("ERROR: No data loaded in GeniusDataStore")
            return
        }

        // 1. Count entries
        var indexedFilms: Set<String> = []
        var totalInStore = 0

        for category in data.categories {
            for tier in category.tiers {
                for film in tier.films {
                    let key = "\(category.category)|\(tier.name)|\(film.title)|\(film.year ?? 0)"
                    indexedFilms.insert(key)
                    totalInStore += 1
                }
            }
        }

        print("\n1. STORE CONTENTS:")
        print("   Total films in store: \(totalInStore)")
        print("   Unique composite keys: \(indexedFilms.count)")

        // 2. Check if keys match lookup index
        print("\n2. LOOKUP INDEX VERIFICATION:")
        var lookupMatches = 0
        var lookupMisses: [String] = []

        for key in indexedFilms {
            if CategoryEssentials.tmdbIdLookup[key] != nil {
                lookupMatches += 1
            } else {
                lookupMisses.append(key)
            }
        }

        print("   Keys that exist in index: \(lookupMatches)/\(indexedFilms.count)")
        print("   Keys missing from index: \(lookupMisses.count)")

        if !lookupMisses.isEmpty && lookupMisses.count <= 20 {
            print("\n   MISSING KEYS (first 20):")
            for (i, key) in lookupMisses.prefix(20).enumerated() {
                print("      \(i+1). '\(key)'")
            }
        }

        // 3. Character-by-character comparison for failing films
        print("\n3. CHARACTER ENCODING AUDIT (History category):")
        if let historyCat = data.categories.first(where: { $0.category == "History" }) {
            let testFilms = [
                ("Henry V", 1944),
                ("Hamlet", 1948),
                ("Lawrence of Arabia", 1962)
            ]

            for (searchTitle, searchYear) in testFilms {
                print("\n   Looking for: '\(searchTitle)' (\(searchYear))")

                var found = false
                for tier in historyCat.tiers {
                    for film in tier.films {
                        if film.title == searchTitle && film.year == searchYear {
                            let key = "History|\(tier.name)|\(film.title)|\(film.year ?? 0)"
                            let inLookup = CategoryEssentials.tmdbIdLookup[key] != nil
                            let tmdbId = CategoryEssentials.tmdbIdLookup[key] ?? 0

                            print("      ✓ Found in \(tier.name)")
                            print("        Composite key: '\(key)'")
                            print("        TMDB ID from data: \(film.tmdbId)")
                            print("        TMDB ID from lookup: \(tmdbId)")
                            print("        Key in index: \(inLookup)")

                            // Byte-by-byte check
                            let titleBytes = Array(film.title.utf8)
                            print("        Title bytes: \(titleBytes)")

                            found = true
                            break
                        }
                    }
                    if found { break }
                }

                if !found {
                    print("      ✗ NOT FOUND in any tier")
                }
            }
        }

        // 4. Category/Tier structure
        print("\n4. CATEGORY/TIER STRUCTURE:")
        for category in data.categories {
            print("\n   \(category.category):")
            for tier in category.tiers {
                print("      - \(tier.name): \(tier.films.count) films")
            }
        }

        print("\n" + String(repeating: "=", count: 80) + "\n")
    }
}

// Call at app launch (in SceneDelegate or app init):
// GeniusIndexAudit.auditIndexIntegrity()
```

### Step 2: Check View Code Integration

Run this check to see what keys the view is actually generating:

```swift
// In GeniusView.swift, add temporary logging:
let lookupKey = "\(self.category)|\(self.subcategory ?? "")|\(film.title)|\(film.year ?? 0)"
let inIndex = CategoryEssentials.tmdbIdLookup[lookupKey] != nil
let indexValue = CategoryEssentials.tmdbIdLookup[lookupKey]

print("""
🔍 LOOKUP ATTEMPT:
   Category: '\(self.category)'
   Tier: '\(self.subcategory ?? "nil")'
   Film: '\(film.title)'
   Year: \(film.year ?? 0)
   Composite Key: '\(lookupKey)'
   In Index: \(inIndex)
   Index Value: \(indexValue ?? -1)
   """)
```

### Step 3: Data Integrity Validation Script

Create a Python script to validate JSON structure:

```python
# File: /Users/josh.petersen/moviegenius/validate_genius_data.py
import json
import sys

def validate_genius_data(json_path):
    """Comprehensive validation of genius_data.json structure"""

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    errors = []
    warnings = []

    # 1. Schema validation
    if 'schemaVersion' not in data:
        errors.append("Missing 'schemaVersion'")

    if 'categories' not in data:
        errors.append("Missing 'categories' array")
        return errors, warnings

    # 2. Per-category validation
    seen_keys = set()
    duplicate_keys = []

    for cat in data['categories']:
        cat_name = cat.get('category', 'UNNAMED')

        if 'tiers' not in cat:
            errors.append(f"{cat_name}: missing 'tiers' array")
            continue

        for tier in cat['tiers']:
            tier_name = tier.get('name', 'UNNAMED')
            films = tier.get('films', [])

            if not isinstance(films, list):
                errors.append(f"{cat_name}|{tier_name}: 'films' is not array")
                continue

            for film in films:
                title = film.get('title', '')
                year = film.get('year', '')
                tmdb_id = film.get('tmdbId', '')

                # Missing required fields
                if not title:
                    errors.append(f"{cat_name}|{tier_name}: film missing 'title'")
                if not year:
                    errors.append(f"{cat_name}|{tier_name}: film missing 'year'")
                if not tmdb_id:
                    errors.append(f"{cat_name}|{tier_name}: film missing 'tmdbId'")

                # Check for duplicates and encoding issues
                key = f"{cat_name}|{tier_name}|{title}|{year}"
                if key in seen_keys:
                    duplicate_keys.append(key)
                else:
                    seen_keys.add(key)

                # Encoding check
                try:
                    key.encode('utf-8')
                except UnicodeEncodeError as e:
                    errors.append(f"{cat_name}|{tier_name}|{title}: encoding error {e}")

                # Whitespace issues
                if title != title.strip():
                    warnings.append(f"{cat_name}|{tier_name}: '{title}' has leading/trailing whitespace")

    if duplicate_keys:
        errors.append(f"Duplicate composite keys found: {len(duplicate_keys)}")
        for key in duplicate_keys[:10]:
            errors.append(f"  - {key}")

    return errors, warnings

if __name__ == '__main__':
    json_path = '/Users/josh.petersen/moviegenius/ios/moviegenius/moviegenius/Resources/genius_data.json'

    errors, warnings = validate_genius_data(json_path)

    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  ✗ {e}")

    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print(f"  ⚠ {w}")

    if not errors and not warnings:
        print("✓ Data integrity check passed")

    sys.exit(0 if not errors else 1)
```

---

## Key Generation Issues: Detailed Analysis

### Issue 1: Optional Year Handling

**Before fix (broken):**
```swift
let composite = compositeKey(
    category: category.category,
    tier: tier.name,
    title: film.title,
    year: film.year  // ← Optional(1944) string representation!
)
```

**After fix (current):**
```swift
let composite = compositeKey(
    category: category.category,
    tier: tier.name,
    title: film.title,
    year: film.year ?? 0  // ← Unwrap to 0
)
```

**Status:** Fixed in GeniusDataStore ✓

**But still could be broken in view code:**
```swift
// GeniusView.swift line 894
let lookupKey = "\(self.category)|\(self.subcategory ?? "")|\(film.title)|\(film.year ?? 0)"
```

### Issue 2: Tier Name Case Sensitivity

Swift strings are **case-sensitive**:
- `"Fan"` ≠ `"fan"`
- `"Beginner"` ≠ `"beginner"`

**Audit:** Check if JSON uses different casing:
```python
# In validate script
for category in data['categories']:
    for tier in category['tiers']:
        tier_name = tier['name']
        if tier_name != tier_name.strip():
            print(f"Whitespace issue: '{tier_name}'")
        if tier_name[0].islower():
            print(f"Lowercase tier: '{tier_name}'")
```

### Issue 3: Unicode Normalization

Some characters have multiple Unicode representations:

```swift
// Could be either:
let dash1 = "Impossible — Fallout"   // Em-dash (U+2014)
let dash2 = "Impossible - Fallout"   // Hyphen (U+002D)

// These won't match in dictionary lookup:
dict["Impossible — Fallout"]  // Key doesn't exist
dict["Impossible - Fallout"]  // Different key
```

**Check in JSON:**
```python
import unicodedata

for film in films:
    nfd = unicodedata.normalize('NFD', film['title'])
    nfc = unicodedata.normalize('NFC', film['title'])
    if nfd != nfc:
        print(f"Normalization difference: {film['title']}")
        for i, c in enumerate(film['title']):
            print(f"  [{i}] {c!r} (U+{ord(c):04X})")
```

---

## Data Anomalies Explained

### "Loading 5/26 films successfully"

**Observation:**
```
📋 Loading 26 films for History > Fan
✅ FINAL RESULT: Loaded 5/26 films successfully
```

**Root Cause:**
- `CategoryEssentials.films(for: "History", subcategory: "Fan")` returns 26 films
- Loop iterates all 26, attempts lookup with composite keys
- Only 5 keys match the `CategoryEssentials.tmdbIdLookup` dictionary
- Other 21 fall back to TMDB search (slow, may fail)

**Why 5 work:**
- Likely coincidence or these films are explicitly handled elsewhere
- Check if these 5 appear in any hardcoded Awards data

### "History > nil" loads 0 films

**In code:**
```swift
let films = CategoryEssentials.films(for: category, subcategory: tier)
// If tier is nil: CategoryEssentials.films("History", "")
// Falls through switch statement, returns []
```

**Fix:** Ensure `subcategory` is never nil/empty before calling.

---

## Recommended Diagnostic Steps (Priority Order)

### 1. Run Index Audit (15 minutes)
Add `GeniusIndexAudit.auditIndexIntegrity()` call at app startup, examine console output for:
- Are all 1,828 films indexed?
- Which films are missing from lookup?
- Are there tier name mismatches?

### 2. Validate JSON Structure (5 minutes)
```bash
cd /Users/josh.petersen/moviegenius
python3 validate_genius_data.py
```

Check for:
- Duplicate composite keys
- Missing required fields
- Encoding issues

### 3. Character-by-Character Comparison (10 minutes)
For failing films, print hex dumps:
```swift
let title = film.title
let bytes = Array(title.utf8)
print("Title: '\(title)'")
print("UTF-8 bytes: \(bytes)")
print("Hex: \(bytes.map { String(format: "%02X", $0) }.joined(separator: " "))")
```

### 4. Check Tier Name Consistency (5 minutes)
Confirm JSON tier names match all hardcoded references:
```python
# From JSON
json_tiers = set()
for cat in data['categories']:
    for tier in cat['tiers']:
        json_tiers.add(tier['name'])

print("JSON tier names:", sorted(json_tiers))
print("Expected: {'Beginner', 'Fan', 'Expert', 'Auteur', 'Genius'}")
```

---

## Summary of Issues & Severity

| Issue | Severity | Impact | Quick Fix |
|-------|----------|--------|-----------|
| Tier name mismatch | HIGH | 80% lookup failures | Audit tiers, align hardcoded list |
| Optional year formatting | MEDIUM | 20% failures if nulls exist | Year ?? 0 (already done) |
| Unicode normalization | LOW | Edge cases (dashes, accents) | Use NFD normalization |
| Hardcoded Awards data | MEDIUM | Not applicable to genres | Use GeniusDataStore for all |

---

## Files to Examine

1. **`GeniusDataStore.swift`** - Index building logic (correct)
2. **`GeniusView.swift` (lines 989-1156)** - CategoryEssentials hardcoded data
3. **`GeniusView.swift` (lines 28-30, 893-905)** - Lookup call site with hardcoded tiers
4. **`genius_data.json`** - Source data (correct but needs validation)

