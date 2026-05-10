//
//  MoreIdea.swift
//  moviegenius
//
//  Related movie suggestions (15 per movie)
//

import Foundation

struct MoreIdea: Codable, Identifiable {
    let tmdbId: Int?  // Some entries don't have tmdbId
    let title: String
    let year: Int
    let connection: String

    var id: String {
        "\(tmdbId ?? 0)-\(title)"
    }

    enum CodingKeys: String, CodingKey {
        case tmdbId
        case title
        case year
        case connection
    }
}
