import Foundation

// MARK: - GeniusIndexAudit
//
// Comprehensive diagnostic tools for validating index integrity
// and detecting data loading issues. Run at app startup to ensure
// all 1,828 films are indexed correctly and available for lookup.
//
// Usage:
//   GeniusIndexAudit.auditIndexIntegrity()
//   GeniusIndexAudit.auditSpecificFilms()
//   GeniusIndexAudit.auditTierConsistency()

struct GeniusIndexAudit {

    // MARK: - Main Audit Entry Point

    /// Complete index integrity audit - run at app startup
    static func auditIndexIntegrity() {
        print("\n" + String(repeating: "=", count: 80))
        print("GENIUS INDEX INTEGRITY AUDIT")
        print(String(repeating: "=", count: 80) + "\n")

        let store = GeniusDataStore.shared

        guard let data = store.data else {
            print("❌ ERROR: No data loaded in GeniusDataStore")
            return
        }

        // 1. Basic statistics
        auditBasicStatistics(data: data, store: store)

        // 2. Index population
        auditIndexPopulation(data: data, store: store)

        // 3. Tier consistency
        auditTierConsistency(data: data)

        // 4. Character encoding check
        auditCharacterEncoding(data: data)

        // 5. Specific failing films
        auditFailingFilms(store: store)

        print("\n" + String(repeating: "=", count: 80) + "\n")
    }

    // MARK: - Audit Components

    /// Check basic data statistics
    private static func auditBasicStatistics(data: GeniusData, store: GeniusDataStore) {
        print("1. BASIC STATISTICS")
        print("   Categories: \(data.categories.count)")

        var totalFilms = 0
        var totalTiers = 0

        for category in data.categories {
            totalTiers += category.tiers.count
            for tier in category.tiers {
                totalFilms += tier.films.count
            }
        }

        print("   Tiers: \(totalTiers)")
        print("   Total films: \(totalFilms)")
        print()
    }

    /// Verify index matches data source
    private static func auditIndexPopulation(data: GeniusData, store: GeniusDataStore) {
        print("2. INDEX POPULATION AUDIT")

        var dataKeys: Set<String> = []
        var dataFilmsCount = 0

        // Count films and keys in data
        for category in data.categories {
            for tier in category.tiers {
                for film in tier.films {
                    let key = "\(category.category)|\(tier.name)|\(film.title)|\(film.year ?? 0)"
                    dataKeys.insert(key)
                    dataFilmsCount += 1
                }
            }
        }

        print("   Films in data: \(dataFilmsCount)")
        print("   Unique composite keys in data: \(dataKeys.count)")

        // Check if all data keys are in index
        var indexHits = 0
        var missingFromIndex: [String] = []

        for key in dataKeys {
            // We can't directly access the index, so we do a reverse lookup
            // by checking if we can fetch the film through the public API
            let parts = key.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
            if parts.count == 4 {
                let category = parts[0]
                let tier = parts[1]
                let title = parts[2]
                let year = Int(parts[3]) ?? 0

                if let tmdbId = store.tmdbId(category: category, tier: tier, title: title, year: year) {
                    indexHits += 1
                } else {
                    missingFromIndex.append(key)
                }
            }
        }

        print("   Keys found in index: \(indexHits)/\(dataKeys.count)")
        print("   Keys missing from index: \(dataKeys.count - indexHits)")

        if !missingFromIndex.isEmpty && missingFromIndex.count <= 30 {
            print("\n   ⚠️ MISSING FROM INDEX (first 30):")
            for (i, key) in missingFromIndex.prefix(30).enumerated() {
                print("      \(i+1). \(key)")
            }
        }

        print()
    }

    /// Check tier names and structure
    private static func auditTierConsistency(data: GeniusData) {
        print("3. TIER CONSISTENCY AUDIT")

        var tierNamesByCategory: [String: Set<String>] = [:]
        var tierOrderByCategory: [String: [String: Int]] = [:]

        for category in data.categories {
            let tierNames = Set(category.tiers.map(\.name))
            tierNamesByCategory[category.category] = tierNames

            var orderMap: [String: Int] = [:]
            for tier in category.tiers {
                orderMap[tier.name] = tier.order
            }
            tierOrderByCategory[category.category] = orderMap
        }

        // Check for inconsistencies
        for category in data.categories {
            let expectedTiers = tierNamesByCategory[category.category] ?? []
            print("   \(category.category):")
            print("      Tiers: \(expectedTiers.sorted().joined(separator: ", "))")

            // Check order values
            if let orderMap = tierOrderByCategory[category.category] {
                let orders = expectedTiers.compactMap { orderMap[$0] }
                let sortedOrders = orders.sorted()
                if orders != sortedOrders {
                    print("      ⚠️ WARNING: Order values not sequential: \(orders)")
                }
            }
        }

        print()
    }

