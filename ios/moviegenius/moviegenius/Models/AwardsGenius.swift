//
//  AwardsGenius.swift
//  moviegenius
//
//  Model for awards genius data
//

import Foundation

struct AwardsGeniusData: Codable {
    let schemaVersion: Int
    let categories: [AwardCategory]
}

struct AwardCategory: Codable, Identifiable {
    var id: String { category }
    let category: String
    let tiers: [AwardTier]
}

struct AwardTier: Codable, Identifiable {
    var id: String { name }
    let name: String
    let subtitle: String
    let order: Int
    let films: [AwardFilm]
}

struct AwardFilm: Codable, Identifiable {
    let title: String
    let year: Int
    let tmdbId: Int

    var id: Int { tmdbId }
}

// Loader for awards data
class AwardsGeniusLoader {
    static let shared = AwardsGeniusLoader()

    private var cachedData: AwardsGeniusData?

    private init() {}

    func loadAwardsData() -> AwardsGeniusData? {
        // Return cached data if available
        if let cached = cachedData {
            return cached
        }

        // Load from bundle
        guard let url = Bundle.main.url(forResource: "genius_awards", withExtension: "json") else {
            print("Failed to find genius_awards.json in bundle")
            return nil
        }

        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            let awardsData = try decoder.decode(AwardsGeniusData.self, from: data)
            cachedData = awardsData
            return awardsData
        } catch {
            print("Failed to decode awards data: \(error)")
            return nil
        }
    }

    func getAllAwardTiers() -> [AwardTier] {
        guard let data = loadAwardsData() else { return [] }

        // Flatten all tiers from all categories
        return data.categories.flatMap { $0.tiers }.sorted { $0.name < $1.name }
    }
}