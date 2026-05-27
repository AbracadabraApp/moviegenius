//
//  NavigationIntegrationTests.swift
//  moviegeniusTests
//
//  Integration tests for complete navigation flows
//

import XCTest
import SwiftUI
import Combine
@testable import moviegenius

final class NavigationIntegrationTests: XCTestCase {

    var cancellables: Set<AnyCancellable>!

    override func setUp() {
        super.setUp()
        cancellables = []
    }

    override func tearDown() {
        cancellables = nil
        super.tearDown()
    }

    // MARK: - Complete User Flow Tests

    @MainActor
    func testBrowseToMovieFlow() async throws {
        // Simulate complete browse flow
        let browseNav = NavigationStateManager()
        let homeViewModel = HomeViewModel()

        // Load collections
        await homeViewModel.loadInitialCollections()

        // User browses to a collection
        if let firstCollection = homeViewModel.collections.first {
            browseNav.path.append(MovieDestination.collection(id: firstCollection.id))
            XCTAssertEqual(browseNav.path.count, 1)

            // User selects a movie from collection
            if let firstMovie = firstCollection.movies.first {
                browseNav.path.append(MovieDestination.detail(tmdbId: firstMovie.tmdbId))
                XCTAssertEqual(browseNav.path.count, 2)
            }
        }
    }

    @MainActor
    func testSearchToMovieFlow() async throws {
        // Simulate complete search flow
        let searchNav = NavigationStateManager()
        let searchViewModel = SearchViewModel()

        // User performs search
        searchViewModel.searchText = "Inception"
        await searchViewModel.performSearch()

        // Wait for results
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second

        // User selects result
        if let firstResult = searchViewModel.searchResults.first {
            searchNav.path.append(MovieDestination.detail(tmdbId: firstResult.tmdbId))
            XCTAssertEqual(searchNav.path.count, 1)
        }
    }

    @MainActor
    func testGeniusNavigationFlow() async throws {
        // Simulate Genius category navigation
        let geniusNav = NavigationStateManager()
        let geniusViewModel = GeniusViewModel()

        // Load categories
        await geniusViewModel.loadCategories()

        // User selects category
        if let category = geniusViewModel.categories.first {
            // Navigate to category essentials
            geniusNav.path.append(MovieDestination.collection(id: "genius-\(category.id)"))
            XCTAssertEqual(geniusNav.path.count, 1)

            // User selects a movie
            if let movie = category.essentialMovies.first {
                geniusNav.path.append(MovieDestination.detail(tmdbId: movie.tmdbId))
                XCTAssertEqual(geniusNav.path.count, 2)
            }
        }
    }

    // MARK: - Cross-Tab Navigation Tests

    @MainActor
    func testCrossTabNavigation() async throws {
        // Test that each tab maintains independent state
        let browseNav = NavigationStateManager()
        let searchNav = NavigationStateManager()
        let geniusNav = NavigationStateManager()
        let watchNav = NavigationStateManager()

        // Navigate in browse tab
        browseNav.path.append(MovieDestination.detail(tmdbId: 123))

        // Navigate in search tab
        searchNav.path.append(MovieDestination.detail(tmdbId: 456))

        // Navigate in genius tab
        geniusNav.path.append(MovieDestination.collection(id: "action"))

        // Navigate in watch tab
        watchNav.path.append(MovieDestination.detail(tmdbId: 789))

        // Verify all maintain separate state
        XCTAssertEqual(browseNav.path.count, 1)
        XCTAssertEqual(searchNav.path.count, 1)
        XCTAssertEqual(geniusNav.path.count, 1)
        XCTAssertEqual(watchNav.path.count, 1)

        // Clear one tab
        browseNav.path = NavigationPath()

        // Others should remain unchanged
        XCTAssertTrue(browseNav.path.isEmpty)
        XCTAssertEqual(searchNav.path.count, 1)
        XCTAssertEqual(geniusNav.path.count, 1)
        XCTAssertEqual(watchNav.path.count, 1)
    }

    // MARK: - Deep Linking Tests

    @MainActor
    func testDeepLinkToMovie() throws {
        let nav = NavigationStateManager()

        // Simulate deep link to movie
        let movieId = 550 // Fight Club
        nav.path.append(MovieDestination.detail(tmdbId: movieId))

        XCTAssertEqual(nav.path.count, 1)

        // Verify can navigate back
        nav.path.removeLast()
        XCTAssertTrue(nav.path.isEmpty)
    }

    @MainActor
    func testDeepLinkToCollection() throws {
        let nav = NavigationStateManager()

        // Simulate deep link to collection
        let collectionId = "90s-classics"
        nav.path.append(MovieDestination.collection(id: collectionId))

        XCTAssertEqual(nav.path.count, 1)
    }

    @MainActor
    func testDeepLinkToPerson() throws {
        let nav = NavigationStateManager()

        // Simulate deep link to person
        let personId = 1892 // Matt Damon
        nav.path.append(MovieDestination.person(id: personId))

        XCTAssertEqual(nav.path.count, 1)
    }

    // MARK: - State Restoration Tests

