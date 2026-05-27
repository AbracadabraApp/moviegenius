//
//  NavigationSnapshotTests.swift
//  moviegeniusTests
//
//  Snapshot tests for navigation bar appearance and configuration
//

import XCTest
import SwiftUI
import SnapshotTesting
@testable import moviegenius

final class NavigationSnapshotTests: XCTestCase {

    override func setUp() {
        super.setUp()
        // Set fixed device for consistent snapshots
        isRecording = false // Set to true to record new reference images
    }

    // MARK: - Navigation Bar Appearance Tests

    func testRootNavigationBarLargeTitle() {
        let view = NavigationStack {
            HomeView()
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "home-large-title-dark"
        )

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .light)
            ),
            named: "home-large-title-light"
        )
    }

    func testDetailNavigationBarInlineTitle() {
        let view = NavigationStack {
            MovieDetailView(tmdbId: 153) // Lost in Translation
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "detail-inline-title-dark"
        )
    }

    func testGeniusViewNavigationBar() {
        let view = NavigationStack {
            GeniusView()
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "genius-navigation-bar"
        )
    }

    func testSearchViewNavigationBar() {
        let view = NavigationStack {
            SearchView()
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "search-navigation-bar"
        )
    }

    // MARK: - Tab Bar Appearance Tests

    func testTabBarAppearance() {
        let view = MainTabView()

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "tab-bar-dark"
        )

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .light)
            ),
            named: "tab-bar-light"
        )
    }

    // MARK: - Navigation Transitions

    func testNavigationPushTransition() {
        // This would require capturing the transition animation
        // Typically done with UI testing rather than snapshot testing
        XCTSkip("Navigation transitions require UI testing")
    }

    // MARK: - Toolbar Configuration Tests

    func testToolbarBackgroundVisibility() {
        let view = NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(0..<50) { i in
                        Text("Item \(i)")
                            .frame(height: 50)
                    }
                }
            }
            .navigationTitle("Scrollable Content")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "toolbar-background-visible"
        )
    }

    func testCollectionDetailNavigationBar() {
        let view = NavigationStack {
            CollectionDetailView(collectionId: "90s-classics")
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "collection-detail-nav-bar"
        )
    }

    // MARK: - Error State Navigation

    func testNavigationBarInErrorState() {
        // Create a view model that's in error state
        let viewModel = MovieDetailViewModel(tmdbId: 99999999)
        viewModel.error = APIError.notFound

        let view = NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundStyle(.red)
                    Text("Failed to load movie")
                        .font(.headline)
                }
                .padding()
            }
            .navigationTitle("Error")
            .navigationBarTitleDisplayMode(.inline)
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "navigation-error-state"
        )
    }

    // MARK: - Accessibility Size Tests

    func testNavigationBarWithLargeText() {
        let view = NavigationStack {
            HomeView()
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(preferredContentSizeCategory: .extraExtraExtraLarge)
            ),
            named: "navigation-bar-large-text"
        )
    }

    // MARK: - Back Button Tests

    func testBackButtonAppearance() {
        // Create a navigation stack with a pushed view
        let view = NavigationStack {
            NavigationLink("Tap Me", value: MovieDestination.detail(tmdbId: 153))
                .navigationDestination(for: MovieDestination.self) { destination in
                    MovieDetailView(tmdbId: 153)
                }
        }

        // This would need to be tested in UI tests as we need to actually push
        XCTSkip("Back button appearance requires UI testing with actual navigation")
    }

    // MARK: - Search Bar Appearance

    func testSearchBarInToolbar() {
        let view = NavigationStack {
            ScrollView {
                Text("Content")
            }
            .navigationTitle("Search Test")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    SearchBarCompactSmaller()
                }
            }
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "search-bar-in-toolbar"
        )
    }

    // MARK: - Tab Selection Appearance

    func testSelectedTabAppearance() {
        // Would need to programmatically select each tab
        // This is better tested in UI tests
        XCTSkip("Tab selection requires UI testing")
    }

    // MARK: - Landscape Orientation

    func testNavigationBarLandscape() {
        let view = NavigationStack {
            HomeView()
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 844, height: 390), // Landscape
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "navigation-bar-landscape"
        )
    }

    // MARK: - Edge Cases

    func testNavigationBarWithLongTitle() {
        let view = NavigationStack {
            Text("Content")
                .navigationTitle("This Is An Extremely Long Navigation Title That Should Be Truncated")
                .navigationBarTitleDisplayMode(.inline)
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "navigation-bar-long-title"
        )
    }

    func testNavigationBarWithEmptyTitle() {
        let view = NavigationStack {
            Text("Content")
                .navigationTitle("")
                .navigationBarTitleDisplayMode(.inline)
        }

        assertSnapshot(
            matching: view,
            as: .image(
                precision: 0.99,
                size: CGSize(width: 390, height: 844),
                traits: .init(userInterfaceStyle: .dark)
            ),
            named: "navigation-bar-empty-title"
        )
    }
}

// MARK: - Helper Extensions

extension NavigationSnapshotTests {

    /// Helper to create consistent test views
    func createTestNavigationStack<Content: View>(
        title: String,
        displayMode: NavigationBarItem.TitleDisplayMode,
        @ViewBuilder content: () -> Content
    ) -> some View {
        NavigationStack {
            content()
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(displayMode)
                .toolbarBackground(.visible, for: .navigationBar)
                .toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
        }
    }

    /// Helper to test different device sizes
    func testOnMultipleDevices<Content: View>(
        view: Content,
        testName: String
    ) {
        // iPhone 15 Pro
        assertSnapshot(
            matching: view,
            as: .image(size: CGSize(width: 390, height: 844)),
            named: "\(testName)-iphone15pro"
        )

        // iPhone 15 Pro Max
        assertSnapshot(
            matching: view,
            as: .image(size: CGSize(width: 430, height: 932)),
            named: "\(testName)-iphone15promax"
        )

        // iPhone SE
        assertSnapshot(
            matching: view,
            as: .image(size: CGSize(width: 375, height: 667)),
            named: "\(testName)-iphonese"
        )
    }
}