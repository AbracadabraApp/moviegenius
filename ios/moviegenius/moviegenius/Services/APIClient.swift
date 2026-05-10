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
        // Don't use .convertFromSnakeCase - API uses snake_case keys
        // but we handle them with CodingKeys

        do {
            return try decoder.decode(MovieResponse.self, from: data)
        } catch {
            // Print decoding error for debugging
            print("Decoding error: \(error)")
            if let decodingError = error as? DecodingError {
                switch decodingError {
                case .keyNotFound(let key, let context):
                    print("Missing key: \(key.stringValue) - \(context.debugDescription)")
                case .typeMismatch(let type, let context):
                    print("Type mismatch for type: \(type) - \(context.debugDescription)")
                case .valueNotFound(let type, let context):
                    print("Value not found for type: \(type) - \(context.debugDescription)")
                case .dataCorrupted(let context):
                    print("Data corrupted: \(context.debugDescription)")
                @unknown default:
                    print("Unknown decoding error")
                }
            }
            throw error
        }
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
