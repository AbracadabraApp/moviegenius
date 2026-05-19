//
//  GeniusDataTests.swift
//  moviegeniusTests
//
//  Tests for Genius data integrity and loading
//

import XCTest
@testable import moviegenius

final class GeniusDataTests: XCTestCase {

    func testGeniusDataFileExists() {
        // This test MUST pass for app to function
        let url = Bundle.main.url(forResource: "genius_data", withExtension: "json")
        XCTAssertNotNil(url, "genius_data.json MUST be in Xcode project bundle")
    }

    func testGeniusDataLoads() {
        let store = GeniusDataStore()
        XCTAssertFalse(store.categories.isEmpty, "Genius categories should load")
        XCTAssertGreaterThan(store.categories.count, 0, "Should have at least one category")
    }

    func testGeniusDataStructure() {
        let store = GeniusDataStore()

        for category in store.categories {
            XCTAssertFalse(category.category.isEmpty, "Category name required")
            XCTAssertFalse(category.tiers.isEmpty, "Category must have tiers")

            for tier in category.tiers {
                XCTAssertFalse(tier.name.isEmpty, "Tier name required")
                XCTAssertFalse(tier.films.isEmpty, "Tier must have films")
                XCTAssert(["Essential", "Foundational", "Connoisseur", "Specialist", "Genius"].contains(tier.name),
                         "Invalid tier name: \(tier.name)")

                for film in tier.films {
                    XCTAssertGreaterThan(film.tmdbId, 0, "Valid TMDB ID required")
                    XCTAssertFalse(film.title.isEmpty, "Film title required")
                    XCTAssertGreaterThan(film.year, 1900, "Valid year required")
                }
            }
        }
    }

    func testAllTiersPresent() {
        let store = GeniusDataStore()
        let expectedTiers = ["Essential", "Foundational", "Connoisseur", "Specialist", "Genius"]

        for category in store.categories {
            let tierNames = Set(category.tiers.map { $0.name })
            for expectedTier in expectedTiers {
                XCTAssertTrue(tierNames.contains(expectedTier),
                            "\(category.category) missing tier: \(expectedTier)")
            }
        }
    }
}
