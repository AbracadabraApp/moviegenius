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

    private init() {}

    func fetchMovie(tmdbId: Int) async throws -> MovieResponse {
        let url = URL(string: "\(baseURL)/movie/\(tmdbId)")!

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        return try decoder.decode(MovieResponse.self, from: data)
    }
}

enum APIError: Error, LocalizedError {
    case invalidResponse
    case networkError
    case decodingError

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .networkError:
            return "Network connection failed"
        case .decodingError:
            return "Failed to decode response"
        }
    }
}
