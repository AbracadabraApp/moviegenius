# Lookup Failures: Quick Fix Reference

## TL;DR

**Your Problem:** 80% of lookups fail (21/26 films in History|Fan category)

**Root Cause:** Data exists in JSON but index keys don't match lookup keys
- Tier name mismatch: JSON has different tiers than hardcoded list
- Competing indices: `CategoryEssentials` incomplete, should use `GeniusDataStore`
- Character encoding: Unicode dashes, accents, whitespace issues

**Quick Verification (5 minutes):**

```bash
# Run this Python script to check JSON structure
python3 << 'EOF'
import json

with open('/Users/josh.petersen/moviegenius/ios/moviegenius/moviegenius/Resources/genius_data.json', 'r') as f:
    data = json.load(f)

# Count films
total = 0
for cat in data['categories']:
    for tier in cat['tiers']:
        total += len(tier['films'])
print(f"Total films in JSON: {total}")

# Check History category structure
hist = [c for c in data['categories'] if c['category'] == 'History'][0]
print(f"\nHistory tier names: {[t['name'] for t in hist['tiers']]}")
print(f"History|Fan films: {len([t for t in hist['tiers'] if t['name'] == 'Fan'][0]['films'])}")

# Verify failing films exist
for tier in hist['tiers']:
    for film in tier['films']:
        if film['title'] in ['Henry V', 'Hamlet', 'Lawrence of Arabia']:
            print(f"✓ Found: {film['title']} ({film['year']}) in {tier['name']}")
EOF
```

---

## Immediate Actions (Priority Order)

### 1. Add Diagnostic Logging (10 minutes)

Add to `GeniusView.swift` line 894:

```swift
// Before lookup
let lookupKey = "\(self.category)|\(self.subcategory ?? "")|\(film.title)|\(film.year ?? 0)"
print("🔑 Looking up: '\(lookupKey)'")

// After lookup result
if let tmdbId = CategoryEssentials.tmdbIdLookup[lookupKey] {
    print("   ✅ HIT: \(tmdbId)")
} else {
    print("   ❌ MISS (will search)")
}
```

Run the app and capture 20-30 lookup attempts. This will show you the actual key format being generated.

### 2. Verify Index Built Correctly (5 minutes)

Add to your app's `SceneDelegate` or `@main` struct:

```swift
import Foundation

// At app startup:
let store = GeniusDataStore.shared
print("📊 GeniusDataStore loaded:")
print("   Categories: \(store.categoryNames.count)")
print("   Total films indexed: ???")  // Can't check this directly
// Instead, spot check:
let historyFilms = store.films(category: "History", tier: "Fan")
print("   History|Fan films: \(historyFilms.count)")

// Check if specific films are findable
if let tmdbId = store.tmdbId(category: "History", tier: "Fan", title: "Henry V", year: 1944) {
    print("   ✅ Can find Henry V directly in store: \(tmdbId)")
} else {
    print("   ❌ Cannot find Henry V in store")
}
```

### 3. Check Tier Name Consistency (3 minutes)

Compare hardcoded tier list with actual data:

```swift
// In GeniusView.swift, find this:
let allTiers = [
    "Beginner", "Fan", "Expert", "Auteur", "Genius"
]

// And verify it matches JSON by printing:
let store = GeniusDataStore.shared
let actualTiers = store.tierNames(category: "History")
print("Hardcoded tiers: \(allTiers)")
print("Actual JSON tiers for History: \(actualTiers)")

// If different, you found the issue!
```

---

## The Fix (Choose One)

### Option A: Quick Patch (30 minutes)

**Replace hardcoded tier list with data-driven list:**

In `GeniusView.swift`, around line 28-30:

**Before:**
```swift
let allTiers = [
    "Beginner", "Fan", "Expert", "Auteur", "Genius"
]
```

**After:**
```swift
let store = GeniusDataStore.shared
let allTiers = store.tierNames(category: category)  // Get from actual data
```

### Option B: Proper Fix (2-3 hours)

1. Replace all `CategoryEssentials.tmdbIdLookup` calls with `GeniusDataStore.shared.tmdbId()`
2. Remove hardcoded Awards/Actors/Actresses/Directors data from CategoryEssentials
3. Add fallback chain for Unicode/encoding issues
4. Add lookup metrics monitoring

See `LOOKUP_FIX_IMPLEMENTATION.md` for full implementation.

---

## Diagnostic Code (Copy-Paste Ready)

### Run Comprehensive Audit

