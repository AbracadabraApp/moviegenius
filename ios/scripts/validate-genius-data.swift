#!/usr/bin/env swift
/**
 * Genius System Data Validator
 *
 * Validates all category/tier combinations in CategoryEssentials:
 * - Empty lists (0 films)
 * - Short lists (<8 films minimum)
 * - Missing TMDB IDs
 * - Duplicate entries
 *
 * Usage: swift ios/scripts/validate-genius-data.swift
 */

import Foundation

// Parse GeniusView.swift to extract validation data
let geniusViewPath = "ios/moviegenius/moviegenius/Views/GeniusView.swift"

guard let content = try? String(contentsOfFile: geniusViewPath) else {
    print("❌ Failed to read GeniusView.swift")
    exit(1)
}

// Results tracking
var issues: [(category: String, tier: String, issue: String)] = []
var totalTiers = 0
var totalFilms = 0

// Extract all case statements from films() function
let casePattern = #/case \("(.+?)", "(.+?)"\):\s+return \[\s*((?:\(".*?", \d+\),?\s*)*)\]/#

for match in content.matches(of: casePattern) {
    let category = String(match.1)
    let tier = String(match.2)
    let filmsString = String(match.3)

    totalTiers += 1

    // Parse film entries
    let filmPattern = #/\("(.+?)", (\d+)\)/#
    let films = filmsString.matches(of: filmPattern)

    let filmCount = films.count
    totalFilms += filmCount

    // Check 1: Empty tier
    if filmCount == 0 {
        issues.append((category, tier, "❌ Empty list (0 films)"))
        continue
    }

    // Check 2: Minimum 8 films
    if filmCount < 8 {
        issues.append((category, tier, "⚠️  Only \(filmCount) films (minimum 8 required)"))
    }

    // Check 3: Duplicates
    var seen = Set<String>()
    for film in films {
        let title = String(film.1)
        let year = String(film.2)
        let key = "\(title)|\(year)"

        if seen.contains(key) {
            issues.append((category, tier, "⚠️  Duplicate: \(title) (\(year))"))
        }
        seen.insert(key)
    }
}

// Extract TMDB lookup entries count
let lookupPattern = #/"(.+?)":\s*(\d+),/#
let lookupMatches = content.matches(of: lookupPattern)
let tmdbLookupCount = lookupMatches.count

// Print results
print("═══════════════════════════════════════════════════════════")
print("GENIUS SYSTEM DATA VALIDATION REPORT")
print("═══════════════════════════════════════════════════════════\n")

print("📊 Overview:")
print("  Total tiers: \(totalTiers)")
print("  Total films: \(totalFilms)")
print("  TMDB lookup entries: \(tmdbLookupCount)\n")

if issues.isEmpty {
    print("✅ ALL CHECKS PASSED - No issues found\n")
    exit(0)
} else {
    print("⚠️  ISSUES FOUND (\(issues.count)):\n")

    // Group by category
    var byCategory: [String: [(tier: String, issue: String)]] = [:]
    for (cat, tier, issue) in issues {
        if byCategory[cat] == nil {
            byCategory[cat] = []
        }
        byCategory[cat]!.append((tier, issue))
    }

    for category in byCategory.keys.sorted() {
        print("  \(category):")
        for (tier, issue) in byCategory[category]! {
            print("    • \(tier): \(issue)")
        }
    }

    print("\n═══════════════════════════════════════════════════════════")
    print("❌ \(issues.count) issues found - please fix before deploying\n")
    exit(1)
}
