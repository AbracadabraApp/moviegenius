//
//  FavoritesManager.swift
//  moviegenius
//
//  Favorites persistence with cloud sync
//

import Foundation
import Combine

// Simple movie model for favorites
struct SavedMovie: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let year: Int?
    let posterUrl: String?
    let slug: String?

    static func == (lhs: SavedMovie, rhs: SavedMovie) -> Bool {
        lhs.id == rhs.id
    }
}

// Favorites manager with cloud sync
@MainActor
class FavoritesManager: ObservableObject {
    static let shared = FavoritesManager()

    @Published var lovedMovies: [SavedMovie] = []
    @Published var queueMovies: [SavedMovie] = []
    @Published var isSyncing = false

    private let lovedKey = "lovedMovies"
    private let queueKey = "queueMovies"
    private let authManager = AuthManager.shared
    private let apiBaseURL = "https://moviegenius.ai" // Change to localhost:3000 for local dev

    private init() {
        loadFavorites()
    }

    func loadFavorites() {
        if let lovedData = UserDefaults.standard.data(forKey: lovedKey),
           let loved = try? JSONDecoder().decode([SavedMovie].self, from: lovedData) {
            lovedMovies = loved
        }

        if let queueData = UserDefaults.standard.data(forKey: queueKey),
           let queue = try? JSONDecoder().decode([SavedMovie].self, from: queueData) {
            queueMovies = queue
        }
    }

    func isLoved(_ tmdbId: Int) -> Bool {
        lovedMovies.contains(where: { $0.id == tmdbId })
    }

    func isInQueue(_ tmdbId: Int) -> Bool {
        queueMovies.contains(where: { $0.id == tmdbId })
    }

    func toggleLoved(_ movie: SavedMovie) {
        let isAdding: Bool
        if let index = lovedMovies.firstIndex(where: { $0.id == movie.id }) {
            lovedMovies.remove(at: index)
            isAdding = false
        } else {
            lovedMovies.append(movie)
            isAdding = true
        }
        saveLoved()

        // Sync to cloud if authenticated
        if authManager.isAuthenticated {
            Task {
                await syncToCloud(tmdbId: movie.id, action: isAdding ? "add" : "remove")
            }
        }
    }

    func toggleQueue(_ movie: SavedMovie) {
        if let index = queueMovies.firstIndex(where: { $0.id == movie.id }) {
            queueMovies.remove(at: index)
        } else {
            queueMovies.append(movie)
        }
        saveQueue()

        // Note: Queue sync can be added later if needed
    }

    private func saveLoved() {
        if let encoded = try? JSONEncoder().encode(lovedMovies) {
            UserDefaults.standard.set(encoded, forKey: lovedKey)
        }
    }

    private func saveQueue() {
        if let encoded = try? JSONEncoder().encode(queueMovies) {
            UserDefaults.standard.set(encoded, forKey: queueKey)
        }
    }

    // MARK: - Cloud Sync

    /// Sync local favorites with cloud (union merge - never delete)
    func syncWithCloud() async {
        guard authManager.isAuthenticated,
              let token = authManager.getAuthToken() else {
            print("⚠️ Not authenticated - skipping cloud sync")
            return
        }

        isSyncing = true
        defer { isSyncing = false }

        do {
            // Fetch cloud favorites
            let url = URL(string: "\(apiBaseURL)/api/v1/user/favorites")!
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                print("❌ Failed to fetch cloud favorites")
                return
            }

            let cloudResponse = try JSONDecoder().decode(CloudFavoritesResponse.self, from: data)

            // Convert cloud favorites to SavedMovie format
            let cloudMovies = cloudResponse.favorites.map { cloudFav in
                SavedMovie(
                    id: cloudFav.tmdb_id,
                    title: cloudFav.title,
                    year: cloudFav.year,
                    posterUrl: cloudFav.poster_url,
                    slug: nil
                )
            }

            // Union merge: Local ∪ Cloud (never delete)
            var mergedSet = Set(lovedMovies.map { $0.id })
            for cloudMovie in cloudMovies {
                if !mergedSet.contains(cloudMovie.id) {
                    lovedMovies.append(cloudMovie)
                    mergedSet.insert(cloudMovie.id)
                }
            }

            saveLoved()
            print("✅ Cloud sync complete: \(lovedMovies.count) total favorites")

            // Push any local-only favorites to cloud
            for localMovie in lovedMovies {
                if !cloudMovies.contains(where: { $0.id == localMovie.id }) {
                    await syncToCloud(tmdbId: localMovie.id, action: "add")
                }
            }

        } catch {
            print("❌ Cloud sync error: \(error.localizedDescription)")
        }
    }

    /// Push single favorite change to cloud
    private func syncToCloud(tmdbId: Int, action: String) async {
        guard let token = authManager.getAuthToken() else { return }

        do {
            if action == "add" {
                // POST /api/v1/user/favorites
                let url = URL(string: "\(apiBaseURL)/api/v1/user/favorites")!
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")

                let body = ["tmdb_id": tmdbId]
                request.httpBody = try JSONSerialization.data(withJSONObject: body)

                let (_, response) = try await URLSession.shared.data(for: request)
                if let httpResponse = response as? HTTPURLResponse,
                   httpResponse.statusCode == 201 {
                    print("✅ Synced to cloud: Added \(tmdbId)")
                }
            } else {
                // DELETE /api/v1/user/favorites/:tmdbId
                let url = URL(string: "\(apiBaseURL)/api/v1/user/favorites/\(tmdbId)")!
                var request = URLRequest(url: url)
                request.httpMethod = "DELETE"
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

                let (_, response) = try await URLSession.shared.data(for: request)
                if let httpResponse = response as? HTTPURLResponse,
                   httpResponse.statusCode == 200 {
                    print("✅ Synced to cloud: Removed \(tmdbId)")
                }
            }
        } catch {
            print("❌ Failed to sync \(tmdbId): \(error.localizedDescription)")
        }
    }
}

// MARK: - API Response Models
struct CloudFavoritesResponse: Codable {
    let favorites: [CloudFavorite]
}

struct CloudFavorite: Codable {
    let tmdb_id: Int
    let title: String
    let year: Int?
    let poster_url: String?
}