    @MainActor
    func testNavigationStateRestoration() throws {
        let nav = NavigationStateManager()

        // Build navigation stack
        nav.path.append(MovieDestination.collection(id: "action"))
        nav.path.append(MovieDestination.detail(tmdbId: 123))

        // Simulate state save (would use Codable in real app)
        let originalCount = nav.path.count

        // Simulate app termination and restoration
        // In real app, this would save/load from disk
        let restoredNav = NavigationStateManager()

        // Manually restore for testing
        restoredNav.path.append(MovieDestination.collection(id: "action"))
        restoredNav.path.append(MovieDestination.detail(tmdbId: 123))

        XCTAssertEqual(restoredNav.path.count, originalCount)
    }

    // MARK: - Error Handling in Navigation

    @MainActor
    func testNavigationWithNetworkError() async throws {
        let nav = NavigationStateManager()
        let viewModel = MovieDetailViewModel(tmdbId: 99999999) // Invalid ID

        // Navigate to invalid movie
        nav.path.append(MovieDestination.detail(tmdbId: 99999999))

        // Load should fail
        await viewModel.loadMovie()

        XCTAssertNotNil(viewModel.error)
        XCTAssertNil(viewModel.movieResponse)

        // User can still navigate back
        nav.path.removeLast()
        XCTAssertTrue(nav.path.isEmpty)
    }

    // MARK: - Navigation with Data Loading

    @MainActor
    func testNavigationDuringDataLoad() async throws {
        let nav = NavigationStateManager()
        let viewModel = MovieDetailViewModel(tmdbId: 550)

        // Start navigation
        nav.path.append(MovieDestination.detail(tmdbId: 550))

        // Start loading
        let loadTask = Task {
            await viewModel.loadMovie()
        }

        // Navigate away before load completes
        nav.path.removeLast()

        // Cancel load
        loadTask.cancel()

        XCTAssertTrue(nav.path.isEmpty)
    }

    // MARK: - Tab-Specific Behavior Tests

    @MainActor
    func testSearchTabClearBehavior() {
        let searchViewModel = SearchViewModel()

        searchViewModel.searchText = "Test Query"
        searchViewModel.clearSearch()

        XCTAssertTrue(searchViewModel.searchText.isEmpty)
        XCTAssertTrue(searchViewModel.searchResults.isEmpty)
    }

    @MainActor
    func testWatchlistNavigation() async throws {
        let watchNav = NavigationStateManager()
        let watchlistManager = WatchlistManager.shared

        // Add movies to watchlist
        let movie1 = WatchlistItem(
            tmdbId: 123,
            title: "Test Movie 1",
            year: "2024",
            posterUrl: nil,
            slug: "test-movie-1"
        )
        watchlistManager.add(movie1)

        // Navigate to movie from watchlist
        watchNav.path.append(MovieDestination.detail(tmdbId: movie1.tmdbId))
        XCTAssertEqual(watchNav.path.count, 1)

        // Remove from watchlist
        watchlistManager.remove(tmdbId: movie1.tmdbId)

        // Navigation should still work
        XCTAssertEqual(watchNav.path.count, 1)
    }

    // MARK: - Performance Tests

    func testNavigationPerformance() {
        measure {
            let nav = NavigationStateManager()

            // Perform many navigation operations
            for i in 0..<100 {
                nav.path.append(MovieDestination.detail(tmdbId: i))
            }

            // Pop all
            nav.path = NavigationPath()
        }
    }

    func testDeepNavigationPerformance() {
        measure {
            let nav = NavigationStateManager()

            // Build deep navigation stack
            for i in 0..<50 {
                if i % 3 == 0 {
                    nav.path.append(MovieDestination.collection(id: "collection-\(i)"))
                } else if i % 3 == 1 {
                    nav.path.append(MovieDestination.person(id: i))
                } else {
                    nav.path.append(MovieDestination.detail(tmdbId: i))
                }
            }

            // Navigate back through entire stack
            while nav.path.count > 0 {
                nav.path.removeLast()
            }
        }
    }

    // MARK: - Concurrent Navigation Tests

    @MainActor
    func testConcurrentTabNavigation() async throws {
        let browseNav = NavigationStateManager()
        let searchNav = NavigationStateManager()

        // Simulate concurrent navigation in different tabs
        await withTaskGroup(of: Void.self) { group in
            group.addTask { @MainActor in
                browseNav.path.append(MovieDestination.detail(tmdbId: 1))
                browseNav.path.append(MovieDestination.collection(id: "action"))
            }

            group.addTask { @MainActor in
                searchNav.path.append(MovieDestination.detail(tmdbId: 2))
                searchNav.path.append(MovieDestination.person(id: 100))
            }
        }

        XCTAssertEqual(browseNav.path.count, 2)
        XCTAssertEqual(searchNav.path.count, 2)
    }
}

// MARK: - Mock Helpers for Testing

extension NavigationIntegrationTests {

    func createMockMovieDestinations(count: Int) -> [MovieDestination] {
        (0..<count).map { MovieDestination.detail(tmdbId: $0) }
    }

    func createMockNavigationPath() -> NavigationPath {
        var path = NavigationPath()
        path.append(MovieDestination.collection(id: "test"))
        path.append(MovieDestination.detail(tmdbId: 123))
        return path
    }
}