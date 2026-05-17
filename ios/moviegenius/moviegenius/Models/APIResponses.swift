//
//  APIResponses.swift
//  moviegenius
//
//  API response models for v1 endpoints
//

import Foundation

// MARK: - Featured Collections

struct FeaturedCollectionsResponse: Codable {
    let collections: [Collection]
    let count: Int
}

// MARK: - Search

struct SearchResponse: Codable {
    let query: String
    let movies: [SearchMovie]
    let collections: [SearchCollection]?  // COLLECTION_SEARCH: Optional for easy rollback
    let people: [SearchPerson]?
    let hasResults: Bool
    let fallback: SearchFallback?
}

struct SearchMovie: Codable, Identifiable {
    let id: String?
    let tmdbId: Int
    let title: String
    let year: Int?
    let posterUrl: String?
    let contributors: String?
    let whyWatch: WhyWatch?
    let analysisPreview: String?
    let contentScore: Int
    let external: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case tmdbId = "tmdb_id"
        case title
        case year
        case posterUrl = "poster_url"
        case contributors
        case whyWatch
        case analysisPreview
        case contentScore
        case external
    }
}

struct SearchPerson: Codable, Identifiable {
    let id: Int
    let name: String
    let profilePath: String?
    let knownForDepartment: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case profilePath = "profile_path"
        case knownForDepartment = "known_for_department"
    }
}

struct SearchFallback: Codable {
    let message: String
    let askUrl: String
}

// MARK: - COLLECTION_SEARCH: Search Collections (Easy Rollback)
// To remove this feature: Delete this struct and remove collections array from SearchResponse

struct SearchCollection: Codable, Identifiable {
    let id: String
    let title: String
    let subtitle: String?
    let category: String
    let movieCount: Int
    let topPosterUrls: [String]

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case subtitle
        case category
        case movieCount = "movie_count"
        case topPosterUrls = "top_poster_urls"
    }
}

// MARK: - Genius Feed

struct GeniusFeedResponse: Codable {
    let items: [GeniusFeedItem]
    let empty: Bool?
}

struct GeniusFeedItem: Codable, Identifiable {
    let type: String  // "more_ideas" or "collection"
    let id: String  // Computed from type + identifier

    // More Ideas fields
    let seedTitle: String?
    let seedTmdbId: Int?

    // Collection fields
    let name: String?
    let collectionId: String?
    let collectionTitle: String?

    // Shared
    let movies: [GeniusMovie]

    enum CodingKeys: String, CodingKey {
        case type
        case seedTitle
        case seedTmdbId
        case name
        case collectionId
        case collectionTitle
        case movies
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        type = try container.decode(String.self, forKey: .type)
        seedTitle = try container.decodeIfPresent(String.self, forKey: .seedTitle)
        seedTmdbId = try container.decodeIfPresent(Int.self, forKey: .seedTmdbId)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        collectionId = try container.decodeIfPresent(String.self, forKey: .collectionId)
        collectionTitle = try container.decodeIfPresent(String.self, forKey: .collectionTitle)
        movies = try container.decode([GeniusMovie].self, forKey: .movies)

        // Generate unique ID
        if type == "more_ideas", let tmdbId = seedTmdbId {
            id = "more_ideas_\(tmdbId)"
        } else if type == "collection", let colId = collectionId {
            id = "collection_\(colId)"
        } else {
            id = UUID().uuidString
        }
    }
}

struct GeniusMovie: Codable, Identifiable {
    let tmdbId: Int
    let title: String
    let year: Int?
    let posterUrl: String?
    let slug: String?

    var id: Int { tmdbId }

    enum CodingKeys: String, CodingKey {
        case tmdbId = "tmdb_id"
        case title
        case year
        case posterUrl = "poster_url"
        case slug
    }
}

// MARK: - Person

struct PersonResponse: Codable {
    let person: Person
    let movies: [PersonMovie]
}

struct Person: Codable, Identifiable {
    let id: Int
    let name: String
    let movieCount: Int
    let roles: [String]
    let profilePath: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case movieCount
        case roles
        case profilePath = "profile_path"
    }
}

struct PersonMovie: Codable, Identifiable {
    let tmdbId: Int
    let title: String
    let year: Int?
    let slug: String?
    let posterUrl: String?
    let roles: [String]

    var id: Int { tmdbId }

    enum CodingKeys: String, CodingKey {
        case tmdbId = "tmdb_id"
        case title
        case year
        case slug
        case posterUrl = "poster_url"
        case roles
    }
}
