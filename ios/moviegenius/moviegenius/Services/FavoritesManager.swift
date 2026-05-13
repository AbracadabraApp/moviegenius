//
//  FavoritesManager.swift
//  moviegenius
//
//  Favorites persistence using UserDefaults (localStorage equivalent)
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

// Favorites manager using UserDefaults
@MainActor
class FavoritesManager: ObservableObject {
    static let shared = FavoritesManager()

    @Published var lovedMovies: [SavedMovie] = []
    @Published var queueMovies: [SavedMovie] = []

    private let lovedKey = "lovedMovies"
    private let queueKey = "queueMovies"

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
        if let index = lovedMovies.firstIndex(where: { $0.id == movie.id }) {
            lovedMovies.remove(at: index)
        } else {
            lovedMovies.append(movie)
        }
        saveLoved()
    }

    func toggleQueue(_ movie: SavedMovie) {
        if let index = queueMovies.firstIndex(where: { $0.id == movie.id }) {
            queueMovies.remove(at: index)
        } else {
            queueMovies.append(movie)
        }
        saveQueue()
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
}