    /// Check for Unicode and encoding issues
    private static func auditCharacterEncoding(data: GeniusData) {
        print("4. CHARACTER ENCODING AUDIT")

        var encodingIssues: [String] = []

        for category in data.categories {
            // Check category name
            if hasEncodingIssue(category.category) {
                encodingIssues.append("Category: '\(category.category)'")
            }

            for tier in category.tiers {
                // Check tier name
                if hasEncodingIssue(tier.name) {
                    encodingIssues.append("\(category.category)|\(tier.name)")
                }

                for film in tier.films {
                    // Check title for potential issues
                    if hasEncodingIssue(film.title) {
                        encodingIssues.append("\(category.category)|\(tier.name)|\(film.title)")
                    }

                    // Check for whitespace issues
                    if film.title != film.title.trimmingCharacters(in: .whitespaces) {
                        encodingIssues.append("""
                            WHITESPACE: '\(film.title)' (trimmed: '\(film.title.trimmingCharacters(in: .whitespaces))') \
                            in \(category.category)|\(tier.name)
                            """)
                    }
                }
            }
        }

        if encodingIssues.isEmpty {
            print("   ✓ No encoding issues detected")
        } else {
            print("   ⚠️ \(encodingIssues.count) potential encoding issues:")
            for (i, issue) in encodingIssues.prefix(20).enumerated() {
                print("      \(i+1). \(issue)")
            }
        }

        print()
    }

    /// Audit specific failing films mentioned in reports
    private static func auditFailingFilms(store: GeniusDataStore) {
        print("5. FAILING FILMS AUDIT")
        print("   Checking specific films from error reports:\n")

        let failingFilms: [(category: String, tier: String, title: String, year: Int)] = [
            ("History", "Fan", "Henry V", 1944),
            ("History", "Fan", "Hamlet", 1948),
            ("History", "Beginner", "Lawrence of Arabia", 1962),
        ]

        for film in failingFilms {
            auditSpecificFilm(
                store: store,
                category: film.category,
                tier: film.tier,
                title: film.title,
                year: film.year
            )
        }

        print()
    }

    // MARK: - Specific Film Audit

    /// Check a specific film for presence and indexing
    static func auditSpecificFilm(
        store: GeniusDataStore,
        category: String,
        tier: String,
        title: String,
        year: Int
    ) {
        print("   '\(title)' (\(year)) in \(category)|\(tier):")

        guard let data = store.data else {
            print("      ❌ No data loaded")
            return
        }

        // Find film in data
        guard let catData = data.categories.first(where: { $0.category == category }) else {
            print("      ❌ Category '\(category)' not found")
            return
        }

        var found = false
        var filmTmdbId: Int?
        var actualTier: String?

        for t in catData.tiers {
            for film in t.films {
                if film.title == title && film.year == year {
                    found = true
                    filmTmdbId = film.tmdbId
                    actualTier = t.name
                    break
                }
            }
            if found { break }
        }

        if !found {
            print("      ❌ Film NOT FOUND in data")
            return
        }

        if actualTier != tier {
            print("      ⚠️ Found in tier '\(actualTier ?? "unknown")' not '\(tier)'")
        } else {
            print("      ✓ Found in data")
        }

        if let tmdbId = filmTmdbId {
            print("      TMDB ID from data: \(tmdbId)")
        }

        // Check if indexed
        if let indexedTmdbId = store.tmdbId(
            category: category,
            tier: actualTier ?? tier,
            title: title,
            year: year
        ) {
            print("      ✓ Found in index: \(indexedTmdbId)")
            if indexedTmdbId == filmTmdbId {
                print("      ✓ Index value matches data")
            } else {
                print("      ❌ Index value MISMATCH: data=\(filmTmdbId ?? 0), index=\(indexedTmdbId)")
            }
        } else {
            print("      ❌ NOT found in index (lookup failed)")

            // Try to debug why
            print("      Debugging lookup...")

            // Check with different tier
            for tierName in store.tierNames(category: category) {
                if let id = store.tmdbId(
                    category: category,
                    tier: tierName,
                    title: title,
                    year: year
                ) {
                    print("      ⚠️ Found in tier '\(tierName)' instead of '\(tier)': \(id)")
                    break
                }
            }

            // Check films in tier
            let filmsInTier = store.films(category: category, tier: tier)
            let similarTitles = filmsInTier.filter { film in
                film.title.lowercased().contains(title.lowercased()) ||
                title.lowercased().contains(film.title.lowercased())
            }

            if !similarTitles.isEmpty {
                print("      ℹ️ Similar titles in tier '\(tier)':")
                for film in similarTitles.prefix(5) {
                    print("         - '\(film.title)' (\(film.year ?? 0))")
                }
            }
        }

        print()
    }

    // MARK: - Helper Functions

    /// Check if string has potential encoding issues
    private static func hasEncodingIssue(_ string: String) -> Bool {
        // Check if string can be represented in ASCII
        if string.allSatisfy({ $0.isASCII }) {
            return false  // ASCII strings are safe
        }

        // For non-ASCII, check if it's valid UTF-8
        let utf8Data = string.data(using: .utf8)
        let isValidUTF8 = utf8Data != nil && utf8Data?.count ?? 0 > 0

        return !isValidUTF8
    }

    // MARK: - Export Functions

    /// Generate audit report as string for logging
    static func generateAuditReport() -> String {
        var report = "GENIUS INDEX AUDIT REPORT\n"
        report += "Generated: \(Date())\n"
        report += "\n"

        let store = GeniusDataStore.shared
        guard let data = store.data else {
            report += "ERROR: No data loaded\n"
            return report
        }

        var totalFilms = 0
        var categoryCounts: [(String, Int)] = []

        for category in data.categories {
            let catCount = category.tiers.reduce(0) { $0 + $1.films.count }
            categoryCounts.append((category.category, catCount))
            totalFilms += catCount
        }

        report += "Total Films: \(totalFilms)\n"
        report += "Categories: \(data.categories.count)\n"
        report += "\nFilms by Category:\n"

        for (category, count) in categoryCounts.sorted(by: { $0.0 < $1.0 }) {
            report += "  \(category): \(count)\n"
        }

        return report
    }
}
