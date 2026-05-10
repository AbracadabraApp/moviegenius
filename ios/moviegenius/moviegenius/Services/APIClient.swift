//
//  APIClient.swift
//  moviegenius
//
//  API client for MovieGenius backend
//

import Foundation

actor APIClient {
    static let shared = APIClient()
    private let baseURL = "https://moviegenius.ai/api/v1"
    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.waitsForConnectivity = false
        self.session = URLSession(configuration: config)
    }

    func fetchMovie(tmdbId: Int) async throws -> MovieResponse {
        guard let url = URL(string: "\(baseURL)/movie/\(tmdbId)") else {
            throw APIError.invalidURL
        }

        do {
            let (data, response) = try await session.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                throw APIError.httpError(statusCode: httpResponse.statusCode)
            }

            return try JSONDecoder().decode(MovieResponse.self, from: data)
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
