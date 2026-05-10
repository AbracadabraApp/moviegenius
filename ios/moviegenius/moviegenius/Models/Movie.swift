//
//  Movie.swift
//  moviegenius
//
//  Models for unified API response from /api/v1/movie/{tmdbId}
//

import Foundation

// MARK: - API Response
struct MovieResponse: Codable {
    let movie: Movie
    let whyWatch: WhyWatch?
    let moreIdeas: [MoreIdea]?
    // Contributors deferred to Phase 4 (only 41% coverage)
    // Analysis legacy field not used in UI
}

// MARK: - Movie
struct Movie: Codable, Identifiable {
    let tmdbId: Int
    let title: String
    let year: Int?
    let officialTitle: String?
    let releaseDate: String?
    let slug: String?
    let posterUrl: String?
    let trailerUrl: String?
    let hasAnalysis: Bool
    let hasLinkedAnalysis: Bool
    let createdAt: String?
    let updatedAt: String?

    var id: Int { tmdbId }

    enum CodingKeys: String, CodingKey {
        case tmdbId = "tmdb_id"
        case title
        case year
        case officialTitle = "official_title"
        case releaseDate = "release_date"
        case slug
        case posterUrl = "poster_url"
        case trailerUrl = "trailer_url"
        case hasAnalysis = "has_analysis"
        case hasLinkedAnalysis = "has_linked_analysis"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
