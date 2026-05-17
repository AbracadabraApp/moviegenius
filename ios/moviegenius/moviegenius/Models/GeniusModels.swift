import Foundation

// MARK: - Tier data models
//
// Single source of truth for MovieGenius canon data. Replaces both the
// hardcoded switch statement in GeniusView.swift and the static dictionary
// in TierTmdbLookup.swift — film entry and TMDB id now live together, so
// they can never drift out of sync.
//
// JSON shape (top-level genius_data.json):
//
// {
//   "schemaVersion": 1,
//   "categories": [
//     {
//       "category": "Drama",
//       "tiers": [
//         {
//           "name": "Essential",
//           "order": 0,
//           "films": [
//             { "title": "Network", "year": 1976, "tmdbId": 8392 }
//           ]
//         }
//       ]
//     }
//   ]
// }
//
// For the Actors / Actresses / Directors categories, the "tiers" array
// holds one entry per person (name in "name"), not Essential..Master.
// Same shape, different meaning — see the migration README.

struct GeniusFilm: Codable, Identifiable, Hashable {
    let title: String
    let year: Int
    let tmdbId: Int

    // Stable identity for SwiftUI lists. TMDB id is unique per film.
    var id: Int { tmdbId }

    enum CodingKeys: String, CodingKey {
        case title, year, tmdbId
    }
}

struct GeniusTier: Codable, Identifiable, Hashable {
    let name: String          // e.g. "Essential", "Master"
    let order: Int            // 0-based rank, low = easier
    let films: [GeniusFilm]

    var id: String { name }
}

struct GeniusCategory: Codable, Identifiable, Hashable {
    let category: String      // e.g. "Drama", "Crime"
    let tiers: [GeniusTier]

    var id: String { category }

    // Tiers sorted by their declared order, defensively.
    var orderedTiers: [GeniusTier] {
        tiers.sorted { $0.order < $1.order }
    }
}

struct GeniusData: Codable {
    let schemaVersion: Int
    let categories: [GeniusCategory]
}
