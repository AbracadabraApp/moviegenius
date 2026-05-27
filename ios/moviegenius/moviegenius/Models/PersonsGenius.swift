//
//  PersonsGenius.swift
//  moviegenius
//
//  Model for persons genius data (actors, actresses, directors)
//

import Foundation

struct PersonsGeniusData: Codable {
    let schemaVersion: Int
    let categories: [PersonCategory]
}

struct PersonCategory: Codable, Identifiable {
    var id: String { category }
    let category: String
    let tiers: [PersonTier]
}

struct PersonTier: Codable, Identifiable {
    var id: String { "\(personTmdbId)" }
    let name: String
    let subtitle: String
    let personTmdbId: Int
    let films: [PersonFilm]
    let order: Int
}

struct PersonFilm: Codable, Identifiable {
    let title: String
    let year: Int?
    let tmdbId: Int

    var id: Int { tmdbId }

    enum CodingKeys: String, CodingKey {
        case title
        case year
        case tmdbId
    }
}

// Loader for persons data
class PersonsGeniusLoader {
    static let shared = PersonsGeniusLoader()

    private var cachedData: PersonsGeniusData?

    private init() {}

    func loadPersonsData() -> PersonsGeniusData? {
        // Return cached data if available
        if let cached = cachedData {
            return cached
        }

        // Load from bundle
        guard let url = Bundle.main.url(forResource: "genius_persons", withExtension: "json") else {
            print("Failed to find genius_persons.json in bundle")
            return nil
        }

        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            let personsData = try decoder.decode(PersonsGeniusData.self, from: data)
            cachedData = personsData
            return personsData
        } catch {
            print("Failed to decode persons data: \(error)")
            return nil
        }
    }

    func getCategory(type: PersonCategoryType) -> PersonCategory? {
        guard let data = loadPersonsData() else { return nil }

        let categoryName = type.categoryName
        return data.categories.first { $0.category == categoryName }
    }
}

enum PersonCategoryType: String, Codable, Hashable {
    case actors
    case actresses
    case directors

    var categoryName: String {
        switch self {
        case .actors: return "Great Actors"
        case .actresses: return "Great Actresses"
        case .directors: return "Master Directors"
        }
    }

    var tabTitle: String {
        switch self {
        case .actors: return "Actors"
        case .actresses: return "Actresses"
        case .directors: return "Directors"
        }
    }
}