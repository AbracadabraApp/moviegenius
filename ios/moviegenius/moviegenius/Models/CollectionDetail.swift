//
//  CollectionDetail.swift
//  moviegenius
//
//  Full collection model with subcategories and complete movie list
//

import Foundation

struct CollectionDetailResponse: Codable {
    let collection: CollectionDetail
    let movies: [CollectionDetailMovie]
}

struct CollectionDetail: Codable {
    let id: String
    let title: String
    let subtitle: String?
    let subcategories: [Subcategory]?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case subtitle
        case subcategories
    }
}

struct Subcategory: Codable, Identifiable {
    var id: String { name }
    let name: String
    let description: String?
    let movies: [SubcategoryMovie]?

    enum CodingKeys: String, CodingKey {
        case name
        case description
        case movies
    }
}

struct SubcategoryMovie: Codable {
    let tmdbId: Int
    let title: String?
    let year: Int?

    enum CodingKeys: String, CodingKey {
        case tmdbId = "tmdb_id"
        case title
        case year
    }
}

struct CollectionDetailMovie: Codable, Identifiable {
    let tmdbId: Int
    let title: String
    let year: Int?
    let posterUrl: String?

    var id: Int { tmdbId }

    enum CodingKeys: String, CodingKey {
        case tmdbId = "tmdb_id"
        case title
        case year
        case posterUrl = "poster_url"
    }
}
