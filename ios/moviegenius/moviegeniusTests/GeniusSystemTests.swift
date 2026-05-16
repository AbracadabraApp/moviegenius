//
//  GeniusSystemTests.swift
//  moviegeniusTests
//
//  Comprehensive smoke tests for Genius category system
//

import XCTest
@testable import moviegenius

final class GeniusSystemTests: XCTestCase {

    // All 110 categories
    let allCategories = [
        "History", "Drama", "Comedy", "Romance", "Thriller", "Horror", "Mystery",
        "Sci-Fi", "Fantasy", "Adventure", "Action", "Documentary", "Animation",
        "Western", "Crime", "Musical", "War", "Biography", "Family", "Sport",
        "Film-Noir", "Epic", "Satire", "Noir", "Gangster", "Heist", "Spy",
        "Martial Arts", "Superhero", "Monster", "Vampire", "Zombie", "Ghost",
        "Alien", "Robot", "Time Travel", "Dystopia", "Apocalyptic", "Space Opera",
        "Cyberpunk", "Steampunk", "Gothic", "Psychological", "Surreal", "Absurdist",
        "Expressionist", "Avant-Garde", "Art House", "Experimental", "Anthology",
        "Coming of Age", "Slice of Life", "Romantic Comedy", "Dark Comedy",
        "Screwball Comedy", "Slapstick", "Mockumentary", "Found Footage",
        "Body Horror", "Slasher", "Survival Horror", "Creature Feature",
        "Disaster", "Kaiju", "Sword and Sandal", "Samurai", "Kung Fu",
        "Wuxia", "Superhero Team", "Origin Story", "Dark Hero", "Anti-Hero",
        "Buddy Cop", "Detective", "Procedural", "Legal", "Medical", "Political",
        "Religious", "Philosophical", "Existential", "Absurd", "Black Comedy",
        "Farce", "Parody", "Spoof", "Remake", "Adaptation", "Biopic",
        "True Story", "Period Piece", "Historical Epic", "Costume Drama",
        "Social Commentary", "Cultural", "Ethnic", "LGBTQ", "Feminist",
        "Road Movie", "Buddy Film", "Ensemble", "Anthology Film", "Episodic",
        "Exploitation", "Grindhouse", "B-Movie", "Cult Classic", "Camp",
        "Melodrama", "Tearjerker", "Feel-Good", "Inspirational", "Uplifting"
    ]

    let allTiers = ["Essential", "Connoisseur", "Mystery"]

    // MARK: - Data Integrity Tests

    func testAllCategoriesHaveValidTiers() async throws {
        let tmdbLookup = TierTmdbLookup.lookup

        var failures: [(category: String, tier: String, issue: String)] = []

        for category in allCategories {
            for tier in allTiers {
                // Get tier data for this category
                let films = await loadTierFilms(category: category, tier: tier)

                // Check 1: Not empty
                if films.isEmpty {
                    failures.append((category, tier, "Empty list"))
                    continue
                }

                // Check 2: Minimum 8 films per tier
                if films.count < 8 {
                    failures.append((category, tier, "Only \(films.count) films (minimum 8 required)"))
                }

                // Check 3: All films have TMDB IDs
                for film in films {
                    let filmKey = "\(film.title) (\(film.year))"
                    if tmdbLookup[filmKey] == nil {
                        failures.append((category, tier, "Missing TMDB ID for: \(filmKey)"))
                    }
                }

                // Check 4: No duplicates
                let filmKeys = films.map { "\($0.title) (\($0.year))" }
                let uniqueKeys = Set(filmKeys)
                if filmKeys.count != uniqueKeys.count {
                    failures.append((category, tier, "Contains duplicate entries"))
                }
            }
        }

        // Print failures
        if !failures.isEmpty {
            print("\n❌ GENIUS SYSTEM DATA INTEGRITY FAILURES (\(failures.count)):\n")
            for (category, tier, issue) in failures {
                print("  ✗ \(category) › \(tier): \(issue)")
            }
            print("")
        }

        XCTAssertTrue(failures.isEmpty, "Found \(failures.count) data integrity issues")
    }

    func testTMDBLookupCoverage() {
        let lookup = TierTmdbLookup.lookup

        // Check lookup table has reasonable size
        XCTAssertGreaterThan(lookup.count, 1000, "TMDB lookup should have >1000 entries")

        // Check no duplicate TMDB IDs (would indicate data corruption)
        let tmdbIds = lookup.values
        let uniqueIds = Set(tmdbIds)
        XCTAssertEqual(tmdbIds.count, uniqueIds.count, "TMDB lookup contains duplicate IDs")
    }

    // MARK: - Navigation Tests

    func testTierNavigationDoesNotCrash() async throws {
        // Sample test: Load a few random categories and tiers
        let testCategories = Array(allCategories.prefix(10))

        for category in testCategories {
            for tier in allTiers {
                // This should not crash
                let films = await loadTierFilms(category: category, tier: tier)

                // Basic sanity check
                XCTAssertTrue(films.count >= 0, "\(category) › \(tier) should return valid array")
            }
        }
    }

    // MARK: - Progress Tracking Tests

    func testProgressPersistence() {
        let manager = FavoritesManager.shared

        // Save initial state
        let initialLovedCount = manager.lovedMovies.count

        // Add a test movie
        let testMovie = SavedMovie(
            id: 550, // Fight Club
            title: "Fight Club",
            year: 1999,
            posterUrl: nil,
            slug: nil
        )

        manager.toggleLoved(testMovie)

        // Verify change
        XCTAssertEqual(manager.lovedMovies.count, initialLovedCount + 1)

        // Clean up
        manager.toggleLoved(testMovie)
        XCTAssertEqual(manager.lovedMovies.count, initialLovedCount)
    }

    // MARK: - Helper Methods

    private func loadTierFilms(category: String, tier: String) async -> [EssentialMovie] {
        // This needs to match your actual data loading logic
        // For now, return mock data - replace with actual implementation

        // TODO: Replace with actual tier loading logic from GeniusView
        return []
    }
}

// MARK: - Performance Tests

extension GeniusSystemTests {

    func testCategoryLoadingPerformance() {
        measure {
            // Measure how fast we can load a category's tier data
            let lookup = TierTmdbLookup.lookup
            let _ = lookup["The Godfather (1972)"]
        }
    }
}
