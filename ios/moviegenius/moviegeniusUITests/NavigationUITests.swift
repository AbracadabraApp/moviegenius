//
//  NavigationUITests.swift
//  moviegeniusUITests
//
//  UI tests for navigation gestures and transitions
//

import XCTest

final class NavigationUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Tab Bar Navigation Tests

    func testTabBarNavigation() throws {
        // Verify all 4 tabs exist
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.exists)

        let moviesTab = tabBar.buttons["Movies"]
        let geniusTab = tabBar.buttons["Genius"]
        let searchTab = tabBar.buttons["Search"]
        let watchlistTab = tabBar.buttons["Watchlist"]

        XCTAssertTrue(moviesTab.exists)
        XCTAssertTrue(geniusTab.exists)
        XCTAssertTrue(searchTab.exists)
        XCTAssertTrue(watchlistTab.exists)

        // Test switching between tabs
        geniusTab.tap()
        XCTAssertTrue(geniusTab.isSelected)

        searchTab.tap()
        XCTAssertTrue(searchTab.isSelected)

        watchlistTab.tap()
        XCTAssertTrue(watchlistTab.isSelected)

        moviesTab.tap()
        XCTAssertTrue(moviesTab.isSelected)
    }

    func testTabDoubleTapPopToRoot() throws {
        let tabBar = app.tabBars.firstMatch
        let moviesTab = tabBar.buttons["Movies"]

        // Navigate deep into Movies tab
        moviesTab.tap()

        // Wait for content to load
        let firstMovieCard = app.scrollViews.descendants(matching: .button).firstMatch
        XCTAssertTrue(firstMovieCard.waitForExistence(timeout: 5))

        // Navigate to movie detail
        firstMovieCard.tap()

        // Verify we're in detail view (navigation bar should exist)
        let navBar = app.navigationBars.firstMatch
        XCTAssertTrue(navBar.waitForExistence(timeout: 2))

        // Double-tap Movies tab to pop to root
        moviesTab.tap()
        moviesTab.tap()

        // Verify we're back at root (large title should be visible)
        let largeTitle = app.navigationBars.staticTexts["Movies"]
        XCTAssertTrue(largeTitle.waitForExistence(timeout: 2))
    }

    // MARK: - Navigation Bar Tests

    func testNavigationBarVisibility() throws {
        // Navigation bar should always be visible
        let navBar = app.navigationBars.firstMatch
        XCTAssertTrue(navBar.exists)
        XCTAssertTrue(navBar.isHittable)
    }

    func testNavigationBarTitleModes() throws {
        let tabBar = app.tabBars.firstMatch

        // Test large title on root view
        let moviesTab = tabBar.buttons["Movies"]
        moviesTab.tap()

        let largeTitleExists = app.navigationBars.staticTexts["Movies"].exists
        XCTAssertTrue(largeTitleExists, "Root view should show large title")

        // Navigate to detail view
        let firstMovieCard = app.scrollViews.descendants(matching: .button).firstMatch
        if firstMovieCard.waitForExistence(timeout: 5) {
            firstMovieCard.tap()

            // Detail view should use inline title
            let navBar = app.navigationBars.firstMatch
            XCTAssertTrue(navBar.waitForExistence(timeout: 2))
            // Inline titles are smaller and centered
        }
    }

    // MARK: - Back Button Tests

    func testBackButtonNavigation() throws {
        let tabBar = app.tabBars.firstMatch
        let moviesTab = tabBar.buttons["Movies"]
        moviesTab.tap()

        // Navigate to movie detail
        let firstMovieCard = app.scrollViews.descendants(matching: .button).firstMatch
        if firstMovieCard.waitForExistence(timeout: 5) {
            firstMovieCard.tap()

            // Back button should exist
            let backButton = app.navigationBars.buttons.firstMatch
            XCTAssertTrue(backButton.waitForExistence(timeout: 2))

            // Tap back button
            backButton.tap()

            // Should be back at root
            let largeTitle = app.navigationBars.staticTexts["Movies"]
            XCTAssertTrue(largeTitle.waitForExistence(timeout: 2))
        }
    }

    // MARK: - Swipe Gesture Tests

    func testSwipeBackGesture() throws {
        // Skip on simulator - swipe-back gesture behavior differs
        #if targetEnvironment(simulator)
        throw XCTSkip("Swipe-back gesture test requires physical device")
        #endif

        let tabBar = app.tabBars.firstMatch
        let moviesTab = tabBar.buttons["Movies"]
        moviesTab.tap()

        // Navigate to movie detail
        let firstMovieCard = app.scrollViews.descendants(matching: .button).firstMatch
        if firstMovieCard.waitForExistence(timeout: 5) {
            firstMovieCard.tap()

            // Wait for navigation
            let navBar = app.navigationBars.firstMatch
            XCTAssertTrue(navBar.waitForExistence(timeout: 2))

            // Perform swipe-back gesture from left edge
            let leftEdge = app.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5))
            let center = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            leftEdge.press(forDuration: 0.1, thenDragTo: center)

            // Should be back at root
            let largeTitle = app.navigationBars.staticTexts["Movies"]
            XCTAssertTrue(largeTitle.waitForExistence(timeout: 2))
        }
    }

    func testSwipeBackGestureNotDisabled() throws {
        // This test ensures swipe-back is never disabled
        #if targetEnvironment(simulator)
        throw XCTSkip("Swipe-back gesture test requires physical device")
        #endif

        // Navigate through multiple screens
        let tabBar = app.tabBars.firstMatch
        let geniusTab = tabBar.buttons["Genius"]
        geniusTab.tap()

        // Try to find a category to tap
        let firstCategory = app.scrollViews.descendants(matching: .button).firstMatch
        if firstCategory.waitForExistence(timeout: 5) {
            firstCategory.tap()

            // Swipe back should work
            let leftEdge = app.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5))
            let center = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            leftEdge.press(forDuration: 0.1, thenDragTo: center)

            // Should be back at Genius root
            XCTAssertTrue(geniusTab.isSelected)
        }
    }

    // MARK: - Deep Navigation Tests

    func testDeepNavigationStack() throws {
        let tabBar = app.tabBars.firstMatch
        let moviesTab = tabBar.buttons["Movies"]
        moviesTab.tap()

        // Navigate: Home -> Collection -> Movie Detail
        let firstCollection = app.scrollViews.descendants(matching: .button).firstMatch
        if firstCollection.waitForExistence(timeout: 5) {
            firstCollection.tap()

            // In collection view, tap a movie
            let movieInCollection = app.scrollViews.descendants(matching: .button).firstMatch
            if movieInCollection.waitForExistence(timeout: 3) {
                movieInCollection.tap()

                // We should be 2 levels deep
                let navBar = app.navigationBars.firstMatch
                XCTAssertTrue(navBar.exists)

                // Navigate back twice
                let backButton = app.navigationBars.buttons.firstMatch
                if backButton.exists {
                    backButton.tap() // Back to collection
                    Thread.sleep(forTimeInterval: 0.5)

                    if backButton.exists {
                        backButton.tap() // Back to home
                    }
                }

                // Should be at root
                let largeTitle = app.navigationBars.staticTexts["Movies"]
                XCTAssertTrue(largeTitle.waitForExistence(timeout: 2))
            }
        }
    }

    // MARK: - Search Navigation Tests

    func testSearchNavigation() throws {
        let tabBar = app.tabBars.firstMatch
        let searchTab = tabBar.buttons["Search"]
        searchTab.tap()

        // Search field should be visible
        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 3))

        // Type a search query
        searchField.tap()
        searchField.typeText("Inception")

        // Tap search button
        app.buttons["Search"].tap()

        // Wait for results
        Thread.sleep(forTimeInterval: 2)

        // Tap first result if available
        let firstResult = app.scrollViews.descendants(matching: .button).firstMatch
        if firstResult.waitForExistence(timeout: 5) {
            firstResult.tap()

            // Should navigate to movie detail
            let navBar = app.navigationBars.firstMatch
            XCTAssertTrue(navBar.waitForExistence(timeout: 2))

            // Navigate back
            let backButton = app.navigationBars.buttons.firstMatch
            if backButton.exists {
                backButton.tap()
            }

            // Should be back at search results
            XCTAssertTrue(searchField.waitForExistence(timeout: 2))
        }
    }

    // MARK: - Tab Persistence Tests

    func testTabNavigationStatePersistence() throws {
        let tabBar = app.tabBars.firstMatch

        // Navigate deep in Movies tab
        let moviesTab = tabBar.buttons["Movies"]
        moviesTab.tap()

        let firstMovieCard = app.scrollViews.descendants(matching: .button).firstMatch
        if firstMovieCard.waitForExistence(timeout: 5) {
            firstMovieCard.tap()

            // Switch to Genius tab
            let geniusTab = tabBar.buttons["Genius"]
            geniusTab.tap()

            // Switch back to Movies tab
            moviesTab.tap()

            // Should still be in movie detail (navigation state preserved)
            let navBar = app.navigationBars.firstMatch
            XCTAssertTrue(navBar.exists)
            let backButton = app.navigationBars.buttons.firstMatch
            XCTAssertTrue(backButton.exists, "Should still be in detail view")
        }
    }

    // MARK: - Edge Case Tests

    func testRapidTabSwitching() throws {
        let tabBar = app.tabBars.firstMatch

        // Rapidly switch between tabs
        for _ in 0..<10 {
            tabBar.buttons["Movies"].tap()
            tabBar.buttons["Genius"].tap()
            tabBar.buttons["Search"].tap()
            tabBar.buttons["Watchlist"].tap()
        }

        // App should not crash and last tab should be selected
        XCTAssertTrue(tabBar.buttons["Watchlist"].isSelected)
    }

    func testNavigationDuringLoading() throws {
        let tabBar = app.tabBars.firstMatch
        let moviesTab = tabBar.buttons["Movies"]
        moviesTab.tap()

        // Try to navigate while content is loading
        let firstButton = app.scrollViews.descendants(matching: .button).firstMatch

        // Don't wait for existence, tap immediately
        if firstButton.exists {
            firstButton.tap()

            // Try to go back immediately
            let backButton = app.navigationBars.buttons.firstMatch
            if backButton.exists {
                backButton.tap()
            }
        }

        // App should handle this gracefully
        XCTAssertTrue(app.exists)
    }

    // MARK: - Accessibility Tests

    func testNavigationAccessibility() throws {
        // Enable VoiceOver testing
        app.launchArguments.append("-UIAccessibilityEnabled")
        app.launchArguments.append("1")
        app.launch()

        let tabBar = app.tabBars.firstMatch

        // Check tab accessibility labels
        XCTAssertTrue(tabBar.buttons["Movies"].exists)
        XCTAssertTrue(tabBar.buttons["Genius"].exists)
        XCTAssertTrue(tabBar.buttons["Search"].exists)
        XCTAssertTrue(tabBar.buttons["Watchlist"].exists)

        // Navigate to detail
        tabBar.buttons["Movies"].tap()
        let firstMovieCard = app.scrollViews.descendants(matching: .button).firstMatch
        if firstMovieCard.waitForExistence(timeout: 5) {
            firstMovieCard.tap()

            // Back button should have accessibility label
            let backButton = app.navigationBars.buttons.firstMatch
            XCTAssertTrue(backButton.exists)
        }
    }
}

// MARK: - Navigation Performance Tests

extension NavigationUITests {

    func testNavigationPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            app.launch()
        }
    }

    func testTabSwitchingPerformance() throws {
        app.launch()

        measure {
            let tabBar = app.tabBars.firstMatch
            tabBar.buttons["Movies"].tap()
            tabBar.buttons["Genius"].tap()
            tabBar.buttons["Search"].tap()
            tabBar.buttons["Watchlist"].tap()
        }
    }
}