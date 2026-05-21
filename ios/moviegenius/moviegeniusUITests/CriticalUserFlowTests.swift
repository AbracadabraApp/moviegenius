//
//  CriticalUserFlowTests.swift
//  moviegeniusUITests
//
//  Critical user flow tests to prevent breaking changes
//  Last Updated: 2026-05-20
//

import XCTest

final class CriticalUserFlowTests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    // MARK: - Core Navigation Flow

    func testCompleteNavigationFlow() throws {
        // Test the most common user journey
        // Home → Movie → Person → Back → Back → Home

        // 1. Start at Home
        XCTAssertTrue(app.tabBars.buttons["Home"].isSelected)

        // 2. Tap a movie
        let firstMovie = app.scrollViews.images.firstMatch
        XCTAssertTrue(firstMovie.waitForExistence(timeout: 5), "No movies found on home screen")
        firstMovie.tap()

        // 3. Verify we're in MovieDetailView
        XCTAssertTrue(app.navigationBars.buttons["Back"].waitForExistence(timeout: 3))

        // 4. Scroll to cast and tap a person
        app.swipeUp() // Scroll to cast section
        let castMember = app.scrollViews.buttons.matching(NSPredicate(format: "identifier CONTAINS 'person-'")).firstMatch
        if castMember.waitForExistence(timeout: 3) {
            castMember.tap()

            // 5. Verify we're in PersonDetailView (deeper in navigation)
            XCTAssertTrue(app.navigationBars.buttons["Back"].exists)

            // 6. Test swipe-back from Person to Movie
            performSwipeBack()
            Thread.sleep(forTimeInterval: 0.5)

            // 7. Should be back at MovieDetail (not Home)
            XCTAssertTrue(app.navigationBars.buttons["Back"].exists, "Should still be in navigation stack")

            // 8. Swipe back to Home
            performSwipeBack()
            Thread.sleep(forTimeInterval: 0.5)
        }

        // 9. Verify we're back at Home
        XCTAssertTrue(app.tabBars.buttons["Home"].isSelected)
        XCTAssertFalse(app.navigationBars.buttons["Back"].exists)
    }

    // MARK: - Favorites Persistence

    func testFavoritesPersistAcrossLaunch() throws {
        // Critical: Favorites must persist after app restart

        // 1. Navigate to a movie
        app.tabBars.buttons["Home"].tap()
        let firstMovie = app.scrollViews.images.firstMatch
        XCTAssertTrue(firstMovie.waitForExistence(timeout: 5))

        // Remember movie position for later
        let movieFrame = firstMovie.frame
        firstMovie.tap()

        // 2. Toggle "Love" button
        let loveButton = app.buttons["Love"].firstMatch
        if loveButton.waitForExistence(timeout: 3) {
            let wasLoved = loveButton.isSelected
            loveButton.tap()

            // 3. Verify state changed
            XCTAssertNotEqual(loveButton.isSelected, wasLoved)

            // 4. Go back to home
            app.navigationBars.buttons["Back"].tap()

            // 5. Kill and restart app
            app.terminate()
            app.launch()

            // 6. Navigate back to same movie
            app.tabBars.buttons["Home"].tap()
            let sameMovie = app.scrollViews.images.element(boundBy: 0)
            sameMovie.tap()

            // 7. Verify Love state persisted
            let loveButtonAfterRestart = app.buttons["Love"].firstMatch
            XCTAssertTrue(loveButtonAfterRestart.waitForExistence(timeout: 3))
            XCTAssertNotEqual(loveButtonAfterRestart.isSelected, wasLoved,
                            "Love state should persist across app launches")
        }
    }

    // MARK: - Genius View Navigation

    func testGeniusCategoryAndTierNavigation() throws {
        // Test navigation through Genius categories and tiers

        app.tabBars.buttons["Genius"].tap()

        // Wait for Genius view to load
        XCTAssertTrue(app.scrollViews.firstMatch.waitForExistence(timeout: 5))

        // 1. Find and tap a category collection
        let firstCategory = app.scrollViews.otherElements.containing(.staticText, identifier: "category-").firstMatch
        if firstCategory.waitForExistence(timeout: 3) {
            firstCategory.tap()

            // 2. Verify CollectionDetailView opened
            XCTAssertTrue(app.navigationBars.element.exists)

            // 3. Verify tier badges exist (Wanderer, Explorer, etc.)
            let tierBadges = ["Wanderer", "Explorer", "Adventurer", "Seeker", "Genius"]
            var foundTier = false
            for tier in tierBadges {
                if app.staticTexts[tier].exists {
                    foundTier = true
                    break
                }
            }
            XCTAssertTrue(foundTier, "Should show tier badges in collection detail")

            // 4. Test swipe-back
            performSwipeBack()

            // 5. Verify back at Genius tab
            XCTAssertTrue(app.tabBars.buttons["Genius"].isSelected)
        }
    }

    // MARK: - Search Functionality

    func testSearchAndNavigation() throws {
        app.tabBars.buttons["Search"].tap()

        // 1. Verify search field appears
        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 3))

        // 2. Type a search query
        searchField.tap()
        searchField.typeText("Inception")

        // 3. Wait for results
        Thread.sleep(forTimeInterval: 1) // API call

        // 4. Tap first result
        let firstResult = app.scrollViews.buttons.firstMatch
        if firstResult.waitForExistence(timeout: 5) {
            firstResult.tap()

            // 5. Verify navigation to movie detail
            XCTAssertTrue(app.navigationBars.buttons["Back"].waitForExistence(timeout: 3))

            // 6. Test swipe-back from search result
            performSwipeBack()

            // 7. Should return to search with results still visible
            XCTAssertTrue(app.tabBars.buttons["Search"].isSelected)
            XCTAssertTrue(searchField.exists)
        }
    }

    // MARK: - StandardMovieCard Button Placement

    func testFavoriteButtonsPlacement() throws {
        // Verify FavoriteButtons are below poster, not overlaid

        app.tabBars.buttons["Home"].tap()

        // Find movie poster and buttons
        let poster = app.scrollViews.images.firstMatch
        XCTAssertTrue(poster.waitForExistence(timeout: 5))

        let loveButton = app.scrollViews.buttons["Love"].firstMatch
        let queueButton = app.scrollViews.buttons["Queue"].firstMatch

        if loveButton.exists && queueButton.exists {
            let posterFrame = poster.frame
            let loveFrame = loveButton.frame
            let queueFrame = queueButton.frame

            // Buttons should be BELOW poster
            XCTAssertGreaterThan(loveFrame.minY, posterFrame.maxY,
                               "Love button must be below poster, not overlaid")
            XCTAssertGreaterThan(queueFrame.minY, posterFrame.maxY,
                               "Queue button must be below poster, not overlaid")

            // Buttons should be horizontally aligned
            XCTAssertEqual(loveFrame.minY, queueFrame.minY, accuracy: 5,
                          "Buttons should be horizontally aligned")
        }
    }

    // MARK: - Dark Mode Support

    func testDarkModeToggle() throws {
        // Navigate to Settings
        app.tabBars.buttons["Settings"].tap()

        // Find dark mode toggle
        let darkModeSwitch = app.switches["Dark Mode"].firstMatch
        if darkModeSwitch.waitForExistence(timeout: 3) {
            let wasEnabled = darkModeSwitch.value as? String == "1"

            // Toggle dark mode
            darkModeSwitch.tap()

            // Verify toggle state changed
            let isEnabled = darkModeSwitch.value as? String == "1"
            XCTAssertNotEqual(wasEnabled, isEnabled)

            // Navigate back to Home
            app.tabBars.buttons["Home"].tap()

            // Verify UI is still functional (no invisible text)
            let movieTitle = app.scrollViews.staticTexts.firstMatch
            XCTAssertTrue(movieTitle.exists, "Movie titles should be visible in dark mode")
        }
    }

    // MARK: - Memory and Performance

    func testScrollPerformance() throws {
        // Test that scrolling through large lists doesn't degrade

        app.tabBars.buttons["Genius"].tap()

        measure(metrics: [XCTOSSignpostMetric.scrollDecelerationMetric]) {
            // Scroll through Genius view
            for _ in 0..<5 {
                app.swipeUp()
            }
            for _ in 0..<5 {
                app.swipeDown()
            }
        }
    }

    // MARK: - Error Handling

    func testNetworkErrorRecovery() throws {
        // Test app handles network errors gracefully

        // Enable airplane mode simulation (if supported)
        app.launchArguments.append("--simulate-offline")
        app.terminate()
        app.launch()

        app.tabBars.buttons["Search"].tap()
        let searchField = app.searchFields.firstMatch

        if searchField.waitForExistence(timeout: 3) {
            searchField.tap()
            searchField.typeText("Test")

            // Should show error message, not crash
            let errorMessage = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'error' OR label CONTAINS 'offline'")).firstMatch
            XCTAssertTrue(errorMessage.waitForExistence(timeout: 5),
                         "Should show error message when offline")
        }
    }

    // MARK: - Helper Methods

    private func performSwipeBack() {
        let leftEdge = app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.5))
        let center = app.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5))
        leftEdge.press(forDuration: 0.05, thenDragTo: center)
    }

    private func verifyNavigationBarVisible() {
        XCTAssertTrue(app.navigationBars.element.exists,
                     "Navigation bar must be visible for swipe gestures to work")
    }
}