import Foundation

// MARK: - GeniusDataStore
//
// Loads canon data from bundled JSON and exposes the SAME two lookups the
// old hardcoded code provided, so call sites don't have to change:
//
//   Old:  switch (category, tier) -> [EssentialMovie]
//   New:  store.films(category:tier:) -> [GeniusFilm]
//
//   Old:  tmdbLookup["Drama|Devotee|Network|1976"] -> 8392
//   New:  store.tmdbId(category:tier:title:year:) -> 8392
//
// This is the parity layer. Step 1 of the migration: ship this reading
// the *current* 10-tier JSON and confirm the app behaves identically
// BEFORE collapsing 10 tiers into 5.

final class GeniusDataStore {

    static let shared = GeniusDataStore()

    private(set) var data: GeniusData?
    private(set) var loadError: Error?

    // Fast indexes built once at load.
    private var filmsByCategoryTier: [String: [GeniusMovie]] = [:]
    private var tmdbByCompositeKey: [String: Int] = [:]

    private init() {
        load()
    }

    // MARK: Loading

    private func load() {
        guard let url = Bundle.main.url(forResource: "genius_data", withExtension: "json") else {
            loadError = LoadError.fileNotFound
            assertionFailure("Genius: genius_data.json not found in bundle")
            return
        }

        do {
            let jsonData = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            let loadedData = try decoder.decode(GeniusData.self, from: jsonData)

            self.data = loadedData
            buildIndexes()

            // Debug: Print loaded data summary
            print("✅ GeniusDataStore loaded successfully")
            print("  - Categories: \(loadedData.categories.count)")
            for category in loadedData.categories.prefix(3) {
                print("  - \(category.category): \(category.tiers.map { $0.name }.joined(separator: ", "))")
            }
            print("  - Total keys in index: \(filmsByCategoryTier.count)")
            print("  - Sample keys: \(Array(filmsByCategoryTier.keys.sorted().prefix(5)))")
        } catch {
            loadError = error
            assertionFailure("Genius: failed to load genius_data.json: \(error)")
        }
    }

    private func buildIndexes() {
        guard let data = data else { return }

        filmsByCategoryTier.removeAll()
        tmdbByCompositeKey.removeAll()

        for category in data.categories {
            for tier in category.tiers {
                filmsByCategoryTier[key(category.category, tier.name)] = tier.films
                for film in tier.films {
                    let composite = compositeKey(
                        category: category.category, tier: tier.name,
                        title: film.title, year: film.year ?? 0
                    )
                    tmdbByCompositeKey[composite] = film.tmdbId
                }
            }
        }
    }

    // MARK: Public lookups (mirror the old API)

    /// Films for a (category, tier) pair. Empty array if none.
    func films(category: String, tier: String) -> [GeniusMovie] {
        let lookupKey = key(category, tier)
        let result = filmsByCategoryTier[lookupKey] ?? []

        if result.isEmpty {
            print("⚠️ No films found for key: '\(lookupKey)'")
            print("   Available keys containing '\(category)': \(filmsByCategoryTier.keys.filter { $0.contains(category) }.sorted())")
        } else {
            print("✅ Found \(result.count) films for '\(lookupKey)'")
        }

        return result
    }

    /// TMDB id for a specific film, matching the old "Category|Tier|Title|Year" key.
    func tmdbId(category: String, tier: String, title: String, year: Int) -> Int? {
        tmdbByCompositeKey[compositeKey(category: category, tier: tier, title: title, year: year)]
    }

    /// Ordered tier names for a category (easy -> hard).
    func tierNames(category: String) -> [String] {
        data?.categories.first { $0.category == category }?
            .orderedTiers.map(\.name) ?? []
    }

    /// All category names.
    var categoryNames: [String] {
        data?.categories.map(\.category) ?? []
    }

    /// Total number of films across all tiers for a given category.
    func totalFilmCount(category: String) -> Int {
        guard let categoryData = data?.categories.first(where: { $0.category == category }) else {
            return 0
        }
        return categoryData.tiers.reduce(0) { $0 + $1.films.count }
    }

    /// All film IDs for a category (across all tiers).
    func allFilmIds(category: String) -> Set<Int> {
        guard let categoryData = data?.categories.first(where: { $0.category == category }) else {
            return []
        }
        return Set(categoryData.tiers.flatMap { $0.films.map(\.tmdbId) })
    }

    // MARK: Key helpers

    private func key(_ category: String, _ tier: String) -> String {
        "\(category)|\(tier)"
    }

    private func compositeKey(category: String, tier: String, title: String, year: Int) -> String {
        "\(category)|\(tier)|\(title)|\(year)"
    }

    // MARK: Error types

    enum LoadError: Error, LocalizedError {
        case fileNotFound

        var errorDescription: String? {
            switch self {
            case .fileNotFound:
                return "Genius data file not found in app bundle"
            }
        }
    }
}
