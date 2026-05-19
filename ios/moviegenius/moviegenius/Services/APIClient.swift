//
//  APIClient.swift
//  moviegenius
//
//  API client for MovieGenius backend
//

import Foundation

actor APIClient {
    static let shared = APIClient()

    // Production API - ready for TestFlight
    private let baseURL = "https://moviegenius.ai/api/v1"

    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.waitsForConnectivity = false

        // Configure aggressive disk cache for movie data and images
        let memoryCapacity = 50 * 1024 * 1024  // 50 MB memory
        let diskCapacity = 200 * 1024 * 1024   // 200 MB disk
        let cacheDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)
            .first?
            .appendingPathComponent("MovieGeniusCache")

        config.urlCache = URLCache(
            memoryCapacity: memoryCapacity,
            diskCapacity: diskCapacity,
            directory: cacheDirectory
        )

        // Cache movie data appropriately - return cache if available, otherwise load
        config.requestCachePolicy = .returnCacheDataElseLoad

        self.session = URLSession(configuration: config)
    }

    // Helper to decode outside actor isolation (Swift 6 concurrency fix)
    nonisolated private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        return try JSONDecoder().decode(type, from: data)
    }

    // MARK: - Movie

    func fetchMovie(tmdbId: Int) async throws -> MovieResponse {
        guard let url = URL(string: "\(baseURL)/movie/\(tmdbId)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.cachePolicy = .returnCacheDataElseLoad
        request.timeoutInterval = 15

        // Cache movie data for 15 minutes
        request.setValue("public, max-age=900", forHTTPHeaderField: "Cache-Control")

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                throw APIError.httpError(statusCode: httpResponse.statusCode)
            }

            let decoded = try decode(MovieResponse.self, from: data)

            #if DEBUG
            print("✅ [APIClient] Fetched movie: \(decoded.movie.title) (\(decoded.movie.year ?? 0))")
            print("   Trailer URL: \(decoded.movie.trailerUrl ?? "nil")")
            print("   Poster URL: \(decoded.movie.posterUrl ?? "nil")")
            #endif

            return decoded
        } catch let error as URLError {
            throw APIError.networkError(underlying: error)
        } catch let error as DecodingError {
            throw APIError.decodingError(underlying: error)
        }
    }

    // MARK: - Collections

    func fetchFeaturedCollections(limit: Int = 10, offset: Int = 0, moviesPerCollection: Int = 10, seed: Int? = nil) async throws -> FeaturedCollectionsResponse {
        var components = URLComponents(string: "\(baseURL)/collections/featured")!
        components.queryItems = [
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "offset", value: String(offset)),
            URLQueryItem(name: "moviesPerCollection", value: String(moviesPerCollection))
        ]
        if let seed = seed {
            components.queryItems?.append(URLQueryItem(name: "seed", value: String(seed)))
        }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try decode(FeaturedCollectionsResponse.self, from: data)
    }

    func fetchCollection(id: String) async throws -> CollectionDetailResponse {
        guard let url = URL(string: "\(baseURL)/collections/\(id)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.cachePolicy = .returnCacheDataElseLoad
        request.timeoutInterval = 15

        // Cache collection data for 15 minutes
        request.setValue("public, max-age=900", forHTTPHeaderField: "Cache-Control")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try decode(CollectionDetailResponse.self, from: data)
    }

    // MARK: - Search

    func search(query: String, type: String = "movie", includeExternal: Bool = false) async throws -> SearchResponse {
        guard let url = URL(string: "\(baseURL)/search") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "query": query,
            "type": type,
            "includeExternal": includeExternal
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try decode(SearchResponse.self, from: data)
    }

    // MARK: - Genius

    func fetchGeniusFeed(savedIds: [Int], seenIds: [Int] = []) async throws -> GeniusFeedResponse {
        guard let url = URL(string: "\(baseURL)/genius") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "savedIds": savedIds,
            "seenIds": seenIds
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try decode(GeniusFeedResponse.self, from: data)
    }

    // MARK: - Person

    func fetchPerson(id: Int) async throws -> PersonResponse {
        guard let url = URL(string: "\(baseURL)/person/\(id)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.cachePolicy = .returnCacheDataElseLoad
        request.timeoutInterval = 15

        // Cache person data for 15 minutes
        request.setValue("public, max-age=900", forHTTPHeaderField: "Cache-Control")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try decode(PersonResponse.self, from: data)
    }

    // MARK: - TMDB Videos (Trailers)

    func fetchVideos(tmdbId: Int) async throws -> TMDBVideosResponse {
        // Use TMDB API directly for video data (not in our backend yet)
        let tmdbAPIKey = "15d2ea6d0dc1d476efbca3eba2b9bbfb"
        guard let url = URL(string: "https://api.themoviedb.org/3/movie/\(tmdbId)/videos?api_key=\(tmdbAPIKey)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.cachePolicy = .returnCacheDataElseLoad
        request.timeoutInterval = 15

        // Cache video data for 1 hour (videos rarely change)
        request.setValue("public, max-age=3600", forHTTPHeaderField: "Cache-Control")

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                throw APIError.httpError(statusCode: httpResponse.statusCode)
            }

            let decoded = try decode(TMDBVideosResponse.self, from: data)

            #if DEBUG
            print("✅ [APIClient] Fetched \(decoded.results.count) videos for movie \(tmdbId)")
            print("   Primary trailer: \(decoded.primaryTrailer?.name ?? "none")")
            #endif

            return decoded
        } catch let error as URLError {
            throw APIError.networkError(underlying: error)
        } catch let error as DecodingError {
            throw APIError.decodingError(underlying: error)
        }
    }
}

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case networkError(underlying: URLError)
    case decodingError(underlying: DecodingError)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid movie ID"
        case .invalidResponse:
            return "Invalid server response"
        case .httpError(let code) where code == 404:
            return "Movie not found"
        case .httpError(let code) where (500...599).contains(code):
            return "Server error. Please try again."
        case .httpError(let code):
            return "Request failed (error \(code))"
        case .networkError(let error) where error.code == .notConnectedToInternet || error.code == .networkConnectionLost:
            return "No internet connection"
        case .networkError(let error) where error.code == .timedOut:
            return "Request timed out. Please try again."
        case .networkError:
            return "Network error. Please check your connection."
        case .decodingError:
            return "Unable to parse movie data"
        }
    }
}
