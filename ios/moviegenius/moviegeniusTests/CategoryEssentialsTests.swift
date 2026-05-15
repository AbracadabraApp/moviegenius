//
//  CategoryEssentialsTests.swift
//  moviegeniusTests
//
//  Tests for Category Essentials API integration
//

import Testing
import Foundation
@testable import moviegenius

struct CategoryEssentialsTests {

    // MARK: - API Response Parsing Tests

    @Test("Parse Search API Response")
    func testSearchResponseParsing() async throws {
        let searchURL = URL(string: "https://moviegenius.ai/api/v1/search")!
        var request = URLRequest(url: searchURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let searchBody = ["query": "Die Hard", "type": "movie"]
        request.httpBody = try JSONEncoder().encode(searchBody)

        let (data, response) = try await URLSession.shared.data(for: request)

        // Check HTTP response
        let httpResponse = response as? HTTPURLResponse
        #expect(httpResponse?.statusCode == 200, "Expected 200 OK from search API")

        // Parse response
        let decoder = JSONDecoder()
        let searchResponse = try decoder.decode(SearchResponse.self, from: data)

        // Verify structure
        #expect(!searchResponse.movies.isEmpty, "Expected movies in search results")
        #expect(searchResponse.query == "Die Hard", "Expected query to match")

        // Find 1988 Die Hard
        let dieHard = searchResponse.movies.first { $0.year == 1988 }
        #expect(dieHard != nil, "Expected to find Die Hard (1988)")
        #expect(dieHard?.tmdbId != nil, "Expected tmdb_id in search result")

        print("✓ Search API returned \(searchResponse.movies.count) movies")
        print("✓ Die Hard (1988) tmdbId: \(dieHard?.tmdbId ?? 0)")
    }

    @Test("Parse Movie API Response")
    func testMovieResponseParsing() async throws {
        // First search for Die Hard to get tmdbId
        let searchURL = URL(string: "https://moviegenius.ai/api/v1/search")!
        var searchRequest = URLRequest(url: searchURL)
        searchRequest.httpMethod = "POST"
        searchRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let searchBody = ["query": "Die Hard", "type": "movie"]
        searchRequest.httpBody = try JSONEncoder().encode(searchBody)

        let (searchData, _) = try await URLSession.shared.data(for: searchRequest)
        let searchResponse = try JSONDecoder().decode(SearchResponse.self, from: searchData)

        guard let dieHard = searchResponse.movies.first(where: { $0.year == 1988 }) else {
            Issue.record("Could not find Die Hard (1988) in search results")
            return
        }

        // Now fetch full movie data
        let movieURL = URL(string: "https://moviegenius.ai/api/v1/movie/\(dieHard.tmdbId)")!
        let (movieData, movieResponse) = try await URLSession.shared.data(from: movieURL)

        // Check HTTP response
        let httpResponse = movieResponse as? HTTPURLResponse
        #expect(httpResponse?.statusCode == 200, "Expected 200 OK from movie API")

        // Parse response
        let decoder = JSONDecoder()
        let movieResponseObj = try decoder.decode(MovieResponse.self, from: movieData)

        // Verify structure
        #expect(movieResponseObj.movie.tmdbId == dieHard.tmdbId, "Expected matching tmdbId")
        #expect(movieResponseObj.movie.title == "Die Hard", "Expected title")
        #expect(movieResponseObj.movie.year == 1988, "Expected year")
        #expect(movieResponseObj.movie.slug != nil, "Expected slug to be present")
        #expect(movieResponseObj.movie.posterUrl != nil, "Expected poster_url to be present")

        print("✓ Movie API returned full data")
        print("✓ Slug: \(movieResponseObj.movie.slug ?? "nil")")
        print("✓ Poster: \(movieResponseObj.movie.posterUrl ?? "nil")")
    }

    // MARK: - ViewModel Tests

    @Test("Load Action Category Essentials")
    @MainActor
    func testLoadActionEssentials() async throws {
        let viewModel = CategoryEssentialsViewModel(category: "Action")

        #expect(viewModel.movies.isEmpty, "Expected movies to be empty initially")
        #expect(!viewModel.isLoading, "Expected not loading initially")
        #expect(viewModel.error == nil, "Expected no error initially")

        // Load movies
        await viewModel.loadMovies()

        // Check loading completed
        #expect(!viewModel.isLoading, "Expected loading to be false after completion")

        // Check for errors
        if let error = viewModel.error {
            Issue.record("Error loading movies: \(error.localizedDescription)")
            print("❌ Error: \(error)")
            return
        }

        // Verify movies loaded
        #expect(!viewModel.movies.isEmpty, "Expected movies to be loaded")
        #expect(viewModel.movies.count <= 10, "Expected at most 10 movies")

        // Verify each movie has required fields
        for movie in viewModel.movies {
            #expect(movie.tmdbId > 0, "Expected valid tmdbId")
            #expect(!movie.title.isEmpty, "Expected title")
            #expect(movie.year != nil, "Expected year")
            #expect(!movie.slug.isEmpty, "Expected slug")

            print("✓ \(movie.title) (\(movie.year ?? 0))")
            print("  - slug: \(movie.slug)")
            print("  - poster: \(movie.posterUrl ?? "none")")
        }

        print("✓ Loaded \(viewModel.movies.count) Action essentials")
    }

    @Test("Load Multiple Categories")
    @MainActor
    func testLoadMultipleCategories() async throws {
        let categories = ["Action", "Drama", "Comedy"]

        for category in categories {
            let viewModel = CategoryEssentialsViewModel(category: category)
            await viewModel.loadMovies()

            if let error = viewModel.error {
                Issue.record("\(category): \(error.localizedDescription)")
                continue
            }

            #expect(!viewModel.movies.isEmpty, "Expected \(category) to load movies")
            print("✓ \(category): \(viewModel.movies.count) movies")
        }
    }

    // MARK: - Edge Cases

    @Test("Handle Movie Not Found")
    @MainActor
    func testMovieNotFound() async throws {
        // Create a film that doesn't exist
        struct MockFilm {
            let title: String
            let year: Int
        }

        let fakeFilm = MockFilm(title: "Nonexistent Movie 12345", year: 1900)

        // Try to search for it
        let searchURL = URL(string: "https://moviegenius.ai/api/v1/search")!
        var request = URLRequest(url: searchURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let searchBody = ["query": fakeFilm.title, "type": "movie"]
        request.httpBody = try JSONEncoder().encode(searchBody)

        let (data, _) = try await URLSession.shared.data(for: request)
        let searchResponse = try JSONDecoder().decode(SearchResponse.self, from: data)

        // Should not find exact year match
        let match = searchResponse.movies.first { $0.year == fakeFilm.year }
        #expect(match == nil, "Expected no match for fake movie")

        print("✓ Correctly handles movie not found")
    }

    @Test("Verify First 3 Action Films Load")
    @MainActor
    func testFirstThreeActionFilms() async throws {
        let expectedFilms = [
            ("Die Hard", 1988),
            ("Mad Max: Fury Road", 2015),
            ("Seven Samurai", 1954)
        ]

        let viewModel = CategoryEssentialsViewModel(category: "Action")
        await viewModel.loadMovies()

        #expect(viewModel.error == nil, "Expected no errors")
        #expect(viewModel.movies.count >= 3, "Expected at least 3 movies")

        // Check if we got the expected films
        for (title, year) in expectedFilms {
            let found = viewModel.movies.contains { $0.title == title && $0.year == year }
            if found {
                print("✓ Found \(title) (\(year))")
            } else {
                print("⚠️ Missing \(title) (\(year))")
            }
        }
    }
}
