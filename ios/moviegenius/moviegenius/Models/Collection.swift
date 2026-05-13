//
//  Collection.swift
//  moviegenius
//
//  Featured collection model for Browse homepage
//

import Foundation

struct CollectionResponse: Codable {
    let collections: [Collection]
}

struct Collection: Codable, Identifiable {
    let id: String  // UUID from API
    let title: String
    let movies: [CollectionMovie]
    let categories: [String]?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case movies
        case categories
    }
}

struct CollectionMovie: Codable, Identifiable {
    let tmdbId: Int
    let title: String
    let year: Int
    let posterUrl: String?

    var id: Int { tmdbId }

    enum CodingKeys: String, CodingKey {
        case tmdbId = "tmdb_id"  // API uses snake_case
        case title
        case year
        case posterUrl = "poster_url"
    }
}
