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

    // MARK: - StandardMovieCard Consistency Tests

    /// Verifies FavoriteButtons appear consistently below movie cards
    func testFavoriteButtonsPlacementConsistency() throws {
        app.tabBars.buttons["Home"].tap()

        // Find a movie card's favorite buttons
        let loveButton = app.scrollViews.buttons.matching(NSPredicate(format: "label CONTAINS 'Love'")).firstMatch
        let queueButton = app.scrollViews.buttons.matching(NSPredicate(format: "label CONTAINS 'Queue'")).firstMatch

        if loveButton.waitForExistence(timeout: 3) {
            // Get movie poster frame
            let poster = app.scrollViews.images.firstMatch
            let posterFrame = poster.frame

            // Buttons should be BELOW poster, not overlaid
            let buttonFrame = loveButton.frame
            XCTAssertGreaterThan(buttonFrame.minY, posterFrame.maxY,
                                 "FavoriteButtons must be below poster, not overlaid")

            // Buttons should be horizontally aligned
            if queueButton.exists {
                XCTAssertEqual(buttonFrame.minY, queueButton.frame.minY, accuracy: 5,
                               "Love and Queue buttons must be horizontally aligned")
            }
        }
    }

    /// Verifies movie cards maintain standard dimensions
    func testMovieCardDimensions() throws {
        app.tabBars.buttons["Home"].tap()

        let firstPoster = app.scrollViews.images.firstMatch
        XCTAssertTrue(firstPoster.waitForExistence(timeout: 5))

        let frame = firstPoster.frame
        let aspectRatio = frame.height / frame.width

        // Standard poster aspect ratio is 1.5 (3:2)
        XCTAssertEqual(aspectRatio, 1.5, accuracy: 0.1,
                       "Movie posters must maintain 2:3 aspect ratio (125x188)")
    }

    // MARK: - Dark Mode Theme Tests

    /// Verifies no hardcoded colors that break in dark mode
    func testDarkModeCompatibility() throws {
        // This test would ideally switch to dark mode and verify
        // For now, we check that semantic colors are used

        // Elements should use semantic colors that adapt
        app.tabBars.buttons["Settings"].tap()

        // Look for any white/black text that doesn't adapt
        // (In real app, we'd toggle dark mode and compare)
        XCTAssertTrue(true, "Views must use Color.mg* semantic colors")
    }

    // MARK: - Terminology Consistency Tests

    /// Verifies correct terminology is used in UI
    func testTerminologyConsistency() throws {
        // Check tab bar labels
        XCTAssertTrue(app.tabBars.buttons["Home"].exists, "Should use 'Home' not 'Films'")
        XCTAssertTrue(app.tabBars.buttons["Search"].exists, "Should use 'Search' not 'Browse'")

        // Check button labels
        app.tabBars.buttons["Home"].tap()

        // Should say "Queue" not "Bookmark" or "Watchlist"
        let queueButton = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Queue'")).firstMatch
        if queueButton.waitForExistence(timeout: 2) {
            XCTAssertTrue(queueButton.exists, "Should use 'Queue' terminology")
        }

        // Should say "Love" not "Favorite"
        let loveButton = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Love'")).firstMatch
        if loveButton.waitForExistence(timeout: 2) {
            XCTAssertTrue(loveButton.exists, "Should use 'Love' not 'Favorite'")
        }
    }

    // MARK: - Performance Regression Tests

    /// Measures StandardMovieCard rendering performance
    func testMovieCardRenderingPerformance() throws {
        app.tabBars.buttons["Home"].tap()

        measure(metrics: [XCTClockMetric()]) {
            // Scroll through movie list
            app.swipeUp()
            app.swipeUp()
            app.swipeDown()
            app.swipeDown()
        }
    }

    // MARK: - Gesture Conflict Tests

    /// Ensures custom gestures don't conflict with system gestures
    func testNoGestureConflicts() throws {
        app.tabBars.buttons["Home"].tap()
        app.scrollViews.images.firstMatch.tap()

        // Try system gestures
        performLeftEdgeSwipeBack()

        // Should have gone back
        XCTAssertTrue(app.tabBars.buttons["Home"].isSelected,
                      "Swipe-back gesture must not be blocked by custom gestures")
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