```swift
// Add this Swift file to your project:
// File: GeniusIndexAudit.swift

import Foundation

struct GeniusIndexAudit {
    static func auditIndexIntegrity() {
        print("\n" + String(repeating: "=", count: 80))
        print("GENIUS INDEX AUDIT")
        print(String(repeating: "=", count: 80) + "\n")

        let store = GeniusDataStore.shared

        guard let data = store.data else {
            print("❌ No data loaded")
            return
        }

        // 1. Count total films
        var total = 0
        for cat in data.categories {
            for tier in cat.tiers {
                total += tier.films.count
            }
        }
        print("Total films: \(total)\n")

        // 2. Check specific failing films
        print("FAILING FILMS CHECK:\n")

        let testCases: [(String, String, String, Int)] = [
            ("History", "Fan", "Henry V", 1944),
            ("History", "Fan", "Hamlet", 1948),
            ("History", "Beginner", "Lawrence of Arabia", 1962),
        ]

        for (cat, tier, title, year) in testCases {
            print("Looking for: \(title) (\(year)) in \(cat)|\(tier)")

            // Check data
            var found = false
            for catData in data.categories where catData.category == cat {
                for tierData in catData.tiers {
                    for film in tierData.films {
                        if film.title == title && film.year == year {
                            print("  ✓ In data: \(film.tmdbId)")
                            found = true
                            break
                        }
                    }
                    if found { break }
                }
            }

            if !found {
                print("  ✗ NOT in data")
                continue
            }

            // Check index
            if let tmdbId = store.tmdbId(category: cat, tier: tier, title: title, year: year) {
                print("  ✓ In index: \(tmdbId)")
            } else {
                print("  ✗ NOT in index")
            }

            print()
        }

        // 3. Check tier names
        print("\nTIER CONSISTENCY:\n")
        for category in data.categories {
            let tiers = category.tiers.map(\.name)
            print("\(category.category): \(tiers.joined(separator: ", "))")
        }

        print("\n" + String(repeating: "=", count: 80) + "\n")
    }
}

// Call it:
// GeniusIndexAudit.auditIndexIntegrity()
```

### Spot-Check Individual Film

```swift
// Quick inline check in your view
let store = GeniusDataStore.shared

// Method 1: Direct GeniusDataStore lookup
let result1 = store.tmdbId(
    category: "History",
    tier: "Fan",
    title: "Henry V",
    year: 1944
)
print("GeniusDataStore result: \(result1 ?? -1)")

// Method 2: CategoryEssentials lookup (current broken path)
let key = "History|Fan|Henry V|1944"
let result2 = CategoryEssentials.tmdbIdLookup[key]
print("CategoryEssentials result: \(result2 ?? -1)")

// If different or result2 is nil, you found the problem!
```

---

## Expected Findings

### If tier names match:
```
✓ Hardcoded: ["Beginner", "Fan", "Expert", "Auteur", "Genius"]
✓ Actual: ["Beginner", "Fan", "Expert", "Auteur", "Genius"]
→ Not a tier name issue
```

Then check #2 and #3 below.

### If tier names differ:
```
✓ Hardcoded: ["Beginner", "Fan", "Expert", "Auteur", "Genius"]
✗ Actual: ["Easy", "Intermediate", "Hard"]
→ KEY ISSUE: Key generation uses wrong tier name!
   Lookup generates: "History|Fan|Henry V|1944"
   Index built with: "History|Intermediate|Henry V|1944"
   MISMATCH!
```

**Fix:** Pull tier names from data instead of hardcoding.

### If index lookup fails but data exists:
```
✓ Data has: Henry V (1944) with tmdbId 22638
✓ GeniusDataStore can find it
✗ CategoryEssentials.tmdbIdLookup["History|Fan|Henry V|1944"] = nil
→ KEY ISSUE: CategoryEssentials index wasn't built properly
```

**Fix:** Rebuild CategoryEssentials.tmdbIdLookup or switch to GeniusDataStore.

### If year becomes "Optional(1944)":
```
✗ Key built: "History|Fan|Henry V|Optional(1944)"
✓ Index has: "History|Fan|Henry V|1944"
→ KEY ISSUE: Optional stringification instead of unwrap
```

**Fix:** Use `year ?? 0` instead of `\(year)`.

---

## Monitoring Setup (Optional but Recommended)

Add to your view initialization:

```swift
struct CategoryEssentialsView: View {
    let category: String
    let tier: String

    var body: some View {
        ZStack {
            // ... existing content
        }
        .onAppear {
            // Log performance
            let start = Date()

            let films = CategoryEssentials.films(for: category, subcategory: tier)
            var hits = 0
            var misses = 0

            for film in films {
                let key = "\(category)|\(tier)|\(film.title)|\(film.year ?? 0)"
                if CategoryEssentials.tmdbIdLookup[key] != nil {
                    hits += 1
                } else {
                    misses += 1
                }
            }

            let elapsed = Date().timeIntervalSince(start) * 1000
            let hitRate = Double(hits) / Double(films.count) * 100

            print("""
                LOOKUP STATS for \(category)|\(tier):
                  Films: \(films.count)
                  Hits: \(hits) (\(String(format: "%.1f", hitRate))%)
                  Misses: \(misses)
                  Time: \(String(format: "%.2f", elapsed))ms
                """)
        }
    }
}
```

---

## Files You'll Need

1. **LOOKUP_DIAGNOSIS.md** - Complete root cause analysis
2. **LOOKUP_FIX_IMPLEMENTATION.md** - Full implementation guide
3. **GeniusIndexAudit.swift** - Diagnostic tool (ready to copy)
4. **DATABASE_INTEGRITY_INTERVIEW_GUIDE.md** - For interviews

---

## Next Steps

1. **Run diagnostics** - Use GeniusIndexAudit to identify exact issue
2. **Document findings** - What's the actual mismatch?
3. **Apply quick patch** - Fix tier name list if needed
4. **Test thoroughly** - Verify hit rate improves
5. **Implement proper fix** - Replace CategoryEssentials usage with GeniusDataStore

Expected improvement: 80% miss rate → <5% miss rate after quick patch.

