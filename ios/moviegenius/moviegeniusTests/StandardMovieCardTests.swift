//
//  StandardMovieCardTests.swift
//  moviegeniusTests
//
//  Tests for StandardMovieCard layout to prevent button positioning regressions
//

import XCTest
import SwiftUI
import ViewInspector
@testable import moviegenius

final class StandardMovieCardTests: XCTestCase {

    // MARK: - Button Positioning Tests

    func testFavoriteButtonsAreBelowContent() throws {
        // This test ensures FavoriteButtons are in a separate section below the main content
        // to prevent overlap with movie title and description text

        let card = StandardMovieCard(
            tmdbId: 123,
            title: "Test Movie",
            year: 2024,
            posterUrl: nil,
            slug: "A test movie with a long description that could potentially overlap with buttons if they're positioned incorrectly"
        )

        // Create a hosting controller to test the view hierarchy
        let hostingController = UIHostingController(rootView: card)
        _ = hostingController.view // Force view loading

        // The correct structure should be:
        // VStack {
        //   NavigationLink { HStack { poster, content } }
        //   HStack { FavoriteButtons, Spacer, DeleteButton? }
        // }

        // Verify the root is a VStack with 2 children (NavigationLink and button HStack)
        let rootView = try card.inspect()
        let vstack = try rootView.vStack()

        // First child should be NavigationLink with movie content
        _ = try vstack.navigationLink(0)

        // Second child should be HStack with FavoriteButtons
        let buttonStack = try vstack.hStack(1)

        // Verify FavoriteButtons exists in the button stack
        XCTAssertNoThrow(try buttonStack.view(FavoriteButtons.self, 0))
    }

    func testButtonsDoNotOverlapWithContent() throws {
        // Test that buttons are NOT using overlay or ZStack positioning
        // which would cause them to overlap with text content

        let card = StandardMovieCard(
            tmdbId: 456,
            title: "Another Test",
            year: 2024,
            slug: "Short description"
        )

        // Convert to string representation to check for problematic patterns
        let cardString = String(describing: type(of: card.body))

        // These patterns indicate overlay positioning that causes overlap
        XCTAssertFalse(cardString.contains("ZStack"), "StandardMovieCard should not use ZStack for button positioning")
        XCTAssertFalse(cardString.contains("overlay"), "StandardMovieCard should not use overlay for button positioning")
    }

    func testButtonsRemainVisibleWithLongContent() throws {
        // Ensure buttons stay visible even with very long movie descriptions

        let longSlug = String(repeating: "This is a very long movie description. ", count: 10)

        let card = StandardMovieCard(
            tmdbId: 789,
            title: "Long Content Test",
            year: 2024,
            slug: longSlug
        )

        // The VStack should expand to accommodate both content and buttons
        // without buttons being hidden or overlapped
        let rootView = try card.inspect()
        let vstack = try rootView.vStack()

        // Both NavigationLink and button HStack should be present
        XCTAssertEqual(try vstack.count, 2, "Card should have exactly 2 main sections: content and buttons")
    }

    // MARK: - Layout Regression Guards

    func testCardMaintainsMinimumHeight() throws {
        // Card should maintain minimum height even with minimal content

        let card = StandardMovieCard(
            tmdbId: 111,
            title: "X",  // Very short title
            year: 2024
        )

        let rootView = try card.inspect()
        let vstack = try rootView.vStack()
        let navLink = try vstack.navigationLink(0)
        let content = try navLink.labelView().hStack()

        // Should have frame modifier with minHeight
        let hasMinHeight = try content.frame().minHeight == 210
        XCTAssertTrue(hasMinHeight, "Card content should maintain minimum height of 210")
    }

    func testButtonsHaveProperSpacing() throws {
        // Verify proper spacing between buttons

        let card = StandardMovieCard(
            tmdbId: 222,
            title: "Spacing Test",
            year: 2024
        )

        let rootView = try card.inspect()
        let vstack = try rootView.vStack()

        // Check VStack spacing between content and buttons
        let spacing = try vstack.spacing()
        XCTAssertEqual(spacing, .mgSpacing12, "Should have proper spacing between content and buttons")
    }
}

// MARK: - Pre-commit Hook Test

extension StandardMovieCardTests {

    /// This test is designed to be run as part of pre-commit checks
    /// It fails if problematic patterns are detected in StandardMovieCard
    func testNoOverlayPatterns() throws {
        let fileURL = URL(fileURLWithPath: #file)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("moviegenius")
            .appendingPathComponent("Components")
            .appendingPathComponent("StandardMovieCard.swift")

        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            XCTFail("StandardMovieCard.swift not found at expected path")
            return
        }

        let content = try String(contentsOf: fileURL)

        // Check for problematic patterns that cause button overlap
        let problematicPatterns = [
            ".overlay(alignment: .bottomTrailing)",
            "ZStack(alignment: .bottom",
            ".overlay(alignment: .bottom",
            "// Overlay buttons to make them interactive"
        ]

        for pattern in problematicPatterns {
            XCTAssertFalse(
                content.contains(pattern),
                "StandardMovieCard contains problematic pattern '\(pattern)' that causes button overlap"
            )
        }

        // Verify correct pattern exists
        XCTAssertTrue(
            content.contains("// Favorite buttons with optional delete button - below all content"),
            "StandardMovieCard should have buttons positioned below content"
        )
    }
}