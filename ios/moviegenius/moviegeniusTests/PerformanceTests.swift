//
//  PerformanceTests.swift
//  moviegeniusTests
//
//  Performance regression tests for critical app functions
//  Last Updated: 2026-05-20
//

import XCTest
@testable import moviegenius

final class PerformanceTests: XCTestCase {

    // MARK: - Genius View Performance

    func testGeniusDataLoadingPerformance() throws {
        // Test loading and parsing the large genius_data.json file

        self.measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            let decoder = JSONDecoder()
            if let url = Bundle.main.url(forResource: "genius_data", withExtension: "json"),
               let data = try? Data(contentsOf: url) {
                _ = try? decoder.decode(GeniusData.self, from: data)
            }
        }
    }

    func testGeniusViewRenderingPerformance() throws {
        // Test rendering performance with full data

        let geniusVM = GeniusViewModel()

        self.measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            // Simulate loading all categories
            geniusVM.loadCategories()

            // Simulate scrolling through categories
            for _ in 0..<10 {
                _ = geniusVM.categories.prefix(5)
            }
        }
    }

    // MARK: - StandardMovieCard Performance

    func testStandardMovieCardCreationPerformance() throws {
        // Test creating many movie cards (simulating list/grid)

        let movies = (0..<100).map { index in
            MovieBasic(
                id: index,
                tmdbId: index,
                title: "Movie \(index)",
                posterPath: "/path\(index).jpg",
                releaseDate: "2024-01-01",
                overview: "Overview \(index)",
                voteAverage: 7.5,
                popularity: 100.0
            )
        }

        self.measure(metrics: [XCTClockMetric()]) {
            for movie in movies {
                _ = StandardMovieCard(movie: movie)
            }
        }
    }

    // MARK: - Search Performance

    func testMovieSearchPerformance() throws {
        // Test searching through large movie database

        let searchManager = SearchManager()

        // Simulate search queries
        let queries = ["The", "Star", "Love", "War", "Man"]

        self.measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            for query in queries {
                _ = searchManager.searchMovies(query: query)
            }
        }
    }

    // MARK: - FavoritesManager Performance

    func testFavoritesOperationPerformance() throws {
        // Test favorites operations with many movies

        let favoritesManager = FavoritesManager.shared
        let movieIds = Array(1...1000)

        self.measure(metrics: [XCTClockMetric()]) {
            // Add to favorites
            for id in movieIds.prefix(500) {
                favoritesManager.toggleLoved(movieId: id)
            }

            // Check status
            for id in movieIds {
                _ = favoritesManager.isLoved(movieId: id)
            }

            // Remove from favorites
            for id in movieIds.prefix(250) {
                favoritesManager.toggleLoved(movieId: id)
            }
        }
    }

    // MARK: - Image Loading Performance

    func testPosterImageCachePerformance() throws {
        // Test image caching performance

        let imageCache = ImageCache.shared
        let posterPaths = (0..<100).map { "/poster\($0).jpg" }

        self.measure(metrics: [XCTMemoryMetric()]) {
            for path in posterPaths {
                // Simulate cache operations
                let key = NSString(string: path)
                if imageCache.cache.object(forKey: key) == nil {
                    // Simulate storing image
                    if let image = UIImage(systemName: "photo") {
                        imageCache.cache.setObject(image, forKey: key)
                    }
                }
            }
        }
    }

    // MARK: - Navigation Performance

    func testNavigationStackPerformance() throws {
        // Test deep navigation performance

        self.measure(metrics: [XCTClockMetric()]) {
            // Simulate navigation stack operations
            var path = NavigationPath()

            // Push multiple destinations
            for i in 0..<20 {
                path.append(MovieDestination.movie(id: i))
            }

            // Pop back
            for _ in 0..<10 {
                if !path.isEmpty {
                    path.removeLast()
                }
            }
        }
    }

    // MARK: - Dark Mode Performance

    func testColorSchemeChangePerformance() throws {
        // Test performance when switching between light/dark mode

        self.measure(metrics: [XCTClockMetric()]) {
            // Simulate color scheme changes
            for _ in 0..<10 {
                _ = Color.mgBackground.resolve(in: .init())
                _ = Color.mgText.resolve(in: .init())
                _ = Color.mgCardBackground.resolve(in: .init())
            }
        }
    }

    // MARK: - Memory Leak Detection

    func testViewModelDeallocation() throws {
        // Test that ViewModels properly deallocate

        weak var weakViewModel: MovieDetailViewModel?

        autoreleasepool {
            let viewModel = MovieDetailViewModel(movieId: 123)
            weakViewModel = viewModel

            // Simulate usage
            viewModel.loadMovie()
        }

        // ViewModel should deallocate after leaving scope
        XCTAssertNil(weakViewModel, "MovieDetailViewModel should deallocate - potential memory leak")
    }

    func testFavoritesManagerSingleton() throws {
        // Ensure FavoritesManager doesn't create multiple instances

        let instance1 = FavoritesManager.shared
        let instance2 = FavoritesManager.shared

        XCTAssertTrue(instance1 === instance2, "FavoritesManager must be singleton")

        // Test memory footprint
        self.measure(metrics: [XCTMemoryMetric()]) {
            for i in 0..<1000 {
                _ = FavoritesManager.shared.isLoved(movieId: i)
            }
        }
    }

    // MARK: - Baseline Assertions

    func testPerformanceBaselines() throws {
        // Assert that critical operations meet baseline requirements

        let startTime = CFAbsoluteTimeGetCurrent()

        // Load Genius data
        if let url = Bundle.main.url(forResource: "genius_data", withExtension: "json"),
           let data = try? Data(contentsOf: url) {
            let decoder = JSONDecoder()
            _ = try? decoder.decode(GeniusData.self, from: data)
        }

        let loadTime = CFAbsoluteTimeGetCurrent() - startTime

        // Assert loading takes less than 100ms
        XCTAssertLessThan(loadTime, 0.1, "Genius data loading should take < 100ms, took \(loadTime * 1000)ms")
    }
}