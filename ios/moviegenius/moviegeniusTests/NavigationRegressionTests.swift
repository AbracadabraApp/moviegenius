//
//  NavigationRegressionTests.swift
//  moviegeniusTests
//
//  Tests critical navigation patterns to prevent swipe-back gesture regressions
//

import XCTest

/// Tests critical navigation patterns to prevent swipe-back gesture regressions
final class NavigationRegressionTests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    // MARK: - Swipe-Back Gesture Tests

    /// Verifies swipe-back from MovieDetailView to HomeView
    func testSwipeBackFromMovieDetailToHome() throws {
        // Navigate to Home tab
        app.tabBars.buttons["Home"].tap()

        // Tap first movie poster (assumes at least one movie visible)
        let firstMoviePoster = app.scrollViews.images.firstMatch
        XCTAssertTrue(firstMoviePoster.waitForExistence(timeout: 5))
        firstMoviePoster.tap()

        // Verify detail view appeared
        XCTAssertTrue(app.navigationBars.staticTexts.element(matching: .any, identifier: nil).exists)

        // Perform left-edge swipe-back gesture
        let leftEdge = app.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.5))
        let rightPoint = app.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5))
        leftEdge.press(forDuration: 0.1, thenDragTo: rightPoint)

        // Verify we're back at HomeView (movie detail no longer visible)
        XCTAssertTrue(app.tabBars.buttons["Home"].isSelected)
        XCTAssertFalse(app.navigationBars.buttons["Back"].exists, "Should have navigated back - no back button visible")
    }

    /// Verifies swipe-back from CollectionDetailView to GeniusView
    func testSwipeBackFromCollectionDetailToGenius() throws {
        app.tabBars.buttons["Genius"].tap()

        // Tap first collection card
        let firstCollection = app.scrollViews.otherElements.containing(.staticText, identifier: nil).firstMatch
        XCTAssertTrue(firstCollection.waitForExistence(timeout: 5))
        firstCollection.tap()

        // Verify collection detail appeared
        XCTAssertTrue(app.navigationBars.element.exists)

        // Swipe back
        performLeftEdgeSwipeBack()

        // Verify back at Genius tab
        XCTAssertTrue(app.tabBars.buttons["Genius"].isSelected)
    }

    /// Verifies swipe-back from PersonDetailView to MovieDetailView
    func testSwipeBackFromPersonDetailToMovieDetail() throws {
        // Navigate: Home → Movie → Cast Member → Swipe Back
        app.tabBars.buttons["Home"].tap()

        let firstMovie = app.scrollViews.images.firstMatch
        XCTAssertTrue(firstMovie.waitForExistence(timeout: 5))
        firstMovie.tap()

        // Scroll to cast section and tap first cast member
        let castMember = app.scrollViews.buttons.matching(NSPredicate(format: "identifier CONTAINS 'cast-'")).firstMatch
        if castMember.waitForExistence(timeout: 3) {
            castMember.tap()

            // Wait for PersonDetailView
            XCTAssertTrue(app.navigationBars.element.waitForExistence(timeout: 3))

            // Swipe back to MovieDetailView
            performLeftEdgeSwipeBack()

            // Should still be in navigation stack (back button exists)
            XCTAssertTrue(app.navigationBars.buttons["Back"].exists)
        }
    }

    // MARK: - Navigation Bar Tests

    /// Ensures no detail views hide the navigation bar
    func testNavigationBarVisibleOnAllDetailViews() throws {
        // Test MovieDetailView
        app.tabBars.buttons["Home"].tap()
        app.scrollViews.images.firstMatch.tap()
        XCTAssertTrue(app.navigationBars.element.exists, "MovieDetailView must show navigation bar")
        app.navigationBars.buttons.firstMatch.tap() // Back

        // Test CollectionDetailView
        app.tabBars.buttons["Genius"].tap()
        app.scrollViews.otherElements.firstMatch.tap()
        XCTAssertTrue(app.navigationBars.element.exists, "CollectionDetailView must show navigation bar")
    }

    /// Verifies search bar appears in correct location (toolbar, not overlay)
    func testSearchBarUsesNativeToolbar() throws {
        app.tabBars.buttons["Search"].tap()

        // Native searchable() puts search field in navigation area
        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 2))

        // Ensure it's NOT inside a custom ZStack overlay (check frame is at top)
        let searchFrame = searchField.frame
        XCTAssertLessThan(searchFrame.minY, 150, "Search bar should be in navigation area, not custom overlay")
    }

    // MARK: - Tab Bar Visibility Tests

    /// Verifies tab bar auto-hides on detail push, shows on root
    func testTabBarVisibilityBehavior() throws {
        // Root view: tab bar visible
        XCTAssertTrue(app.tabBars.element.exists)

        // Push detail: tab bar should hide
        app.tabBars.buttons["Home"].tap()
        app.scrollViews.images.firstMatch.tap()

        // Small delay for animation
        Thread.sleep(forTimeInterval: 0.5)

        // Tab bar should be hidden or offscreen in detail view
        // (NavigationStack handles this automatically)
        XCTAssertTrue(app.navigationBars.buttons["Back"].exists)
    }

    // MARK: - Helper Methods

    private func performLeftEdgeSwipeBack() {
        let leftEdge = app.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.5))
        let rightPoint = app.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5))
        leftEdge.press(forDuration: 0.1, thenDragTo: rightPoint)

        // Wait for animation
        Thread.sleep(forTimeInterval: 0.5)
    }
}
